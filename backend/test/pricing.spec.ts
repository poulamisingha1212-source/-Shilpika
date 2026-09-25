import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from 'src/pricing/pricing.service';
import { TigerDataAdapter } from 'src/pricing/tiger-data.adapter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CostInput } from 'src/pricing/cost-input.entity';
import { PriceRecommendation } from 'src/pricing/price-recommendation.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

const mockRepo = () => ({ create: jest.fn(), save: jest.fn(), findOne: jest.fn() });
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('PricingService', () => {
  let service: PricingService;
  let tigerDataAdapter: TigerDataAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: TigerDataAdapter, useValue: { getMarketTrend: jest.fn() } },
        { provide: getRepositoryToken(CostInput), useFactory: mockRepo },
        { provide: getRepositoryToken(PriceRecommendation), useFactory: mockRepo },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    tigerDataAdapter = module.get<TigerDataAdapter>(TigerDataAdapter);
  });

  describe('recommendPrice', () => {
    it('should return cost-based recommendation when no market data', async () => {
      (tigerDataAdapter.getMarketTrend as jest.Mock).mockResolvedValue({
        dataPoints: 0,
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        source: 'mock',
        dataTimestamp: new Date().toISOString(),
        currency: 'INR',
      });

      const result = await service.recommendPrice({
        productId: 'test-id',
        materialCost: 100,
        laborCost: 200,
        otherCost: 50,
        desiredMarginPercent: 30,
        category: 'Pottery',
      });

      expect(result.currency).toBe('INR');
      expect(result.min_price).toBeGreaterThan(0);
      expect(result.max_price).toBeGreaterThanOrEqual(result.min_price);
      expect(result.data_availability).toBe('cost_based');
      expect(result.factors).toContain('Cost base: ₹350');
      expect(result.model_version).toBe('pricing-v1');
    });

    it('should use market data when dataPoints > 0', async () => {
      (tigerDataAdapter.getMarketTrend as jest.Mock).mockResolvedValue({
        dataPoints: 50,
        averagePrice: 800,
        minPrice: 400,
        maxPrice: 1200,
        source: 'tigerdata',
        dataTimestamp: '2026-09-25T00:00:00Z',
        currency: 'INR',
      });

      const result = await service.recommendPrice({
        productId: 'test-id-2',
        materialCost: 200,
        laborCost: 150,
        desiredMarginPercent: 30,
        category: 'Pottery',
      });

      expect(result.data_availability).toBe('market_data');
      expect(result.factors.some((f) => f.includes('Market avg'))).toBeTruthy();
    });

    it('should return advisory range, not single price', async () => {
      (tigerDataAdapter.getMarketTrend as jest.Mock).mockResolvedValue(null);
      const result = await service.recommendPrice({
        productId: 'test-id-3',
        materialCost: 500,
        laborCost: 300,
      });
      expect(result).toHaveProperty('min_price');
      expect(result).toHaveProperty('max_price');
      expect(result.max_price).toBeGreaterThan(result.min_price);
    });
  });
});
