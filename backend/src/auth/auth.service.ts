import { Injectable, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { User, UserRole } from "../users/user.entity";
import { ArtisanProfile } from "../users/artisan-profile.entity";
import { CreateProfileDto } from "./dto/create-profile.dto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ArtisanProfile) private artisanProfileRepo: Repository<ArtisanProfile>,
    private jwtService: JwtService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) {}

  async validateJwtPayload(payload: any): Promise<User | null> {
    const auth0Id = payload.sub || payload.auth0Id;
    const email = payload.email;

    let user = await this.userRepo.findOne({
      where: [{ auth0Id }, { email }],
    });

    if (!user && (auth0Id || email)) {
      // Auto-provision user on first login
      user = this.userRepo.create({
        auth0Id,
        email,
        displayName: payload.name || payload.nickname,
        avatarUrl: payload.picture,
        role: UserRole.BUYER,
      });
      await this.userRepo.save(user);
      this.logger.info("New user provisioned", { userId: user.id, email });
    }

    return user;
  }

  async createOrUpdateProfile(userId: string, dto: CreateProfileDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

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

  async generateDevToken(userId: string, role: UserRole): Promise<string> {
    // Dev-only token generation
    const payload = { sub: userId, email: `dev-${userId}@example.com`, role };
    return this.jwtService.sign(payload);
  }
}
