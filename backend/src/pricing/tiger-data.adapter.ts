import { Injectable, Inject, Optional, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MarketObservation } from './market-observation.entity';

export interface RegionalComparison {
  region: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  dataPoints: number;
}

export interface MarketTrend {
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  dataPoints: number;
  currency: string;
  dataTimestamp: string;
  freshnessDays?: number;
  recentTrend: 'UP' | 'DOWN' | 'STABLE';
  regionalComparison: RegionalComparison[];
  source: string;
  isDemo: boolean;
}

export interface MarketQueryFilter {
  category?: string;
  craft?: string;
  material?: string;
  region?: string;
  product?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  allowDemo?: boolean;
}

export interface MarketObservationInput {
  product?: string;
  category: string;
  craft?: string;
  material?: string;
  region?: string;
  price: number;
  currency?: string;
  source: string;
  observedAt?: Date | string;
  isDemo?: boolean;
}

export interface IMarketDataProvider {
  getMarketTrend(params: MarketQueryFilter): Promise<MarketTrend | null>;
  ingestObservation(data: MarketObservationInput): Promise<MarketObservation>;
  ingestBatch(data: MarketObservationInput[]): Promise<MarketObservation[]>;
}

@Injectable()
export class TigerDataAdapter implements IMarketDataProvider {
  private readonly provider: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @Optional() @InjectRepository(MarketObservation) private marketObservationRepo?: Repository<MarketObservation>,
  ) {
    this.provider = configService.get<string>('MARKET_DATA_PROVIDER', 'tiger');
    this.baseUrl = configService.get<string>('MARKET_DATA_PROVIDER_URL', '');
    this.apiKey = configService.get<string>('MARKET_DATA_PROVIDER_API_KEY', '');

    this.logger.info(`Market data provider mode: ${this.provider}`, { context: 'TigerDataAdapter' });
  }

  /**
   * Ingest a single market observation into time-series storage
   */
  async ingestObservation(input: MarketObservationInput): Promise<MarketObservation> {
    if (input.price === undefined || isNaN(input.price) || input.price < 0) {
      throw new BadRequestException('Observation price must be a non-negative number');
    }
    if (!input.category || !input.source) {
      throw new BadRequestException('Category and source are required for market observation');
    }

    if (!this.marketObservationRepo) {
      throw new Error('Market observation repository not initialized');
    }

    const isDemo = input.isDemo ?? (input.source.toLowerCase().startsWith('demo') || input.source.toLowerCase().includes('mock'));
    const obsDate = input.observedAt ? new Date(input.observedAt) : new Date();

    const observation = this.marketObservationRepo.create({
      product: input.product?.trim(),
      category: input.category.trim(),
      craft: input.craft?.trim(),
      material: input.material?.trim(),
      region: input.region?.trim(),
      observedPrice: Number(input.price),
      currency: input.currency || 'INR',
      source: input.source.trim(),
      isDemo,
      observedAt: isNaN(obsDate.getTime()) ? new Date() : obsDate,
    });

    const saved = await this.marketObservationRepo.save(observation);
    this.logger.info('Market observation ingested', {
      id: saved.id,
      craft: saved.craft,
      category: saved.category,
      price: saved.observedPrice,
      isDemo: saved.isDemo,
      source: saved.source,
    });
    return saved;
  }

  /**
   * Batch ingest observations into time-series storage
   */
  async ingestBatch(inputs: MarketObservationInput[]): Promise<MarketObservation[]> {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return [];
    }
    const results: MarketObservation[] = [];
    for (const item of inputs) {
      results.push(await this.ingestObservation(item));
    }
    return results;
  }

  /**
   * Query aggregated market intelligence (average, median, min/max, trend, regional comparison)
   */
  async getMarketTrend(params: MarketQueryFilter): Promise<MarketTrend | null> {
    // 1. If external Tiger Data API is configured and enabled, try fetching remote observations
    if (this.provider === 'tiger' && this.baseUrl && this.apiKey) {
      const remoteTrend = await this.fetchFromTigerData(params);
      if (remoteTrend && remoteTrend.dataPoints > 0) {
        return remoteTrend;
      }
    }

    // 2. Query stored observations from PostgreSQL/time-series table
    if (this.marketObservationRepo) {
      const storedTrend = await this.queryAggregatedFromDatabase(params);
      if (storedTrend && storedTrend.dataPoints > 0) {
        return storedTrend;
      }
    }

    // 3. Insufficient market data — return null without fabricating fake prices
    return null;
  }

  /**
   * Aggregate observations directly from the time-series database
   */
  private async queryAggregatedFromDatabase(params: MarketQueryFilter): Promise<MarketTrend | null> {
    if (!this.marketObservationRepo) return null;

    try {
      const qb = this.marketObservationRepo.createQueryBuilder('obs');

      // Craft or category pattern matching
      if (params.craft && params.craft.trim()) {
        const pattern = `%${params.craft.toLowerCase().trim()}%`;
        qb.andWhere('(LOWER(obs.craft) LIKE :cPattern OR LOWER(obs.category) LIKE :cPattern OR LOWER(obs.product) LIKE :cPattern)', {
          cPattern: pattern,
        });
      } else if (params.category && params.category.trim()) {
        const pattern = `%${params.category.toLowerCase().trim()}%`;
        qb.andWhere('(LOWER(obs.category) LIKE :catPattern OR LOWER(obs.craft) LIKE :catPattern OR LOWER(obs.product) LIKE :catPattern)', {
          catPattern: pattern,
        });
      }

      if (params.material && params.material.trim()) {
        qb.andWhere('LOWER(obs.material) LIKE :matPattern', {
          matPattern: `%${params.material.toLowerCase().trim()}%`,
        });
      }

      if (params.startDate) {
        qb.andWhere('obs.observedAt >= :startDate', { startDate: new Date(params.startDate) });
      }
      if (params.endDate) {
        qb.andWhere('obs.observedAt <= :endDate', { endDate: new Date(params.endDate) });
      }

      qb.orderBy('obs.observedAt', 'ASC');
      const matches = await qb.getMany();

      if (!matches || matches.length === 0) {
        return null;
      }

      // Check for live observations vs demo observations
      const liveMatches = matches.filter((o) => !o.isDemo && !(o.source && o.source.toLowerCase().startsWith('demo')));
      const isDemo = liveMatches.length === 0;
      const activeObs = isDemo ? matches : liveMatches;

      // 1. Min / Max / Average / Median
      const prices = activeObs.map((o) => Number(o.observedPrice)).sort((a, b) => a - b);
      const minPrice = prices[0];
      const maxPrice = prices[prices.length - 1];
      const sum = prices.reduce((acc, p) => acc + p, 0);
      const averagePrice = Math.round(sum / prices.length);
      const medianPrice =
        prices.length % 2 === 1
          ? prices[Math.floor(prices.length / 2)]
          : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2);

      // 2. Recent Trend calculation over time
      let recentTrend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
      if (activeObs.length >= 2) {
        const mid = Math.floor(activeObs.length / 2);
        const firstHalf = activeObs.slice(0, mid);
        const secondHalf = activeObs.slice(mid);
        const firstHalfAvg = firstHalf.reduce((acc, o) => acc + Number(o.observedPrice), 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((acc, o) => acc + Number(o.observedPrice), 0) / secondHalf.length;

        if (secondHalfAvg > firstHalfAvg * 1.05) {
          recentTrend = 'UP';
        } else if (secondHalfAvg < firstHalfAvg * 0.95) {
          recentTrend = 'DOWN';
        }
      }

      // 3. Regional comparison
      const regionMap = new Map<string, number[]>();
      for (const obs of activeObs) {
        const reg = obs.region?.trim() || 'General';
        if (!regionMap.has(reg)) regionMap.set(reg, []);
        regionMap.get(reg)!.push(Number(obs.observedPrice));
      }

      const regionalComparison: RegionalComparison[] = Array.from(regionMap.entries()).map(([region, rPrices]) => {
        const sorted = [...rPrices].sort((a, b) => a - b);
        const rSum = sorted.reduce((a, b) => a + b, 0);
        return {
          region,
          averagePrice: Math.round(rSum / sorted.length),
          minPrice: sorted[0],
          maxPrice: sorted[sorted.length - 1],
          dataPoints: sorted.length,
        };
      });

      // 4. Data freshness and timestamp
      const timestamps = activeObs
        .map((o) => (o.observedAt ? new Date(o.observedAt).getTime() : 0))
        .filter((t) => t > 0);
      const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
      const dataTimestamp = new Date(latestTimestamp).toISOString();
      const freshnessDays = Math.max(0, Math.floor((Date.now() - latestTimestamp) / (1000 * 60 * 60 * 24)));

      // 5. Source attribution
      const uniqueSources = Array.from(new Set(activeObs.map((o) => o.source).filter(Boolean)));
      const sourceString = uniqueSources.length > 0
        ? uniqueSources.join(', ')
        : (isDemo ? 'DEMO DATASET' : 'tigerdata');

      return {
        averagePrice,
        medianPrice,
        minPrice,
        maxPrice,
        dataPoints: activeObs.length,
        currency: activeObs[0]?.currency || 'INR',
        dataTimestamp,
        freshnessDays,
        recentTrend,
        regionalComparison,
        source: sourceString,
        isDemo,
      };
    } catch (err) {
      this.logger.error('Failed to query aggregated market observations', { error: err.message });
      return null;
    }
  }

  private async fetchFromTigerData(params: any): Promise<MarketTrend | null> {
    try {
      const axios = require('axios');
      const response = await axios.get(`${this.baseUrl}/v1/market/trends`, {
        params,
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 10000,
      });

      const data = response.data;
      if (!data || !data.data_points) return null;

      // Ingest remote points if available
      if (this.marketObservationRepo && Array.isArray(data.observations)) {
        for (const obs of data.observations) {
          await this.ingestObservation({
            ...obs,
            source: 'tigerdata',
            isDemo: false,
          }).catch(() => {});
        }
      }

      return {
        averagePrice: Number(data.average_price),
        medianPrice: Number(data.median_price || data.average_price),
        minPrice: Number(data.min_price),
        maxPrice: Number(data.max_price),
        dataPoints: Number(data.data_points),
        currency: data.currency || 'INR',
        dataTimestamp: data.timestamp || new Date().toISOString(),
        recentTrend: data.recent_trend || 'STABLE',
        regionalComparison: data.regional_comparison || [],
        source: 'tigerdata',
        isDemo: false,
      };
    } catch (err) {
      this.logger.warn('Tiger Data external API query failed or unavailable', { error: err.message });
      return null;
    }
  }
}

