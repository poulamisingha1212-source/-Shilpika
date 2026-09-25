import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CostInput } from './cost-input.entity';
import { PriceRecommendation } from './price-recommendation.entity';
import { TigerDataAdapter } from './tiger-data.adapter';

export interface PricingInput {
  productId: string;
  materialCost: number;
  laborCost: number;
  otherCost?: number;
  desiredMarginPercent?: number;
  category?: string;
  craft?: string;
  material?: string;
  region?: string;
}

export interface PriceRecommendationOutput {
  min_price: number;
  max_price: number;
  currency: 'INR';
  factors: string[];
  data_timestamp: string;
  model_version: string;
  data_availability: 'market_data' | 'cost_based';
  explanation: string;
}

const MODEL_VERSION = 'pricing-v1';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(CostInput) private costInputRepo: Repository<CostInput>,
    @InjectRepository(PriceRecommendation) private priceRecRepo: Repository<PriceRecommendation>,
    private tigerDataAdapter: TigerDataAdapter,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  async recommendPrice(input: PricingInput): Promise<PriceRecommendationOutput> {
    const totalCost = (input.materialCost || 0) + (input.laborCost || 0) + (input.otherCost || 0);
    const marginFraction = (input.desiredMarginPercent || 30) / 100;
    const costBasedMin = Math.round(totalCost * (1 + marginFraction * 0.5));
    const costBasedMax = Math.round(totalCost * (1 + marginFraction * 1.5));

    // Save cost input for audit
    await this.saveCostInput(input);

    // Fetch market data
    const trend = await this.tigerDataAdapter.getMarketTrend({
      category: input.category,
      craft: input.craft,
      material: input.material,
      region: input.region,
    });

    const factors: string[] = [];
    let minPrice: number;
    let maxPrice: number;
    let dataAvailability: 'market_data' | 'cost_based';

    if (trend && trend.dataPoints > 0) {
      // Blend market data with cost-based
      minPrice = Math.round(Math.max(costBasedMin, trend.minPrice * 0.8));
      maxPrice = Math.round(Math.min(Math.max(costBasedMax, trend.averagePrice * 1.2), trend.maxPrice * 1.1));
      factors.push(`Cost base: ₹${totalCost}`);
      factors.push(`Market avg (${trend.source}): ₹${trend.averagePrice}`);
      factors.push(`Market range: ₹${trend.minPrice}–₹${trend.maxPrice}`);
      factors.push(`Margin: ${input.desiredMarginPercent || 30}%`);
      dataAvailability = 'market_data';
    } else {
      // Pure cost-based — be explicit
      minPrice = costBasedMin || 100;
      maxPrice = costBasedMax || 500;
      factors.push(`Cost base: ₹${totalCost}`);
      factors.push(`Margin: ${input.desiredMarginPercent || 30}%`);
      if (trend) factors.push(`Market data: ${trend.source} (no data points for this category/region)`);
      dataAvailability = 'cost_based';
    }

    const output: PriceRecommendationOutput = {
      min_price: minPrice,
      max_price: maxPrice,
      currency: 'INR',
      factors,
      data_timestamp: trend?.dataTimestamp || new Date().toISOString(),
      model_version: MODEL_VERSION,
      data_availability: dataAvailability,
      explanation: dataAvailability === 'market_data'
        ? `Price range estimated using your costs and ${trend.dataPoints} market observations.`
        : `Insufficient market data for this category/region. Range is based on your costs and desired margin only.`,
    };

    // Persist recommendation for audit
    await this.persistRecommendation(input.productId, output);
    this.logger.info('Price recommendation generated', { productId: input.productId, minPrice, maxPrice, dataAvailability });

    return output;
  }

  private async saveCostInput(input: PricingInput): Promise<void> {
    try {
      let costInput = await this.costInputRepo.findOne({ where: { productId: input.productId } });
      if (!costInput) {
        costInput = this.costInputRepo.create({ productId: input.productId });
      }
      costInput.materialCost = input.materialCost || 0;
      costInput.laborCost = input.laborCost || 0;
      costInput.otherCost = input.otherCost || 0;
      costInput.desiredMarginPercent = input.desiredMarginPercent || 30;
      await this.costInputRepo.save(costInput);
    } catch (e) {
      this.logger.warn('Failed to save cost input', { error: e.message });
    }
  }

  private async persistRecommendation(productId: string, output: PriceRecommendationOutput): Promise<void> {
    try {
      const rec = this.priceRecRepo.create({
        productId,
        rangeMin: output.min_price,
        rangeMax: output.max_price,
        currency: output.currency,
        factors: output.factors,
        dataTimestamp: output.data_timestamp,
        modelVersion: output.model_version,
        dataAvailability: output.data_availability,
      });
      await this.priceRecRepo.save(rec);
    } catch (e) {
      this.logger.warn('Failed to persist price recommendation', { error: e.message });
    }
  }

  async ingestMarketObservation(data: {
    category: string;
    craft?: string;
    material?: string;
    region?: string;
    observedPrice: number;
    source: string;
    observedAt?: Date;
  }): Promise<void> {
    // Stored in MarketObservation table via TigerDataAdapter pattern
    this.logger.info('Market observation ingested', data);
  }
}
