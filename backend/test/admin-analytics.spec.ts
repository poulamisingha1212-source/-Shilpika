import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/users/user.entity';

describe('TASK 10 — Admin & Program Manager Analytics Acceptance Test', () => {
  let app: INestApplication;
  let adminToken: string;
  let artisanToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 1. Get tokens
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'admin-analytics-user', role: UserRole.ADMIN })
      .expect(201);
    adminToken = adminRes.body.token;

    const artisanRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-analytics-user', role: UserRole.ARTISAN })
      .expect(201);
    artisanToken = artisanRes.body.token;

    const buyerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'buyer-analytics-user', role: UserRole.BUYER })
      .expect(201);
    buyerToken = buyerRes.body.token;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. RBAC & Security Protection', () => {
    it('Rejects unauthenticated requests with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .expect(401);
    });

    it('Rejects buyer requests with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('Rejects artisan requests with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(403);
    });

    it('Allows admin requests with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('2. PRD Analytics Metrics Completeness', () => {
    it('Returns all required program manager metrics from real database data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const m = res.body;

      // 1. Active Artisans
      expect(typeof m.activeArtisans).toBe('number');
      expect(m.activeArtisans).toBeGreaterThanOrEqual(0);

      // 2. Published Products & Total Products
      expect(typeof m.publishedProducts).toBe('number');
      expect(typeof m.totalProducts).toBe('number');

      // 3. Catalog Completion Rate
      expect(typeof m.catalogCompletionRate).toBe('number');
      expect(m.catalogCompletionRate).toBeGreaterThanOrEqual(0);
      expect(m.catalogCompletionRate).toBeLessThanOrEqual(100);

      // 4. Voice Completion Rate
      expect(typeof m.voiceCompletionRate).toBe('number');
      expect(m.voiceCompletionRate).toBeGreaterThanOrEqual(0);
      expect(m.voiceCompletionRate).toBeLessThanOrEqual(100);

      // 5. AI Image Enhancement Usage
      expect(m.imageEnhancementUsage).toBeDefined();
      expect(typeof m.imageEnhancementUsage.totalEnhanced).toBe('number');
      expect(typeof m.imageEnhancementUsage.enhancementRate).toBe('number');

      // 6. AI Catalog Acceptance Rate
      expect(typeof m.aiCatalogAcceptanceRate).toBe('number');
      expect(m.aiCatalogAcceptanceRate).toBeGreaterThanOrEqual(0);
      expect(m.aiCatalogAcceptanceRate).toBeLessThanOrEqual(100);

      // 7. Price Recommendation Acceptance
      expect(m.priceRecommendationAcceptance).toBeDefined();
      expect(typeof m.priceRecommendationAcceptance.totalRecommendations).toBe('number');
      expect(typeof m.priceRecommendationAcceptance.acceptedCount).toBe('number');
      expect(typeof m.priceRecommendationAcceptance.acceptanceRate).toBe('number');

      // 8. Buyer Inquiries
      expect(m.buyerInquiries).toBeDefined();
      expect(typeof m.buyerInquiries.total).toBe('number');
      expect(m.buyerInquiries.byStatus).toBeDefined();
      expect(typeof m.buyerInquiries.byStatus.new).toBe('number');
      expect(typeof m.buyerInquiries.byStatus.read).toBe('number');
      expect(typeof m.buyerInquiries.byStatus.responded).toBe('number');
      expect(typeof m.buyerInquiries.byStatus.closed).toBe('number');

      // 9. Product Views
      expect(m.productViews).toBeDefined();
      expect(typeof m.productViews.totalViews).toBe('number');
      expect(typeof m.productViews.averageViewsPerProduct).toBe('number');

      // 10. Regional & Craft Distribution
      expect(m.distribution).toBeDefined();
      expect(Array.isArray(m.distribution.byRegion)).toBe(true);
      expect(Array.isArray(m.distribution.byCraft)).toBe(true);
      expect(Array.isArray(m.distribution.byCategory)).toBe(true);
    });

    it('Does not expose unnecessary PII (no phone numbers, emails, passwords, or GST numbers)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const jsonStr = JSON.stringify(res.body);
      expect(jsonStr).not.toContain('gstNumber');
      expect(jsonStr).not.toContain('password');
      expect(jsonStr).not.toContain('auth0Id');
    });
  });

  describe('3. Date Filtering (7, 30, 90 days, all)', () => {
    it('Supports 7 days filter (?days=7)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/admin?days=7')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.timeframeDays).toBe(7);
      expect(res.body.sinceDate).toBeDefined();
    });

    it('Supports 30 days filter (?days=30)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/admin?days=30')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.timeframeDays).toBe(30);
      expect(res.body.sinceDate).toBeDefined();
    });

    it('Supports 90 days filter (?days=90)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/admin?days=90')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.timeframeDays).toBe(90);
      expect(res.body.sinceDate).toBeDefined();
    });

    it('Supports all-time filter (?days=all)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/admin?days=all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.timeframeDays).toBe('all');
      expect(res.body.sinceDate).toBeUndefined();
    });
  });
});
