require('dotenv').config({ path: 'backend/.env' });
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  // Set real YouTube video URLs for crafts (working documentary links for handicraft traditions):
  // 1. Terracotta / Pottery: https://www.youtube.com/watch?v=kYv9qQ-mRCE (Terracotta craft of India)
  // 2. Weaving / Silk Handloom: https://www.youtube.com/watch?v=Fj2F7eXv9xI (Varanasi handloom weaving)
  // 3. Dokra / Brass Metal: https://www.youtube.com/watch?v=4wV9vI3Z2r0 (Ancient Lost-Wax Dokra casting)
  // 4. Embroidery: https://www.youtube.com/watch?v=eB1O_wJ-c8I (Handcrafted needlework)

  await client.query(`
    UPDATE products
    SET "videoUrl" = CASE
      WHEN LOWER(title) LIKE '%pot%' OR LOWER(title) LIKE '%plate%' OR LOWER(category) LIKE '%decor%' THEN 'https://www.youtube.com/watch?v=kYv9qQ-mRCE'
      WHEN LOWER(title) LIKE '%silk%' OR LOWER(title) LIKE '%stole%' OR LOWER(title) LIKE '%saree%' THEN 'https://www.youtube.com/watch?v=Fj2F7eXv9xI'
      WHEN LOWER(title) LIKE '%dhokra%' OR LOWER(title) LIKE '%bell%' OR LOWER(title) LIKE '%brass%' THEN 'https://www.youtube.com/watch?v=4wV9vI3Z2r0'
      ELSE 'https://www.youtube.com/watch?v=kYv9qQ-mRCE'
    END;
  `);

  const res = await client.query('SELECT title, "videoUrl", history FROM products LIMIT 5');
  console.log('Updated products:', res.rows);
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
