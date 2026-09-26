require('dotenv').config({ path: 'backend/.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  await client.query(`
    UPDATE products
    SET 
      "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=kYv9qQ-mRCE'),
      "history" = COALESCE("history", 'Passed down through multiple generations of master craftspeople, this heritage technique preserves timeless artisanal artistry with sustainably sourced natural materials.')
  `);
  await client.query(`
    UPDATE products SET "priceMin" = 450, "priceMax" = 450 WHERE title = 'Odisha Terracotta Moon Pot' AND ("priceMax" IS NULL OR "priceMax" = 0);
    UPDATE products SET "priceMin" = 650, "priceMax" = 650 WHERE title = 'Handcrafted Terracotta Vase' AND ("priceMax" IS NULL OR "priceMax" = 0);
    UPDATE products SET "priceMin" = 2200, "priceMax" = 2200 WHERE title = 'Dhokra Brass Elephant Figurine' AND ("priceMax" IS NULL OR "priceMax" = 0);
    UPDATE products SET "priceMin" = 850, "priceMax" = 850 WHERE title = 'Dhokra Brass Bell' AND ("priceMax" IS NULL OR "priceMax" = 0);
    UPDATE products SET "priceMin" = 750, "priceMax" = 750 WHERE title ILIKE '%pottery vase%' AND ("priceMax" IS NULL OR "priceMax" = 0);
    UPDATE products SET "priceMin" = 600, "priceMax" = 600 WHERE "priceMax" IS NULL OR "priceMax" = 0;
  `);
  const res = await client.query('SELECT title, craft, category, region, "videoUrl", history, "priceMin", "priceMax" FROM products');
  res.rows.forEach((r, i) => {
    console.log(`[${i+1}] ${r.title} | ${r.craft} | ${r.region} | Fixed Price: ₹${r.priceMax} | Video: ${r.videoUrl}`);
  });
  await client.end();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
