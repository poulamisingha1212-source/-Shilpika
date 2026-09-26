import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from 'src/pricing/pricing.service';
import { TigerDataAdapter } from 'src/pricing/tiger-data.adapter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CostInput } from 'src/pricing/cost-input.entity';
import { PriceRecommendation } from 'src/pricing/price-recommendation.entity';
import { Product } from 'src/products/product.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { BadRequestException } from '@nestjs/common';

const mockRepo = () => ({
  create: jest.fn((dto) => ({ id: 'rec-uuid-1', ...dto })),
  save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'rec-uuid-1', ...entity })),
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
});
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('PricingService', () => {
  let service: PricingService;
  let tigerDataAdapter: TigerDataAdapter;
  let priceRecRepo: any;
  let productRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: TigerDataAdapter, useValue: { getMarketTrend: jest.fn() } },
        { provide: getRepositoryToken(CostInput), useFactory: mockRepo },
        { provide: getRepositoryToken(PriceRecommendation), useFactory: mockRepo },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    tigerDataAdapter = module.get<TigerDataAdapter>(TigerDataAdapter);
    priceRecRepo = module.get(getRepositoryToken(PriceRecommendation));
    productRepo = module.get(getRepositoryToken(Product));
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
      expect(result.data_availability).toBe('COST_BASED');
      expect(result.factors).toContain('Cost base: ₹350');
      expect(result.estimated_cost).toBe(350);
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

      expect(result.data_availability).toBe('MARKET_DATA');
      expect(result.factors.some((f) => f.includes('Market observations'))).toBeTruthy();
      expect(result.data_timestamp).toBe('2026-09-25T00:00:00Z');
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

    // Requirement 15: zero costs
    it('zero costs: should handle zero costs gracefully without crashing', async () => {
      (tigerDataAdapter.getMarketTrend as jest.Mock).mockResolvedValue(null);
      const result = await service.recommendPrice({
        productId: 'prod-zero',
        materialCost: 0,
        laborCost: 0,
        otherCost: 0,
        desiredMarginPercent: 30,
      });

      expect(result.estimated_cost).toBe(0);
      expect(result.min_price).toBe(0);
      expect(result.max_price).toBe(0);
      expect(result.data_availability).toBe('COST_BASED');
    });

    // Requirement 15: normal costs & acceptance test parameters
    it('normal costs: should calculate recommendation for material=500, labor=600, other=100, margin=30%', async () => {
      (tigerDataAdapter.getMarketTrend as jest.Mock).mockResolvedValue(null);
      const result = await service.recommendPrice({
        productId: 'prod-normal',
        materialCost: 500,
        laborCost: 600,
        otherCost: 100,
        desiredMarginPercent: 30,
      });

      expect(result.estimated_cost).toBe(1200);
      expect(result.suggested_margin_percent).toBe(30);
      expect(result.min_price).toBe(1380); // 1200 * (1 + 0.15)
      expect(result.max_price).toBe(1740); // 1200 * (1 + 0.45)
      expect(result.data_availability).toBe('COST_BASED');
      expect(result.factors).toContain('Material cost: ₹500');
      expect(result.factors).toContain('Labor cost: ₹600');
      expect(result.factors).toContain('Cost base: ₹1200');
    });

    // Requirement 15: high margin
    it('high margin: should calculate correctly with high margins (200%)', async () => {
      (tigerDataAdapter.getMarketTrend as jest.Mock).mockResolvedValue(null);
      const result = await service.recommendPrice({
        productId: 'prod-high-margin',
        materialCost: 400,
        laborCost: 600,
        otherCost: 0,
        desiredMarginPercent: 200,
      });

      expect(result.estimated_cost).toBe(1000);
      // costBasedMin = 1000 * (1 + 2.0 * 0.5) = 2000
      // costBasedMax = 1000 * (1 + 2.0 * 1.5) = 4000
      expect(result.min_price).toBe(2000);
      expect(result.max_price).toBe(4000);
      expect(result.suggested_margin_percent).toBe(200);
    });

    // Requirement 15: missing market data
    it('missing market data: should transparently return COST_BASED and never fabricate market data', async () => {
      (tigerDataAdapter.getMarketTrend as jest.Mock).mockResolvedValue({
        dataPoints: 0, // Mock returns 0 data points
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        source: 'mock',
        dataTimestamp: '2026-09-25T12:00:00Z',
        currency: 'INR',
      });

      const result = await service.recommendPrice({
        productId: 'prod-no-market',
        materialCost: 300,
        laborCost: 400,
        otherCost: 50,
        desiredMarginPercent: 25,
      });

      expect(result.data_availability).toBe('COST_BASED');
      expect(result.factors.some((f) => f.includes('Insufficient market observations'))).toBe(true);
      expect(result.factors.some((f) => f.includes('Market observations: 0'))).toBe(false);
    });

    // Requirement 15: invalid input
    it('invalid input: should reject negative material cost', async () => {
      await expect(
        service.recommendPrice({
          productId: 'prod-neg',
          materialCost: -50,
          laborCost: 200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('invalid input: should reject negative labor cost', async () => {
      await expect(
        service.recommendPrice({
          productId: 'prod-neg-labor',
          materialCost: 100,
          laborCost: -20,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('invalid input: should reject negative margin', async () => {
      await expect(
        service.recommendPrice({
          productId: 'prod-neg-margin',
          materialCost: 100,
          laborCost: 100,
          desiredMarginPercent: -10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('invalid input: should reject NaN values', async () => {
      await expect(
        service.recommendPrice({
          productId: 'prod-nan',
          materialCost: NaN,
          laborCost: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptPriceRecommendation & artisan override', () => {
    it('accept recommendation: should persist accepted recommendation with separate fields', async () => {
      const mockRec = {
        id: 'rec-123',
        productId: 'prod-1',
        rangeMin: 1380,
        rangeMax: 1740,
        artisanAccepted: false,
      };
      priceRecRepo.findOne.mockResolvedValue(mockRec);

      const mockProduct = {
        id: 'prod-1',
        priceMin: null,
        priceMax: null,
        aiRecommendedPriceMin: null,
        aiRecommendedPriceMax: null,
      };
      productRepo.findOne.mockResolvedValue(mockProduct);

      const res = await service.acceptPriceRecommendation({
        productId: 'prod-1',
        recommendationId: 'rec-123',
        priceMin: 1380,
        priceMax: 1740,
        isOverride: false,
      });

      expect(res.success).toBe(true);
      expect(res.priceMin).toBe(1380);
      expect(res.priceMax).toBe(1740);
      expect(res.aiRecommendedPriceMin).toBe(1380);
      expect(res.aiRecommendedPriceMax).toBe(1740);
      expect(res.isOverride).toBe(false);

      expect(mockRec.artisanAccepted).toBe(true);
      expect(mockProduct.priceMin).toBe(1380);
      expect(mockProduct.priceMax).toBe(1740);
      expect(mockProduct.aiRecommendedPriceMin).toBe(1380);
      expect(mockProduct.aiRecommendedPriceMax).toBe(1740);
    });

    it('artisan override: should record custom price while preserving AI recommendation', async () => {
      const mockRec = {
        id: 'rec-456',
        productId: 'prod-2',
        rangeMin: 1000,
        rangeMax: 1500,
        artisanAccepted: false,
      };
      priceRecRepo.findOne.mockResolvedValue(mockRec);

      const mockProduct = {
        id: 'prod-2',
        priceMin: null,
        priceMax: null,
        aiRecommendedPriceMin: null,
        aiRecommendedPriceMax: null,
      };
      productRepo.findOne.mockResolvedValue(mockProduct);

      const res = await service.acceptPriceRecommendation({
        productId: 'prod-2',
        recommendationId: 'rec-456',
        priceMin: 1800,
        priceMax: 2200,
        isOverride: true,
      });

      expect(res.success).toBe(true);
      expect(res.priceMin).toBe(1800);
      expect(res.priceMax).toBe(2200);
      expect(res.aiRecommendedPriceMin).toBe(1000);
      expect(res.aiRecommendedPriceMax).toBe(1500);
      expect(res.isOverride).toBe(true);

      // Verify product state
      expect(mockProduct.priceMin).toBe(1800);
      expect(mockProduct.priceMax).toBe(2200);
      expect(mockProduct.aiRecommendedPriceMin).toBe(1000);
      expect(mockProduct.aiRecommendedPriceMax).toBe(1500);
    });

    it('invalid input: should reject if minPrice > maxPrice', async () => {
      await expect(
        service.acceptPriceRecommendation({
          productId: 'prod-1',
          priceMin: 2000,
          priceMax: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

