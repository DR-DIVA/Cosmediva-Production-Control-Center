import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkUser() {
  await pgClient.connect();
  const res = await pgClient.query("SELECT id, email, encrypted_password, aud, role, is_sso_user, deleted_at, is_super_admin FROM auth.users WHERE email = 'admin@cosmediva.com'");
  console.log(res.rows[0]);
  await pgClient.end();
}

checkUser();
