/**
 * Seed script — populates the database with realistic demo data.
 * Run: npm run seed
 *
 * Creates:
 * - 5 artisan users
 * - 5 artisan profiles (diverse crafts/regions)
 * - 15 products (3 per artisan, various statuses)
 * - Market observations (for pricing)
 * - 2 buyer users with inquiries
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'artisan_marketplace',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
});

const ARTISANS = [
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
      { title: 'Chikankari Dupatta', titleHindi: 'चिकनकारी दुपट्टा', category: 'Accessories', material: 'Georgette', craft: 'Chikankari', origin: 'Lucknow', region: 'Uttar Pradesh', tags: ['dupatta', 'chikankari', 'georgette'], priceMin: 1200, priceMax: 2000, status: 'draft', description: 'Sheer georgette dupatta with delicate chikankari work.' },
    ],
  },
  {
    user: { email: 'arjun.woodcraft@example.com', displayName: 'Arjun Shetty', preferredLanguage: 'kn', role: 'artisan' },
    profile: { craftType: 'Woodwork', region: 'Mysore', state: 'Karnataka', bio: 'Sandalwood artisan from Mysore creating exquisite carved figurines and boxes.', craftTags: ['sandalwood', 'woodcarving', 'mysore'] },
    products: [
      { title: 'Sandalwood Ganesha', titleHindi: 'चंदन की गणेश मूर्ति', category: 'Religious', material: 'Sandalwood', craft: 'Wood Carving', origin: 'Mysore', region: 'Karnataka', tags: ['ganesha', 'sandalwood', 'religious', 'figurine', 'gift'], priceMin: 2500, priceMax: 5000, status: 'published', description: 'Hand-carved pure sandalwood Ganesha idol. Naturally fragrant. Size: 6 inches.' },
      { title: 'Rosewood Jewelry Box', titleHindi: 'गुलाबी लकड़ी का गहने का डब्बा', category: 'Boxes', material: 'Rosewood', craft: 'Woodwork', origin: 'Mysore', region: 'Karnataka', tags: ['jewelry-box', 'rosewood', 'gift', 'storage'], priceMin: 1800, priceMax: 3000, status: 'published', description: 'Ornate rosewood jewelry box with velvet lining and brass fittings.' },
      { title: 'Carved Wooden Frame', titleHindi: 'नक्काशीदार लकड़ी का फ्रेम', category: 'Home Decor', material: 'Teak', craft: 'Wood Carving', origin: 'Mysore', region: 'Karnataka', tags: ['frame', 'teak', 'home-decor', 'handcarved'], priceMin: 900, priceMax: 1500, status: 'published', description: 'Hand-carved teak photo frame with floral border. Fits 8x10 photo.' },
    ],
  },
  {
    user: { email: 'fatima.metalwork@example.com', displayName: 'Fatima Begum', preferredLanguage: 'ur', role: 'artisan' },
    profile: { craftType: 'Metalwork', region: 'Moradabad', state: 'Uttar Pradesh', bio: 'Brass artisan from the city of brass — Moradabad. Specializes in intricate bidri work.', craftTags: ['brass', 'metalwork', 'moradabad', 'bidri'] },
    products: [
      { title: 'Brass Diya Set', titleHindi: 'पीतल का दीया सेट', category: 'Religious', material: 'Brass', craft: 'Metalwork', origin: 'Moradabad', region: 'Uttar Pradesh', tags: ['diya', 'brass', 'religious', 'festival', 'gift'], priceMin: 350, priceMax: 700, status: 'published', description: 'Set of 5 hand-crafted brass diyas. Perfect for Diwali and daily puja.' },
      { title: 'Decorative Brass Vase', titleHindi: 'सजावटी पीतल का फूलदान', category: 'Home Decor', material: 'Brass', craft: 'Metalwork', origin: 'Moradabad', region: 'Uttar Pradesh', tags: ['vase', 'brass', 'home-decor', 'handcrafted'], priceMin: 800, priceMax: 1400, status: 'published', description: 'Etched brass vase with traditional Indian motifs. Height: 30cm.' },
      { title: 'Brass Wall Clock', titleHindi: 'पीतल की दीवार घड़ी', category: 'Home Decor', material: 'Brass', craft: 'Metalwork', origin: 'Moradabad', region: 'Uttar Pradesh', tags: ['clock', 'brass', 'wall-clock', 'home-decor'], priceMin: 1500, priceMax: 2800, status: 'published', description: 'Ornamental brass wall clock with hand-etched dial. Diameter: 35cm.' },
    ],
  },
];

const BUYERS = [
  { email: 'buyer1@example.com', displayName: 'Ananya Singh', role: 'buyer' },
  { email: 'buyer2@example.com', displayName: 'Sam Kumar', role: 'buyer' },
];

const MARKET_OBSERVATIONS = [
  { category: 'Pottery', craft: 'Blue Pottery', region: 'Rajasthan', observedPrice: 550, source: 'mock-seed' },
  { category: 'Textile', craft: 'Banarasi Weaving', region: 'Uttar Pradesh', observedPrice: 12000, source: 'mock-seed' },
  { category: 'Clothing', craft: 'Chikankari', region: 'Uttar Pradesh', observedPrice: 2500, source: 'mock-seed' },
  { category: 'Religious', craft: 'Wood Carving', region: 'Karnataka', observedPrice: 3500, source: 'mock-seed' },
  { category: 'Home Decor', craft: 'Metalwork', region: 'Uttar Pradesh', observedPrice: 1200, source: 'mock-seed' },
];

async function seed() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const userRepo = dataSource.getRepository('users');
    const profileRepo = dataSource.getRepository('artisan_profiles');
    const productRepo = dataSource.getRepository('products');
    const marketRepo = dataSource.getRepository('market_observations');
    const inquiryRepo = dataSource.getRepository('inquiries');

    // Clear existing seed data
    console.log('🗑️  Clearing existing data...');
    await inquiryRepo.delete({});
    await productRepo.delete({});
    await profileRepo.delete({});
    await userRepo.delete({});
    await marketRepo.delete({});

    // Seed buyers
    console.log('👥 Seeding buyers...');
    const buyerEntities = [];
    for (const b of BUYERS) {
      const buyer = userRepo.create({ ...b, auth0Id: `mock|${b.email}`, isActive: true });
      buyerEntities.push(await userRepo.save(buyer));
    }

    // Seed artisans
    console.log('🎨 Seeding artisans...');
    const artisanEntities = [];
    for (const a of ARTISANS) {
      const user = userRepo.create({ ...a.user, auth0Id: `mock|${a.user.email}`, isActive: true });
      const savedUser = await userRepo.save(user);
      artisanEntities.push(savedUser);

      const profile = profileRepo.create({ ...a.profile, userId: savedUser.id });
      await profileRepo.save(profile);

      for (const p of a.products) {
        const product = productRepo.create({
          ...p,
          artisanId: savedUser.id,
          aiProcessed: p.status === 'published',
          publishedAt: p.status === 'published' ? new Date() : null,
          viewCount: Math.floor(Math.random() * 100),
          inquiryCount: Math.floor(Math.random() * 10),
        });
        await productRepo.save(product);
      }
    }

    // Seed market observations
    console.log('📊 Seeding market observations...');
    for (const obs of MARKET_OBSERVATIONS) {
      const o = marketRepo.create({ ...obs, observedAt: new Date(), currency: 'INR' });
      await marketRepo.save(o);
    }

    // Seed inquiries
    console.log('📨 Seeding inquiries...');
    const publishedProducts = await productRepo.find({ where: { status: 'published' } });
    if (publishedProducts.length > 0 && buyerEntities.length > 0) {
      const inq = inquiryRepo.create({
        buyerId: buyerEntities[0].id,
        productId: publishedProducts[0].id,
        message: 'Hello! I am interested in this beautiful product. Can you please share more details about shipping and customization options?',
      });
      await inquiryRepo.save(inq);
    }

    console.log(`\n✅ Seed complete!`);
    console.log(`   Artisans: ${ARTISANS.length}`);
    console.log(`   Buyers: ${BUYERS.length}`);
    console.log(`   Products: ${ARTISANS.reduce((s, a) => s + a.products.length, 0)}`);
    console.log(`   Market observations: ${MARKET_OBSERVATIONS.length}`);
    console.log(`\n🔑 Dev tokens can be generated via POST /api/v1/auth/dev-token`);

    await dataSource.destroy();
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
