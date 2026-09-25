import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { PricingService, PricingInput } from "./pricing.service";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

class PriceRecommendationDto implements PricingInput {
  @IsString() productId: string;
  @IsNumber() @Min(0) @Type(() => Number) materialCost: number;
  @IsNumber() @Min(0) @Type(() => Number) laborCost: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) otherCost?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) desiredMarginPercent?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() craft?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() region?: string;
}

@ApiTags("pricing")
@Controller("ai")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Post("price-recommendation")
  @ApiOperation({ summary: "Get AI-assisted price range recommendation" })
  recommendPrice(@Body() dto: PriceRecommendationDto) {
    return this.pricingService.recommendPrice(dto);
  }
}
