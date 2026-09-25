import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/user.entity";

@ApiTags("analytics")
@Controller("analytics")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get("artisan")
  @ApiOperation({ summary: "Get artisan dashboard analytics" })
  getArtisanAnalytics(@CurrentUser() user: User) {
    return this.analyticsService.getArtisanAnalytics(user.id);
  }

  @Get("admin")
  @ApiOperation({ summary: "Get admin overview (admin only)" })
  getAdminOverview() {
    return this.analyticsService.getAdminOverview();
  }
}
