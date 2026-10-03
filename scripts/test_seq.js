const pg = require('pg');
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function testSeq() {
  await client.connect();
  const res1 = await client.query("SELECT qms_get_next_number('QE', '2026') AS num");
  const res2 = await client.query("SELECT qms_get_next_number('QE', '2026') AS num");
  const res3 = await client.query("SELECT qms_get_next_number('DEV', '2026') AS num");
  console.log('Sequence test 1:', res1.rows[0].num);
  console.log('Sequence test 2:', res2.rows[0].num);
  console.log('Sequence test 3:', res3.rows[0].num);
  await client.end();
}

testSeq().catch(console.error);
