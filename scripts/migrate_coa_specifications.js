const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const client = new pg.Client({
  connectionString: `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await client.connect();
  console.log('--- Migrating Database for COA Source & Specification Integrity ---');

  // 1. Create qms_product_specifications table
  await client.query(`
    CREATE TABLE IF NOT EXISTS qms_product_specifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      sku_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      spec_code TEXT NOT NULL UNIQUE,
      spec_version INTEGER NOT NULL DEFAULT 1,
      product_category TEXT NOT NULL,
      template_id UUID REFERENCES qms_release_templates(id),
      effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
      review_due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '2 years'),
      approved_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'APPROVED', 'OBSOLETE')),
      parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
      conclusion_template TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qms_product_specifications_prod ON qms_product_specifications(product_id);
    CREATE INDEX IF NOT EXISTS idx_qms_product_specifications_sku ON qms_product_specifications(sku_code);
  `);
  console.log('✓ Created qms_product_specifications table');

  // 2. Create qms_lot_qc_analytical_results table
  await client.query(`
    CREATE TABLE IF NOT EXISTS qms_lot_qc_analytical_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      production_lot_id UUID NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
      lot_no TEXT NOT NULL,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      sku_code TEXT NOT NULL,
      specification_id UUID NOT NULL REFERENCES qms_product_specifications(id) ON DELETE RESTRICT,
      spec_code TEXT NOT NULL,
      spec_version INTEGER NOT NULL DEFAULT 1,
      parameter_key TEXT NOT NULL,
      parameter_th TEXT NOT NULL,
      parameter_en TEXT NOT NULL,
      specification TEXT NOT NULL,
      test_method TEXT NOT NULL,
      actual_result TEXT NOT NULL,
      result_status TEXT NOT NULL CHECK (result_status IN ('PASS', 'FAIL', 'NOT_APPLICABLE', 'PENDING')),
      is_microbial BOOLEAN DEFAULT FALSE,
      is_exempt BOOLEAN DEFAULT FALSE,
      exemption_reason TEXT,
      tested_by TEXT NOT NULL DEFAULT 'นักวิเคราะห์ QC (CosmeDiva QC Lab)',
      tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_by TEXT NOT NULL DEFAULT 'ภญ. นภาพร เลิศวิจิตร (QC Supervisor)',
      approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_uat_data BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qms_qc_results_lot ON qms_lot_qc_analytical_results(production_lot_id);
    CREATE INDEX IF NOT EXISTS idx_qms_qc_results_lotno ON qms_lot_qc_analytical_results(lot_no);
    CREATE INDEX IF NOT EXISTS idx_qms_qc_results_spec ON qms_lot_qc_analytical_results(specification_id);
  `);
  console.log('✓ Created qms_lot_qc_analytical_results table');

  await client.end();
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
