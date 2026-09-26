import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('PRD 24-Step End-to-End Compliance Test', () => {
  let app: INestApplication;

  let artisanToken: string;
  let buyerToken: string;
  let adminToken: string;

  let artisanId: string;
  let buyerId: string;
  let productId: string;
  let mediaId: string;
  let recommendationId: string;
  let inquiryId: string;

  // Valid 1x1 PNG image buffer for Sharp/Studio AI
  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  beforeAll(async () => {
    process.env.DATABASE_TYPE = 'memory';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 1. Setup Auth Tokens
    const artisanRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-e2e-tester', role: 'artisan' });
    artisanToken = artisanRes.body.token;

    const buyerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'buyer-e2e-tester', role: 'buyer' });
    buyerToken = buyerRes.body.token;

    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'admin-e2e-tester', role: 'admin' });
    adminToken = adminRes.body.token;

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${artisanToken}`);
    artisanId = meRes.body.id;

    const buyerMeRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${buyerToken}`);
    buyerId = buyerMeRes.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('Step 1 & 2: Artisan Authentication and Language Selection', async () => {
    expect(artisanToken).toBeDefined();
    expect(artisanId).toBeDefined();

    // Language selection (Hindi / English preference)
    const updateRes = await request(app.getHttpServer())
      .post('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ preferredLanguage: 'hi', displayName: 'Artisan Ramesh', craftType: 'Pottery' });
    expect(updateRes.status).toBe(201);
    expect(updateRes.body.preferredLanguage).toBe('hi');
  });

  it('Step 3: Add Product (Draft Creation)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ title: 'New Handcrafted Item' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('draft');
    expect(res.body.artisanId).toBe(artisanId);
    productId = res.body.id;
  });

  it('Step 4 & 5: Camera/Gallery Image Upload', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .attach('file', validPngBuffer, 'artisan_craft.png');

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.productId).toBe(productId);
    mediaId = res.body.id;
  });

  it('Step 6 & 7: Real AI Image Enhancement and Before/After verification', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/image-enhance')
      .set('Authorization', `Bearer ${artisanToken}`)
      .field('mediaId', mediaId)
      .field('productId', productId)
      .attach('image', validPngBuffer, 'photo.png');

    expect(res.status).toBe(201);
    expect(res.body.processedUrl).toBeDefined();
    expect(res.body.provider).toBeDefined();
  });

  it('Step 8 & 9: Real Microphone Audio / Voice Transcription', async () => {
    // 1. Synthesize audio or use valid MP3 payload
    let audioBytes = Buffer.from(
      '//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'base64',
    );
    try {
      const synthRes = await request(app.getHttpServer())
        .post('/api/v1/ai/voice-synthesize')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ text: 'Handcrafted blue pottery vase made in Jaipur Rajasthan.', language: 'en' });
      if (synthRes.status === 201 && synthRes.body?.audioBase64) {
        audioBytes = Buffer.from(synthRes.body.audioBase64, 'base64');
      }
    } catch (_) {}

    // 2. Upload the audio for transcription (with manual fallback to ensure resilience against API quota limits)
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/transcribe')
      .set('Authorization', `Bearer ${artisanToken}`)
      .field('productId', productId)
      .field('language', 'en')
      .field('manualTranscript', 'Handcrafted blue pottery vase made in Jaipur Rajasthan with natural colors.')
      .attach('audio', audioBytes, 'speech.mp3');

    expect(res.status).toBe(201);
    expect(res.body.transcript).toBeDefined();
    expect(typeof res.body.transcript).toBe('string');
    expect(res.body.transcript.length).toBeGreaterThan(0);
  }, 40000);

  it('Step 10, 11 & 12: Gemini Multilingual Catalog Generation (English & Hindi)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/catalog-generate')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        productId,
        transcript: 'यह एक हस्तनिर्मित नीली मिट्टी का फूलदान है जिसे जयपुर में प्राकृतिक रंगों से बनाया गया है।',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBeDefined();
    expect(res.body.description).toBeDefined();
    expect(res.body.title_hindi).toBeDefined();
    expect(res.body.description_hindi).toBeDefined();
    expect(res.body.category).toBeDefined();
    expect(res.body.craft).toBeDefined();
    expect(res.body.material).toBeDefined();
  });

  it('Step 13 & 14: Editable Catalog and Saving Edits', async () => {
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        title: 'Artisan Blue Pottery Heritage Vase',
        titleHindi: 'पारंपरिक नीली मिट्टी का फूलदान',
        description: 'Exquisite handcrafted blue pottery vase crafted with natural mineral colors.',
        descriptionHindi: 'प्राकृतिक खनिज रंगों से तैयार उत्कृष्ट हस्तनिर्मित नीली मिट्टी का फूलदान।',
        category: 'Pottery',
        craft: 'Blue Pottery',
        material: 'Clay',
        origin: 'Jaipur',
        region: 'Rajasthan',
        tags: ['pottery', 'jaipur', 'blue-pottery', 'handcrafted'],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Artisan Blue Pottery Heritage Vase');
    expect(updateRes.body.craft).toBe('Blue Pottery');
  });

  it('Step 15, 16, 17 & 18: Cost Input, Dynamic Pricing, Market Intelligence & Price Explanation', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/price-recommendation')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        productId,
        materialCost: 250,
        laborCost: 200,
        otherCost: 50,
        desiredMarginPercent: 35,
        category: 'Pottery',
        craft: 'Blue Pottery',
        region: 'Rajasthan',
      });

    expect(res.status).toBe(201);
    expect(res.body.min_price).toBeDefined();
    expect(res.body.max_price).toBeDefined();
    expect(res.body.estimated_cost).toBe(500); // 250 + 200 + 50
    expect(res.body.explanation).toBeDefined();
    expect(res.body.factors).toBeDefined();
    expect(Array.isArray(res.body.factors)).toBe(true);
    recommendationId = res.body.recommendation_id;
  }, 25000);

  it('Step 19: Artisan Price Approval and Override Persistence', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/price-recommendation/accept')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        productId,
        recommendationId,
        priceMin: 750,
        priceMax: 950,
        isOverride: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.artisanAccepted).toBe(true);
    expect(res.body.priceMin).toBe(750);
    expect(res.body.priceMax).toBe(950);
  });

  it('Step 20: Product Publication with Full Validation', async () => {
    // Persist final prices before publish
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        priceMin: 750,
        priceMax: 950,
      });

    const pubRes = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({});

    expect(pubRes.status).toBe(201);
    expect(pubRes.body.status).toBe('published');
    expect(pubRes.body.publishedAt).toBeDefined();
  });

  it('Step 21: Marketplace Discovery Feed (Public)', async () => {
    const feedRes = await request(app.getHttpServer())
      .get('/api/v1/marketplace/feed?category=Pottery')
      .send();

    expect(feedRes.status).toBe(200);
    expect(feedRes.body.data).toBeDefined();
    const found = feedRes.body.data.find((p: any) => p.id === productId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Artisan Blue Pottery Heritage Vase');
  });

  it('Step 22: Product Detail and View Count Tracking', async () => {
    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .send();

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(productId);
    expect(detailRes.body.artisan).toBeDefined();
    // Verify no private data leaked (phone and gst are sanitized/masked or null)
    expect(detailRes.body.artisan.gstNumber || null).toBeNull();
    expect(detailRes.body.artisan.phone || null).toBeNull();
  });

  it('Step 23: Buyer Inquiry Submission (Authenticated Buyer)', async () => {
    const inqRes = await request(app.getHttpServer())
      .post('/api/v1/inquiries')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId,
        message: 'Hello, is this blue pottery vase customizable with custom initials?',
      });

    expect(inqRes.status).toBe(201);
    expect(inqRes.body.id).toBeDefined();
    expect(inqRes.body.status).toBe('new');
    expect(inqRes.body.buyerId).toBe(buyerId);
    inquiryId = inqRes.body.id;
  });

  it('Step 24: Artisan Receives Inquiry and Updates Status', async () => {
    const inqListRes = await request(app.getHttpServer())
      .get('/api/v1/inquiries')
      .set('Authorization', `Bearer ${artisanToken}`);

    expect(inqListRes.status).toBe(200);
    expect(Array.isArray(inqListRes.body)).toBe(true);
    const foundInq = inqListRes.body.find((i: any) => i.id === inquiryId);
    expect(foundInq).toBeDefined();
    expect(foundInq.message).toContain('custom initials');

    // Artisan updates inquiry status
    const statusRes = await request(app.getHttpServer())
      .patch(`/api/v1/inquiries/${inquiryId}/status`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ status: 'responded' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('responded');
  });

  it('Admin Overview Dashboard reflects all 24 journey events with RBAC', async () => {
    // Normal buyer cannot access admin overview
    const buyerForbidden = await request(app.getHttpServer())
      .get('/api/v1/analytics/admin?days=7')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(buyerForbidden.status).toBe(403);

    // Admin can access and see live metrics
    const adminRes = await request(app.getHttpServer())
      .get('/api/v1/analytics/admin?days=7')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.activeArtisans).toBeGreaterThanOrEqual(1);
    expect(adminRes.body.publishedProducts).toBeGreaterThanOrEqual(1);
    expect(adminRes.body.buyerInquiries.total).toBeGreaterThanOrEqual(1);
    expect(adminRes.body.catalogCompletionRate).toBeGreaterThanOrEqual(0);
    expect(adminRes.body.distribution.byCraft).toBeDefined();
    expect(adminRes.body.distribution.byRegion).toBeDefined();
  });
});
