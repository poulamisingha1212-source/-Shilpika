import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole } from "./user.entity";
import { ArtisanProfile } from "./artisan-profile.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ArtisanProfile) private profileRepo: Repository<ArtisanProfile>
  ) {}

  sanitizeProfile(profile: ArtisanProfile, callerUser?: User): Partial<ArtisanProfile> {
    if (!profile) return profile;
    const isOwner = callerUser && callerUser.id === profile.userId;
    const isAdmin = callerUser && callerUser.role === UserRole.ADMIN;

    const copy = { ...profile };
    if (!isOwner && !isAdmin) {
      delete (copy as any).gstNumber;
      if (copy.user) {
        const userCopy = { ...copy.user };
        delete (userCopy as any).phone;
        delete (userCopy as any).auth0Id;
        copy.user = userCopy as User;
      }
    }
    return copy;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findArtisanProfile(userId: string, callerUser?: User): Promise<Partial<ArtisanProfile>> {
    const profile = await this.profileRepo.findOne({ where: { userId }, relations: ["user"] });
    if (!profile) throw new NotFoundException("Artisan profile not found");
    return this.sanitizeProfile(profile, callerUser);
  }

  async listArtisans(callerUser?: User): Promise<Partial<ArtisanProfile>[]> {
    const profiles = await this.profileRepo.find({ relations: ["user"] });
    return profiles.map((p) => this.sanitizeProfile(p, callerUser));
  }
}
