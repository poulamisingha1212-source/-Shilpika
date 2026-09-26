import { Controller, Get, Param, Req } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { Request } from "express";
import { User } from "./user.entity";

@ApiTags("artisans")
@Controller("artisans")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List all artisan profiles (sensitive data masked for public/buyers)" })
  listArtisans(@Req() req: Request) {
    const user = (req as any).user as User | undefined;
    return this.usersService.listArtisans(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get artisan profile by user ID (sensitive data masked for public/buyers)" })
  getArtisan(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user as User | undefined;
    return this.usersService.findArtisanProfile(id, user);
  }
}
