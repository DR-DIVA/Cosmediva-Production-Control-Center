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

function deduceSparePartCategory(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('seal') || n.includes('ซีล') || n.includes('gasket') || n.includes('ปะเก็น') || n.includes('o-ring') || n.includes('โอริง')) return 'Seal & Gasket';
  if (n.includes('bearing') || n.includes('ลูกปืน') || n.includes('ตลับลูกปืน')) return 'Bearing';
  if (n.includes('belt') || n.includes('สายพาน') || n.includes('timing belt')) return 'Belt';
  if (n.includes('สายไฟ') || n.includes('breaker') || n.includes('เบรกเกอร์') || n.includes('magnetic') || n.includes('แมกเนติก') || n.includes('relay') || n.includes('รีเลย์') || n.includes('heater') || n.includes('ฮีตเตอร์') || n.includes('ฟิวส์') || n.includes('หางปลา') || n.includes('สวิตซ์') || n.includes('switch')) return 'Electrical';
  if (n.includes('motor') || n.includes('มอเตอร์') || n.includes('เกียร์') || n.includes('gear')) return 'Motor';
  if (n.includes('sensor') || n.includes('เซนเซอร์') || n.includes('proximity') || n.includes('photo') || n.includes('thermocouple') || n.includes('เทอร์โม')) return 'Sensor';
  if (n.includes('กระบอกลม') || n.includes('cylinder') || n.includes('solenoid') || n.includes('โซลินอยด์') || n.includes('วาล์ว') || n.includes('valve') || n.includes('ข้อต่อลม') || n.includes('สายลม')) return 'Pneumatic';
  if (n.includes('ใบพัด') || n.includes('สลิง') || n.includes('ลูกสูบ') || n.includes('บู๊ซ') || n.includes('shaft') || n.includes('เพลา') || n.includes('สปริง') || n.includes('น็อต') || n.includes('โซ่')) return 'Mechanical';
  return 'General Spare';
}

function extractCompatibleMachines(text) {
  if (!text) return [];
  const matches = text.match(/[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+(?:-[A-Z0-9/]+)?/g);
  return matches ? Array.from(new Set(matches)) : [];
}

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL for Spare Parts Import.');

  const spFile = path.join(basePath, 'ประวัติการซื้ออะไหล่เครื่องจักร 5 ปีย้อนห.xlsx');
  const wbSp = xlsx.readFile(spFile);

  // Group parts by unique identity (partName + rawCode)
  const partsMap = new Map();
  const sheets = ['ปี22', 'ปี23', 'ปี24', 'ปี25', 'ปี26'];

  sheets.forEach(sheetName => {
    const ws = wbSp.Sheets[sheetName];
    if (!ws) return;
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const rawCode = r[1] ? String(r[1]).trim() : '';
      const partName = r[2] ? String(r[2]).trim() : '';
      const qty = parseFloat(r[3]) || 1;
      const unit = r[4] ? String(r[4]).trim() : 'ชิ้น';
      const unitPrice = parseFloat(r[5]) || 0;
      const ref = r[6] ? String(r[6]).trim() : '';
      const remark = r[7] ? String(r[7]).trim() : '';

      if (!partName) continue;

      const normName = partName.replace(/\s+/g, ' ');
      const key = normName;

      if (!partsMap.has(key)) {
        partsMap.set(key, {
          rawCode,
          partName: normName,
          unit: unit || 'ชิ้น',
          totalPurchasedQty: 0,
          purchasePrices: [],
          refs: [],
          remarks: [],
          compatibleMachines: new Set()
        });
      }

      const p = partsMap.get(key);
      if (!p.rawCode && rawCode) p.rawCode = rawCode;
      p.totalPurchasedQty += qty;
      if (unitPrice > 0) p.purchasePrices.push(unitPrice);
      if (ref) p.refs.push(ref);
      if (remark) {
        p.remarks.push(remark);
        const machines = extractCompatibleMachines(remark);
        machines.forEach(m => p.compatibleMachines.add(m));
      }
    }
  });

  console.log(`Found ${partsMap.size} distinct spare parts from 5 years of history.`);

  // Generate unique codes
  let idx = 1;
  const usedCodes = new Set();
  let inserted = 0;
  let updated = 0;

  for (const [key, item] of partsMap.entries()) {
    let partCode = item.rawCode;
    if (!partCode || usedCodes.has(partCode)) {
      partCode = `SP-${String(idx).padStart(4, '0')}`;
      if (item.rawCode) {
        partCode = `${item.rawCode}-${String(idx).padStart(2, '0')}`;
      }
      while (usedCodes.has(partCode)) {
        idx++;
        partCode = `SP-${String(idx).padStart(4, '0')}`;
      }
    }
    usedCodes.add(partCode);
    idx++;

    const category = deduceSparePartCategory(item.partName);
    const avgCost = item.purchasePrices.length > 0
      ? item.purchasePrices.reduce((a, b) => a + b, 0) / item.purchasePrices.length
      : 0;
    const lastPrice = item.purchasePrices.length > 0
      ? item.purchasePrices[item.purchasePrices.length - 1]
      : 0;

    const initialStock = Math.min(Math.max(Math.ceil(item.totalPurchasedQty * 0.3), 1), 20);
    const minStock = 1;
    const maxStock = Math.max(initialStock * 3, 5);
    const reorderPoint = Math.max(minStock + 1, 2);

    const compMachines = Array.from(item.compatibleMachines);
    const spec = [
      item.rawCode ? `Account/GL Code: ${item.rawCode}` : '',
      item.remarks.length > 0 ? `Remarks: ${item.remarks.slice(0, 2).join('; ')}` : '',
      item.refs.length > 0 ? `Latest PR: ${item.refs[item.refs.length - 1]}` : ''
    ].filter(Boolean).join('\n');

    const res = await client.query(`
      INSERT INTO maintenance_spare_parts (
        part_code, part_name, category, unit, stock_qty, min_stock, max_stock,
        reorder_point, average_cost, last_purchase_price, compatible_machines,
        specification, storage_location, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true
      )
      ON CONFLICT (part_code) DO UPDATE SET
        part_name = EXCLUDED.part_name,
        category = EXCLUDED.category,
        unit = EXCLUDED.unit,
        average_cost = EXCLUDED.average_cost,
        last_purchase_price = EXCLUDED.last_purchase_price,
        compatible_machines = EXCLUDED.compatible_machines,
        specification = EXCLUDED.specification,
        updated_at = NOW()
      RETURNING (xmax = 0) AS is_inserted;
    `, [
      partCode,
      item.partName,
      category,
      item.unit,
      initialStock,
      minStock,
      maxStock,
      reorderPoint,
      avgCost,
      lastPrice,
      compMachines,
      spec,
      'Main Parts Storage Shelf'
    ]);

    if (res.rows[0]?.is_inserted) {
      inserted++;
    } else {
      updated++;
    }
  }

  const finalCount = await client.query('SELECT COUNT(*) FROM maintenance_spare_parts WHERE is_active = true');
  console.log('Spare Parts Import Complete:');
  console.log(`- Inserted: ${inserted}`);
  console.log(`- Updated: ${updated}`);
  console.log(`- Total active spare parts in DB: ${finalCount.rows[0].count}`);

  await client.end();
}

main().catch(err => {
  console.error('Import spare parts error:', err);
  process.exit(1);
});
