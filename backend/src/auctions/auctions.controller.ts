import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsNumber, IsString, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { AuctionsService } from "./auctions.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/user.entity";
import { RolesGuard, Role } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

class PlaceBidDto {
  @IsString() bidder: string;
  @IsNumber() @Min(1) @Type(() => Number) amount: number;
}

@ApiTags("auctions")
@Controller("auctions")
export class AuctionsController {
  constructor(private auctionsService: AuctionsService) {}

  @Get()
  @ApiOperation({ summary: "List Nilaam auction sessions (live + recently ended)" })
  list() {
    return this.auctionsService.getSessions();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one auction session with recent bids" })
  get(@Param("id") id: string) {
    return this.auctionsService.getSession(id);
  }

  @Post(":id/bids")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ARTISAN, Role.BUYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Place a bid (anti-sniping: final-minute bids extend the timer by 2 minutes)" })
  bid(@Param("id") id: string, @CurrentUser() user: User, @Body() dto: PlaceBidDto) {
    return this.auctionsService.placeBid(id, dto.bidder, dto.amount, user?.id);
  }
}
