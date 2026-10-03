const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await pgClient.connect();
  console.log('Connected to DB for Phase 5 Batch QA Review & Release migration...');

  // 1. Create qms_release_templates
  console.log('1. Creating qms_release_templates table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_release_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_code VARCHAR(50) UNIQUE NOT NULL,
      template_name VARCHAR(255) NOT NULL,
      product_category VARCHAR(100) NOT NULL,
      standard_yield_min_pct NUMERIC(5,2) DEFAULT 97.00,
      standard_yield_max_pct NUMERIC(5,2) DEFAULT 102.00,
      yield_spec_reference TEXT DEFAULT 'CosmeDiva Approved Master Spec SOP-PRD-008',
      description TEXT,
      is_default BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. Create qms_release_template_gates
  console.log('2. Creating qms_release_template_gates table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_release_template_gates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES qms_release_templates(id) ON DELETE CASCADE,
      gate_number INT NOT NULL,
      gate_code VARCHAR(50) NOT NULL,
      gate_title_th VARCHAR(255) NOT NULL,
      gate_title_en VARCHAR(255) NOT NULL,
      requirement_level VARCHAR(30) NOT NULL DEFAULT 'REQUIRED',
      default_na_justification TEXT,
      source_entity VARCHAR(100),
      evaluation_type VARCHAR(50) DEFAULT 'AUTO_SYSTEM_LINK',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. Create qms_batch_releases
  console.log('3. Creating qms_batch_releases table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_batch_releases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      release_no VARCHAR(50) UNIQUE NOT NULL,
      production_lot_id UUID NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
      lot_no VARCHAR(100) NOT NULL,
      sku_id UUID REFERENCES products(id),
      sku_code VARCHAR(100),
      product_name VARCHAR(255),
      batch_size_kg NUMERIC(10,2),
      planned_quantity NUMERIC(10,2),
      actual_quantity NUMERIC(10,2),
      unit VARCHAR(30),
      template_id UUID REFERENCES qms_release_templates(id),
      overall_status VARCHAR(50) NOT NULL DEFAULT 'WAITING_FOR_RESULT',
      is_blocked BOOLEAN DEFAULT FALSE,
      blocking_reasons JSONB DEFAULT '[]'::jsonb,
      total_gates_count INT DEFAULT 12,
      passed_gates_count INT DEFAULT 0,
      na_gates_count INT DEFAULT 0,
      pending_gates_count INT DEFAULT 0,
      failed_gates_count INT DEFAULT 0,
      open_capa_count INT DEFAULT 0,
      capa_impact_reviewed BOOLEAN DEFAULT FALSE,
      capa_impact_notes TEXT,
      capa_impact_reviewed_by UUID,
      capa_impact_reviewed_by_name VARCHAR(150),
      capa_impact_reviewed_at TIMESTAMPTZ,
      yield_actual_pct NUMERIC(5,2),
      yield_spec_min_pct NUMERIC(5,2),
      yield_spec_max_pct NUMERIC(5,2),
      yield_status VARCHAR(30) DEFAULT 'IN_SPEC',
      micro_method_code VARCHAR(100),
      micro_status VARCHAR(50),
      coa_status VARCHAR(50) DEFAULT 'NOT_GENERATED',
      coa_data JSONB DEFAULT '{}'::jsonb,
      coa_approved_at TIMESTAMPTZ,
      coa_approved_by UUID,
      coa_approved_by_name VARCHAR(150),
      current_disposition VARCHAR(50),
      disposition_notes TEXT,
      disposition_at TIMESTAMPTZ,
      disposition_by UUID,
      disposition_by_name VARCHAR(150),
      disposition_by_role VARCHAR(100),
      released_at TIMESTAMPTZ,
      released_by UUID,
      released_by_name VARCHAR(150),
      non_conformance_path VARCHAR(50),
      rework_protocol_no VARCHAR(100),
      record_version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 4. Create qms_batch_release_gate_evaluations
  console.log('4. Creating qms_batch_release_gate_evaluations table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_batch_release_gate_evaluations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_release_id UUID NOT NULL REFERENCES qms_batch_releases(id) ON DELETE CASCADE,
      gate_number INT NOT NULL,
      gate_code VARCHAR(50) NOT NULL,
      gate_title_th VARCHAR(255) NOT NULL,
      gate_title_en VARCHAR(255) NOT NULL,
      requirement_level VARCHAR(30) NOT NULL DEFAULT 'REQUIRED',
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      is_hard_block BOOLEAN DEFAULT FALSE,
      hard_block_message TEXT,
      na_reason TEXT,
      source_entity VARCHAR(100),
      source_record_id VARCHAR(150),
      source_status VARCHAR(100),
      source_last_updated TIMESTAMPTZ,
      responsible_function VARCHAR(100),
      linked_data JSONB DEFAULT '{}'::jsonb,
      qa_comment TEXT,
      verified_by UUID,
      verified_by_name VARCHAR(150),
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Create qms_batch_release_dispositions
  console.log('5. Creating qms_batch_release_dispositions table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_batch_release_dispositions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_release_id UUID NOT NULL REFERENCES qms_batch_releases(id) ON DELETE CASCADE,
      decision VARCHAR(50) NOT NULL,
      reason_rationale TEXT NOT NULL,
      non_conformance_disposition VARCHAR(50),
      rework_protocol_reference VARCHAR(100),
      authorized_by UUID NOT NULL,
      authorized_by_name VARCHAR(150) NOT NULL,
      authorized_by_role VARCHAR(100) NOT NULL,
      authorized_at TIMESTAMPTZ DEFAULT NOW(),
      lot_state_before VARCHAR(50),
      lot_state_after VARCHAR(50),
      record_version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 6. Seed default Cosmetics Release Templates
  console.log('6. Seeding default Cosmetics Release Templates and Gates...');
  const tplCheck = await pgClient.query("SELECT COUNT(*) FROM qms_release_templates WHERE template_code = 'TPL-COSMETIC-EMULSION'");
  if (parseInt(tplCheck.rows[0].count) === 0) {
    const res = await pgClient.query(`
      INSERT INTO qms_release_templates (template_code, template_name, product_category, standard_yield_min_pct, standard_yield_max_pct, yield_spec_reference, description, is_default)
      VALUES (
        'TPL-COSMETIC-EMULSION',
        'Standard Cosmetic Emulsion / Cream / Lotion (ISO 22716 Finished Product)',
        'EMULSION_CREAM',
        97.00,
        102.00,
        'CosmeDiva Spec SP-FG-001 (Cream/Lotion Yield Tolerance)',
        'Default 12-gate release template for O/W and W/O skin creams, lotions, and emulsions.',
        TRUE
      ) RETURNING id;
    `);
    const templateId = res.rows[0].id;

    // Seed 12 gates for default template
    const gates = [
      { num: 1, code: 'GATE_01_RM_PM', th: 'การตรวจปล่อยวัตถุดิบและบรรจุภัณฑ์', en: 'RM/PM Release Status', req: 'REQUIRED', src: 'production_lot_rms & wms_inventory_lots' },
      { num: 2, code: 'GATE_02_BOM', th: 'การใช้วัตถุดิบถูกต้องตามสูตรและ BOM', en: 'Formula BOM & Master Recipe Adherence', req: 'REQUIRED', src: 'product_bom' },
      { num: 3, code: 'GATE_03_BMR', th: 'ความสมบูรณ์ของบันทึกการผลิต (BMR/BPR)', en: 'Batch Record Sign-offs & Completeness', req: 'REQUIRED', src: 'production_logs' },
      { num: 4, code: 'GATE_04_LINE_CLEAR', th: 'การตรวจความสะอาดและการเคลียร์ไลน์', en: 'Line Clearance & Sanitation Verification', req: 'REQUIRED', src: 'production_logs (Line Clearance)' },
      { num: 5, code: 'GATE_05_IPC', th: 'การควบคุมระหว่างกระบวนการผลิต (IPC)', en: 'In-Process Control (IPC) Compliance', req: 'REQUIRED', src: 'defect_logs / IPC Records' },
      { num: 6, code: 'GATE_06_PHYS_CHEM', th: 'ผลวิเคราะห์ทางเคมีและกายภาพของเนื้อครีม (Bulk)', en: 'Bulk Physical & Chemical QC Release', req: 'REQUIRED', src: 'qc_results' },
      { num: 7, code: 'GATE_07_MICRO', th: 'ผลวิเคราะห์ทางจุลชีววิทยาตามเกณฑ์มาตรฐาน', en: 'Microbiological Clearance (TAMC/TYMC/Pathogens)', req: 'REQUIRED', src: 'qc_results (Micro)' },
      { num: 8, code: 'GATE_08_DEVIATION', th: 'การตรวจสอบเหตุการณ์คุณภาพและข้อเบี่ยงเบน', en: 'Quality Event & Deviation Interlock', req: 'REQUIRED', src: 'qms_quality_events & qms_capas' },
      { num: 9, code: 'GATE_09_YIELD', th: 'การกระทบยอดผลผลิตตามเกณฑ์เฉพาะของผลิตภัณฑ์', en: 'Yield & Mass Balance Reconciliation', req: 'REQUIRED', src: 'production_lots' },
      { num: 10, code: 'GATE_10_LABEL_CODE', th: 'การตรวจสอบฉลาก รหัสรุ่น และวันหมดอายุ', en: 'Primary/Secondary Label & Lot Coding Check', req: 'REQUIRED', src: 'Packaging Run Inspection' },
      { num: 11, code: 'GATE_11_RETAIN_SAMPLE', th: 'การจัดเก็บตัวอย่างอ้างอิงและตัวอย่างเก็บไว้', en: 'Retain Sample Deposit & Registration', req: 'REQUIRED', src: 'Retain Room Vault' },
      { num: 12, code: 'GATE_12_COA', th: 'การออกและอนุมัติใบรับรองผลวิเคราะห์ (COA)', en: 'Certificate of Analysis (COA) Review', req: 'REQUIRED', src: 'Auto-Compiled from Approved QC' }
    ];

    for (const g of gates) {
      await pgClient.query(`
        INSERT INTO qms_release_template_gates (template_id, gate_number, gate_code, gate_title_th, gate_title_en, requirement_level, source_entity)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [templateId, g.num, g.code, g.th, g.en, g.req, g.src]);
    }

    // Seed Anhydrous Cleansing Oil Template (where Micro is N/A)
    const resOil = await pgClient.query(`
      INSERT INTO qms_release_templates (template_code, template_name, product_category, standard_yield_min_pct, standard_yield_max_pct, yield_spec_reference, description, is_default)
      VALUES (
        'TPL-ANHYDROUS-OIL',
        'Anhydrous Cosmetic Oil / Waterless Serum (Micro N/A Justified)',
        'ANHYDROUS_SERUM_OIL',
        98.00,
        101.50,
        'CosmeDiva Spec SP-OIL-003 (Anhydrous Oil Yield Spec)',
        'Release template for anhydrous formulations without aqueous phase (Aw < 0.60, micro testing exempt).',
        FALSE
      ) RETURNING id;
    `);
    const oilTemplateId = resOil.rows[0].id;

    for (const g of gates) {
      const isMicro = g.code === 'GATE_07_MICRO';
      await pgClient.query(`
        INSERT INTO qms_release_template_gates (template_id, gate_number, gate_code, gate_title_th, gate_title_en, requirement_level, default_na_justification, source_entity)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, [
        oilTemplateId,
        g.num,
        g.code,
        g.th,
        g.en,
        isMicro ? 'NOT_APPLICABLE' : g.req,
        isMicro ? 'SOP-QC-014 Cl. 4.2: Anhydrous oil formulation with Aw < 0.60 exempt from routine microbial challenge.' : null,
        g.src
      ]);
    }
  }

  // 7. Seed sequence for Batch Release number
  console.log('7. Ensuring numbering sequence for Batch Release (REL-YYYY-XXXX)...');
  const currentYear = new Date().getFullYear().toString();
  const testSeq = await pgClient.query("SELECT qms_get_next_number('REL', $1) AS num", [currentYear]);
  console.log(`7. Verified Batch Release sequence generator: ${testSeq.rows[0].num}`);

  console.log('Phase 5 Batch QA Review & Release migration completed successfully.');
  await pgClient.end();
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
