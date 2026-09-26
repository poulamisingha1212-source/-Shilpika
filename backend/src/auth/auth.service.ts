import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { User, UserRole } from "../users/user.entity";
import { ArtisanProfile, VerificationStatus } from "../users/artisan-profile.entity";
import { CreateProfileDto } from "./dto/create-profile.dto";
import { EmailOtp, OtpPurpose } from "./email-otp.entity";
import { BrevoService } from "./brevo.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import * as crypto from "crypto";

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function hashOtpCode(email: string, code: string): string {
  return crypto.createHash("sha256").update(`${email.toLowerCase()}::${code}`).digest("hex");
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, combinedHash?: string): boolean {
  if (!combinedHash || !combinedHash.includes(":")) return false;
  try {
    const [salt, key] = combinedHash.split(":");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ArtisanProfile) private artisanProfileRepo: Repository<ArtisanProfile>,
    @InjectRepository(EmailOtp) private otpRepo: Repository<EmailOtp>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private brevoService: BrevoService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) {}

  async validateJwtPayload(payload: any): Promise<User | null> {
    const auth0Id = payload.sub || payload.auth0Id || payload.userId;
    const email =
      payload.email ||
      payload["https://artisan-marketplace.api/email"] ||
      (auth0Id ? `${auth0Id.replace(/[^a-zA-Z0-9]/g, "_")}@auth0.local` : undefined);

    // Extract role from standard Auth0 custom claims or direct role claim
    const rawRole =
      payload["https://artisan-marketplace.api/roles"] ||
      payload["https://artisan-marketplace.api/role"] ||
      payload.role ||
      payload.roles;

    let extractedRole: UserRole | undefined;
    if (rawRole) {
      const roleStr = Array.isArray(rawRole) ? rawRole[0] : String(rawRole);
      const lower = roleStr.toLowerCase().trim();
      if (lower === "admin") extractedRole = UserRole.ADMIN;
      else if (lower === "artisan") extractedRole = UserRole.ARTISAN;
      else if (lower === "buyer") extractedRole = UserRole.BUYER;
    }

    let user: User | null = null;
    if (auth0Id) {
      // Dev tokens use the DB user id as sub; Auth0 subs (auth0|...) never match a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth0Id);
      user = await this.userRepo.findOne({ where: isUuid ? [{ auth0Id }, { id: auth0Id }] : { auth0Id } });
    }
    if (!user && email) {
      user = await this.userRepo.findOne({ where: { email } });
      if (user && auth0Id && !user.auth0Id) {
        user.auth0Id = auth0Id;
        await this.userRepo.save(user);
      }
    }

    if (!user && (auth0Id || email)) {
      // Auto-provision user on first Auth0 login
      const targetRole = extractedRole || UserRole.BUYER;
      user = this.userRepo.create({
        auth0Id,
        email,
        displayName:
          payload.name ||
          payload.nickname ||
          payload["https://artisan-marketplace.api/name"] ||
          (email ? email.split("@")[0] : "Artisan User"),
        avatarUrl: payload.picture,
        role: targetRole,
        isActive: true,
      });
      user = await this.userRepo.save(user);
      this.logger.info("New user auto-provisioned from Auth0 JWT", {
        userId: user.id,
        auth0Id,
        role: user.role,
      });

      if (user.role === UserRole.ARTISAN) {
        const existingProfile = await this.artisanProfileRepo.findOne({
          where: { userId: user.id },
        });
        if (!existingProfile) {
          const profile = this.artisanProfileRepo.create({
            userId: user.id,
            craftType: "Handcrafted Artisan",
            region: "India",
          });
          await this.artisanProfileRepo.save(profile);
        }
      }
    } else if (user && extractedRole && user.role !== extractedRole) {
      user.role = extractedRole;
      await this.userRepo.save(user);
    }

    return user;
  }

  async getMeWithProfile(userId: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    let profile: ArtisanProfile | null = null;
    if (user.role === UserRole.ARTISAN) {
      profile = await this.artisanProfileRepo.findOne({ where: { userId } });
    }

    return {
      ...user,
      artisanProfile: profile,
    };
  }

  async createOrUpdateProfile(userId: string, dto: CreateProfileDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    Object.assign(user, {
      displayName: dto.displayName || user.displayName,
      preferredLanguage: dto.preferredLanguage || user.preferredLanguage,
      role: dto.role || user.role,
    });
    await this.userRepo.save(user);

    if (dto.role === UserRole.ARTISAN && dto.artisanProfile) {
      let profile = await this.artisanProfileRepo.findOne({ where: { userId } });
      if (!profile) {
        profile = this.artisanProfileRepo.create({ userId, ...dto.artisanProfile });
      } else {
        Object.assign(profile, dto.artisanProfile);
      }
      await this.artisanProfileRepo.save(profile);
    }

    return user;
  }

  async generateDevToken(
    userId: string,
    role: UserRole,
    expiresIn: string = "24h"
  ): Promise<string> {
    // Dev-only token generation with configurable expiration
    const payload = {
      sub: userId,
      email: `dev-${userId}@example.com`,
      role,
      name: role === UserRole.ARTISAN ? "Priya Sharma (Artisan)" : "Ananya Singh (Buyer)",
    };
    return this.jwtService.sign(payload, { expiresIn } as any);
  }

  /**
   * Register a new user with email and password via Auth0 Database Connection.
   * Provisions the account in both Auth0 and local DB with selected portal role.
   */
  async signup(dto: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
    aadhaar?: string;
    address?: string;
  }) {
    const { email, password, name, role, aadhaar, address } = dto;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException("A valid email address is required.");
    }
    if (!password || password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in DB
    const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new BadRequestException("An account with this email already exists. Please sign in.");
    }

    const domain = this.configService.get<string>("AUTH0_DOMAIN", "dev-3c8eme7wlzr31szt.us.auth0.com");
    const clientId = this.configService.get<string>("AUTH0_CLIENT_ID", "Bgfa62WQm7xteD0cKOWU3MRsIKKbWwyM");
    const targetRole = role && Object.values(UserRole).includes(role) ? role : UserRole.ARTISAN;

    let auth0UserId: string | null = null;

    // Register user in Auth0 Database connection
    try {
      const auth0Res = await fetch(`https://${domain}/dbconnections/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          email: normalizedEmail,
          password: password,
          connection: "Username-Password-Authentication",
          user_metadata: { name: name || normalizedEmail.split("@")[0], role: targetRole }
        }),
      });

      if (auth0Res.ok) {
        const auth0Data = await auth0Res.json();
        auth0UserId = auth0Data._id ? `auth0|${auth0Data._id}` : null;
        this.logger.info("User registered in Auth0 database connection", { email: normalizedEmail, auth0Id: auth0UserId });
      } else {
        const errData = await auth0Res.json().catch(() => null);
        if (errData?.code === "invalid_signup" || errData?.description?.includes("already exists")) {
          throw new BadRequestException("An account with this email is already registered in Auth0. Please sign in.");
        }
        this.logger.warn("Auth0 signup returned non-200, continuing with local provision", { errData });
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn("Auth0 signup warning:", { message: err?.message });
    }

    const finalAuth0Id = auth0UserId || `auth0|${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const passwordHash = hashPassword(password);

    const user = this.userRepo.create({
      auth0Id: finalAuth0Id,
      email: normalizedEmail,
      displayName: (name || normalizedEmail.split("@")[0]).trim(),
      passwordHash,
      role: targetRole,
      isActive: true,
      onboardingCompleted: true,
    });
    await this.userRepo.save(user);

    if (user.role === UserRole.ARTISAN) {
      const existingProfile = await this.artisanProfileRepo.findOne({ where: { userId: user.id } });
      if (!existingProfile) {
        const profile = this.artisanProfileRepo.create({
          userId: user.id,
          craftType: "Handcrafted Artisan",
          region: address?.trim() || "India",
          address: address?.trim() || undefined,
          aadhaarNumber: aadhaar ? aadhaar.replace(/\s/g, '') : undefined,
          verificationStatus: VerificationStatus.PENDING,
        });
        await this.artisanProfileRepo.save(profile);
      } else {
        if (address) existingProfile.address = address.trim();
        if (aadhaar) existingProfile.aadhaarNumber = aadhaar.replace(/\s/g, '');
        await this.artisanProfileRepo.save(existingProfile);
      }
    }

    // Email + password signup → verify email ownership via OTP before the
    // session is issued (Google sign-in is unaffected and pre-verified).
    const otp = await this.issueOtp(normalizedEmail, OtpPurpose.SIGNUP);
    if (otp.required) {
      return {
        otpRequired: true,
        email: normalizedEmail,
        ...(otp.devCode ? { devCode: otp.devCode } : {}),
      };
    }

    // Mail provider not configured in production — never brick sign-up.
    this.logger.warn("Email OTP skipped (no mail provider) — issuing session without verification");
    user.emailVerified = true;
    await this.userRepo.save(user);
    return { verificationSkipped: true, ...this.issueSession(user) };
  }

  /**
   * Sign in with email and password via Auth0.
   * Authenticates password directly against Auth0 database connection,
   * verifies credentials, then requires an email OTP before issuing a session.
   */
  async login(dto: {
    email: string;
    password?: string;
    name?: string;
    role?: UserRole;
  }) {
    const { email, password, role } = dto;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException("A valid email address is required.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const domain = this.configService.get<string>("AUTH0_DOMAIN", "dev-3c8eme7wlzr31szt.us.auth0.com");
    const clientId = this.configService.get<string>("AUTH0_CLIENT_ID", "Bgfa62WQm7xteD0cKOWU3MRsIKKbWwyM");

    let auth0Verified = false;

    // 1. Authenticate against Auth0 if password is provided
    if (password) {
      try {
        const auth0Res = await fetch(`https://${domain}/co/authenticate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": `https://${domain}`
          },
          body: JSON.stringify({
            client_id: clientId,
            username: normalizedEmail,
            password: password,
            realm: "Username-Password-Authentication",
            credential_type: "http://auth0.com/oauth/grant-type/password-realm"
          })
        });

        if (auth0Res.ok) {
          auth0Verified = true;
          this.logger.info("Password authenticated successfully with Auth0", { email: normalizedEmail });
        } else {
          const errData = await auth0Res.json().catch(() => null);
          this.logger.warn("Auth0 rejected password authentication", { status: auth0Res.status, err: errData?.error_description });
        }
      } catch (err: any) {
        this.logger.warn("Auth0 authentication check warning:", { message: err?.message });
      }
    }

    let user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      user = await this.userRepo.findOne({ where: { auth0Id: `auth0|${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "_")}` } });
    }

    // 2. Validate password check: must match Auth0 or local password hash
    if (password) {
      if (!auth0Verified) {
        if (user && user.passwordHash && verifyPassword(password, user.passwordHash)) {
          // local password matches fallback
        } else {
          throw new UnauthorizedException("Incorrect email or password. Please verify your credentials.");
        }
      }
    }

    // 3. Provision or update user
    const targetRole = role && Object.values(UserRole).includes(role) ? role : (user?.role || UserRole.ARTISAN);

    if (!user) {
      user = this.userRepo.create({
        auth0Id: `auth0|${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: normalizedEmail,
        displayName: (dto.name || normalizedEmail.split("@")[0]).trim(),
        passwordHash: password ? hashPassword(password) : undefined,
        role: targetRole,
        isActive: true,
      });
      user = await this.userRepo.save(user);

      if (user.role === UserRole.ARTISAN) {
        const profile = this.artisanProfileRepo.create({ userId: user.id });
        await this.artisanProfileRepo.save(profile);
      }
    } else {
      let updated = false;
      if (role && Object.values(UserRole).includes(role) && user.role !== role) {
        user.role = role;
        updated = true;
      }
      if (password && !user.passwordHash) {
        user.passwordHash = hashPassword(password);
        updated = true;
      }
      if (updated) {
        user = await this.userRepo.save(user);
      }
    }

    // Credentials are valid → prove email ownership with an OTP before the
    // session is issued (Google sign-in is unaffected and pre-verified).
    const otp = await this.issueOtp(normalizedEmail, OtpPurpose.LOGIN);
    if (otp.required) {
      return {
        otpRequired: true,
        email: normalizedEmail,
        ...(otp.devCode ? { devCode: otp.devCode } : {}),
      };
    }

    // Mail provider not configured in production — never brick sign-in.
    this.logger.warn("Email OTP skipped (no mail provider) — issuing session without verification");
    if (!user.emailVerified) {
      user.emailVerified = true;
      await this.userRepo.save(user);
    }
    return { verificationSkipped: true, ...this.issueSession(user) };
  }

  /**
   * Verify a 6-digit email OTP (signup or login purpose) and issue the session.
   * Codes are hashed at rest, single-use, expire after 10 minutes, and allow
   * at most 5 incorrect attempts before a new code must be requested.
   */
  async verifyOtp(dto: { email: string; code: string; purpose: OtpPurpose }) {
    const normalized = (dto.email || "").trim().toLowerCase();
    const code = (dto.code || "").trim();
    if (!normalized || !/^\d{6}$/.test(code)) {
      throw new BadRequestException("Enter the 6-digit code from your email.");
    }
    if (!Object.values(OtpPurpose).includes(dto.purpose)) {
      throw new BadRequestException("Invalid verification purpose.");
    }

    const otp = await this.otpRepo.findOne({
      where: { email: normalized, purpose: dto.purpose },
      order: { createdAt: "DESC" },
    });
    if (!otp || otp.consumedAt) {
      throw new BadRequestException("This code is no longer valid. Request a new one.");
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("This code has expired. Request a new one.");
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException("Too many incorrect attempts. Request a new code.");
    }

    if (hashOtpCode(normalized, code) !== otp.codeHash) {
      otp.attempts += 1;
      await this.otpRepo.save(otp);
      throw new BadRequestException(
        otp.attempts >= OTP_MAX_ATTEMPTS
          ? "Too many incorrect attempts. Request a new code."
          : "That code is incorrect. Please check your email and try again.",
      );
    }

    otp.consumedAt = new Date();
    await this.otpRepo.save(otp);

    const user = await this.userRepo.findOne({ where: { email: normalized } });
    if (!user) throw new NotFoundException("No account found for this email.");

    if (!user.emailVerified) {
      user.emailVerified = true;
      await this.userRepo.save(user);
    }

    return this.issueSession(user);
  }

  /** Re-send an OTP for the given purpose, rate-limited to one per minute. */
  async resendOtp(dto: { email: string; purpose: OtpPurpose }) {
    const normalized = (dto.email || "").trim().toLowerCase();
    if (!normalized || !Object.values(OtpPurpose).includes(dto.purpose)) {
      throw new BadRequestException("A valid email and purpose are required.");
    }
    const last = await this.otpRepo.findOne({
      where: { email: normalized, purpose: dto.purpose },
      order: { createdAt: "DESC" },
    });
    if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      const wait = Math.ceil(
        (OTP_RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - last.createdAt.getTime())) / 1000,
      );
      throw new BadRequestException(`Please wait ${wait}s before requesting another code.`);
    }
    return this.issueOtp(normalized, dto.purpose);
  }

  /**
   * Generate + email an OTP. Returns whether OTP is required and, in
   * non-production without a mail provider, the code so the flow stays testable.
   */
  private async issueOtp(email: string, purpose: OtpPurpose): Promise<{ required: boolean; devCode?: string }> {
    if (!this.brevoService.isConfigured()) {
      const isProduction = this.configService.get<string>("NODE_ENV") === "production";
      if (isProduction) return { required: false };
      const devCode = String(crypto.randomInt(100000, 1000000));
      await this.otpRepo.save(
        this.otpRepo.create({ email, codeHash: hashOtpCode(email, devCode), purpose, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000) }),
      );
      this.logger.warn("BREVO_API_KEY not configured — dev OTP code generated", { email });
      return { required: true, devCode };
    }

    const code = String(crypto.randomInt(100000, 1000000));
    await this.otpRepo.save(
      this.otpRepo.create({ email, codeHash: hashOtpCode(email, code), purpose, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000) }),
    );
    const result = await this.brevoService.sendOtpEmail(email, code, purpose, OTP_TTL_MINUTES);
    if (!result.sent) {
      throw new BadRequestException("Could not send the verification email. Please try again in a moment.");
    }
    return { required: true };
  }

  private issueSession(user: User) {
    const token = this.jwtService.sign(
      { sub: user.id, auth0Id: user.auth0Id, email: user.email, role: user.role, name: user.displayName, isAuth0: true },
      { expiresIn: "24h" } as any,
    );
    return {
      token,
      isAuth0: true,
      user: {
        id: user.id,
        auth0Id: user.auth0Id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isAuth0: true,
      },
    };
  }

  /**
   * Complete Auth0 sign-in flow:
   * Finds or provisions the user in the database using their verified Auth0 identity,
   * assigns the appropriate portal role, and returns an authenticated session.
   */
  async loginWithAuth0(auth0Payload: {
    auth0Id: string;
    email: string;
    name?: string;
    role?: UserRole;
    avatarUrl?: string;
  }) {
    const { auth0Id, email, name, role, avatarUrl } = auth0Payload;
    const normalizedEmail = (email || `${auth0Id.replace(/[^a-zA-Z0-9]/g, '_')}@auth0.local`).trim().toLowerCase();

    let user = await this.userRepo.findOne({ where: { auth0Id } });
    if (!user && normalizedEmail) {
      user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    }

    const targetRole = role && Object.values(UserRole).includes(role) ? role : (user?.role || UserRole.ARTISAN);

    if (!user) {
      user = this.userRepo.create({
        auth0Id,
        email: normalizedEmail,
        displayName: (name || normalizedEmail.split('@')[0] || 'Artisan').trim(),
        avatarUrl: avatarUrl || undefined,
        role: targetRole,
        isActive: true,
        onboardingCompleted: false,
        emailVerified: true, // identity (and email) already verified by Google/Auth0
      });
      user = await this.userRepo.save(user);
      this.logger.info("New Auth0 user provisioned", { userId: user.id, auth0Id, role: user.role });

      if (user.role === UserRole.ARTISAN) {
        const profile = this.artisanProfileRepo.create({
          userId: user.id,
          craftType: "Handcrafted Artisan",
          region: "India",
        });
        await this.artisanProfileRepo.save(profile);
      }
    } else {
      let updated = false;
      if (!user.auth0Id) {
        user.auth0Id = auth0Id;
        updated = true;
      }
      if (role && Object.values(UserRole).includes(role) && user.role !== role) {
        user.role = role;
        updated = true;
      }
      if (name && name.trim() && user.displayName !== name.trim()) {
        user.displayName = name.trim();
        updated = true;
      }
      if (avatarUrl && !user.avatarUrl) {
        user.avatarUrl = avatarUrl;
        updated = true;
      }
      if (updated) {
        user = await this.userRepo.save(user);
      }
    }

    const token = this.jwtService.sign(
      { sub: user.id, auth0Id: user.auth0Id, email: user.email, role: user.role, name: user.displayName, isAuth0: true },
      { expiresIn: "24h" } as any,
    );

    return {
      token,
      isAuth0: true,
      needsOnboarding: user.onboardingCompleted !== true,
      user: {
        id: user.id,
        auth0Id: user.auth0Id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        onboardingCompleted: user.onboardingCompleted,
        isAuth0: true,
      },
    };
  }

  /**
   * Complete Google / OAuth2 user onboarding:
   * Sets role to buyer or seller (artisan), saves Aadhaar & address for artisans,
   * marks onboardingCompleted = true, and returns fresh JWT.
   */
  async completeOnboarding(
    userId: string,
    dto: {
      role: UserRole;
      aadhaar?: string;
      address?: string;
      craftType?: string;
    }
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const targetRole = dto.role === UserRole.ARTISAN ? UserRole.ARTISAN : UserRole.BUYER;
    user.role = targetRole;
    user.onboardingCompleted = true;

    if (targetRole === UserRole.ARTISAN) {
      const cleanAadhaar = dto.aadhaar ? dto.aadhaar.replace(/\s/g, '') : '';
      if (!cleanAadhaar || cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
        throw new BadRequestException("A valid 12-digit Aadhaar number is required for seller verification.");
      }
      if (!dto.address || dto.address.trim().length < 5) {
        throw new BadRequestException("A valid workshop or studio address is required.");
      }

      let profile = await this.artisanProfileRepo.findOne({ where: { userId } });
      if (!profile) {
        profile = this.artisanProfileRepo.create({
          userId,
          craftType: dto.craftType || "Handcrafted Artisan",
          region: dto.address.trim(),
          address: dto.address.trim(),
          aadhaarNumber: cleanAadhaar,
          verificationStatus: VerificationStatus.PENDING,
        });
      } else {
        profile.address = dto.address.trim();
        profile.aadhaarNumber = cleanAadhaar;
        if (dto.craftType) profile.craftType = dto.craftType;
      }
      await this.artisanProfileRepo.save(profile);
    }

    await this.userRepo.save(user);

    const token = this.jwtService.sign(
      { sub: user.id, auth0Id: user.auth0Id, email: user.email, role: user.role, name: user.displayName, isAuth0: true },
      { expiresIn: "24h" } as any,
    );

    return {
      token,
      isAuth0: true,
      user: {
        id: user.id,
        auth0Id: user.auth0Id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        onboardingCompleted: true,
        isAuth0: true,
      },
    };
  }
}

