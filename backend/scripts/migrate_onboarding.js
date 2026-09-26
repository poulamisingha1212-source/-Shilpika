require('dotenv').config({ path: 'backend/.env' });
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to DB');

  await client.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS "onboardingCompleted" boolean DEFAULT false;
  `);
  console.log('Added onboardingCompleted to users');

  await client.query(`
    ALTER TABLE artisan_profiles 
    ADD COLUMN IF NOT EXISTS "aadhaarNumber" text,
    ADD COLUMN IF NOT EXISTS "address" text;
  `);
  console.log('Added aadhaarNumber & address to artisan_profiles');

  await client.end();
  console.log('Migration complete');
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
