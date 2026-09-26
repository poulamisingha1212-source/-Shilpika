import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { UserRole } from '../src/users/user.entity';

describe('TASK 8 — Auth0 & Security Acceptance Test', () => {
  let app: INestApplication;
  let authService: AuthService;

  let artisan1Token: string;
  let artisan1Id: string;
  let artisan2Token: string;
  let artisan2Id: string;
  let buyerToken: string;
  let buyerId: string;
  let adminToken: string;

  let artisan1ProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);

    // 1. Artisan 1 Token
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-one-uuid', role: UserRole.ARTISAN })
      .expect(201);
    artisan1Token = res1.body.token;

    // Get artisan 1 user ID from /auth/me
    const me1 = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${artisan1Token}`)
      .expect(200);
    artisan1Id = me1.body.id;

    // 2. Artisan 2 Token
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'artisan-two-uuid', role: UserRole.ARTISAN })
      .expect(201);
    artisan2Token = res2.body.token;

    const me2 = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${artisan2Token}`)
      .expect(200);
    artisan2Id = me2.body.id;

    // 3. Buyer Token
    const resBuyer = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'buyer-uuid', role: UserRole.BUYER })
      .expect(201);
    buyerToken = resBuyer.body.token;

    // 4. Admin Token
    const resAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({ userId: 'admin-uuid', role: UserRole.ADMIN })
      .expect(201);
    adminToken = resAdmin.body.token;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('Step 1: Artisan 1 creates a private draft product', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${artisan1Token}`)
      .send({
        title: 'Artisan 1 Private Masterpiece',
        category: 'Pottery',
        priceMin: 1200,
        priceMax: 1800,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.artisanId).toBe(artisan1Id);
    artisan1ProductId = res.body.id;
  });

  it('Step 2: Artisan 1 sees product in their private dashboard listings (GET /products/my)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products/my')
      .set('Authorization', `Bearer ${artisan1Token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((p: any) => p.id === artisan1ProductId);
    expect(found).toBeDefined();
  });

  it('Step 3: Artisan 2 logs in and CANNOT see Artisan 1 private product in myProducts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products/my')
      .set('Authorization', `Bearer ${artisan2Token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((p: any) => p.id === artisan1ProductId);
    expect(found).toBeUndefined(); // Strictly private to Artisan 1
  });

  it('Step 4: Artisan 2 attempts to edit Artisan 1 product -> 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${artisan1ProductId}`)
      .set('Authorization', `Bearer ${artisan2Token}`)
      .send({ title: 'Hacked Title' })
      .expect(403);
  });

  it('Step 5: Artisan 2 attempts to publish Artisan 1 product -> 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/products/${artisan1ProductId}/publish`)
      .set('Authorization', `Bearer ${artisan2Token}`)
      .expect(403);
  });

  it('Step 6: Artisan 2 attempts to delete Artisan 1 product -> 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/products/${artisan1ProductId}`)
      .set('Authorization', `Bearer ${artisan2Token}`)
      .expect(403);
  });

  it('Step 7: Token expiration check -> expired token is rejected with 401 Unauthorized', async () => {
    // Generate an expired token (expires in -10 seconds)
    const expiredToken = await authService.generateDevToken(
      'expired-user',
      UserRole.ARTISAN,
      '-10s'
    );

    await request(app.getHttpServer())
      .get('/api/v1/products/my')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('Step 8: Unauthorized requests without token are rejected with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/products/my')
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .send({ title: 'Unauthorized Product' })
      .expect(401);
  });

  it('Step 9: Validates Auth0 claims extraction with namespaced custom roles (artisan, buyer, admin)', async () => {
    // Simulate Auth0 token payload with namespaced role
    const auth0Payload = {
      sub: 'auth0|artisan_custom_claim',
      email: 'custom.artisan@example.com',
      name: 'Custom Artisan',
      'https://artisan-marketplace.api/roles': ['artisan'],
    };

    const user = await authService.validateJwtPayload(auth0Payload);
    expect(user).toBeDefined();
    expect(user?.role).toBe(UserRole.ARTISAN);
    expect(user?.email).toBe('custom.artisan@example.com');
  });

  it('Step 10: Artisan 1 can update and publish their own product', async () => {
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/products/${artisan1ProductId}`)
      .set('Authorization', `Bearer ${artisan1Token}`)
      .send({ title: 'Artisan 1 Approved Title' })
      .expect(200);

    expect(updateRes.body.title).toBe('Artisan 1 Approved Title');

    const pubRes = await request(app.getHttpServer())
      .post(`/api/v1/products/${artisan1ProductId}/publish`)
      .set('Authorization', `Bearer ${artisan1Token}`)
      .expect(201);

    expect(pubRes.body.status).toBe('published');
  });
});
