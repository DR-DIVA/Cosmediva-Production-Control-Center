import pg from 'pg';
const { Client } = pg;
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const client = new Client({
  connectionString: `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }
});
async function setupBucket() {
  await client.connect();
  await client.query(`
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('maintenance-media', 'maintenance-media', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  `);
  console.log('maintenance-media bucket ready in Supabase Storage!');
  const res = await client.query('SELECT id, name, public FROM storage.buckets');
  console.log('All Buckets:', res.rows);
  await client.end();
}
setupBucket().catch(console.error);
