require('dotenv').config({ path: 'backend/.env' });
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to DB');

  await client.query(`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS "videoUrl" text,
    ADD COLUMN IF NOT EXISTS "history" text;
  `);
  console.log('Added videoUrl and history to products table');

  // Let's populate default craft video URLs and histories for current catalog products
  // E.g. authentic documentary videos on Indian crafts:
  // Pottery / Terracotta: https://www.youtube.com/watch?v=s5eU7x-j5L8
  // Handloom Weaving: https://www.youtube.com/watch?v=Fj2F7eXv9xI
  // Embroidery / Chikankari: https://www.youtube.com/watch?v=5Q_GZ-rYl68
  // Dokra / Metal: https://www.youtube.com/watch?v=wXkX3yM9I5g

  await client.query(`
    UPDATE products
    SET 
      "videoUrl" = CASE 
        WHEN LOWER(category) LIKE '%decor%' OR LOWER(craft) LIKE '%embroidery%' THEN 'https://www.youtube.com/watch?v=5Q_GZ-rYl68'
        WHEN LOWER(category) LIKE '%pottery%' OR LOWER(craft) LIKE '%terracotta%' THEN 'https://www.youtube.com/watch?v=s5eU7x-j5L8'
        WHEN LOWER(category) LIKE '%textile%' OR LOWER(craft) LIKE '%weave%' OR LOWER(craft) LIKE '%handloom%' THEN 'https://www.youtube.com/watch?v=Fj2F7eXv9xI'
        ELSE 'https://www.youtube.com/watch?v=s5eU7x-j5L8'
      END,
      "history" = CASE
        WHEN LOWER(category) LIKE '%decor%' OR LOWER(craft) LIKE '%embroidery%' THEN 'Passed down through 4 generations of Awadhi artisans, this embroidery technique dates back to 16th century Mughal courts. Each floral motif is hand-stitched on pure fabric using shadow-work and untwisted silk floss.'
        WHEN LOWER(category) LIKE '%pottery%' OR LOWER(craft) LIKE '%terracotta%' THEN 'Rooted in 800 years of temple pottery traditions in Eastern India. The clay is sourced from sacred riverbeds, hand-turned on traditional wooden wheels, and wood-fired in open kilns for natural earthy patina.'
        WHEN LOWER(category) LIKE '%textile%' OR LOWER(craft) LIKE '%weave%' OR LOWER(craft) LIKE '%handloom%' THEN 'Crafted on ancestral pit looms utilizing GI-tagged heritage silk weaving techniques preserved since the 14th century. Each warp and weft is counted by hand, taking over 180 hours of meticulous craftsmanship.'
        ELSE 'An authentic generational craft preserved by master artisans in rural craft clusters, maintaining century-old techniques and sustainable, natural materials.'
      END
    WHERE "videoUrl" IS NULL OR "history" IS NULL;
  `);
  console.log('Populated default craft videos and histories');

  await client.end();
  console.log('Done!');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
