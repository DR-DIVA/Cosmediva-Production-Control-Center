const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const client = new pg.Client({
  connectionString: `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Seeding Master Specifications & Controlled UAT Analytical QC Results...');

  // 1. Fetch templates
  const emulsionTpl = await client.query("SELECT id FROM qms_release_templates WHERE template_code = 'TPL-COSMETIC-EMULSION' LIMIT 1;");
  const oilTpl = await client.query("SELECT id FROM qms_release_templates WHERE template_code = 'TPL-ANHYDROUS-OIL' LIMIT 1;");
  const emulsionTplId = emulsionTpl.rows[0].id;
  const oilTplId = oilTpl.rows[0].id;

  // 2. Ensure products exist with correct SKUs and Names
  const productDefinitions = [
    { sku: 'JHD-105', name: 'CosmeDiva Pure Argan Cleansing Oil 100ml', size: '100ml', unit: 'ชิ้น' },
    { sku: 'JHD-309', name: 'CosmeDiva White Booster Cream 50g', size: '50g', unit: 'ชิ้น' },
    { sku: 'JHD-202', name: 'CosmeDiva Acne Clarifying Toner 150ml', size: '150ml', unit: 'ชิ้น' },
    { sku: 'JHD-301', name: 'CosmeDiva Hydrating Serum 30ml', size: '30ml', unit: 'ชิ้น' },
    { sku: 'JHD-405', name: 'CosmeDiva Daily Sunscreen SPF50+ 40g', size: '40g', unit: 'ชิ้น' },
    { sku: 'JHD-101', name: 'CosmeDiva Intensive Night Cream 50g', size: '50g', unit: 'ชิ้น' },
  ];

  const productMap = {};
  for (const p of productDefinitions) {
    let r = await client.query("SELECT id FROM products WHERE sku = $1;", [p.sku]);
    if (r.rows.length === 0) {
      r = await client.query(`
        INSERT INTO products (sku, product_name, product_size, standard_batch_size, default_unit, is_active)
        VALUES ($1, $2, $3, 1000, $4, true)
        RETURNING id;
      `, [p.sku, p.name, p.size, p.unit]);
    } else {
      await client.query("UPDATE products SET product_name = $1, product_size = $2 WHERE id = $3;", [p.name, p.size, r.rows[0].id]);
    }
    productMap[p.sku] = r.rows[0].id;
    console.log(`✓ Product ${p.sku} -> ${r.rows[0].id}`);
  }

  // 3. Clear existing specs
  await client.query("DELETE FROM qms_lot_qc_analytical_results;");
  await client.query("DELETE FROM qms_product_specifications;");

  // 4. Seed Specifications
  // 4.1 SPEC-JHD-105-01 (Pure Argan Cleansing Oil 100ml)
  const specOilRes = await client.query(`
    INSERT INTO qms_product_specifications (
      product_id, sku_code, product_name, spec_code, spec_version, product_category, template_id,
      approved_by, parameters, conclusion_template
    ) VALUES ($1, 'JHD-105', 'CosmeDiva Pure Argan Cleansing Oil 100ml', 'SPEC-JHD-105-01', 1, 'ANHYDROUS_SERUM_OIL', $2,
      'ภญ. สุภาพร สุขสมบัติ (R&D Director) & ภญ. วริศรา มั่นคง (QA Manager)',
      $3,
      'ผลการตรวจวิเคราะห์ทางเคมี-กายภาพเป็นไปตามเกณฑ์มาตรฐานผลิตภัณฑ์เครื่องสำอางที่ได้รับอนุมัติ และได้รับการยกเว้นการทดสอบทางจุลชีววิทยาตาม ISO 29621 (Conforms to Approved Anhydrous Cosmetic Specification. Microbiological testing exempt per ISO 29621 low-risk formulation Aw < 0.60)'
    ) RETURNING id;
  `, [
    productMap['JHD-105'],
    oilTplId,
    JSON.stringify([
      {
        parameter_key: 'appearance',
        parameter_th: 'ลักษณะทางกายภาพ',
        parameter_en: 'Appearance',
        specification: 'ของเหลวน้ำมันใส สีเหลืองทอง มีกลิ่นเฉพาะตัว ไม่มีตะกอนหรือสิ่งแปลกปลอม (Clear golden oil, characteristic aroma, free of particulate and foreign matters)',
        test_method: 'Visual Inspection (SOP-QC-001)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'specific_gravity',
        parameter_th: 'ความถ่วงจำเพาะ (Specific Gravity at 25°C)',
        parameter_en: 'Specific Gravity (at 25°C)',
        specification: '0.910 – 0.925 g/mL',
        test_method: 'Pycnometer (SOP-QC-004)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'refractive_index',
        parameter_th: 'ดัชนีการหักเหของแสง (Refractive Index at 25°C)',
        parameter_en: 'Refractive Index (at 25°C)',
        specification: '1.465 – 1.475',
        test_method: 'Abbe Refractometer (SOP-QC-005)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'acid_value',
        parameter_th: 'ค่าความเป็นกรด (Acid Value)',
        parameter_en: 'Acid Value',
        specification: '≤ 2.0 mg KOH/g',
        test_method: 'Titration Method (SOP-QC-006)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'peroxide_value',
        parameter_th: 'ค่าเปอร์ออกไซด์ (Peroxide Value)',
        parameter_en: 'Peroxide Value',
        specification: '≤ 10.0 meq O2/kg',
        test_method: 'Titration Method (SOP-QC-007)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'water_activity',
        parameter_th: 'ค่าวอเตอร์แอกติวิตี (Water Activity, Aw at 25°C)',
        parameter_en: 'Water Activity (Aw at 25°C)',
        specification: '< 0.60 Aw (Non-aqueous lipid formulation)',
        test_method: 'Water Activity Meter (SOP-QC-014)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'microbiology',
        parameter_th: 'การทดสอบทางจุลชีววิทยา (Microbiological Testing)',
        parameter_en: 'Routine Microbiological Challenge (TAMC / TYMC / Pathogens)',
        specification: 'ยกเว้นการทดสอบตามมาตรฐาน ISO 29621 / SOP-QC-014 (Exempt: Aw < 0.60 anhydrous formulation does not support microbial proliferation)',
        test_method: 'ISO 29621 / SOP-QC-014 (Microbiological Risk Assessment)',
        is_mandatory: false,
        is_microbial: true,
        exemption_allowed: true,
        exemption_reference: 'SOP-QC-014 Cl. 4.2 / ISO 29621: Low-risk product Aw < 0.60'
      }
    ])
  ]);
  const specOilId = specOilRes.rows[0].id;
  console.log(`✓ Spec SPEC-JHD-105-01 created: ${specOilId}`);

  // 4.2 SPEC-JHD-309-01 (White Booster Cream 50g)
  const specCreamRes = await client.query(`
    INSERT INTO qms_product_specifications (
      product_id, sku_code, product_name, spec_code, spec_version, product_category, template_id,
      approved_by, parameters, conclusion_template
    ) VALUES ($1, 'JHD-309', 'CosmeDiva White Booster Cream 50g', 'SPEC-JHD-309-01', 1, 'EMULSION_CREAM', $2,
      'ภญ. สุภาพร สุขสมบัติ (R&D Director) & ภญ. วริศรา มั่นคง (QA Manager)',
      $3,
      'ผลการตรวจวิเคราะห์ทางเคมี กายภาพ และจุลชีววิทยาเป็นไปตามเกณฑ์มาตรฐานผลิตภัณฑ์เครื่องสำอางทุกประการ (Conforms to Approved Cosmetic Product Specification & ASEAN Cosmetic Directive)'
    ) RETURNING id;
  `, [
    productMap['JHD-309'],
    emulsionTplId,
    JSON.stringify([
      {
        parameter_key: 'appearance',
        parameter_th: 'ลักษณะทางกายภาพ',
        parameter_en: 'Appearance',
        specification: 'เนื้อครีมเนียนละเอียด สีขาว ไม่พบสิ่งแปลกปลอม (Smooth white cream, free of foreign matters)',
        test_method: 'Visual Inspection (SOP-QC-001)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'ph',
        parameter_th: 'ความเป็นกรด-ด่าง (pH Value at 25°C)',
        parameter_en: 'pH Value (at 25°C)',
        specification: '5.20 – 6.20',
        test_method: 'pH Meter (SOP-QC-002)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'viscosity',
        parameter_th: 'ความหนืด (Viscosity at 25°C)',
        parameter_en: 'Viscosity (cP at 25°C)',
        specification: '12,000 – 18,000 cP (Spindle 4, 12 rpm)',
        test_method: 'Brookfield Viscometer (SOP-QC-003)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'specific_gravity',
        parameter_th: 'ความถ่วงจำเพาะ (Specific Gravity at 25°C)',
        parameter_en: 'Specific Gravity (at 25°C)',
        specification: '0.980 – 1.020 g/mL',
        test_method: 'Pycnometer (SOP-QC-004)',
        is_mandatory: true,
        is_microbial: false,
        exemption_allowed: false
      },
      {
        parameter_key: 'tamc',
        parameter_th: 'จำนวนจุลินทรีย์รวม (TAMC)',
        parameter_en: 'Total Aerobic Microbial Count',
        specification: '< 500 CFU/g (ASEAN Cosmetic Limit: <1,000 CFU/g)',
        test_method: 'Plate Count Method (SOP-QC-008)',
        is_mandatory: true,
        is_microbial: true,
        exemption_allowed: false
      },
      {
        parameter_key: 'tymc',
        parameter_th: 'ยีสต์และรา (TYMC)',
        parameter_en: 'Total Combined Yeasts and Molds',
        specification: '< 50 CFU/g (ASEAN Cosmetic Limit: <100 CFU/g)',
        test_method: 'Pour Plate Method (SOP-QC-008)',
        is_mandatory: true,
        is_microbial: true,
        exemption_allowed: false
      },
      {
        parameter_key: 'pathogens',
        parameter_th: 'เชื้อก่อโรคที่ระบุ (Pathogens)',
        parameter_en: 'Specified Pathogens (P. aeruginosa, S. aureus, C. albicans)',
        specification: 'ต้องไม่พบใน 0.1 กรัม (Absent in 0.1g)',
        test_method: 'Enrichment Method (ISO 22718 / 22717 / 18416)',
        is_mandatory: true,
        is_microbial: true,
        exemption_allowed: false
      }
    ])
  ]);
  const specCreamId = specCreamRes.rows[0].id;
  console.log(`✓ Spec SPEC-JHD-309-01 created: ${specCreamId}`);

  // 4.3 SPEC-JHD-202-01 (Toner)
  const specTonerRes = await client.query(`
    INSERT INTO qms_product_specifications (
      product_id, sku_code, product_name, spec_code, spec_version, product_category, template_id,
      approved_by, parameters, conclusion_template
    ) VALUES ($1, 'JHD-202', 'CosmeDiva Acne Clarifying Toner 150ml', 'SPEC-JHD-202-01', 1, 'AQUEOUS_SOLUTION', $2,
      'ภญ. สุภาพร สุขสมบัติ (R&D Director)',
      $3,
      'ผลการตรวจวิเคราะห์ทางเคมี กายภาพ และจุลชีววิทยาเป็นไปตามเกณฑ์มาตรฐานผลิตภัณฑ์เครื่องสำอางทุกประการ (Conforms to Approved Cosmetic Product Specification & ASEAN Cosmetic Directive)'
    ) RETURNING id;
  `, [
    productMap['JHD-202'],
    emulsionTplId,
    JSON.stringify([
      { parameter_key: 'appearance', parameter_th: 'ลักษณะทางกายภาพ', parameter_en: 'Appearance', specification: 'ของเหลวใส ไม่มีสี กลิ่นสมุนไพรเฉพาะตัว (Clear colorless liquid, herbal scent)', test_method: 'Visual Inspection (SOP-QC-001)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'ph', parameter_th: 'ความเป็นกรด-ด่าง (pH at 25°C)', parameter_en: 'pH Value (at 25°C)', specification: '5.00 – 5.80', test_method: 'pH Meter (SOP-QC-002)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'specific_gravity', parameter_th: 'ความถ่วงจำเพาะ (Specific Gravity at 25°C)', parameter_en: 'Specific Gravity (at 25°C)', specification: '1.000 – 1.015 g/mL', test_method: 'Pycnometer (SOP-QC-004)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'tamc', parameter_th: 'จำนวนจุลินทรีย์รวม (TAMC)', parameter_en: 'Total Aerobic Microbial Count', specification: '< 500 CFU/g', test_method: 'Plate Count Method (SOP-QC-008)', is_mandatory: true, is_microbial: true },
      { parameter_key: 'tymc', parameter_th: 'ยีสต์และรา (TYMC)', parameter_en: 'Total Combined Yeasts and Molds', specification: '< 50 CFU/g', test_method: 'Pour Plate Method (SOP-QC-008)', is_mandatory: true, is_microbial: true },
      { parameter_key: 'pathogens', parameter_th: 'เชื้อก่อโรคที่ระบุ (Pathogens)', parameter_en: 'Specified Pathogens', specification: 'ต้องไม่พบใน 0.1 กรัม (Absent in 0.1g)', test_method: 'Enrichment Method (ISO 22718)', is_mandatory: true, is_microbial: true }
    ])
  ]);

  // 4.4 SPEC-JHD-301-01 (Serum)
  const specSerumRes = await client.query(`
    INSERT INTO qms_product_specifications (
      product_id, sku_code, product_name, spec_code, spec_version, product_category, template_id,
      approved_by, parameters, conclusion_template
    ) VALUES ($1, 'JHD-301', 'CosmeDiva Hydrating Serum 30ml', 'SPEC-JHD-301-01', 1, 'AQUEOUS_SOLUTION', $2,
      'ภญ. สุภาพร สุขสมบัติ (R&D Director)',
      $3,
      'ผลการตรวจวิเคราะห์ทางเคมี กายภาพ และจุลชีววิทยาเป็นไปตามเกณฑ์มาตรฐานผลิตภัณฑ์เครื่องสำอางทุกประการ (Conforms to Approved Cosmetic Product Specification & ASEAN Cosmetic Directive)'
    ) RETURNING id;
  `, [
    productMap['JHD-301'],
    emulsionTplId,
    JSON.stringify([
      { parameter_key: 'appearance', parameter_th: 'ลักษณะทางกายภาพ', parameter_en: 'Appearance', specification: 'ของเหลวกึ่งเจลใส หนืด ไม่มีกลิ่น (Clear viscous gel, fragrance-free)', test_method: 'Visual Inspection (SOP-QC-001)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'ph', parameter_th: 'ความเป็นกรด-ด่าง (pH at 25°C)', parameter_en: 'pH Value (at 25°C)', specification: '5.50 – 6.50', test_method: 'pH Meter (SOP-QC-002)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'viscosity', parameter_th: 'ความหนืด (Viscosity at 25°C)', parameter_en: 'Viscosity (cP at 25°C)', specification: '3,500 – 5,500 cP', test_method: 'Brookfield Viscometer (SOP-QC-003)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'specific_gravity', parameter_th: 'ความถ่วงจำเพาะ (Specific Gravity at 25°C)', parameter_en: 'Specific Gravity (at 25°C)', specification: '1.010 – 1.030 g/mL', test_method: 'Pycnometer (SOP-QC-004)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'tamc', parameter_th: 'จำนวนจุลินทรีย์รวม (TAMC)', parameter_en: 'Total Aerobic Microbial Count', specification: '< 500 CFU/g', test_method: 'Plate Count Method (SOP-QC-008)', is_mandatory: true, is_microbial: true },
      { parameter_key: 'tymc', parameter_th: 'ยีสต์และรา (TYMC)', parameter_en: 'Total Combined Yeasts and Molds', specification: '< 50 CFU/g', test_method: 'Pour Plate Method (SOP-QC-008)', is_mandatory: true, is_microbial: true },
      { parameter_key: 'pathogens', parameter_th: 'เชื้อก่อโรคที่ระบุ (Pathogens)', parameter_en: 'Specified Pathogens', specification: 'ต้องไม่พบใน 0.1 กรัม (Absent in 0.1g)', test_method: 'Enrichment Method (ISO 22718)', is_mandatory: true, is_microbial: true }
    ])
  ]);

  // 4.5 SPEC-JHD-405-01 (Sunscreen)
  const specSunscreenRes = await client.query(`
    INSERT INTO qms_product_specifications (
      product_id, sku_code, product_name, spec_code, spec_version, product_category, template_id,
      approved_by, parameters, conclusion_template
    ) VALUES ($1, 'JHD-405', 'CosmeDiva Daily Sunscreen SPF50+ 40g', 'SPEC-JHD-405-01', 1, 'EMULSION_CREAM', $2,
      'ภญ. สุภาพร สุขสมบัติ (R&D Director)',
      $3,
      'ผลการตรวจวิเคราะห์ทางเคมี กายภาพ และจุลชีววิทยาเป็นไปตามเกณฑ์มาตรฐานผลิตภัณฑ์เครื่องสำอางทุกประการ (Conforms to Approved Cosmetic Product Specification & ASEAN Cosmetic Directive)'
    ) RETURNING id;
  `, [
    productMap['JHD-405'],
    emulsionTplId,
    JSON.stringify([
      { parameter_key: 'appearance', parameter_th: 'ลักษณะทางกายภาพ', parameter_en: 'Appearance', specification: 'โลชั่นน้ำนมสีเหลืองอ่อน เนียนละเอียด (Light yellow fluid lotion)', test_method: 'Visual Inspection (SOP-QC-001)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'ph', parameter_th: 'ความเป็นกรด-ด่าง (pH at 25°C)', parameter_en: 'pH Value (at 25°C)', specification: '6.00 – 7.00', test_method: 'pH Meter (SOP-QC-002)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'viscosity', parameter_th: 'ความหนืด (Viscosity at 25°C)', parameter_en: 'Viscosity (cP at 25°C)', specification: '8,000 – 14,000 cP', test_method: 'Brookfield Viscometer (SOP-QC-003)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'specific_gravity', parameter_th: 'ความถ่วงจำเพาะ (Specific Gravity at 25°C)', parameter_en: 'Specific Gravity (at 25°C)', specification: '0.990 – 1.030 g/mL', test_method: 'Pycnometer (SOP-QC-004)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'tamc', parameter_th: 'จำนวนจุลินทรีย์รวม (TAMC)', parameter_en: 'Total Aerobic Microbial Count', specification: '< 500 CFU/g', test_method: 'Plate Count Method (SOP-QC-008)', is_mandatory: true, is_microbial: true },
      { parameter_key: 'tymc', parameter_th: 'ยีสต์และรา (TYMC)', parameter_en: 'Total Combined Yeasts and Molds', specification: '< 50 CFU/g', test_method: 'Pour Plate Method (SOP-QC-008)', is_mandatory: true, is_microbial: true },
      { parameter_key: 'pathogens', parameter_th: 'เชื้อก่อโรคที่ระบุ (Pathogens)', parameter_en: 'Specified Pathogens', specification: 'ต้องไม่พบใน 0.1 กรัม (Absent in 0.1g)', test_method: 'Enrichment Method (ISO 22718)', is_mandatory: true, is_microbial: true }
    ])
  ]);

  // 4.6 SPEC-JHD-101-01 (Night Cream)
  const specNightRes = await client.query(`
    INSERT INTO qms_product_specifications (
      product_id, sku_code, product_name, spec_code, spec_version, product_category, template_id,
      approved_by, parameters, conclusion_template
    ) VALUES ($1, 'JHD-101', 'CosmeDiva Intensive Night Cream 50g', 'SPEC-JHD-101-01', 1, 'EMULSION_CREAM', $2,
      'ภญ. สุภาพร สุขสมบัติ (R&D Director)',
      $3,
      'ผลการตรวจวิเคราะห์ทางเคมี กายภาพ และจุลชีววิทยาเป็นไปตามเกณฑ์มาตรฐานผลิตภัณฑ์เครื่องสำอางทุกประการ (Conforms to Approved Cosmetic Product Specification & ASEAN Cosmetic Directive)'
    ) RETURNING id;
  `, [
    productMap['JHD-101'],
    emulsionTplId,
    JSON.stringify([
      { parameter_key: 'appearance', parameter_th: 'ลักษณะทางกายภาพ', parameter_en: 'Appearance', specification: 'เนื้อครีมเข้มข้น สีขาวนวล ไม่พบสิ่งแปลกปลอม (Rich creamy white emulsion)', test_method: 'Visual Inspection (SOP-QC-001)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'ph', parameter_th: 'ความเป็นกรด-ด่าง (pH at 25°C)', parameter_en: 'pH Value (at 25°C)', specification: '5.40 – 6.40', test_method: 'pH Meter (SOP-QC-002)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'viscosity', parameter_th: 'ความหนืด (Viscosity at 25°C)', parameter_en: 'Viscosity (cP at 25°C)', specification: '15,000 – 22,000 cP', test_method: 'Brookfield Viscometer (SOP-QC-003)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'specific_gravity', parameter_th: 'ความถ่วงจำเพาะ (Specific Gravity at 25°C)', parameter_en: 'Specific Gravity (at 25°C)', specification: '0.985 – 1.025 g/mL', test_method: 'Pycnometer (SOP-QC-004)', is_mandatory: true, is_microbial: false },
      { parameter_key: 'tamc', parameter_th: 'จำนวนจุลินทรีย์รวม (TAMC)', parameter_en: 'Total Aerobic Microbial Count', specification: '< 500 CFU/g', test_method: 'Plate Count Method (SOP-QC-008)', is_mandatory: true, is_microbial: true },
      { parameter_key: 'tymc', parameter_th: 'ยีสต์และรา (TYMC)', parameter_en: 'Total Combined Yeasts and Molds', specification: '< 50 CFU/g', test_method: 'Pour Plate Method (SOP-QC-008)', is_mandatory: true, is_microbial: true },
      { parameter_key: 'pathogens', parameter_th: 'เชื้อก่อโรคที่ระบุ (Pathogens)', parameter_en: 'Specified Pathogens', specification: 'ต้องไม่พบใน 0.1 กรัม (Absent in 0.1g)', test_method: 'Enrichment Method (ISO 22718)', is_mandatory: true, is_microbial: true }
    ])
  ]);
  const specNightId = specNightRes.rows[0].id;

  // 5. Update production_lots and qms_batch_releases to point to exact product IDs
  const lotSkuMapping = [
    { lot_no: 'LOT-2026-0050', sku: 'JHD-309', name: 'CosmeDiva White Booster Cream 50g' },
    { lot_no: 'LOT-2026-0051', sku: 'JHD-309', name: 'CosmeDiva White Booster Cream 50g' },
    { lot_no: 'LOT-2026-0052', sku: 'JHD-202', name: 'CosmeDiva Acne Clarifying Toner 150ml' },
    { lot_no: 'LOT-2026-0053', sku: 'JHD-301', name: 'CosmeDiva Hydrating Serum 30ml' },
    { lot_no: 'LOT-2026-0054', sku: 'JHD-309', name: 'CosmeDiva White Booster Cream 50g' },
    { lot_no: 'LOT-2026-0055', sku: 'JHD-309', name: 'CosmeDiva White Booster Cream 50g' },
    { lot_no: 'LOT-2026-0056', sku: 'JHD-405', name: 'CosmeDiva Daily Sunscreen SPF50+ 40g' },
    { lot_no: 'LOT-2026-0057', sku: 'JHD-101', name: 'CosmeDiva Intensive Night Cream 50g' },
    { lot_no: 'LOT-2026-0058', sku: 'JHD-105', name: 'CosmeDiva Pure Argan Cleansing Oil 100ml' },
  ];

  for (const m of lotSkuMapping) {
    const pId = productMap[m.sku];
    await client.query("UPDATE production_lots SET sku_id = $1 WHERE lot_no = $2;", [pId, m.lot_no]);
    await client.query("UPDATE qms_batch_releases SET sku_id = $1, sku_code = $2, product_name = $3 WHERE lot_no = $4;", [pId, m.sku, m.name, m.lot_no]);
    console.log(`✓ Updated lot and release for ${m.lot_no} -> SKU ${m.sku}`);
  }

  // 6. Reset LOT-2026-0058 COA status & data (CASE J ready for fresh manual test)
  await client.query(`
    UPDATE qms_batch_releases
    SET coa_status = 'NOT_GENERATED',
        coa_data = NULL,
        coa_approved_at = NULL,
        coa_approved_by = NULL,
        coa_approved_by_name = NULL
    WHERE lot_no = 'LOT-2026-0058';
  `);
  console.log('✓ Reset LOT-2026-0058 COA to NOT_GENERATED for clean UAT re-testing');

  // Also reset LOT-2026-0050 COA status
  await client.query(`
    UPDATE qms_batch_releases
    SET coa_status = 'DRAFT',
        coa_data = NULL
    WHERE lot_no = 'LOT-2026-0050';
  `);

  // 7. Seed QC Analytical Results
  // 7.1 For LOT-2026-0058 (Pure Argan Cleansing Oil 100ml)
  const lot58 = await client.query("SELECT id FROM production_lots WHERE lot_no = 'LOT-2026-0058';");
  const lot58Id = lot58.rows[0].id;
  const p105Id = productMap['JHD-105'];

  const oilQcData = [
    {
      key: 'appearance',
      th: 'ลักษณะทางกายภาพ',
      en: 'Appearance',
      spec: 'ของเหลวน้ำมันใส สีเหลืองทอง มีกลิ่นเฉพาะตัว ไม่มีตะกอนหรือสิ่งแปลกปลอม (Clear golden oil, characteristic aroma, free of particulate and foreign matters)',
      method: 'Visual Inspection (SOP-QC-001)',
      result: 'ของเหลวน้ำมันใส สีเหลืองทอง เป็นเนื้อเดียวกันตามเกณฑ์ (Conforms)',
      status: 'PASS',
      is_micro: false,
      is_exempt: false
    },
    {
      key: 'specific_gravity',
      th: 'ความถ่วงจำเพาะ (Specific Gravity at 25°C)',
      en: 'Specific Gravity (at 25°C)',
      spec: '0.910 – 0.925 g/mL',
      method: 'Pycnometer (SOP-QC-004)',
      result: '0.918 g/mL',
      status: 'PASS',
      is_micro: false,
      is_exempt: false
    },
    {
      key: 'refractive_index',
      th: 'ดัชนีการหักเหของแสง (Refractive Index at 25°C)',
      en: 'Refractive Index (at 25°C)',
      spec: '1.465 – 1.475',
      method: 'Abbe Refractometer (SOP-QC-005)',
      result: '1.469',
      status: 'PASS',
      is_micro: false,
      is_exempt: false
    },
    {
      key: 'acid_value',
      th: 'ค่าความเป็นกรด (Acid Value)',
      en: 'Acid Value',
      spec: '≤ 2.0 mg KOH/g',
      method: 'Titration Method (SOP-QC-006)',
      result: '0.85 mg KOH/g',
      status: 'PASS',
      is_micro: false,
      is_exempt: false
    },
    {
      key: 'peroxide_value',
      th: 'ค่าเปอร์ออกไซด์ (Peroxide Value)',
      en: 'Peroxide Value',
      spec: '≤ 10.0 meq O2/kg',
      method: 'Titration Method (SOP-QC-007)',
      result: '2.40 meq O2/kg',
      status: 'PASS',
      is_micro: false,
      is_exempt: false
    },
    {
      key: 'water_activity',
      th: 'ค่าวอเตอร์แอกติวิตี (Water Activity, Aw at 25°C)',
      en: 'Water Activity (Aw at 25°C)',
      spec: '< 0.60 Aw (Non-aqueous lipid formulation)',
      method: 'Water Activity Meter (SOP-QC-014)',
      result: '0.38',
      status: 'PASS',
      is_micro: false,
      is_exempt: false
    },
    {
      key: 'microbiology',
      th: 'การทดสอบทางจุลชีววิทยา (Microbiological Testing)',
      en: 'Routine Microbiological Challenge (TAMC / TYMC / Pathogens)',
      spec: 'ยกเว้นการทดสอบตามมาตรฐาน ISO 29621 / SOP-QC-014 (Exempt: Aw < 0.60 anhydrous formulation does not support microbial proliferation)',
      method: 'ISO 29621 / SOP-QC-014 (Microbiological Risk Assessment)',
      result: 'NOT APPLICABLE (ยกเว้นการทดสอบตามเกณฑ์ความเสี่ยงทางจุลชีววิทยาต่ำ Aw < 0.60)',
      status: 'NOT_APPLICABLE',
      is_micro: true,
      is_exempt: true,
      exemption_reason: 'SOP-QC-014 Cl. 4.2 / ISO 29621: Low-risk product Aw < 0.60'
    }
  ];

  for (const q of oilQcData) {
    await client.query(`
      INSERT INTO qms_lot_qc_analytical_results (
        production_lot_id, lot_no, product_id, sku_code, specification_id, spec_code, spec_version,
        parameter_key, parameter_th, parameter_en, specification, test_method, actual_result, result_status,
        is_microbial, is_exempt, exemption_reason, is_uat_data
      ) VALUES ($1, 'LOT-2026-0058', $2, 'JHD-105', $3, 'SPEC-JHD-105-01', 1,
        $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE);
    `, [
      lot58Id, p105Id, specOilId,
      q.key, q.th, q.en, q.spec, q.method, q.result, q.status,
      q.is_micro, q.is_exempt, q.exemption_reason || null
    ]);
  }
  console.log('✓ Seeded controlled analytical QC results for LOT-2026-0058 (JHD-105 Anhydrous Oil)');

  // 7.2 For LOT-2026-0050 (White Booster Cream 50g)
  const lot50 = await client.query("SELECT id FROM production_lots WHERE lot_no = 'LOT-2026-0050';");
  const lot50Id = lot50.rows[0].id;
  const p309Id = productMap['JHD-309'];

  const creamQcData = [
    {
      key: 'appearance',
      th: 'ลักษณะทางกายภาพ',
      en: 'Appearance',
      spec: 'เนื้อครีมเนียนละเอียด สีขาว ไม่พบสิ่งแปลกปลอม (Smooth white cream, free of foreign matters)',
      method: 'Visual Inspection (SOP-QC-001)',
      result: 'เนื้อครีมเนียนละเอียด สีขาว สม่ำเสมอ ไม่พบสิ่งแปลกปลอม (Conforms)',
      status: 'PASS',
      is_micro: false
    },
    {
      key: 'ph',
      th: 'ความเป็นกรด-ด่าง (pH Value at 25°C)',
      en: 'pH Value (at 25°C)',
      spec: '5.20 – 6.20',
      method: 'pH Meter (SOP-QC-002)',
      result: '5.65',
      status: 'PASS',
      is_micro: false
    },
    {
      key: 'viscosity',
      th: 'ความหนืด (Viscosity at 25°C)',
      en: 'Viscosity (cP at 25°C)',
      spec: '12,000 – 18,000 cP (Spindle 4, 12 rpm)',
      method: 'Brookfield Viscometer (SOP-QC-003)',
      result: '14,800 cP',
      status: 'PASS',
      is_micro: false
    },
    {
      key: 'specific_gravity',
      th: 'ความถ่วงจำเพาะ (Specific Gravity at 25°C)',
      en: 'Specific Gravity (at 25°C)',
      spec: '0.980 – 1.020 g/mL',
      method: 'Pycnometer (SOP-QC-004)',
      result: '0.998 g/mL',
      status: 'PASS',
      is_micro: false
    },
    {
      key: 'tamc',
      th: 'จำนวนจุลินทรีย์รวม (TAMC)',
      en: 'Total Aerobic Microbial Count',
      spec: '< 500 CFU/g (ASEAN Cosmetic Limit: <1,000 CFU/g)',
      method: 'Plate Count Method (SOP-QC-008)',
      result: '< 10 CFU/g',
      status: 'PASS',
      is_micro: true
    },
    {
      key: 'tymc',
      th: 'ยีสต์และรา (TYMC)',
      en: 'Total Combined Yeasts and Molds',
      spec: '< 50 CFU/g (ASEAN Cosmetic Limit: <100 CFU/g)',
      method: 'Pour Plate Method (SOP-QC-008)',
      result: '< 10 CFU/g',
      status: 'PASS',
      is_micro: true
    },
    {
      key: 'pathogens',
      th: 'เชื้อก่อโรคที่ระบุ (Pathogens)',
      en: 'Specified Pathogens (P. aeruginosa, S. aureus, C. albicans)',
      spec: 'ต้องไม่พบใน 0.1 กรัม (Absent in 0.1g)',
      method: 'Enrichment Method (ISO 22718 / 22717 / 18416)',
      result: 'ไม่พบเชื้อ (Not Detected)',
      status: 'PASS',
      is_micro: true
    }
  ];

  for (const q of creamQcData) {
    await client.query(`
      INSERT INTO qms_lot_qc_analytical_results (
        production_lot_id, lot_no, product_id, sku_code, specification_id, spec_code, spec_version,
        parameter_key, parameter_th, parameter_en, specification, test_method, actual_result, result_status,
        is_microbial, is_exempt, is_uat_data
      ) VALUES ($1, 'LOT-2026-0050', $2, 'JHD-309', $3, 'SPEC-JHD-309-01', 1,
        $4, $5, $6, $7, $8, $9, $10, $11, FALSE, TRUE);
    `, [
      lot50Id, p309Id, specCreamId,
      q.key, q.th, q.en, q.spec, q.method, q.result, q.status,
      q.is_micro
    ]);
  }
  console.log('✓ Seeded controlled analytical QC results for LOT-2026-0050 (JHD-309 Cream)');

  // 7.3 For LOT-2026-0057 (Night Cream - Viscosity Fail)
  const lot57 = await client.query("SELECT id FROM production_lots WHERE lot_no = 'LOT-2026-0057';");
  const lot57Id = lot57.rows[0].id;
  const p101Id = productMap['JHD-101'];

  await client.query(`
    INSERT INTO qms_lot_qc_analytical_results (
      production_lot_id, lot_no, product_id, sku_code, specification_id, spec_code, spec_version,
      parameter_key, parameter_th, parameter_en, specification, test_method, actual_result, result_status,
      is_microbial, is_exempt, is_uat_data
    ) VALUES 
      ($1, 'LOT-2026-0057', $2, 'JHD-101', $3, 'SPEC-JHD-101-01', 1, 'appearance', 'ลักษณะทางกายภาพ', 'Appearance', 'เนื้อครีมเข้มข้น สีขาวนวล (Rich creamy white emulsion)', 'Visual Inspection (SOP-QC-001)', 'Conforms', 'PASS', FALSE, FALSE, TRUE),
      ($1, 'LOT-2026-0057', $2, 'JHD-101', $3, 'SPEC-JHD-101-01', 1, 'ph', 'ความเป็นกรด-ด่าง (pH at 25°C)', 'pH Value (at 25°C)', '5.40 – 6.40', 'pH Meter (SOP-QC-002)', '5.82', 'PASS', FALSE, FALSE, TRUE),
      ($1, 'LOT-2026-0057', $2, 'JHD-101', $3, 'SPEC-JHD-101-01', 1, 'viscosity', 'ความหนืด (Viscosity at 25°C)', 'Viscosity (cP at 25°C)', '15,000 – 22,000 cP', 'Brookfield Viscometer (SOP-QC-003)', '5,400 cP (Out of Specification)', 'FAIL', FALSE, FALSE, TRUE);
  `, [lot57Id, p101Id, specNightId]);
  console.log('✓ Seeded controlled analytical QC results for LOT-2026-0057 (JHD-101 Viscosity Fail)');

  await client.end();
  console.log('\n✅ All Master Specifications and Controlled UAT QC Analytical Results Seeded Successfully!');
}

main().catch(e => {
  console.error('Seeding error:', e);
  process.exit(1);
});
