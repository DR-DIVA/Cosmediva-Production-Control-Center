const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const tables = ['profiles', 'users', 'departments', 'roles'];
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\n--- COLUMNS FOR ${t} ---`);
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`));
  }
  await client.end();
}

main().catch(console.error);
