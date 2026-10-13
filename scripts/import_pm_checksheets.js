const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const candidates = [
  path.join(__dirname, '../data/PM Check Sheet'),
  path.join(process.env.USERPROFILE || '', 'Dropbox/AI AGENT/Antigravity/Update PD Daily Status/PM Check Sheet'),
  'C:/Users/Dr.Nuch/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/PM Check Sheet',
  'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/PM Check Sheet'
];
const folder = candidates.find(p => fs.existsSync(p)) || candidates[0];
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseSheetItems(ws) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z80');
  let headerRowIdx = -1, categoryColIdx = -1, pointColIdx = -1, standardColIdx = -1, methodColIdx = -1;

  for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
    for (let c = 0; c <= Math.min(range.e.c, 25); c++) {
      const val = String(ws[XLSX.utils.encode_cell({ r, c })]?.v || '').trim();
      if (val.includes('หัวข้อการตรวจสอบ')) { headerRowIdx = r; categoryColIdx = c; }
      if (val.includes('จุดที่ทำการตรวจเช็ค')) { headerRowIdx = r; pointColIdx = c; }
      if (val.includes('เกณฑ์มาตรฐาน') || (val.includes('มาตรฐาน') && !val.includes('จุดที่ทำการตรวจเช็ค'))) standardColIdx = c;
      if (val.includes('วิธีการตรวจ') || val.includes('วิธีตรวจ') || val.includes('วิธีการ')) methodColIdx = c;
    }
    if (headerRowIdx !== -1 && (categoryColIdx !== -1 || pointColIdx !== -1)) break;
  }

  if (headerRowIdx === -1 && categoryColIdx === -1 && pointColIdx === -1) return [];

  const startRow = (headerRowIdx !== -1 ? headerRowIdx : 11) + 1;
  let currentCategory = '1. ตรวจเช็คทั่วไป';
  let currentCatNum = 1;
  const items = [];

  const inferStandardAndMethod = (pointText) => {
    const t = pointText.toLowerCase();
    if (t.includes('สวิตช์') || t.includes('switch') || t.includes('สายไฟ') || t.includes('เบรกเกอร์') || t.includes('ปลั๊ก')) {
      return { standard: 'สายไฟสมบูรณ์ ไม่มีรอยแตก ขั้วต่อแน่น สวิตช์ทำงานคล่อง', method: 'ตรวจเช็คด้วยสายตาและการกดสั่งงาน' };
    }
    if (t.includes('emergency')) {
      return { standard: 'กดตัดระบบทันที และปลดล็อคได้ปกติ', method: 'กดทดสอบฉุกเฉินและปลดล็อค' };
    }
    if (t.includes('มอเตอร์') || t.includes('motor') || t.includes('กระแส')) {
      return { standard: 'มอเตอร์หมุนราบเรียบ ไม่มีเสียงดังผิดปกติหรือกลิ่นไหม้ กระแสไม่เกินพิกัด', method: 'ตรวจการทำงาน วัดกระแส และฟังเสียง' };
    }
    if (t.includes('ลม') || t.includes('กระบอกลม') || t.includes('ข้อต่อลม') || t.includes('เรกูเลเตอร์')) {
      return { standard: 'ข้อต่อแน่น ไม่รั่วซึม กระบอกลมเลื่อนราบรื่น แรงดันปกติ', method: 'ตรวจด้วยสายตาและฟังเสียงลม' };
    }
    if (t.includes('จารบี') || t.includes('น้ำมัน') || t.includes('หล่อลื่น')) {
      return { standard: 'หล่อลื่นจุดหมุนและลูกปืนตามรอบ ไม่ฝืดเคือง ระดับน้ำมันปกติ', method: 'อัดจารบี/ตรวจระดับน้ำมัน' };
    }
    if (t.includes('เซ็นเซอร์') || t.includes('sensor')) {
      return { standard: 'ตรวจจับชิ้นงานได้อย่างแม่นยำ ไฟสถานะติด-ดับสัมพันธ์', method: 'ทดสอบการตรวจจับวัตถุ' };
    }
    if (t.includes('ยาง') || t.includes('ลูกกลิ้ง')) {
      return { standard: 'ยางลูกกลิ้งไม่สึกหรอ ไม่แตกลายงา จับยึดฝาได้แน่น', method: 'ตรวจสภาพเนื้อยางด้วยสายตาและสัมผัส' };
    }
    if (t.includes('ความสะอาด') || t.includes('ฝุ่น')) {
      return { standard: 'สะอาด ปราศจากฝุ่นและสิ่งสกปรกตกค้าง ตามมาตรฐาน GMP', method: 'ตรวจเช็คด้วยสายตาและทำความสะอาด' };
    }
    return { standard: 'ใช้งานได้ปกติ สมบูรณ์ตามมาตรฐาน', method: 'ตรวจเช็คด้วยสายตาและการทำงาน' };
  };

  for (let r = startRow; r <= range.e.r; r++) {
    const rowCells = [];
    for (let c = 0; c <= Math.min(range.e.c, 25); c++) {
      rowCells.push(String(ws[XLSX.utils.encode_cell({ r, c })]?.v || '').trim());
    }
    const rowFullText = rowCells.join(' ');
    if (
      rowFullText.includes('รายละเอียดต้องการให้แก้ไข') ||
      rowFullText.includes('ผู้ส่งมอบ') ||
      rowFullText.includes('ผู้รับมอบ') ||
      rowFullText.includes('เรียบร้อย/พร้อมใช้งาน') ||
      rowFullText.includes('ไม่พร้อมใช้งาน')
    ) {
      break;
    }

    const colAVal = rowCells[0] || '';
    const catVal = categoryColIdx !== -1 ? String(ws[XLSX.utils.encode_cell({ r, c: categoryColIdx })]?.v || '').trim() : '';

    let pointVal = pointColIdx !== -1 ? String(ws[XLSX.utils.encode_cell({ r, c: pointColIdx })]?.v || '').trim() : '';
    if (!pointVal) {
      const startCol = categoryColIdx !== -1 ? categoryColIdx + 1 : 2;
      for (let c = startCol; c < 16; c++) {
        const cellVal = String(ws[XLSX.utils.encode_cell({ r, c })]?.v || '').trim();
        if (cellVal && cellVal !== '1' && cellVal !== '2' && cellVal !== '3' && !cellVal.includes('ผลการตรวจสอบ')) {
          pointVal = cellVal;
          break;
        }
      }
    }

    if (catVal && catVal !== 'หัวข้อการตรวจสอบ' && catVal !== 'ผลการตรวจสอบ') {
      if (/^\d+[\.\s]/.test(catVal)) currentCategory = catVal;
      else if (colAVal && !isNaN(Number(colAVal))) currentCategory = colAVal + '. ' + catVal;
      else currentCategory = currentCatNum + '. ' + catVal;
      currentCatNum++;
    }

    if (pointVal && pointVal !== 'จุดที่ทำการตรวจเช็ค') {
      const defaults = inferStandardAndMethod(pointVal);
      const customStandard = standardColIdx !== -1 ? String(ws[XLSX.utils.encode_cell({ r, c: standardColIdx })]?.v || '').trim() : '';
      const customMethod = methodColIdx !== -1 ? String(ws[XLSX.utils.encode_cell({ r, c: methodColIdx })]?.v || '').trim() : '';

      items.push({
        id: items.length + 1,
        item: pointVal,
        standard: customStandard || defaults.standard,
        method: customMethod || defaults.method,
        category: currentCategory
      });
    }
  }

  return items;
}

async function main() {
  console.log('Fetching machines from Supabase...');
  const { data: machines, error: mErr } = await supabase
    .from('maintenance_machines')
    .select('id, machine_code, machine_name, specification, department_name, category');

  if (mErr || !machines) {
    console.error('Error fetching machines:', mErr);
    process.exit(1);
  }

  console.log(`Loaded ${machines.length} machines from DB.`);

  // Create lookups
  const dbCodeMap = new Map();
  machines.forEach(m => {
    const raw = m.machine_code.toUpperCase().trim();
    if (!dbCodeMap.has(raw)) dbCodeMap.set(raw, []);
    dbCodeMap.get(raw).push(m);

    // Normalizations
    const normDash = raw.replace(/\s+/g, '-');
    if (!dbCodeMap.has(normDash)) dbCodeMap.set(normDash, []);
    if (!dbCodeMap.get(normDash).includes(m)) dbCodeMap.get(normDash).push(m);

    const normSpace = raw.replace(/-/g, ' ');
    if (!dbCodeMap.has(normSpace)) dbCodeMap.set(normSpace, []);
    if (!dbCodeMap.get(normSpace).includes(m)) dbCodeMap.get(normSpace).push(m);
  });

  const files = fs.readdirSync(folder).filter(f => 
    (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$') && !f.includes('(1)')
  );

  const machineItemsMap = new Map(); // machine_id -> { machine, items, source }
  const unmatchedSheets = [];

  for (const f of files) {
    if (f.startsWith('DAILY')) continue; // skip daily check sheets
    const fp = path.join(folder, f);
    const wb = XLSX.readFile(fp);

    for (const s of wb.SheetNames) {
      if (s === 'MT-PF-001E' && (f.includes('10.VACH') || f.includes('AFILL-ACAP') || f.includes('CVY') || f.includes('T150'))) {
        continue;
      }
      const ws = wb.Sheets[s];
      const items = parseSheetItems(ws);
      if (items.length === 0) continue;

      // Extract M/C No. from header
      let mcHeader = '';
      for (let r = 0; r <= 10; r++) {
        for (let c = 0; c <= 15; c++) {
          const v = String(ws[XLSX.utils.encode_cell({ r, c })]?.v || '').trim();
          if (v.includes('M/C No.') || v.includes('M/C :') || v.includes('M/C:')) {
            for (let k = 1; k <= 8; k++) {
              const nv = String(ws[XLSX.utils.encode_cell({ r, c: c + k })]?.v || '').trim();
              if (nv && nv !== ':' && nv !== 'Serial No.' && nv !== 'Model') {
                mcHeader = nv;
                break;
              }
            }
          }
          if (mcHeader) break;
        }
        if (mcHeader) break;
      }

      const candCodes = [];
      if (mcHeader) candCodes.push(mcHeader.toUpperCase().trim());
      candCodes.push(s.toUpperCase().trim());
      if (mcHeader.includes('/')) candCodes.push(mcHeader.toUpperCase().replace(/\//g, '-').trim());
      if (s.includes('-1-3') || s.includes('-2-3') || s.includes('-3-3')) {
        const base = s.replace(/-[123]-3$/, '');
        candCodes.push(base + ' 1/3', base + '-1/3', base + ' 2/3', base + '-2/3', base + ' 3/3', base + '-3/3');
      }

      let matchedList = [];
      for (const cc of candCodes) {
        if (dbCodeMap.has(cc)) {
          matchedList = dbCodeMap.get(cc);
          break;
        }
      }

      // Special alias: VACC-PD-001 -> VACC-PK-001
      if (matchedList.length === 0 && (mcHeader === 'VACC-PD-001' || s === 'VACC-PD-001')) {
        matchedList = dbCodeMap.get('VACC-PK-001') || [];
      }

      if (matchedList.length > 0) {
        matchedList.forEach(m => {
          if (!machineItemsMap.has(m.id)) {
            machineItemsMap.set(m.id, {
              machine: m,
              items: JSON.parse(JSON.stringify(items)),
              source: `${f} [${s}]`
            });
          } else {
            // Append if multi-part sheet
            const ex = machineItemsMap.get(m.id);
            const off = ex.items.length;
            items.forEach((it, idx) => {
              ex.items.push({ ...it, id: off + idx + 1 });
            });
            ex.source += `, ${s}`;
          }
        });
      } else {
        unmatchedSheets.push({ file: f, sheet: s, mcHeader, itemsCount: items.length });
      }
    }
  }

  console.log(`Matched ${machineItemsMap.size} distinct machines for database update.`);
  console.log(`Unmatched sheets: ${unmatchedSheets.length}`);

  const now = new Date().toISOString();
  let updatedCount = 0;
  let errorCount = 0;

  // Process updates in chunks of 20
  const targets = Array.from(machineItemsMap.values());
  for (let i = 0; i < targets.length; i += 20) {
    const chunk = targets.slice(i, i + 20);
    await Promise.all(
      chunk.map(async ({ machine, items, source }) => {
        try {
          const currentSpec = machine.specification && typeof machine.specification === 'object' ? machine.specification : {};
          const existingHistory = Array.isArray(currentSpec.pm_checklist_history) ? currentSpec.pm_checklist_history : [];

          const historyEntry = {
            version: '1.0',
            items_count: items.length,
            updated_at: now,
            updated_by: 'ชมพูนุช แสวงศักดิ์ / DCC Import',
            reason: `นำเข้าหัวข้อ PM Checklist จากแบบฟอร์มควบคุม DCC MT-PF-001E (${source})`,
            effective_date: '19 JAN 24'
          };

          const updatedSpec = {
            ...currentSpec,
            pm_checklist: items,
            pm_checklist_version: currentSpec.pm_checklist_version || '1.0',
            pm_checklist_effective_date: currentSpec.pm_checklist_effective_date || '19 JAN 24',
            pm_checklist_history: [historyEntry, ...existingHistory.filter(h => h.reason !== historyEntry.reason)]
          };

          // 1. Update maintenance_machines
          const { error: uErr } = await supabase
            .from('maintenance_machines')
            .update({
              specification: updatedSpec,
              updated_at: now
            })
            .eq('id', machine.id);

          if (uErr) throw uErr;

          // 2. Sync to maintenance_pm_plans
          await supabase
            .from('maintenance_pm_plans')
            .update({
              checklist_template: items,
              updated_at: now
            })
            .eq('machine_code', machine.machine_code);

          updatedCount++;
        } catch (err) {
          console.error(`Failed to update ${machine.machine_code}:`, err.message);
          errorCount++;
        }
      })
    );
    console.log(`Progress: ${Math.min(i + 20, targets.length)} / ${targets.length} completed.`);
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Successfully updated: ${updatedCount} machines`);
  console.log(`Errors: ${errorCount}`);

  // Summary of unmapped DB machines
  const updatedIds = new Set(targets.map(t => t.machine.id));
  const unmappedDbMachines = machines.filter(m => !updatedIds.has(m.id));

  const resultSummary = {
    updatedCount,
    errorCount,
    unmatchedSheets,
    unmappedDbCount: unmappedDbMachines.length,
    unmappedDbMachines: unmappedDbMachines.map(m => ({
      code: m.machine_code,
      name: m.machine_name,
      dept: m.department_name,
      cat: m.category
    }))
  };

  fs.writeFileSync('import-summary.json', JSON.stringify(resultSummary, null, 2), 'utf-8');
  console.log('Saved summary to import-summary.json');
}

main().catch(console.error);
