import xlsx from 'xlsx';
import path from 'path';
import pg from 'pg';
const { Client } = pg;

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const dbUser = 'postgres.yzwldawflteyywuetzcw';
const dbHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const dbPort = '6543';
const dbName = 'postgres';

const client = new Client({
  connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
  ssl: { rejectUnauthorized: false }
});

const basePath = path.resolve('..');

// Helper to deduce category
function deduceCategory(code, nameTh, dept) {
  const c = code.toUpperCase();
  const n = (nameTh || '').toLowerCase();

  if (c.startsWith('AFILL') || c.startsWith('FILL') || n.includes('บรรจุ')) return 'Filling';
  if (c.startsWith('ACAP') || c.startsWith('CAP') || n.includes('ปิดฝา')) return 'Capping';
  if (c.startsWith('ASEA') || c.startsWith('SEA') || c.startsWith('HANS') || n.includes('ซีล') || n.includes('ปิดผนึก')) return 'Sealing';
  if (c.startsWith('ASNK') || c.startsWith('SNK') || n.includes('ชริ้ง') || n.includes('หดฟิล์ม') || n.includes('ห่อฟิล์ม')) return 'Packaging';
  if (c.startsWith('LABL') || n.includes('ติดฉลาก') || n.includes('พิมพ์วันที่')) return 'Labeling';
  if (c.startsWith('BAL') || c.startsWith('SCA') || n.includes('เครื่องชั่ง')) return 'Inspection';
  if (c.startsWith('CONV') || n.includes('สายพาน')) return 'Conveyor';
  if (c.startsWith('AHU') || c.startsWith('AIRC') || c.startsWith('ROW') || c.startsWith('RO') || c.startsWith('T150') || c.startsWith('CHIL') || c.startsWith('PUMP') || dept === 'CMD') return 'Utility';
  if (c.startsWith('VACH') || c.startsWith('HOMO') || c.startsWith('MIX') || dept === 'MX' || n.includes('ผสม') || n.includes('กวน') || n.includes('ปั่น')) return 'Mixing';
  if (c.startsWith('HANL') || c.startsWith('STAK') || c.startsWith('LIFT') || n.includes('รถยก') || n.includes('สแตกเกอร์') || n.includes('ลิฟท์')) return 'Material Handling';
  if (dept === 'QC' || c.startsWith('QC') || n.includes('ทดสอบ')) return 'Quality Control';
  if (dept === 'RD' || c.startsWith('RD') || n.includes('แล็บ')) return 'R&D Lab';
  if (dept === 'PK') return 'Packaging';
  return 'General Machinery';
}

// Criticality deduction
function deduceCriticality(category, dept, nameTh) {
  if (category === 'Mixing' || category === 'Utility' || category === 'Filling') return 'A';
  if (category === 'Capping' || category === 'Sealing' || category === 'Packaging') return 'B';
  return 'C';
}

// Hourly downtime cost estimation based on criticality
function deduceDowntimeCost(criticality) {
  if (criticality === 'A') return 8000.00;
  if (criticality === 'B') return 4000.00;
  return 1500.00;
}

// Status normalization
function normalizeStatus(statusRaw) {
  const s = (statusRaw || '').trim();
  if (s.includes('ไม่ได้ใช้งาน') || s.includes('ยกเลิก') || s.includes('ชำรุดรอจำหน่าย')) return 'Standby';
  if (s.includes('ซ่อม') || s.includes('รอซ่อม')) return 'Breakdown';
  return 'Running';
}

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL for Machine Import.');

  // Read Equipment list
  const eqFile = path.join(basePath, 'Equipment Factory List 2026 Update (10-6-69) Final (1).xlsx');
  const wbEq = xlsx.readFile(eqFile);
  const wsEq = wbEq.Sheets['Equipment list'];
  const rowsEq = xlsx.utils.sheet_to_json(wsEq, { header: 1 });

  console.log(`Read ${rowsEq.length} rows from Equipment list.`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 6; i < rowsEq.length; i++) {
    const r = rowsEq[i];
    if (!r || !r[1] || String(r[1]).trim() === 'รหัส') continue;

    const rawCode = String(r[1]).trim();
    // Normalize spaces: e.g. VACH-MX-002 1/3 -> standard
    const machineCode = rawCode;
    const nameTh = r[2] ? String(r[2]).trim() : machineCode;
    const nameEn = r[3] ? String(r[3]).trim() : '';
    const supplier = r[4] ? String(r[4]).trim() : null;
    const brand = r[5] ? String(r[5]).trim() : null;
    const model = r[6] ? String(r[6]).trim() : null;
    const serial = r[7] ? String(r[7]).trim() : null;
    const dept = r[8] ? String(r[8]).trim() : 'PK';
    const location = r[9] ? String(r[9]).trim() : 'Main Factory';
    const statusRaw = r[10] ? String(r[10]).trim() : 'ใช้งานได้';

    const category = deduceCategory(machineCode, nameTh, dept);
    const criticality = deduceCriticality(category, dept, nameTh);
    const hourlyCost = deduceDowntimeCost(criticality);
    const status = normalizeStatus(statusRaw);

    const res = await client.query(`
      INSERT INTO maintenance_machines (
        machine_code, machine_name, category, department_code, department_name,
        production_area, supplier, manufacturer, model, serial_number,
        criticality, status, hourly_downtime_cost, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true
      )
      ON CONFLICT (machine_code) DO UPDATE SET
        machine_name = EXCLUDED.machine_name,
        category = EXCLUDED.category,
        department_code = EXCLUDED.department_code,
        department_name = EXCLUDED.department_name,
        production_area = EXCLUDED.production_area,
        supplier = COALESCE(EXCLUDED.supplier, maintenance_machines.supplier),
        manufacturer = COALESCE(EXCLUDED.manufacturer, maintenance_machines.manufacturer),
        model = COALESCE(EXCLUDED.model, maintenance_machines.model),
        serial_number = COALESCE(EXCLUDED.serial_number, maintenance_machines.serial_number),
        criticality = EXCLUDED.criticality,
        status = EXCLUDED.status,
        hourly_downtime_cost = EXCLUDED.hourly_downtime_cost,
        updated_at = NOW()
      RETURNING (xmax = 0) AS is_inserted;
    `, [
      machineCode,
      nameTh + (nameEn ? ` (${nameEn})` : ''),
      category,
      dept,
      dept === 'PK' ? 'Packing' : dept === 'MX' ? 'Mixing' : dept === 'CMD' ? 'Engineering & Facilities' : dept === 'QC' ? 'Quality Control' : dept === 'RD' ? 'R&D' : dept === 'RM' ? 'Raw Materials' : dept,
      location,
      supplier,
      brand,
      model,
      serial,
      criticality,
      status,
      hourlyCost
    ]);

    if (res.rows[0]?.is_inserted) {
      insertedCount++;
    } else {
      updatedCount++;
    }
  }

  // Also ensure any machine from PM 2026 that wasn't in Equipment list is created
  const pmFile = path.join(basePath, 'แผน PM ประจำปีและเดือน 2026 (1).xlsx');
  const wbPm = xlsx.readFile(pmFile);
  const wsPm = wbPm.Sheets['PM2026 (Rev01)'];
  const rowsPm = xlsx.utils.sheet_to_json(wsPm, { header: 1 });

  let pmAddedCount = 0;
  for (let i = 7; i < rowsPm.length; i++) {
    const r = rowsPm[i];
    if (!r || typeof r[0] !== 'number' || !r[1]) continue;

    let pmCode = String(r[1]).trim();
    if (pmCode === 'AFIL-PK-001') pmCode = 'AFILL-PK-001'; // Alias to equipment list
    // check if exists
    const chk = await client.query('SELECT id FROM maintenance_machines WHERE machine_code = $1', [pmCode]);
    if (chk.rows.length === 0) {
      const pmName = r[2] ? String(r[2]).trim() : pmCode;
      const pmDept = r[3] ? String(r[3]).trim() : 'PD';
      const pmLoc = r[4] ? String(r[4]).trim() : 'Factory Area';
      const category = deduceCategory(pmCode, pmName, pmDept);
      const criticality = deduceCriticality(category, pmDept, pmName);
      const hourlyCost = deduceDowntimeCost(criticality);

      await client.query(`
        INSERT INTO maintenance_machines (
          machine_code, machine_name, category, department_code, department_name,
          production_area, criticality, status, hourly_downtime_cost, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'Running', $8, true
        )
      `, [
        pmCode,
        pmName,
        category,
        pmDept,
        pmDept,
        pmLoc,
        criticality,
        hourlyCost
      ]);
      pmAddedCount++;
    }
  }

  const countRes = await client.query('SELECT COUNT(*) FROM maintenance_machines WHERE is_deleted = false');
  console.log(`Machines Import Complete:`);
  console.log(`- Inserted from Equipment list: ${insertedCount}`);
  console.log(`- Updated from Equipment list: ${updatedCount}`);
  console.log(`- Additional machines added from PM plan: ${pmAddedCount}`);
  console.log(`- Total active machines in DB: ${countRes.rows[0].count}`);

  await client.end();
}

main().catch(err => {
  console.error('Import machines error:', err);
  process.exit(1);
});
