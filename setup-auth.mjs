import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const testUsers = [
  { email: 'admin@cosmediva.com', role: 'Admin' },
  { email: 'planner@cosmediva.com', role: 'Production Planner' },
  { email: 'mix4@cosmediva.com', role: 'Operator' },
  { email: 'mix5@cosmediva.com', role: 'Operator' },
  { email: 'room207@cosmediva.com', role: 'Operator' },
  { email: 'qc@cosmediva.com', role: 'QC' },
  { email: 'management@cosmediva.com', role: 'Viewer' }
];

async function setupAuthSQL() {
  await pgClient.connect();
  console.log('Connected to Postgres');

  await pgClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  for (const user of testUsers) {
    try {
      const prefix = user.email.split('@')[0];
      const res = await pgClient.query("SELECT id FROM public.users WHERE email LIKE $1", [`${prefix}%`]);
      
      let userId;
      if (res.rows.length > 0) {
        userId = res.rows[0].id;
      } else {
        const idRes = await pgClient.query("SELECT gen_random_uuid() as id");
        userId = idRes.rows[0].id;
      }

      console.log(`Inserting Auth for ${user.email} with ID ${userId}...`);

      await pgClient.query(`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', $1::uuid, 'authenticated', 'authenticated', $2, 
          crypt($3, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now()
        ) ON CONFLICT (id) DO NOTHING;
      `, [userId, user.email, 'password123']);

      await pgClient.query(`
        INSERT INTO auth.identities (
          id, provider_id, user_id, identity_data, provider, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1::text, $1::uuid, format('{"sub":"%s","email":"%s"}', $1::text, $2::text)::jsonb, 'email', now(), now()
        ) ON CONFLICT DO NOTHING;
      `, [userId, user.email]);
      
      await pgClient.query('UPDATE public.users SET email = $1 WHERE id = $2', [user.email, userId]);

      console.log(`Successfully created Auth via SQL for ${user.email}`);

    } catch (err) {
      console.error(`Failed for ${user.email}:`, err.message);
    }
  }

  await pgClient.end();
  console.log('Done!');
}

setupAuthSQL();
