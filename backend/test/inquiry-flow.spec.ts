import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { InquiryStatus } from '../src/inquiries/inquiry.entity';

describe('TASK 7 — Buyer to Artisan Inquiry Acceptance Flow', () => {
  let app: INestApplication;

  let artisanToken: string;
  let buyerToken: string;
  let otherBuyerToken: string;

  let productId: string;
  let inquiryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 1. Provision Artisan Token
    const artisanRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-inquiry-ramesh', role: 'artisan' })
      .expect(201);
    artisanToken = artisanRes.body.token;

    // 2. Provision Buyer Token
    const buyerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'buyer-inquiry-kavita', role: 'buyer' })
      .expect(201);
    buyerToken = buyerRes.body.token;

    // 3. Provision Third-Party Buyer Token
    const otherBuyerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'buyer-inquiry-other', role: 'buyer' })
      .expect(201);
    otherBuyerToken = otherBuyerRes.body.token;

    // 4. Artisan creates product
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        title: 'Handmade Terracotta Planter',
        description: 'Traditional eco-friendly terracotta planter pot from Rajasthan.',
        category: 'Pottery',
        craft: 'Terracotta',
        material: 'Clay',
        origin: 'Jaipur',
        priceMin: 350,
        priceMax: 500,
      })
      .expect(201);

    productId = prodRes.body.id;
    expect(productId).toBeDefined();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('Step 1: Buyer opens product and submits inquiry (POST /api/v1/inquiries)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inquiries')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId,
        message: 'Hello, can you customize the planter with a custom inscription?',
      })
      .expect(201);

    expect(res.body).toBeDefined();
    expect(res.body.id).toBeDefined();
    expect(res.body.productId).toBe(productId);
    expect(res.body.status).toBe(InquiryStatus.NEW);
    expect(res.body.message).toBe('Hello, can you customize the planter with a custom inscription?');

    inquiryId = res.body.id;
  });

  it('Step 2: Prevents duplicate inquiry submission (Requirement 11)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/inquiries')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId,
        message: 'Hello, can you customize the planter with a custom inscription?',
      })
      .expect(409); // ConflictException
  });

  it('Step 3: Buyer sees their inquiries in list (GET /api/v1/inquiries/my)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inquiries/my')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const inq = res.body.find((i: any) => i.id === inquiryId);
    expect(inq).toBeDefined();
    expect(inq.product.title).toBe('Handmade Terracotta Planter');
    expect(inq.status).toBe(InquiryStatus.NEW);
  });

  it('Step 4: Artisan sees received inquiry on dashboard list (GET /api/v1/inquiries/received)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inquiries/received')
      .set('Authorization', `Bearer ${artisanToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const inq = res.body.find((i: any) => i.id === inquiryId);
    expect(inq).toBeDefined();
    expect(inq.product.title).toBe('Handmade Terracotta Planter');
    expect(inq.message).toContain('custom inscription');
    expect(inq.status).toBe(InquiryStatus.NEW);
  });

  it('Step 5: Artisan opens inquiry, automatically marking status as READ', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .expect(200);

    expect(res.body.id).toBe(inquiryId);
    expect(res.body.status).toBe(InquiryStatus.READ);
  });

  it('Step 6: Artisan responds to inquiry (POST /api/v1/inquiries/:id/reply) -> status RESPONDED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/inquiries/${inquiryId}/reply`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        reply: 'Yes, we can hand-carve any name or motif onto the planter rim.',
      })
      .expect(201);

    expect(res.body.status).toBe(InquiryStatus.RESPONDED);
    expect(res.body.reply).toBe('Yes, we can hand-carve any name or motif onto the planter rim.');
    expect(res.body.respondedAt).toBeDefined();
  });

  it('Step 7: RBAC Protection - Unrelated third party cannot view inquiry (GET /api/v1/inquiries/:id -> 403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${otherBuyerToken}`)
      .expect(403);
  });

  it('Step 8: Buyer reads artisan response and closes inquiry (PATCH /api/v1/inquiries/:id/status)', async () => {
    const readRes = await request(app.getHttpServer())
      .get(`/api/v1/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(readRes.body.status).toBe(InquiryStatus.RESPONDED);
    expect(readRes.body.reply).toContain('hand-carve any name');

    const closeRes = await request(app.getHttpServer())
      .patch(`/api/v1/inquiries/${inquiryId}/status`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ status: InquiryStatus.CLOSED })
      .expect(200);

    expect(closeRes.body.status).toBe(InquiryStatus.CLOSED);
  });
});
