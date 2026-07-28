import bcrypt from 'bcryptjs';
import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fixPasswords() {
  await pgClient.connect();
  const hash = await bcrypt.hash('password123', 10);
  console.log('New hash:', hash);
  await pgClient.query("UPDATE auth.users SET encrypted_password = $1", [hash]);
  
  // also let's fix identities identity_data if needed
  // standard identity_data: {"sub":"...", "email":"...", "email_verified": false, "phone_verified": false}
  await pgClient.query(`
    UPDATE auth.identities 
    SET identity_data = jsonb_build_object(
      'sub', user_id, 
      'email', (SELECT email FROM auth.users WHERE auth.users.id = auth.identities.user_id),
      'email_verified', true,
      'phone_verified', false
    )
  `);

  await pgClient.end();
  console.log('Done fixing passwords and identities');
}

fixPasswords();
