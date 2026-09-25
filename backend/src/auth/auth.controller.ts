import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CreateProfileDto } from "./dto/create-profile.dto";
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
  @ApiOperation({ summary: "Get current user profile" })
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Post("dev-token")
  @ApiOperation({ summary: "Generate dev JWT (development only)" })
  async devToken(
    @Body("userId") userId: string,
    @Body("role") role: UserRole
  ) {
    if (this.configService.get("NODE_ENV") === "production") {
      return { error: "Not available in production mode" };
    }
    const token = await this.authService.generateDevToken(userId || "dev-user-1", role || UserRole.ARTISAN);
    return { token, note: "Development token only. Not for production use." };
  }
}
