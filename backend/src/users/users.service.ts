import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";
import { ArtisanProfile } from "./artisan-profile.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ArtisanProfile) private profileRepo: Repository<ArtisanProfile>
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findArtisanProfile(userId: string): Promise<ArtisanProfile> {
    return this.profileRepo.findOne({ where: { userId }, relations: ["user"] });
  }

  async listArtisans(): Promise<ArtisanProfile[]> {
    return this.profileRepo.find({ relations: ["user"] });
  }
}
