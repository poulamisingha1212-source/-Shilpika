import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Dynamic Pricing End-to-End Acceptance Test', () => {
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

    // 1. Authenticate artisan
    const tokenRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-pricing-tester', role: 'artisan' })
      .expect(201);
    authToken = tokenRes.body.token;

    // 2. Create product
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Handcrafted Terracotta Vase',
        category: 'Pottery',
        craft: 'Terracotta',
        region: 'Gujarat',
      })
      .expect(201);
    productId = prodRes.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('runs acceptance test: Enter costs -> receive recommendation -> accept -> reload product -> persisted', async () => {
    // ACCEPTANCE TEST PARAMETERS:
    // Material = ₹500
    // Labor = ₹600
    // Other = ₹100
    // Margin = 30%
    const pricingRes = await request(app.getHttpServer())
      .post('/api/v1/ai/price-recommendation')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId,
        materialCost: 500,
        laborCost: 600,
        otherCost: 100,
        desiredMarginPercent: 30,
        category: 'Pottery',
        craft: 'Terracotta',
        region: 'Gujarat',
      })
      .expect(201);

    const rec = pricingRes.body;
    expect(rec).toHaveProperty('min_price');
    expect(rec).toHaveProperty('max_price');
    expect(rec.estimated_cost).toBe(1200);
    expect(rec.suggested_margin_percent).toBe(30);
    expect(rec.min_price).toBe(1380);
    expect(rec.max_price).toBe(1740);
    expect(rec.data_availability).toBe('COST_BASED');
    expect(rec.data_timestamp).toBeDefined();
    expect(rec.factors).toContain('Material cost: ₹500');
    expect(rec.factors).toContain('Labor cost: ₹600');
    expect(rec.factors).toContain('Cost base: ₹1200');

    // Accept recommendation
    const acceptRes = await request(app.getHttpServer())
      .post('/api/v1/ai/price-recommendation/accept')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId,
        recommendationId: rec.id,
        priceMin: rec.min_price,
        priceMax: rec.max_price,
        isOverride: false,
      })
      .expect(201);

    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.priceMin).toBe(1380);
    expect(acceptRes.body.priceMax).toBe(1740);
    expect(acceptRes.body.isOverride).toBe(false);

    // Reload the product: The selected price must remain persisted
    const reloadRes = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const product = reloadRes.body;
    expect(Number(product.priceMin)).toBe(1380);
    expect(Number(product.priceMax)).toBe(1740);
    expect(Number(product.aiRecommendedPriceMin)).toBe(1380);
    expect(Number(product.aiRecommendedPriceMax)).toBe(1740);
  });

  it('allows artisan override and stores recommendation and selected price separately', async () => {
    // Artisan chooses to override price to min: 1600, max: 2000
    const overrideRes = await request(app.getHttpServer())
      .post('/api/v1/ai/price-recommendation/accept')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId,
        priceMin: 1600,
        priceMax: 2000,
        isOverride: true,
      })
      .expect(201);

    expect(overrideRes.body.success).toBe(true);
    expect(overrideRes.body.priceMin).toBe(1600);
    expect(overrideRes.body.priceMax).toBe(2000);
    expect(overrideRes.body.aiRecommendedPriceMin).toBe(1380);
    expect(overrideRes.body.aiRecommendedPriceMax).toBe(1740);
    expect(overrideRes.body.isOverride).toBe(true);

    // Reload product to verify separate persistence
    const reloaded = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Number(reloaded.body.priceMin)).toBe(1600);
    expect(Number(reloaded.body.priceMax)).toBe(2000);
    expect(Number(reloaded.body.aiRecommendedPriceMin)).toBe(1380);
    expect(Number(reloaded.body.aiRecommendedPriceMax)).toBe(1740);
  });

  it('rejects negative inputs with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/ai/price-recommendation')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId,
        materialCost: -100,
        laborCost: 200,
      })
      .expect(400);
  });
});
