import { DataSource, DataSourceOptions } from 'typeorm';

export const SEED_ARTISANS = [
  {
    user: { email: 'priya.pottery@example.com', displayName: 'Priya Sharma', preferredLanguage: 'hi', role: 'artisan' },
    profile: { craftType: 'Pottery', region: 'Jaipur', state: 'Rajasthan', bio: 'Third-generation potter from Jaipur specializing in blue pottery with floral motifs.', craftTags: ['blue-pottery', 'rajasthani', 'traditional'] },
    products: [
      { title: 'Blue Pottery Vase', titleHindi: 'नीली मिट्टी का फूलदान', category: 'Pottery', material: 'Clay', craft: 'Blue Pottery', origin: 'Jaipur', region: 'Rajasthan', tags: ['vase', 'blue-pottery', 'handmade', 'gift'], priceMin: 450, priceMax: 650, status: 'published', description: 'Hand-painted blue pottery vase with traditional floral patterns. Each piece is unique.' },
      { title: 'Ceramic Tea Set', titleHindi: 'सिरेमिक चाय सेट', category: 'Pottery', material: 'Ceramic', craft: 'Pottery', origin: 'Jaipur', region: 'Rajasthan', tags: ['tea-set', 'ceramic', 'kitchenware'], priceMin: 1200, priceMax: 1800, status: 'published', description: 'Complete 6-piece tea set with teapot, cups, and saucers. Microwave safe.' },
      { title: 'Wall Hanging Plate', titleHindi: 'दीवार की सजावटी थाली', category: 'Pottery', material: 'Clay', craft: 'Blue Pottery', origin: 'Jaipur', region: 'Rajasthan', tags: ['wall-decor', 'plate', 'blue-pottery'], priceMin: 350, priceMax: 500, status: 'draft', description: 'Decorative wall plate with peacock motif.' },
    ],
  },
  {
    user: { email: 'ravi.weaver@example.com', displayName: 'Ravi Kumar', preferredLanguage: 'hi', role: 'artisan' },
    profile: { craftType: 'Weaving', region: 'Varanasi', state: 'Uttar Pradesh', bio: 'Master weaver creating authentic Banarasi silk sarees for over 20 years.', craftTags: ['banarasi', 'silk', 'saree', 'weaving'] },
    products: [
      { title: 'Banarasi Silk Saree', titleHindi: 'बनारसी रेशम साड़ी', category: 'Textile', material: 'Pure Silk', craft: 'Banarasi Weaving', origin: 'Varanasi', region: 'Uttar Pradesh', tags: ['saree', 'banarasi', 'silk', 'bridal', 'traditional'], priceMin: 8000, priceMax: 15000, status: 'published', description: 'Authentic Banarasi silk saree with zari border and intricate brocade work. Perfect for weddings.' },
      { title: 'Silk Stole', titleHindi: 'रेशम का दुपट्टा', category: 'Textile', material: 'Silk', craft: 'Weaving', origin: 'Varanasi', region: 'Uttar Pradesh', tags: ['stole', 'silk', 'dupatta', 'gift'], priceMin: 1500, priceMax: 2500, status: 'published', description: 'Hand-woven silk stole with geometric patterns.' },
      { title: 'Cotton Handloom Shirt Fabric', titleHindi: 'कपास हथकरघा कपड़ा', category: 'Textile', material: 'Cotton', craft: 'Handloom', origin: 'Varanasi', region: 'Uttar Pradesh', tags: ['fabric', 'cotton', 'handloom'], priceMin: 600, priceMax: 900, status: 'published', description: '2.5m hand-woven cotton fabric suitable for shirt.' },
    ],
  },
  {
    user: { email: 'meena.embroidery@example.com', displayName: 'Meena Devi', preferredLanguage: 'hi', role: 'artisan' },
    profile: { craftType: 'Embroidery', region: 'Lucknow', state: 'Uttar Pradesh', bio: 'Chikankari embroidery artist preserving the 400-year-old Mughal tradition of Lucknow.', craftTags: ['chikankari', 'embroidery', 'lucknow'] },
    products: [
      { title: 'Chikankari Kurta', titleHindi: 'चिकनकारी कुर्ता', category: 'Clothing', material: 'Cotton Muslin', craft: 'Chikankari', origin: 'Lucknow', region: 'Uttar Pradesh', tags: ['kurta', 'chikankari', 'embroidery', 'traditional', 'ethnic'], priceMin: 1800, priceMax: 3200, status: 'published', description: 'Hand-embroidered chikankari kurta on fine cotton muslin. Traditional Lucknawi craftsmanship.' },
      { title: 'Embroidered Table Runner', titleHindi: 'कढ़ाई वाला टेबल रनर', category: 'Home Decor', material: 'Cotton', craft: 'Embroidery', origin: 'Lucknow', region: 'Uttar Pradesh', tags: ['table-runner', 'embroidery', 'home-decor', 'gift'], priceMin: 500, priceMax: 900, status: 'published', description: '60x120cm hand-embroidered table runner with floral motifs.' },
    ],
  },
];

export const SEED_BUYERS = [
  { email: 'buyer1@example.com', displayName: 'Ananya Singh', role: 'buyer' },
  { email: 'buyer2@example.com', displayName: 'Sam Kumar', role: 'buyer' },
];

export const SEED_MARKET_OBSERVATIONS = [
  { category: 'Pottery', craft: 'Blue Pottery', region: 'Rajasthan', observedPrice: 550, source: 'mock-seed' },
  { category: 'Textile', craft: 'Banarasi Weaving', region: 'Uttar Pradesh', observedPrice: 12000, source: 'mock-seed' },
  { category: 'Clothing', craft: 'Chikankari', region: 'Uttar Pradesh', observedPrice: 2500, source: 'mock-seed' },
];

import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../users/user.entity';
import { ArtisanProfile } from '../users/artisan-profile.entity';
import { Product, ProductStatus } from '../products/product.entity';
import { MarketObservation } from '../pricing/market-observation.entity';

export async function seedInMemoryDb(ds: DataSource): Promise<void> {
  try {
    const userRepo = ds.getRepository(User);
    const profileRepo = ds.getRepository(ArtisanProfile);
    const productRepo = ds.getRepository(Product);
    const marketRepo = ds.getRepository(MarketObservation);

    for (const b of SEED_BUYERS) {
      const buyer = userRepo.create({
        id: uuidv4(),
        ...b,
        role: UserRole.BUYER,
        auth0Id: `mock|${b.email}`,
        isActive: true,
      });
      await userRepo.save(buyer);
    }

    for (const a of SEED_ARTISANS) {
      const user = userRepo.create({
        id: uuidv4(),
        ...a.user,
        role: UserRole.ARTISAN,
        auth0Id: `mock|${a.user.email}`,
        isActive: true,
      });
      const savedUser = (await userRepo.save(user)) as User;

      const profile = profileRepo.create({ id: uuidv4(), ...a.profile, userId: savedUser.id });
      await profileRepo.save(profile);

      for (const p of a.products) {
        const product = productRepo.create({
          id: uuidv4(),
          ...p,
          artisanId: savedUser.id,
          status: p.status === 'published' ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
          aiProcessed: p.status === 'published',
          publishedAt: p.status === 'published' ? new Date() : undefined,
          viewCount: Math.floor(Math.random() * 50) + 10,
          inquiryCount: Math.floor(Math.random() * 5),
        });
        await productRepo.save(product);
      }
    }

    for (const obs of SEED_MARKET_OBSERVATIONS) {
      const o = marketRepo.create({ id: uuidv4(), ...obs, observedAt: new Date(), currency: 'INR' });
      await marketRepo.save(o);
    }

    console.log('🌱 Preloaded demo data (artisans, products, market data) into in-memory database');
  } catch (err: any) {
    console.error('❌ Seeding in-memory db error:', err);
  }
}

export async function createDatabaseSource(options: DataSourceOptions): Promise<DataSource> {
  const forceMock = process.env.DATABASE_TYPE === 'mock' || process.env.DATABASE_TYPE === 'memory';
  if (!forceMock) {
    try {
      const ds = new DataSource({
        ...options,
        connectTimeoutMS: 1500,
      } as any);
      await ds.initialize();
      console.log('✅ Connected to external PostgreSQL database');
      return ds;
    } catch (err: any) {
      console.warn(`[Database] PostgreSQL connection failed (${err.message || 'connection refused'}). Falling back to in-memory PostgreSQL emulator.`);
    }
  }

  const { newDb, DataType } = require('pg-mem');
  const db = newDb({ autoCreateForeignKeyIndices: true });

  db.public.registerFunction({
    name: 'current_database',
    returns: DataType.text,
    implementation: () => 'artisan_marketplace',
  });
  db.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 14.0',
  });
  db.registerExtension('uuid-ossp', (schema: any) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.text,
      impure: true,
      implementation: () => uuidv4(),
    });
  });

  const memDs = db.adapters.createTypeormDataSource({
    ...options,
    type: 'postgres',
    synchronize: true,
  });

  await memDs.initialize();
  await seedInMemoryDb(memDs);
  return memDs;
}
