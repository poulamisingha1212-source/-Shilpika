import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AI Catalog Editing and Persistence Acceptance Flow', () => {
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

  it('generates catalog, accepts user edits, persists changes, and marketplace reflects edited values', async () => {
    // 1. Get auth token
    const tokenRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-catalog-tester', role: 'artisan' })
      .expect(201);
    authToken = tokenRes.body.token;

    // 2. Create draft product
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Initial Draft' })
      .expect(201);
    productId = prodRes.body.id;

    // 3. Generate catalog via AI
    const aiRes = await request(app.getHttpServer())
      .post('/api/v1/ai/catalog-generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId,
        transcript: 'This is a hand-thrown clay jug with terracotta finish from Bhuj',
      })
      .expect(201);

    const originalAiTitle = aiRes.body.title;
    expect(originalAiTitle).toBeDefined();

    // 4. Verify AI audit version is stored
    const versionRes = await request(app.getHttpServer())
      .get(`/api/v1/ai/catalog-versions/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(versionRes.body).toBeDefined();
    expect(versionRes.body.productId).toBe(productId);
    expect(versionRes.body.generatedFields.title).toBe(originalAiTitle);

    // 5. User edits catalog fields
    const editedTitle = 'Master Artisan Custom Terracotta Jug';
    const editedMaterial = 'Terracotta and Sandalwood Inlay';
    const editedDescription = 'Custom hand-finished terracotta jug crafted using centuries-old techniques.';
    const editedCareInstructions = 'Hand wash with lukewarm water. Do not scrub.';
    const editedTags = ['terracotta', 'custom-craft', 'bhuj-artisan'];

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: editedTitle,
        material: editedMaterial,
        description: editedDescription,
        careInstructions: editedCareInstructions,
        tags: editedTags,
        priceMin: 750,
        priceMax: 1200,
      })
      .expect(200);

    // 6. Reload product and verify edited values persisted
    const reloadRes = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(reloadRes.body.title).toBe(editedTitle);
    expect(reloadRes.body.material).toBe(editedMaterial);
    expect(reloadRes.body.description).toBe(editedDescription);
    expect(reloadRes.body.careInstructions).toBe(editedCareInstructions);
    expect(reloadRes.body.priceMin).toBe(750);
    expect(reloadRes.body.priceMax).toBe(1200);

    // Ensure the original AI audit record remains untouched
    const versionAfterEdit = await request(app.getHttpServer())
      .get(`/api/v1/ai/catalog-versions/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(versionAfterEdit.body.generatedFields.title).toBe(originalAiTitle);
    expect(versionAfterEdit.body.generatedFields.title).not.toBe(editedTitle);

    // 7. Publish product
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    // 8. Verify marketplace feed displays user-edited values, not original Gemini output
    const marketRes = await request(app.getHttpServer())
      .get('/api/v1/marketplace/feed?q=Master')
      .expect(200);

    const listedProduct = marketRes.body.data?.find((p: any) => p.id === productId);
    expect(listedProduct).toBeDefined();
    expect(listedProduct.title).toBe(editedTitle);
    expect(listedProduct.title).not.toBe(originalAiTitle);
    expect(listedProduct.material).toBe(editedMaterial);
  });
});
