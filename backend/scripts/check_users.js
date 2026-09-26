require('dotenv').config({ path: 'backend/.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  // Reset onboardingCompleted to false so the user can test the onboarding flow live in browser
  await client.query('UPDATE users SET "onboardingCompleted" = false WHERE email = $1', ['netaisamanta7001@gmail.com']);
  const res = await client.query('SELECT id, email, role, "displayName", "onboardingCompleted" FROM users WHERE email = $1', ['netaisamanta7001@gmail.com']);
  console.log('Reset user status:', res.rows[0]);
  await client.end();
}).catch(err => {
  console.error('DB error:', err.message);
  process.exit(1);
});
