import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { Response } from "express";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CreateProfileDto } from "./dto/create-profile.dto";
import { OtpPurpose } from "./email-otp.entity";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User, UserRole } from "../users/user.entity";
import { ConfigService } from "@nestjs/config";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {}

  /**
   * Redirect the browser to Auth0's Universal Login with Google connection.
   * Auth0 will show the real Google sign-in screen, then redirect back to /callback.
   */
  @Get("google")
  @ApiOperation({ summary: "Redirect to Auth0 Google OAuth login" })
  googleLogin(@Res() res: Response) {
    const domain = this.configService.get<string>("AUTH0_DOMAIN", "dev-3c8eme7wlzr31szt.us.auth0.com");
    const clientId = this.configService.get<string>("AUTH0_CLIENT_ID", "Bgfa62WQm7xteD0cKOWU3MRsIKKbWwyM");
    const baseUrl = this.configService.get<string>("APP_BASE_URL", "http://localhost:3000");
    const redirectUri = encodeURIComponent(`${baseUrl}/api/v1/auth/callback`);
    const url = `https://${domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&connection=google-oauth2&scope=openid%20profile%20email&state=shilpika_google`;
    res.redirect(url);
  }

  /**
   * Auth0 calls this after Google login.
   * We exchange the code for tokens, fetch the user profile, provision the DB user,
   * and redirect the browser back to the SPA with the session token in the URL.
   */
  @Get("callback")
  @ApiOperation({ summary: "Auth0 OAuth2 callback — exchanges code for user session" })
  async auth0Callback(
    @Query("code") code: string,
    @Query("error") error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      const reason = error || "no_code";
      return res.redirect(`/?auth_error=${encodeURIComponent(reason)}`);
    }

    try {
      const domain = this.configService.get<string>("AUTH0_DOMAIN", "dev-3c8eme7wlzr31szt.us.auth0.com");
      const clientId = this.configService.get<string>("AUTH0_CLIENT_ID", "Bgfa62WQm7xteD0cKOWU3MRsIKKbWwyM");
      const clientSecret = this.configService.get<string>("AUTH0_CLIENT_SECRET", "");
      const baseUrl = this.configService.get<string>("APP_BASE_URL", "http://localhost:3000");
      const redirectUri = `${baseUrl}/api/v1/auth/callback`;

      // Exchange authorization code for access + id tokens
      const tokenRes = await fetch(`https://${domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Token exchange failed: ${errText}`);
      }

      const tokens = await tokenRes.json();

      // Fetch the authenticated user's profile from Auth0
      const userInfoRes = await fetch(`https://${domain}/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoRes.ok) {
        throw new Error("Failed to fetch user info from Auth0");
      }

      const userInfo = await userInfoRes.json();

      // Provision user in local DB and issue a signed session JWT
      const session = await this.authService.loginWithAuth0({
        auth0Id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || userInfo.nickname,
        role: UserRole.BUYER,
        avatarUrl: userInfo.picture,
      });

      // Redirect to SPA — the frontend reads ?google_token, ?google_user, and ?needs_onboarding
      const tokenParam = encodeURIComponent(session.token);
      const userParam = encodeURIComponent(JSON.stringify(session.user));
      const needsOnboarding = session.needsOnboarding ? "1" : "0";
      return res.redirect(`/?google_token=${tokenParam}&google_user=${userParam}&needs_onboarding=${needsOnboarding}`);
    } catch (err: any) {
      return res.redirect(`/?auth_error=${encodeURIComponent(err?.message || "callback_failed")}`);
    }
  }

  @Post("complete-onboarding")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Complete role and profile onboarding for Google / OAuth users" })
  async completeOnboarding(
    @CurrentUser() user: User,
    @Body("role") role: UserRole,
    @Body("aadhaar") aadhaar?: string,
    @Body("address") address?: string,
    @Body("craftType") craftType?: string,
  ) {
    return this.authService.completeOnboarding(user.id, { role, aadhaar, address, craftType });
  }

  @Post("profile")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create or update user profile after Auth0 login" })
  async createProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateProfileDto
  ) {
    return this.authService.createOrUpdateProfile(user.id, dto);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user profile and persona" })
  async getMe(@CurrentUser() user: User) {
    return this.authService.getMeWithProfile(user.id);
  }

  @Post("dev-token")
  @ApiOperation({ summary: "Generate dev JWT (development only)" })
  async devToken(
    @Body("userId") userId: string,
    @Body("role") role: UserRole,
    @Body("expiresIn") expiresIn?: string
  ) {
    const isProduction = this.configService.get<string>("NODE_ENV") === "production";
    const enableDevAuth = this.configService.get<string>("ENABLE_DEV_AUTH", "true") === "true";

    if (isProduction || !enableDevAuth) {
      throw new ForbiddenException(
        "Development tokens are strictly disabled in production mode. Real Auth0 authentication is required."
      );
    }

    const token = await this.authService.generateDevToken(
      userId || "dev-user-1",
      role || UserRole.ARTISAN,
      expiresIn || "24h"
    );
    return { token, note: "Development token only. Not for production use." };
  }

  @Post("signup")
  @ApiOperation({ summary: "Sign up with email + password — sends a Brevo OTP to verify the email" })
  async signup(
    @Body("email") email: string,
    @Body("password") password: string,
    @Body("name") name?: string,
    @Body("role") role?: UserRole,
    @Body("aadhaar") aadhaar?: string,
    @Body("address") address?: string,
  ) {
    return this.authService.signup({ email, password, name, role, aadhaar, address });
  }

  @Post("login")
  @ApiOperation({ summary: "Sign in with email + password — sends a Brevo OTP before the session is issued" })
  async login(
    @Body("email") email: string,
    @Body("password") password?: string,
    @Body("name") name?: string,
    @Body("role") role?: UserRole,
  ) {
    return this.authService.login({ email, password, name, role });
  }

  @Post("verify-otp")
  @ApiOperation({ summary: "Verify the email OTP (signup or login) and receive the session token" })
  verifyOtp(
    @Body("email") email: string,
    @Body("code") code: string,
    @Body("purpose") purpose: OtpPurpose,
  ) {
    return this.authService.verifyOtp({ email, code, purpose });
  }

  @Post("resend-otp")
  @ApiOperation({ summary: "Re-send the OTP email (max once per minute)" })
  resendOtp(
    @Body("email") email: string,
    @Body("purpose") purpose: OtpPurpose,
  ) {
    return this.authService.resendOtp({ email, purpose });
  }

  @Get("auth0-config")
  @ApiOperation({ summary: "Get public Auth0 configuration for web and mobile clients" })
  async getAuth0Config() {
    return {
      domain: this.configService.get<string>("AUTH0_DOMAIN", "dev-3c8eme7wlzr31szt.us.auth0.com"),
      clientId: this.configService.get<string>("AUTH0_CLIENT_ID", "Bgfa62WQm7xteD0cKOWU3MRsIKKbWwyM"),
      audience: this.configService.get<string>("AUTH0_AUDIENCE", "https://artisan-marketplace.api"),
      useAuth0: true,
    };
  }

  @Post("auth0-login")
  @ApiOperation({ summary: "Sign in with Auth0 user profile or verified Auth0 token" })
  async auth0Login(
    @Body("auth0Id") auth0Id: string,
    @Body("email") email: string,
    @Body("name") name?: string,
    @Body("role") role?: UserRole,
    @Body("avatarUrl") avatarUrl?: string,
  ) {
    if (!auth0Id && !email) {
      throw new ForbiddenException("Auth0 identifier or email is required.");
    }
    const finalAuth0Id = auth0Id || `auth0|${(email || 'artisan').replace(/[^a-zA-Z0-9]/g, '_')}`;
    return this.authService.loginWithAuth0({
      auth0Id: finalAuth0Id,
      email: email || `${finalAuth0Id}@auth0.local`,
      name,
      role,
      avatarUrl,
    });
  }
}
