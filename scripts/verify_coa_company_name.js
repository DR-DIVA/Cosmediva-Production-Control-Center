const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('================================================================');
  console.log('RE-RUNNING COA GENERATION FOR LOT-2026-0058 WITH COMPANY MASTER');
  console.log('================================================================\n');

  const rel = await client.query("SELECT id, lot_no, sku_code, product_name FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0058';");
  const release = rel.rows[0];

  const createJiti = require('jiti');
  const jiti = createJiti(__filename, { alias: { '@/*': './src/*' } });
  const { generateCoaData, getCompanyProfile } = jiti('../src/app/actions/qms_batch_release.ts');

  // Verify getCompanyProfile
  const profile = await getCompanyProfile();
  console.log('Shared Company Master Profile:', profile);

  if (profile.name_en !== 'COSMEDIVA CO., LTD.') {
    throw new Error(`Expected COSMEDIVA CO., LTD. but got ${profile.name_en}`);
  }
  if (profile.name_th !== 'บริษัท คอสเมดิวา จำกัด') {
    throw new Error(`Expected บริษัท คอสเมดิวา จำกัด but got ${profile.name_th}`);
  }
  console.log('✅ Company Master profile validated.\n');

  // Generate COA for LOT-2026-0058
  const coa = await generateCoaData(release.id, {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'ภญ. วริศรา มั่นคง (QA Manager)'
  });

  console.log('Generated COA Header & Manufacturer Details:');
  console.log('COA No:', coa.coa_no);
  console.log('Manufacturer EN:', coa.manufacturer.name_en);
  console.log('Manufacturer TH:', coa.manufacturer.name_th);
  console.log('Manufacturer Standard:', coa.manufacturer.standard);
  console.log('Manufacturer Address:', coa.manufacturer.address);
  console.log('Tax ID:', coa.manufacturer.tax_id);

  if (coa.manufacturer.name_en !== 'COSMEDIVA CO., LTD.') {
    throw new Error(`COA manufacturer name_en mismatch: ${coa.manufacturer.name_en}`);
  }
  if (coa.manufacturer.name_th !== 'บริษัท คอสเมดิวา จำกัด') {
    throw new Error(`COA manufacturer name_th mismatch: ${coa.manufacturer.name_th}`);
  }

  console.log('\n✅ PASS: COA for LOT-2026-0058 strictly retrieves legal company name "COSMEDIVA CO., LTD." from Company Master!');

  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
