/**
 * End-to-end test: Complete artisan product creation flow
 * 
 * Tests the full flow:
 * 1. Create product
 * 2. Generate AI catalog
 * 3. Get price recommendation
 * 4. Publish product
 * 5. Verify marketplace visibility
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

import { AppModule } from 'src/app.module';

describe('Artisan Product Creation Flow (E2E)', () => {
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
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should complete the full artisan product creation flow', async () => {
    // Step 1: Get dev auth token
    const tokenRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'e2e-artisan', role: 'artisan' })
      .expect(201);
    authToken = tokenRes.body.token;
    expect(authToken).toBeDefined();

    // Step 2: Create product
    const productRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'E2E Test Product' })
      .expect(201);
    productId = productRes.body.id;
    expect(productId).toBeDefined();
    expect(productRes.body.status).toBe('draft');

    // Step 3: Generate AI catalog
    const catalogRes = await request(app.getHttpServer())
      .post('/api/v1/ai/catalog-generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ productId, transcript: 'This is a handmade pottery vase from Jaipur' })
      .expect(201);
    expect(catalogRes.body).toHaveProperty('title');
    expect(catalogRes.body).toHaveProperty('title_hindi');
    expect(Array.isArray(catalogRes.body.tags)).toBeTruthy();

    // Step 4: Update product with catalog data
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: catalogRes.body.title || 'Test Pottery Vase',
        category: 'Pottery',
        region: 'Rajasthan',
      })
      .expect(200);

    // Step 5: Get price recommendation
    const priceRes = await request(app.getHttpServer())
      .post('/api/v1/ai/price-recommendation')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ productId, materialCost: 100, laborCost: 200, category: 'Pottery' })
      .expect(201);
    expect(priceRes.body.min_price).toBeGreaterThan(0);
    expect(priceRes.body.max_price).toBeGreaterThanOrEqual(priceRes.body.min_price);
    expect(priceRes.body.currency).toBe('INR');

    // Step 6: Publish product
    const publishRes = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    expect(publishRes.body.status).toBe('published');

    // Step 7: Verify marketplace visibility
    const marketRes = await request(app.getHttpServer())
      .get('/api/v1/marketplace/feed')
      .expect(200);
    const found = marketRes.body.data?.some((p: any) => p.id === productId);
    expect(found).toBeTruthy();
  });
});
