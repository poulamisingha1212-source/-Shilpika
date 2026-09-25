import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CostInput } from './cost-input.entity';
import { MarketObservation } from './market-observation.entity';
import { PriceRecommendation } from './price-recommendation.entity';
import { PricingService } from './pricing.service';
import { TigerDataAdapter } from './tiger-data.adapter';
import { PricingController } from './pricing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CostInput, MarketObservation, PriceRecommendation])],
  providers: [PricingService, TigerDataAdapter],
  controllers: [PricingController],
  exports: [PricingService, TypeOrmModule],
})
export class PricingModule {}
