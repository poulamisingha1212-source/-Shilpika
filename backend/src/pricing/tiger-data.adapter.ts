import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface MarketTrend {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  dataPoints: number;
  currency: string;
  dataTimestamp: string;
  source: string;
}

/**
 * Tiger Data Adapter
 *
 * Abstracts the market-data source behind a clean interface.
 * Provider is selected by the MARKET_DATA_PROVIDER env var:
 * - "mock"   — seeded local data (default, always works)
 * - "tiger"  — Tiger Data REST API (requires MARKET_DATA_PROVIDER_URL + API_KEY)
 *
 * The PricingService consumes this adapter and never calls the provider directly,
 * so substituting providers is a one-line env change.
 */
@Injectable()
export class TigerDataAdapter {
  private readonly provider: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {
    this.provider = configService.get<string>('MARKET_DATA_PROVIDER', 'mock');
    this.baseUrl = configService.get<string>('MARKET_DATA_PROVIDER_URL', '');
    this.apiKey = configService.get<string>('MARKET_DATA_PROVIDER_API_KEY', '');

    this.logger.info(`Market data provider: ${this.provider}`, { context: 'TigerDataAdapter' });
  }

  async getMarketTrend(params: {
    category: string;
    craft?: string;
    material?: string;
    region?: string;
  }): Promise<MarketTrend | null> {
    if (this.provider === 'tiger' && this.baseUrl && this.apiKey) {
      return this.fetchFromTigerData(params);
    }
    return this.getMockTrend(params);
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
      return {
        averagePrice: data.average_price,
        minPrice: data.min_price,
        maxPrice: data.max_price,
        dataPoints: data.data_points,
        currency: data.currency || 'INR',
        dataTimestamp: data.timestamp || new Date().toISOString(),
        source: 'tigerdata',
      };
    } catch (err) {
      this.logger.error('Tiger Data API failed, falling back to mock', { error: err.message });
      return this.getMockTrend(params);
    }
  }

  private getMockTrend(params: any): MarketTrend {
    // Seeded realistic INR price ranges by craft category
    const mockData: Record<string, { min: number; max: number }> = {
      'Pottery': { min: 150, max: 2500 },
      'Weaving': { min: 500, max: 8000 },
      'Embroidery': { min: 300, max: 5000 },
      'Woodwork': { min: 800, max: 15000 },
      'Metalwork': { min: 400, max: 10000 },
      'Jewellery': { min: 200, max: 20000 },
      'Painting': { min: 300, max: 25000 },
      'Textile': { min: 400, max: 6000 },
      'Leather': { min: 600, max: 12000 },
      'Handicraft': { min: 200, max: 5000 },
    };

    const key = Object.keys(mockData).find(k =>
      params.category?.toLowerCase().includes(k.toLowerCase()) ||
      params.craft?.toLowerCase().includes(k.toLowerCase())
    ) || 'Handicraft';

    const range = mockData[key];
    const avg = Math.round((range.min + range.max) / 2);

    this.logger.debug('[MOCK] Tiger Data market trend', { category: key, ...range });

    return {
      averagePrice: avg,
      minPrice: range.min,
      maxPrice: range.max,
      dataPoints: 0,
      currency: 'INR',
      dataTimestamp: new Date().toISOString(),
      source: 'mock — set MARKET_DATA_PROVIDER=tiger for real data',
    };
  }
}
