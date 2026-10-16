const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log('=== Starting QC Data Healing ===');

  // 1. PBANA-001 (Lot 001/26) Task 8b416773-5f64-462d-b878-94e0fd6ff498
  const { data: pbana } = await supabase
    .from('production_logs')
    .select('id, tank_details')
    .eq('id', '8b416773-5f64-462d-b878-94e0fd6ff498')
    .single();

  if (pbana) {
    const d = { ...(pbana.tank_details || {}) };
    d['1'] = 'WAITING';
    d['1_history'] = [
      {
        user: 'mxktj620@cosmediva.local',
        status: 'MX ส่ง QC',
        timestamp: '2026-10-12T03:27:08.227Z'
      }
    ];
    const { error: pbErr } = await supabase
      .from('production_logs')
      .update({ tank_details: d, updated_at: new Date().toISOString() })
      .eq('id', pbana.id);
    console.log('1. PBANA-001 Lot 001/26 Tank 1 -> WAITING:', pbErr ? pbErr.message : 'SUCCESS');
  }

  // 2. JHD-318 (Lot 009/26, 35-39) Task 4692dfb1-a278-48b4-9842-049c1d0cbb7f
  const { data: jhd318 } = await supabase
    .from('production_logs')
    .select('id, tank_details')
    .eq('id', '4692dfb1-a278-48b4-9842-049c1d0cbb7f')
    .single();

  if (jhd318) {
    const d = { ...(jhd318.tank_details || {}) };
    d['35'] = 'QC_PASS';
    d['35_history'] = [
      {
        user: 'mxktj620@cosmediva.local',
        status: 'MX ส่ง QC',
        timestamp: '2026-09-15T10:14:52.451Z'
      },
      {
        note: 'ซิงค์ผล QC ถัง 35 จาก Batch 31-35',
        user: 'qcchj1801',
        status: 'QC_PASS',
        timestamp: '2026-09-15T23:47:40.266Z'
      }
    ];
    const { error: jhdErr } = await supabase
      .from('production_logs')
      .update({ tank_details: d, status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', jhd318.id);
    console.log('2. JHD-318 Lot 009/26 Tanks 35-39 -> COMPLETED:', jhdErr ? jhdErr.message : 'SUCCESS');
  }

  // 3. JHD-309 (Lot 012/26, 1-9) Task ae561f2d-784b-41b7-b2c9-baff4944b318
  const { data: jhd309 } = await supabase
    .from('production_logs')
    .select('id, tank_details')
    .eq('id', 'ae561f2d-784b-41b7-b2c9-baff4944b318')
    .single();

  if (jhd309) {
    const d = { ...(jhd309.tank_details || {}) };
    for (let i = 1; i <= 9; i++) {
      d[i] = 'QC_PASS';
    }
    const { error: j309Err } = await supabase
      .from('production_logs')
      .update({ tank_details: d, status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', jhd309.id);
    console.log('3. JHD-309 Lot 012/26 Tanks 1-9 -> COMPLETED:', j309Err ? j309Err.message : 'SUCCESS');
  }

  // 4. JHD-317 (Lot 006/26, 21-25) Task 9d9487a5-fac4-4329-905a-d8a177a397c8
  const { data: jhd317 } = await supabase
    .from('production_logs')
    .select('id, tank_details')
    .eq('id', '9d9487a5-fac4-4329-905a-d8a177a397c8')
    .single();

  if (jhd317) {
    const d = { ...(jhd317.tank_details || {}) };
    d['21'] = 'QC_PASS';
    d['22'] = 'QC_PASS';
    const { error: j317Err } = await supabase
      .from('production_logs')
      .update({ tank_details: d, status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', jhd317.id);
    console.log('4. JHD-317 Lot 006/26 Tanks 21-25 -> COMPLETED:', j317Err ? j317Err.message : 'SUCCESS');
  }

  // 5. JHD-317 (Lot 005/26, 13-18) Task baddd4b3-b24c-424e-ab84-80a05830043c
  const { data: jhd317_5 } = await supabase
    .from('production_logs')
    .select('id, tank_details')
    .eq('id', 'baddd4b3-b24c-424e-ab84-80a05830043c')
    .single();

  if (jhd317_5) {
    const d = { ...(jhd317_5.tank_details || {}) };
    d['17'] = 'QC_PASS';
    d['18'] = 'QC_PASS';
    const { error: j317_5Err } = await supabase
      .from('production_logs')
      .update({ tank_details: d, status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', jhd317_5.id);
    console.log('5. JHD-317 Lot 005/26 Tanks 13-18 -> COMPLETED:', j317_5Err ? j317_5Err.message : 'SUCCESS');
  }

  console.log('=== Finished QC Data Healing ===');
}

run();
