import { Injectable, Inject, Optional, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CostInput } from './cost-input.entity';
import { PriceRecommendation } from './price-recommendation.entity';
import { MarketObservation } from './market-observation.entity';
import { Product } from '../products/product.entity';
import { User, UserRole } from '../users/user.entity';
import { TigerDataAdapter, MarketObservationInput, MarketTrend, MarketQueryFilter } from './tiger-data.adapter';

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
  id?: string;
  recommendation_id?: string;
  min_price: number;
  max_price: number;
  estimated_cost: number;
  suggested_margin_percent: number;
  currency: 'INR';
  factors: string[];
  data_timestamp: string;
  model_version: string;
  data_availability: 'MARKET_DATA' | 'COST_BASED';
  explanation: string;
}

export interface AcceptPriceInput {
  productId: string;
  recommendationId?: string;
  priceMin: number;
  priceMax: number;
  isOverride?: boolean;
}

const MODEL_VERSION = 'pricing-v1';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(CostInput) private costInputRepo: Repository<CostInput>,
    @InjectRepository(PriceRecommendation) private priceRecRepo: Repository<PriceRecommendation>,
    private tigerDataAdapter: TigerDataAdapter,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @Optional() @InjectRepository(Product) private productRepo?: Repository<Product>,
  ) {}

  async recommendPrice(input: PricingInput, user?: User): Promise<PriceRecommendationOutput> {
    // 1. Validate all numeric inputs
    if (
      input.materialCost === undefined ||
      input.laborCost === undefined ||
      isNaN(input.materialCost) ||
      isNaN(input.laborCost) ||
      (input.otherCost !== undefined && isNaN(input.otherCost)) ||
      (input.desiredMarginPercent !== undefined && isNaN(input.desiredMarginPercent))
    ) {
      throw new BadRequestException('Cost inputs and margin must be valid numbers');
    }

    // 2. Prevent negative values
    if (
      input.materialCost < 0 ||
      input.laborCost < 0 ||
      (input.otherCost !== undefined && input.otherCost < 0) ||
      (input.desiredMarginPercent !== undefined && input.desiredMarginPercent < 0)
    ) {
      throw new BadRequestException('Cost inputs and margin cannot be negative');
    }

    // 3. Ownership check if user context provided
    if (user && input.productId && this.productRepo) {
      const product = await this.productRepo.findOne({ where: { id: input.productId } });
      if (product && product.artisanId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException("Not your product - you cannot generate pricing recommendations for another artisan's product");
      }
    }

    const materialCost = Number(input.materialCost) || 0;
    const laborCost = Number(input.laborCost) || 0;
    const otherCost = Number(input.otherCost) || 0;
    const totalCost = materialCost + laborCost + otherCost;
    const marginPercent = input.desiredMarginPercent !== undefined ? Number(input.desiredMarginPercent) : 30;
    const marginFraction = marginPercent / 100;

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
    let dataAvailability: 'MARKET_DATA' | 'COST_BASED';

    factors.push(`Material cost: ₹${materialCost}`);
    factors.push(`Labor cost: ₹${laborCost}`);
    if (otherCost > 0) {
      factors.push(`Other overhead: ₹${otherCost}`);
    }
    factors.push(`Cost base: ₹${totalCost}`);
    factors.push(`Margin: ${marginPercent}%`);

    if (trend && trend.dataPoints > 0) {
      // Market observations available -> Blend market data with cost-based
      minPrice = Math.round(Math.max(costBasedMin, trend.minPrice * 0.8));
      maxPrice = Math.round(Math.min(Math.max(costBasedMax, trend.averagePrice * 1.2), trend.maxPrice * 1.1));
      const sourceLabel = trend.isDemo ? `${trend.source} [DEMO]` : trend.source;
      factors.push(`Market observations: ${trend.dataPoints} points (${sourceLabel})`);
      factors.push(`Market average: ₹${trend.averagePrice}`);
      factors.push(`Market range: ₹${trend.minPrice}–₹${trend.maxPrice}`);
      if (trend.medianPrice) {
        factors.push(`Market median: ₹${trend.medianPrice}`);
      }
      if (trend.recentTrend) {
        factors.push(`Market trend: ${trend.recentTrend}`);
      }
      if (trend.freshnessDays !== undefined) {
        factors.push(`Data freshness: ${trend.freshnessDays === 0 ? 'Today' : `${trend.freshnessDays} days ago`}`);
      }
      if (trend.dataTimestamp) {
        factors.push(`Last updated: ${trend.dataTimestamp}`);
      }
      if (trend.regionalComparison && trend.regionalComparison.length > 1) {
        factors.push(
          `Regional comparison: ${trend.regionalComparison.map((r) => `${r.region}: ₹${r.averagePrice}`).join(', ')}`,
        );
      }
      if (input.craft || input.category) {
        factors.push(`Craft/Category: ${[input.craft, input.category].filter(Boolean).join(' • ')}`);
      }
      if (input.region) {
        factors.push(`Regional market data: ${input.region}`);
      }
      if (trend.isDemo) {
        factors.push('Attribution: DEMO dataset used for development baseline. Not live market observations.');
      }
      dataAvailability = 'MARKET_DATA';
    } else {
      // Pure cost-based — handle missing market data transparently, NEVER fabricate data
      if (totalCost === 0) {
        minPrice = 0;
        maxPrice = 0;
      } else {
        minPrice = costBasedMin;
        maxPrice = costBasedMax;
      }
      if (input.craft || input.category) {
        factors.push(`Craft/Category: ${[input.craft, input.category].filter(Boolean).join(' • ')}`);
      }
      if (input.region) {
        factors.push(`Regional market data: ${input.region}`);
      }
      factors.push('Market data status: Insufficient market observations for this category/region');
      factors.push('Pricing basis: Transparent cost-based calculation');
      dataAvailability = 'COST_BASED';
    }

    const output: PriceRecommendationOutput = {
      min_price: minPrice,
      max_price: maxPrice,
      estimated_cost: totalCost,
      suggested_margin_percent: marginPercent,
      currency: 'INR',
      factors,
      data_timestamp: trend?.dataTimestamp || new Date().toISOString(),
      model_version: MODEL_VERSION,
      data_availability: dataAvailability,
      explanation: dataAvailability === 'MARKET_DATA'
        ? (trend?.isDemo
            ? `Price range estimated using your production costs (₹${totalCost}) and ${trend?.dataPoints} DEMO baseline observations (trend: ${trend?.recentTrend || 'STABLE'}).`
            : `Price range estimated using your production costs (₹${totalCost}) and ${trend?.dataPoints} regional market observations (trend: ${trend?.recentTrend || 'STABLE'}).`)
        : `No external market data available for this category/region. Range is transparently calculated from your costs (₹${totalCost}) and desired ${marginPercent}% margin.`,
    };

    // Persist recommendation for audit
    const savedRec = await this.persistRecommendation(input.productId, output);
    if (savedRec) {
      output.id = savedRec.id;
      output.recommendation_id = savedRec.id;
    }

    this.logger.info('Price recommendation generated', {
      productId: input.productId,
      minPrice,
      maxPrice,
      estimatedCost: totalCost,
      dataAvailability,
    });

    return output;
  }

  async acceptPriceRecommendation(input: AcceptPriceInput, user?: User): Promise<{
    success: boolean;
    productId: string;
    priceMin: number;
    priceMax: number;
    aiRecommendedPriceMin: number;
    aiRecommendedPriceMax: number;
    isOverride: boolean;
    artisanAccepted: boolean;
    recommendationId?: string;
  }> {
    if (input.priceMin < 0 || input.priceMax < 0) {
      throw new BadRequestException('Price values cannot be negative');
    }
    if (input.priceMin > input.priceMax) {
      throw new BadRequestException('Minimum price cannot be greater than maximum price');
    }

    if (this.productRepo) {
      const product = await this.productRepo.findOne({ where: { id: input.productId } });
      if (user && product && product.artisanId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException("Not your product - you cannot change the price of another artisan's product");
      }
    }

    let rec: PriceRecommendation | null = null;
    if (input.recommendationId) {
      rec = await this.priceRecRepo.findOne({ where: { id: input.recommendationId } });
    }
    if (!rec) {
      rec = await this.priceRecRepo.findOne({
        where: { productId: input.productId },
        order: { createdAt: 'DESC' },
      });
    }

    const aiMin = rec ? Number(rec.rangeMin) : input.priceMin;
    const aiMax = rec ? Number(rec.rangeMax) : input.priceMax;
    const isOverride = input.isOverride ?? (input.priceMin !== aiMin || input.priceMax !== aiMax);

    if (rec) {
      rec.artisanAccepted = true;
      rec.artisanSelectedPriceMin = input.priceMin;
      rec.artisanSelectedPriceMax = input.priceMax;
      await this.priceRecRepo.save(rec);
    }

    if (this.productRepo) {
      const product = await this.productRepo.findOne({ where: { id: input.productId } });
      if (product) {
        product.priceMin = input.priceMin;
        product.priceMax = input.priceMax;
        product.aiRecommendedPriceMin = aiMin;
        product.aiRecommendedPriceMax = aiMax;
        await this.productRepo.save(product);
      }
    }

    this.logger.info('Price recommendation accepted/overridden by artisan', {
      productId: input.productId,
      artisanPriceMin: input.priceMin,
      artisanPriceMax: input.priceMax,
      aiRecommendedPriceMin: aiMin,
      aiRecommendedPriceMax: aiMax,
      isOverride,
    });

    return {
      success: true,
      productId: input.productId,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      aiRecommendedPriceMin: aiMin,
      aiRecommendedPriceMax: aiMax,
      isOverride,
      artisanAccepted: true,
      recommendationId: rec?.id,
    };
  }

  async getLatestRecommendation(productId: string, user?: User): Promise<PriceRecommendation | null> {
    if (this.productRepo) {
      const product = await this.productRepo.findOne({ where: { id: productId } });
      if (product && user && product.artisanId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException("Not your product - you cannot view pricing recommendations for another artisan's product");
      }
    }
    return this.priceRecRepo.findOne({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
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
      costInput.desiredMarginPercent = input.desiredMarginPercent !== undefined ? input.desiredMarginPercent : 30;
      await this.costInputRepo.save(costInput);
    } catch (e) {
      this.logger.warn('Failed to save cost input', { error: e.message });
    }
  }

  private async persistRecommendation(productId: string, output: PriceRecommendationOutput): Promise<PriceRecommendation | null> {
    try {
      const rec = this.priceRecRepo.create({
        productId,
        rangeMin: output.min_price,
        rangeMax: output.max_price,
        currency: output.currency,
        estimatedCost: output.estimated_cost,
        suggestedMarginPercent: output.suggested_margin_percent,
        factors: output.factors,
        dataTimestamp: output.data_timestamp,
        modelVersion: output.model_version,
        dataAvailability: output.data_availability,
      });
      const saved = await this.priceRecRepo.save(rec);

      if (this.productRepo) {
        await this.productRepo.update(productId, {
          aiRecommendedPriceMin: output.min_price,
          aiRecommendedPriceMax: output.max_price,
        }).catch(() => {});
      }

      return saved;
    } catch (e) {
      this.logger.warn('Failed to persist price recommendation', { error: e.message });
      return null;
    }
  }

  async ingestMarketObservation(data: MarketObservationInput): Promise<MarketObservation> {
    const saved = await this.tigerDataAdapter.ingestObservation(data);
    this.logger.info('Market observation ingested via PricingService', {
      id: saved.id,
      craft: saved.craft,
      category: saved.category,
      price: saved.observedPrice,
    });
    return saved;
  }

  async ingestMarketObservationsBatch(data: MarketObservationInput[]): Promise<MarketObservation[]> {
    return this.tigerDataAdapter.ingestBatch(data);
  }

  async getMarketTrend(params: MarketQueryFilter): Promise<MarketTrend | null> {
    return this.tigerDataAdapter.getMarketTrend(params);
  }
}

