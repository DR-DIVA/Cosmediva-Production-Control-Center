import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function updateSchema() {
  await pgClient.connect();
  try {
    await pgClient.query(`
      ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS sub_step character varying(50);
    `);
    console.log("Successfully added sub_step to production_logs");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

updateSchema();
