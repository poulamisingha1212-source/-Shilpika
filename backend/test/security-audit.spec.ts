import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/users/user.entity';

describe('TASK 9 — Complete Security & Ownership Audit Test Suite', () => {
  let app: INestApplication;

  let artisanAToken: string;
  let artisanAId: string;
  let artisanBToken: string;
  let artisanBId: string;
  let buyerToken: string;
  let buyerId: string;
  let adminToken: string;

  let productAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 1. Setup Artisan A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-sec-a', role: UserRole.ARTISAN })
      .expect(201);
    artisanAToken = resA.body.token;

    const meA = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${artisanAToken}`)
      .expect(200);
    artisanAId = meA.body.id;

    // 2. Setup Artisan B
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-sec-b', role: UserRole.ARTISAN })
      .expect(201);
    artisanBToken = resB.body.token;

    const meB = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${artisanBToken}`)
      .expect(200);
    artisanBId = meB.body.id;

    // 3. Setup Buyer
    const resBuyer = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'buyer-sec-c', role: UserRole.BUYER })
      .expect(201);
    buyerToken = resBuyer.body.token;

    const meBuyer = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    buyerId = meBuyer.body.id;

    // 4. Setup Admin
    const resAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'admin-sec-d', role: UserRole.ADMIN })
      .expect(201);
    adminToken = resAdmin.body.token;

    // 5. Artisan A creates a draft product
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${artisanAToken}`)
      .send({
        title: "Artisan A's Handcrafted Vase",
        category: 'Pottery',
        craft: 'Terracotta',
        region: 'Rajasthan',
        priceMin: 1200,
        priceMax: 1500,
      })
      .expect(201);
    productAId = prodRes.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Product Ownership & Modification Isolation', () => {
    it('Artisan B cannot update Artisan A product (IDOR -> 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${productAId}`)
        .set('Authorization', `Bearer ${artisanBToken}`)
        .send({ title: 'Hacked Title by Artisan B' })
        .expect(403);
    });

    it('Artisan B cannot publish Artisan A product (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/products/${productAId}/publish`)
        .set('Authorization', `Bearer ${artisanBToken}`)
        .expect(403);
    });

    it('Artisan B cannot delete Artisan A product (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${productAId}`)
        .set('Authorization', `Bearer ${artisanBToken}`)
        .expect(403);
    });

    it('Buyer cannot create products (Role restriction -> 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Buyer trying to sell product',
          category: 'Pottery',
        })
        .expect(403);
    });

    it('Buyer cannot update products (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${productAId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ title: 'Buyer modification attempt' })
        .expect(403);
    });
  });

  describe('2. Media Asset Isolation & IDOR Protection', () => {
    it('Artisan B cannot upload media to Artisan A product (403 Forbidden)', async () => {
      const dummyPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      await request(app.getHttpServer())
        .post(`/api/v1/products/${productAId}/media`)
        .set('Authorization', `Bearer ${artisanBToken}`)
        .attach('file', dummyPng, 'artisanB_hack.png')
        .expect(403);
    });

    it('Buyer cannot upload media to any product (403 Forbidden)', async () => {
      const dummyPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      await request(app.getHttpServer())
        .post(`/api/v1/products/${productAId}/media`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .attach('file', dummyPng, 'buyer_hack.png')
        .expect(403);
    });

    it('Artisan A can successfully upload media to their own product', async () => {
      const dummyPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const res = await request(app.getHttpServer())
        .post(`/api/v1/products/${productAId}/media`)
        .set('Authorization', `Bearer ${artisanAToken}`)
        .attach('file', dummyPng, 'artisanA_valid.png')
        .expect(201);

      expect(res.body.productId).toBe(productAId);
    });
  });

  describe('3. Dynamic Pricing IDOR & Integrity', () => {
    it('Artisan B cannot generate price recommendations for Artisan A product (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/price-recommendation')
        .set('Authorization', `Bearer ${artisanBToken}`)
        .send({
          productId: productAId,
          materialCost: 500,
          laborCost: 300,
        })
        .expect(403);
    });

    it('Artisan B cannot accept/override price for Artisan A product (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/price-recommendation/accept')
        .set('Authorization', `Bearer ${artisanBToken}`)
        .send({
          productId: productAId,
          priceMin: 10,
          priceMax: 20,
        })
        .expect(403);
    });

    it('Buyer cannot access pricing recommendation endpoints (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/price-recommendation')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: productAId,
          materialCost: 500,
          laborCost: 300,
        })
        .expect(403);
    });

    it('Artisan A can recommend and accept price on their own product', async () => {
      const recRes = await request(app.getHttpServer())
        .post('/api/v1/ai/price-recommendation')
        .set('Authorization', `Bearer ${artisanAToken}`)
        .send({
          productId: productAId,
          materialCost: 600,
          laborCost: 400,
          desiredMarginPercent: 35,
        })
        .expect(201);

      expect(recRes.body.min_price).toBeGreaterThan(0);

      const acceptRes = await request(app.getHttpServer())
        .post('/api/v1/ai/price-recommendation/accept')
        .set('Authorization', `Bearer ${artisanAToken}`)
        .send({
          productId: productAId,
          priceMin: 1400,
          priceMax: 1800,
        })
        .expect(201);

      expect(acceptRes.body.success).toBe(true);
      expect(acceptRes.body.priceMin).toBe(1400);
    });
  });

  describe('4. AI Catalog & Voice Endpoint Authorization', () => {
    it('Artisan B cannot generate catalog for Artisan A product (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/catalog-generate')
        .set('Authorization', `Bearer ${artisanBToken}`)
        .send({
          productId: productAId,
          transcript: 'Malicious overwrite attempt',
        })
        .expect(403);
    });

    it('Artisan B cannot view AI catalog versions of Artisan A product (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ai/catalog-versions/${productAId}`)
        .set('Authorization', `Bearer ${artisanBToken}`)
        .expect(403);
    });

    it('Buyer cannot trigger AI catalog generation (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/catalog-generate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: productAId,
        })
        .expect(403);
    });
  });

  describe('5. Analytics RBAC & Sensitive Data Exposure', () => {
    it('Artisan cannot access admin analytics (/analytics/admin -> 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${artisanAToken}`)
        .expect(403);
    });

    it('Buyer cannot access admin analytics (/analytics/admin -> 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('Admin can access admin analytics (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalProducts).toBeDefined();
    });

    it('Buyer cannot access artisan dashboard analytics (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/artisan')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('Public / Buyer artisan listing sanitizes sensitive GST and private phone numbers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/artisans')
        .expect(200);

      if (res.body.length > 0) {
        const artisan = res.body[0];
        expect(artisan.gstNumber).toBeUndefined();
        if (artisan.user) {
          expect(artisan.user.phone).toBeUndefined();
          expect(artisan.user.auth0Id).toBeUndefined();
        }
      }
    });
  });

  describe('6. Unauthenticated Request Enforcement', () => {
    it('Rejects unauthenticated requests to protected endpoints with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/products/my')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/products')
        .send({ title: 'Unauthenticated product' })
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/analytics/artisan')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .expect(401);
    });
  });
});
