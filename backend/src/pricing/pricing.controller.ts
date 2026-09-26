import { Controller, Post, Get, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { PricingService, PricingInput } from "./pricing.service";
import { MarketObservationInput } from "./tiger-data.adapter";
import { IsNumber, IsOptional, IsString, IsBoolean, Min, IsArray } from "class-validator";
import { Type } from "class-transformer";

export class PriceRecommendationDto implements PricingInput {
  @IsString() productId: string;
  @IsNumber() @Min(0, { message: 'Material cost cannot be negative' }) @Type(() => Number) materialCost: number;
  @IsNumber() @Min(0, { message: 'Labor cost cannot be negative' }) @Type(() => Number) laborCost: number;
  @IsOptional() @IsNumber() @Min(0, { message: 'Other cost cannot be negative' }) @Type(() => Number) otherCost?: number;
  @IsOptional() @IsNumber() @Min(0, { message: 'Desired margin cannot be negative' }) @Type(() => Number) desiredMarginPercent?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() craft?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() region?: string;
}

export class AcceptPriceDto {
  @IsString() productId: string;
  @IsOptional() @IsString() recommendationId?: string;
  @IsNumber() @Min(0, { message: 'Price minimum cannot be negative' }) @Type(() => Number) priceMin: number;
  @IsNumber() @Min(0, { message: 'Price maximum cannot be negative' }) @Type(() => Number) priceMax: number;
  @IsOptional() @IsBoolean() isOverride?: boolean;
}

export class CreateMarketObservationDto implements MarketObservationInput {
  @IsString() category: string;
  @IsOptional() @IsString() craft?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() product?: string;
  @IsNumber() @Min(0, { message: 'Price cannot be negative' }) @Type(() => Number) price: number;
  @IsOptional() @IsString() currency?: string;
  @IsString() source: string;
  @IsOptional() @IsBoolean() isDemo?: boolean;
  @IsOptional() @Type(() => Date) observedAt?: Date;
}

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/user.entity";
import { RolesGuard, Role } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("pricing")
@Controller("ai")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Post("price-recommendation")
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiOperation({ summary: "Get AI-assisted price range recommendation (artisan owner only)" })
  recommendPrice(@CurrentUser() user: User, @Body() dto: PriceRecommendationDto) {
    return this.pricingService.recommendPrice(dto, user);
  }

  @Post("price-recommendation/accept")
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiOperation({ summary: "Accept or override price recommendation and persist to product (artisan owner only)" })
  acceptPrice(@CurrentUser() user: User, @Body() dto: AcceptPriceDto) {
    return this.pricingService.acceptPriceRecommendation(dto, user);
  }

  @Get("price-recommendation/:productId")
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiOperation({ summary: "Get latest price recommendation for a product (artisan owner only)" })
  getLatestRecommendation(@Param("productId") productId: string, @CurrentUser() user: User) {
    return this.pricingService.getLatestRecommendation(productId, user);
  }

  @Post("market-observations")
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiOperation({ summary: "Ingest a market observation into time-series storage (artisan/admin)" })
  ingestObservation(@Body() dto: CreateMarketObservationDto) {
    return this.pricingService.ingestMarketObservation(dto);
  }

  @Post("market-observations/batch")
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiOperation({ summary: "Batch ingest market observations into time-series storage (artisan/admin)" })
  ingestBatch(@Body() dtos: CreateMarketObservationDto[]) {
    return this.pricingService.ingestMarketObservationsBatch(dtos);
  }

  @Get("market-trend")
  @ApiOperation({ summary: "Query aggregated market intelligence (average, median, trend, regional)" })
  getMarketTrend(@Query() query: { category?: string; craft?: string; material?: string; region?: string }) {
    return this.pricingService.getMarketTrend(query);
  }
}


