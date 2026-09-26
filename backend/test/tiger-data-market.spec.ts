import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TigerDataAdapter } from '../src/pricing/tiger-data.adapter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MarketObservation } from '../src/pricing/market-observation.entity';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('Tiger Data Market Intelligence & Aggregation Engine', () => {
  let adapter: TigerDataAdapter;
  let mockMarketRepo: any;
  let storedObservations: any[] = [];

  const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  const mockConfig = { get: jest.fn((key: string, def: any) => def) };

  beforeEach(async () => {
    storedObservations = [];

    mockMarketRepo = {
      create: jest.fn((dto) => ({ id: `obs-${Math.random()}`, ...dto })),
      save: jest.fn((entity) => {
        const saved = { id: entity.id || `obs-${Math.random()}`, ...entity };
        storedObservations.push(saved);
        return Promise.resolve(saved);
      }),
      createQueryBuilder: jest.fn(() => {
        let filtered = [...storedObservations];
        return {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockImplementation((cond: string, params: any) => {
            if (params?.cPattern) {
              const needle = params.cPattern.replace(/%/g, '').toLowerCase();
              filtered = filtered.filter(
                (o) =>
                  (o.craft && o.craft.toLowerCase().includes(needle)) ||
                  (o.category && o.category.toLowerCase().includes(needle)) ||
                  (o.product && o.product.toLowerCase().includes(needle)),
              );
            }
            if (params?.catPattern) {
              const needle = params.catPattern.replace(/%/g, '').toLowerCase();
              filtered = filtered.filter(
                (o) =>
                  (o.category && o.category.toLowerCase().includes(needle)) ||
                  (o.craft && o.craft.toLowerCase().includes(needle)),
              );
            }
            if (params?.matPattern) {
              const needle = params.matPattern.replace(/%/g, '').toLowerCase();
              filtered = filtered.filter((o) => o.material && o.material.toLowerCase().includes(needle));
            }
            return this;
          }),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockImplementation(() => Promise.resolve(filtered)),
        };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TigerDataAdapter,
        { provide: ConfigService, useValue: mockConfig },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: getRepositoryToken(MarketObservation), useValue: mockMarketRepo },
      ],
    }).compile();

    adapter = module.get<TigerDataAdapter>(TigerDataAdapter);
  });

  describe('Ingestion & Schema Validation', () => {
    it('ingests a single market observation with clean schema', async () => {
      const obs = await adapter.ingestObservation({
        product: 'Terracotta Bell',
        category: 'Pottery',
        craft: 'Terracotta',
        material: 'Clay',
        region: 'West Bengal',
        price: 450,
        currency: 'INR',
        source: 'craft_fair_registry',
        observedAt: new Date('2026-08-10'),
      });

      expect(obs).toHaveProperty('id');
      expect(obs.craft).toBe('Terracotta');
      expect(obs.observedPrice).toBe(450);
      expect(obs.isDemo).toBe(false);
      expect(storedObservations.length).toBe(1);
    });

    it('rejects negative observation price', async () => {
      await expect(
        adapter.ingestObservation({
          category: 'Pottery',
          price: -50,
          source: 'test',
        }),
      ).rejects.toThrow();
    });

    it('identifies and tags demo data without labeling it as live market data', async () => {
      const demoObs = await adapter.ingestObservation({
        category: 'Textile',
        craft: 'Kalamkari',
        price: 1200,
        source: 'DEMO:survey_seed',
      });

      expect(demoObs.isDemo).toBe(true);
    });
  });

  describe('Time-Series Aggregation Engine', () => {
    beforeEach(async () => {
      // Ingest multi-date observations for 'Terracotta' with an increasing price trend:
      // July: 500, August: 650, September 1: 750, September 20: 900
      await adapter.ingestObservation({
        product: 'Terracotta Pot',
        category: 'Pottery',
        craft: 'Terracotta',
        region: 'West Bengal',
        price: 500,
        source: 'live_artisan_mandi',
        observedAt: new Date('2026-07-01'),
        isDemo: false,
      });

      await adapter.ingestObservation({
        product: 'Terracotta Planter',
        category: 'Pottery',
        craft: 'Terracotta',
        region: 'West Bengal',
        price: 650,
        source: 'live_artisan_mandi',
        observedAt: new Date('2026-08-01'),
        isDemo: false,
      });

      await adapter.ingestObservation({
        product: 'Terracotta Vase',
        category: 'Pottery',
        craft: 'Terracotta',
        region: 'Rajasthan',
        price: 750,
        source: 'jaipur_craft_expo',
        observedAt: new Date('2026-09-01'),
        isDemo: false,
      });

      await adapter.ingestObservation({
        product: 'Terracotta Figurine',
        category: 'Pottery',
        craft: 'Terracotta',
        region: 'Rajasthan',
        price: 900,
        source: 'jaipur_craft_expo',
        observedAt: new Date('2026-09-20'),
        isDemo: false,
      });
    });

    it('calculates average, median, min, max correctly from stored time-series data', async () => {
      const trend = await adapter.getMarketTrend({ craft: 'Terracotta' });

      expect(trend).not.toBeNull();
      expect(trend!.dataPoints).toBe(4);
      expect(trend!.minPrice).toBe(500);
      expect(trend!.maxPrice).toBe(900);
      // Average: (500 + 650 + 750 + 900) / 4 = 2800 / 4 = 700
      expect(trend!.averagePrice).toBe(700);
      // Median of [500, 650, 750, 900]: (650 + 750) / 2 = 700
      expect(trend!.medianPrice).toBe(700);
      expect(trend!.isDemo).toBe(false);
    });

    it('detects recent price trend over time', async () => {
      const trend = await adapter.getMarketTrend({ craft: 'Terracotta' });

      expect(trend).not.toBeNull();
      // First half avg: (500 + 650) / 2 = 575
      // Second half avg: (750 + 900) / 2 = 825 -> Upward trend
      expect(trend!.recentTrend).toBe('UP');
    });

    it('generates regional comparisons with price breakdowns', async () => {
      const trend = await adapter.getMarketTrend({ craft: 'Terracotta' });

      expect(trend!.regionalComparison).toHaveLength(2);
      const wb = trend!.regionalComparison.find((r) => r.region === 'West Bengal');
      const rj = trend!.regionalComparison.find((r) => r.region === 'Rajasthan');

      expect(wb).toBeDefined();
      expect(wb!.averagePrice).toBe(575); // (500 + 650) / 2
      expect(wb!.dataPoints).toBe(2);

      expect(rj).toBeDefined();
      expect(rj!.averagePrice).toBe(825); // (750 + 900) / 2
      expect(rj!.dataPoints).toBe(2);
    });

    it('provides data freshness and attribution', async () => {
      const trend = await adapter.getMarketTrend({ craft: 'Terracotta' });

      expect(trend!.dataTimestamp).toContain('2026-09-20');
      expect(trend!.source).toContain('live_artisan_mandi');
      expect(trend!.source).toContain('jaipur_craft_expo');
      expect(trend!.isDemo).toBe(false);
    });

    it('returns null when category has no observations (does NOT fabricate fake data)', async () => {
      const trend = await adapter.getMarketTrend({ craft: 'NonExistentSpaceShipCraft' });
      expect(trend).toBeNull();
    });
  });
});

describe('Full Acceptance Test — End-to-End Market Intelligence Flow', () => {
  let app: INestApplication;
  let authToken: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 1. Auth token
    const tokenRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'tiger-artisan-tester', role: 'artisan' })
      .expect(201);
    authToken = tokenRes.body.token;

    // 2. Create product
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Dhokra Brass Elephant Figurine',
        category: 'Metalwork',
        craft: 'Dhokra Metal Casting',
        region: 'Chhattisgarh',
      })
      .expect(201);
    productId = prodRes.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('ACCEPTANCE TEST: Insert observations across multiple dates -> query pricing service -> consumes stored observations rather than hardcoded ranges', async () => {
    // 1. Insert market observations across multiple dates for the craft
    const obsBatch = [
      {
        product: 'Dhokra Elephant Small',
        category: 'Metalwork',
        craft: 'Dhokra Metal Casting',
        region: 'Chhattisgarh',
        price: 1000,
        source: 'bastar_tribal_cooperative',
        observedAt: new Date('2026-07-15'),
      },
      {
        product: 'Dhokra Elephant Medium',
        category: 'Metalwork',
        craft: 'Dhokra Metal Casting',
        region: 'Chhattisgarh',
        price: 1200,
        source: 'bastar_tribal_cooperative',
        observedAt: new Date('2026-08-15'),
      },
      {
        product: 'Dhokra Elephant Large',
        category: 'Metalwork',
        craft: 'Dhokra Metal Casting',
        region: 'Madhya Pradesh',
        price: 1400,
        source: 'national_handicrafts_board',
        observedAt: new Date('2026-09-10'),
      },
    ];

    await request(app.getHttpServer())
      .post('/api/v1/ai/market-observations/batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send(obsBatch)
      .expect(201);

    // 2. Query market trend endpoint directly to verify aggregations
    const trendRes = await request(app.getHttpServer())
      .get('/api/v1/ai/market-trend?craft=Dhokra')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const trend = trendRes.body;
    expect(trend).toBeDefined();
    expect(trend.dataPoints).toBeGreaterThanOrEqual(3);
    expect(trend.averagePrice).toBe(1200); // (1000 + 1200 + 1400) / 3
    expect(trend.minPrice).toBe(1000);
    expect(trend.maxPrice).toBe(1400);
    expect(trend.medianPrice).toBe(1200);
    expect(trend.recentTrend).toBe('UP');
    expect(trend.isDemo).toBe(false);

    // 3. Query the PricingService endpoint: POST /api/v1/ai/price-recommendation
    const pricingRes = await request(app.getHttpServer())
      .post('/api/v1/ai/price-recommendation')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId,
        materialCost: 400,
        laborCost: 400,
        otherCost: 50,
        desiredMarginPercent: 30,
        category: 'Metalwork',
        craft: 'Dhokra Metal Casting',
        region: 'Chhattisgarh',
      })
      .expect(201);

    const rec = pricingRes.body;

    // Verify it used the real stored market observations:
    // Show: Market data available
    expect(rec.data_availability).toBe('MARKET_DATA');

    // Show: Last updated
    expect(rec.data_timestamp).toBeDefined();
    expect(rec.factors.some((f: string) => f.includes('Last updated'))).toBe(true);

    // Show: Price range/trend
    expect(rec.factors.some((f: string) => f.includes('Market observations'))).toBe(true);
    expect(rec.factors.some((f: string) => f.includes('Market average: ₹1200'))).toBe(true);
    expect(rec.factors.some((f: string) => f.includes('Market range: ₹1000–₹1400'))).toBe(true);
    expect(rec.factors.some((f: string) => f.includes('Market trend: UP'))).toBe(true);

    // Blended price: totalCost = 850, costBaseMin = 978, blended with 1000 * 0.8 = 800 -> min >= 978
    expect(rec.min_price).toBeGreaterThan(900);
    expect(rec.max_price).toBeGreaterThan(rec.min_price);
  });
});
