import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/user.entity";
import { RolesGuard, Role } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("analytics")
@Controller("analytics")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get("artisan")
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiOperation({ summary: "Get artisan dashboard analytics (artisan/admin only)" })
  getArtisanAnalytics(@CurrentUser() user: User) {
    return this.analyticsService.getArtisanAnalytics(user.id);
  }

  @Get("admin")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get admin overview and impact metrics (admin only, filter by 7, 30, 90 days)" })
  @ApiQuery({ name: "days", required: false, description: "Timeframe filter: 7, 30, 90, or all (default 30)" })
  getAdminOverview(@Query("days") days?: string) {
    return this.analyticsService.getAdminOverview(days);
  }
}
