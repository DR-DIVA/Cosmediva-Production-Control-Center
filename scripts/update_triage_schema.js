const pg = require('pg');
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function updateSchema() {
  await client.connect();
  console.log('Adding impact assessment & containment types to qms_quality_events...');
  
  await client.query(`
    ALTER TABLE qms_quality_events 
    ADD COLUMN IF NOT EXISTS initial_impact_assessment JSONB DEFAULT '{
      "product_quality": "NO",
      "consumer_safety": "NO",
      "regulatory_labeling": "NO",
      "gmp_compliance": "NO",
      "customer_requirement": "NO",
      "production_batch": "NO",
      "other_batch_market": "NO"
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS containment_types JSONB DEFAULT '[]'::jsonb;
  `);

  console.log('Columns added successfully!');
  await client.end();
}

updateSchema().catch(console.error);
