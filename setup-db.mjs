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

    // Read SQL from the artifact
    const mdContent = fs.readFileSync('C:/Users/hp/.gemini/antigravity/brain/7f1a3657-7885-4f67-83bd-af128ac1d767/database_setup.md', 'utf-8');
    
    // Extract SQL between ```sql and ```
    const sqlMatch = mdContent.match(/```sql([\s\S]*?)```/);
    if (!sqlMatch || sqlMatch.length < 2) {
      throw new Error('Could not find SQL script in the markdown file.');
    }
    
    const sqlScript = sqlMatch[1].trim();

    console.log('Executing database setup script...');
    await client.query(sqlScript);
    console.log('Database setup completed successfully! Tables and seed data created.');
    
  } catch (err) {
    console.error('Error executing script:', err.message);
  } finally {
    await client.end();
  }
}

run();
