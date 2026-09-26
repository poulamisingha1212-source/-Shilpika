import { DataSource, DataSourceOptions } from 'typeorm';

export const SEED_ARTISANS = [
  {
    user: { email: 'priya.pottery@example.com', displayName: 'Priya Sharma', preferredLanguage: 'hi', role: 'artisan' },
    profile: { craftType: 'Pottery', region: 'Jaipur', state: 'Rajasthan', bio: 'Third-generation potter from Jaipur specializing in blue pottery with floral motifs.', craftTags: ['blue-pottery', 'rajasthani', 'traditional'] },
    products: [
      { title: 'Blue Pottery Vase', titleHindi: 'नीली मिट्टी का फूलदान', titleBengali: 'নীল পটারির ফুলদানি', category: 'Pottery', material: 'Clay', craft: 'Blue Pottery', origin: 'Jaipur', region: 'Rajasthan', tags: ['vase', 'blue-pottery', 'handmade', 'gift'], priceMin: 450, priceMax: 650, status: 'published', description: 'Hand-painted blue pottery vase with traditional floral patterns. Each piece is unique.', videoUrl: 'https://www.youtube.com/watch?v=kYv9qQ-mRCE', history: 'Traditional Jaipur Blue Pottery originated in the 19th century under Maharaja Sawai Ram Singh II. Made without clay using Egyptian paste and quartz powder, hand-painted with cobalt oxide pigments.' },
      { title: 'Ceramic Tea Set', titleHindi: 'सिरामिक चाय सेट', titleBengali: 'সিরামিক চায়ের সেট', category: 'Pottery', material: 'Ceramic', craft: 'Pottery', origin: 'Jaipur', region: 'Rajasthan', tags: ['tea-set', 'ceramic', 'kitchenware'], priceMin: 1200, priceMax: 1800, status: 'published', description: 'Complete 6-piece tea set with teapot, cups, and saucers. Microwave safe.', videoUrl: 'https://www.youtube.com/watch?v=s5eU7x-j5L8', history: 'Hand-thrown studio pottery fired at 1200°C for durability while retaining organic clay textures crafted by generational artisan families.' },
      { title: 'Wall Hanging Plate', titleHindi: 'दीवार की सजावटी थाली', titleBengali: 'দেয়ালের সাজসজ্জার থালা', category: 'Pottery', material: 'Clay', craft: 'Blue Pottery', origin: 'Jaipur', region: 'Rajasthan', tags: ['wall-decor', 'plate', 'blue-pottery'], priceMin: 350, priceMax: 500, status: 'draft', description: 'Decorative wall plate with peacock motif.', videoUrl: 'https://www.youtube.com/watch?v=kYv9qQ-mRCE', history: 'Traditional Rajasthani wall decor featuring hand-painted royal peacock motifs using natural mineral glazes.' },
    ],
  },
  {
    user: { email: 'ravi.weaver@example.com', displayName: 'Ravi Kumar', preferredLanguage: 'hi', role: 'artisan' },
    profile: { craftType: 'Weaving', region: 'Varanasi', state: 'Uttar Pradesh', bio: 'Master weaver creating authentic Banarasi silk sarees for over 20 years.', craftTags: ['banarasi', 'silk', 'saree', 'weaving'] },
    products: [
      { title: 'Banarasi Silk Saree', titleHindi: 'बनারসী रेशम साड़ी', titleBengali: 'বনারসি সিল্ক শাড়ি', category: 'Textile', material: 'Pure Silk', craft: 'Banarasi Weaving', origin: 'Varanasi', region: 'Uttar Pradesh', tags: ['saree', 'banarasi', 'silk', 'bridal', 'traditional'], priceMin: 8000, priceMax: 15000, status: 'published', description: 'Authentic Banarasi silk saree with zari border and intricate brocade work. Perfect for weddings.', videoUrl: 'https://www.youtube.com/watch?v=Fj2F7eXv9xI', history: 'Dating back to the Rigvedic era and perfected under the Mughal dynasty, authentic Banarasi silk takes up to 6 months to weave on heritage pit looms.' },
      { title: 'Silk Stole', titleHindi: 'रेशम का दुपट्टा', titleBengali: 'রেশমের দুপাট্টা', category: 'Textile', material: 'Silk', craft: 'Weaving', origin: 'Varanasi', region: 'Uttar Pradesh', tags: ['stole', 'silk', 'dupatta', 'gift'], priceMin: 1500, priceMax: 2500, status: 'published', description: 'Hand-woven silk stole with geometric patterns.', videoUrl: 'https://www.youtube.com/watch?v=Fj2F7eXv9xI', history: 'Ancestral warp-and-weft handloom technique passed down through 5 generations of Varanasi master weavers.' },
      { title: 'Cotton Handloom Shirt Fabric', titleHindi: 'कपास हथकरघा कपड़ा', titleBengali: 'সুতির হাতলুম শার্ট কাপড়', category: 'Textile', material: 'Cotton', craft: 'Handloom', origin: 'Varanasi', region: 'Uttar Pradesh', tags: ['fabric', 'cotton', 'handloom'], priceMin: 600, priceMax: 900, status: 'published', description: '2.5m hand-woven cotton fabric suitable for shirt.', videoUrl: 'https://www.youtube.com/watch?v=Fj2F7eXv9xI', history: 'Spun from organic indigenous cotton fibers on traditional non-electric wooden handlooms in rural craft clusters.' },
    ],
  },
  {
    user: { email: 'meena.embroidery@example.com', displayName: 'Meena Devi', preferredLanguage: 'hi', role: 'artisan' },
    profile: { craftType: 'Embroidery', region: 'Lucknow', state: 'Uttar Pradesh', bio: 'Chikankari embroidery artist preserving the 400-year-old Mughal tradition of Lucknow.', craftTags: ['chikankari', 'embroidery', 'lucknow'] },
    products: [
      { title: 'Chikankari Kurta', titleHindi: 'चिकनकारी कुर्ता', titleBengali: 'চিকনকারি কুর্তা', category: 'Clothing', material: 'Cotton Muslin', craft: 'Chikankari', origin: 'Lucknow', region: 'Uttar Pradesh', tags: ['kurta', 'chikankari', 'embroidery', 'traditional', 'ethnic'], priceMin: 1800, priceMax: 3200, status: 'published', description: 'Hand-embroidered chikankari kurta on fine cotton muslin. Traditional Lucknawi craftsmanship.', videoUrl: 'https://www.youtube.com/watch?v=5Q_GZ-rYl68', history: 'Chikankari was introduced to the royal courts of Awadh by Empress Noor Jahan in the 17th century. Includes 32 distinct hand-stitch variations.' },
      { title: 'Embroidered Table Runner', titleHindi: 'कढ़ाई वाला टेबल रनर', titleBengali: 'কুশিকাটা করা টেবিল রানার', category: 'Home Decor', material: 'Cotton', craft: 'Embroidery', origin: 'Lucknow', region: 'Uttar Pradesh', tags: ['table-runner', 'embroidery', 'home-decor', 'gift'], priceMin: 500, priceMax: 900, status: 'published', description: '60x120cm hand-embroidered table runner with floral motifs.', videoUrl: 'https://www.youtube.com/watch?v=5Q_GZ-rYl68', history: 'Awadhi needlework heritage preserved by rural women artisan self-help collectives using shadow-work on pure organic cotton.' },
    ],
  },
];

export const SEED_BUYERS = [
  { email: 'buyer1@example.com', displayName: 'Ananya Singh', role: 'buyer' },
  { email: 'buyer2@example.com', displayName: 'Sam Kumar', role: 'buyer' },
];

export const SEED_MARKET_OBSERVATIONS = [
  // Pottery - Blue Pottery (Multiple dates to form realistic trend)
  { category: 'Pottery', craft: 'Blue Pottery', product: 'Blue Pottery Floral Vase', region: 'Rajasthan', observedPrice: 500, source: 'DEMO:artisan_council_2026', isDemo: true, observedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
  { category: 'Pottery', craft: 'Blue Pottery', product: 'Blue Pottery Floral Vase', region: 'Rajasthan', observedPrice: 550, source: 'DEMO:artisan_council_2026', isDemo: true, observedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000) },
  { category: 'Pottery', craft: 'Blue Pottery', product: 'Blue Pottery Floral Vase', region: 'Delhi NCR', observedPrice: 700, source: 'DEMO:dilli_haat_survey', isDemo: true, observedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000) },

  // Textile - Banarasi Weaving
  { category: 'Textile', craft: 'Banarasi Weaving', product: 'Katan Silk Sari', region: 'Uttar Pradesh', observedPrice: 11000, source: 'DEMO:handloom_board_2026', isDemo: true, observedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000) },
  { category: 'Textile', craft: 'Banarasi Weaving', product: 'Katan Silk Sari', region: 'Uttar Pradesh', observedPrice: 12500, source: 'DEMO:handloom_board_2026', isDemo: true, observedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000) },

  // Clothing - Chikankari
  { category: 'Clothing', craft: 'Chikankari', product: 'Chikankari Kurta', region: 'Uttar Pradesh', observedPrice: 2200, source: 'DEMO:lucknow_artisan_cluster', isDemo: true, observedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000) },
  { category: 'Clothing', craft: 'Chikankari', product: 'Chikankari Kurta', region: 'Uttar Pradesh', observedPrice: 2600, source: 'DEMO:lucknow_artisan_cluster', isDemo: true, observedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000) },

  // Woodwork - Saharanpur Wood Carving
  { category: 'Woodwork', craft: 'Wood Carving', product: 'Sheesham Jewelry Box', region: 'Uttar Pradesh', observedPrice: 1400, source: 'DEMO:craft_expo_survey', isDemo: true, observedAt: new Date(Date.now() - 25 * 24 * 3600 * 1000) },
  { category: 'Woodwork', craft: 'Wood Carving', product: 'Sheesham Jewelry Box', region: 'Maharashtra', observedPrice: 1800, source: 'DEMO:craft_expo_survey', isDemo: true, observedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000) },

  // Metalwork - Dhokra Metal Casting
  { category: 'Metalwork', craft: 'Dhokra', product: 'Brass Tribal Figurine', region: 'Chhattisgarh', observedPrice: 900, source: 'DEMO:tribal_cooperative', isDemo: true, observedAt: new Date(Date.now() - 18 * 24 * 3600 * 1000) },
  { category: 'Metalwork', craft: 'Dhokra', product: 'Brass Tribal Figurine', region: 'West Bengal', observedPrice: 1200, source: 'DEMO:tribal_cooperative', isDemo: true, observedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000) },
];

import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../users/user.entity';
import { ArtisanProfile } from '../users/artisan-profile.entity';
import { Product, ProductStatus } from '../products/product.entity';
import { EmailOtp } from '../auth/email-otp.entity';
import { MarketCategory } from '../market/market-category.entity';
import { MarketSubcategory } from '../market/market-subcategory.entity';
import { Order } from '../orders/order.entity';
import { seedMarketCatalog } from '../market/market-seed';
import { Inquiry } from '../inquiries/inquiry.entity';
import { MarketObservation } from '../pricing/market-observation.entity';
import { PriceRecommendation } from '../pricing/price-recommendation.entity';
import { CostInput } from '../pricing/cost-input.entity';
import { AIListingVersion } from '../ai/ai-listing-version.entity';
import { VoiceInput } from '../ai/voice-input.entity';
import { ProductMedia } from '../media/product-media.entity';
import { AuctionSession } from '../auctions/auction-session.entity';
import { AuctionBid } from '../auctions/auction-bid.entity';

export const APP_ENTITIES = [
  User,
  ArtisanProfile,
  EmailOtp,
  Product,
  MarketCategory,
  MarketSubcategory,
  Order,
  Inquiry,
  MarketObservation,
  PriceRecommendation,
  CostInput,
  AIListingVersion,
  VoiceInput,
  ProductMedia,
  AuctionSession,
  AuctionBid,
];

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
      const o = marketRepo.create({
        id: uuidv4(),
        ...obs,
        observedAt: obs.observedAt || new Date(),
        currency: 'INR',
      });
      await marketRepo.save(o);
    }

    console.log('🌱 Preloaded demo data (artisans, products, market data) into in-memory database');
  } catch (err: any) {
    console.error('❌ Seeding in-memory db error:', err);
  }
}

export async function seedIfEmpty(ds: DataSource): Promise<void> {
  try {
    const userRepo = ds.getRepository(User);
    const count = await userRepo.count();
    if (count === 0) {
      console.log('🌱 Cloud database is empty. Seeding initial demo artisans, products, and market observations...');
      await seedInMemoryDb(ds);
    }
  } catch (err: any) {
    console.warn('[Database] Seeding check skipped:', err.message);
  }
}

// Bengali titles for demo products seeded before the titleBengali column existed.
const BENGALI_TITLE_BACKFILL: Record<string, string> = {
  'Blue Pottery Vase': 'নীল পটারির ফুলদানি',
  'Ceramic Tea Set': 'সিরামিক চায়ের সেট',
  'Wall Hanging Plate': 'দেয়ালের সাজসজ্জার থালা',
  'Banarasi Silk Saree': 'বনারসি সিল্ক শাড়ি',
  'Silk Stole': 'রেশমের দুপাট্টা',
  'Cotton Handloom Shirt Fabric': 'সুতির হাতলুম শার্ট কাপড়',
  'Chikankari Kurta': 'চিকনকারি কুর্তা',
  'Embroidered Table Runner': 'কুশিকাটা করা টেবিল রানার',
};

export async function backfillBengaliTitles(ds: DataSource): Promise<void> {
  try {
    const productRepo = ds.getRepository(Product);
    for (const [title, titleBengali] of Object.entries(BENGALI_TITLE_BACKFILL)) {
      await productRepo.update({ title }, { titleBengali });
    }
    console.log('🌐 Bengali titles ensured for demo catalog');
  } catch (err: any) {
    console.warn('[Database] Bengali title backfill skipped:', err.message);
  }
}

export async function createDatabaseSource(options: DataSourceOptions): Promise<DataSource> {
  const isTest = process.env.NODE_ENV === 'test' && process.env.FORCE_DB !== 'true';
  const forceMock = process.env.DATABASE_TYPE === 'mock' || process.env.DATABASE_TYPE === 'memory' || isTest;
  if (!forceMock) {
    try {
      const anyOpts = options as any;
      let rawUrl = anyOpts.url;
      if (rawUrl && typeof rawUrl === 'string') {
        rawUrl = rawUrl.replace(/[?&]sslmode=[^&]*/g, '');
      }

      const isCloudOrSsl =
        process.env.DATABASE_SSL === 'true' ||
        (typeof rawUrl === 'string' && rawUrl.includes('tsdb.cloud.timescale.com')) ||
        (typeof anyOpts.host === 'string' && anyOpts.host.includes('tsdb.cloud.timescale.com')) ||
        Boolean(anyOpts.ssl);

      const targetOptions: any = {
        ...options,
        entities: APP_ENTITIES,
        synchronize: true,
        connectTimeoutMS: 45000,
      };

      if (rawUrl) {
        targetOptions.url = rawUrl;
      }

      if (isCloudOrSsl) {
        targetOptions.ssl = { rejectUnauthorized: false };
        targetOptions.extra = {
          ...(targetOptions.extra || {}),
          connectionTimeoutMillis: 45000,
          ssl: { rejectUnauthorized: false },
        };
      }

      const ds = new DataSource(targetOptions);
      await ds.initialize();
      console.log('✅ Connected to external PostgreSQL database (Timescale / Cloud)');
      await seedIfEmpty(ds);
      await backfillBengaliTitles(ds);
      await seedMarketCatalog(ds);
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
    entities: APP_ENTITIES,
    type: 'postgres',
    synchronize: true,
  });

  await memDs.initialize();
  await seedInMemoryDb(memDs);
  await seedMarketCatalog(memDs);
  return memDs;
}
