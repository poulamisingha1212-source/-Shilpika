import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service";

@ApiTags("artisans")
@Controller("artisans")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List all artisan profiles" })
  listArtisans() {
    return this.usersService.listArtisans();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get artisan profile by user ID" })
  getArtisan(@Param("id") id: string) {
    return this.usersService.findArtisanProfile(id);
  }
}
