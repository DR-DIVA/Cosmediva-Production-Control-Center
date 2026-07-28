import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

// URL-encode the password to handle special characters like /
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const dbUser = 'postgres.yzwldawflteyywuetzcw';
const dbHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const dbPort = '6543';
const dbName = 'postgres';

const connectionString = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlScript = fs.readFileSync('supabase/migrations/20260724154400_fg_warehouse.sql', 'utf-8');

    console.log('Executing FG Warehouse setup script...');
    await client.query(sqlScript);
    console.log('Database setup completed successfully! FG Tables created.');
    
  } catch (err) {
    console.error('Error executing script:', err.message);
  } finally {
    await client.end();
  }
}

run();
