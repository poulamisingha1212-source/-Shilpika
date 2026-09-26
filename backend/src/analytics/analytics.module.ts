import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../products/product.entity";
import { Inquiry } from "../inquiries/inquiry.entity";
import { User } from "../users/user.entity";
import { VoiceInput } from "../ai/voice-input.entity";
import { AIListingVersion } from "../ai/ai-listing-version.entity";
import { PriceRecommendation } from "../pricing/price-recommendation.entity";
import { ProductMedia } from "../media/product-media.entity";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Inquiry,
      User,
      VoiceInput,
      AIListingVersion,
      PriceRecommendation,
      ProductMedia,
    ]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
