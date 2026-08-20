const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk2OTMxNiwiZXhwIjoyMDk5NTQ1MzE2fQ.gAyqPBCtL40XUI1n7pbGQKQyWAocj0iZ21AIgrlI3jU'
);

async function restore() {
  console.log('--- Restoring 16 Deleted Tasks ---');

  // Fetch lots and processes to get correct IDs
  const { data: lots } = await supabase.from('production_lots').select('id, lot_no, total_tanks');
  const { data: processes } = await supabase.from('processes').select('id, process_name');

  const lotMap = new Map();
  (lots || []).forEach(l => lotMap.set(l.lot_no, l));

  const procMap = new Map();
  (processes || []).forEach(p => {
    if (p.process_name.includes('ผสม')) procMap.set('ผสม', p.id);
    if (p.process_name.includes('บรรจุ')) procMap.set('บรรจุ', p.id);
    if (p.process_name.includes('POF') || p.process_name.includes('ลงลัง')) procMap.set('POF', p.id);
  });

  const tasksToRestore = [
    { id: 'b5eb517e-e651-4444-9888-e316841758b9', lot_no: '006/26', proc: 'ผสม', s: '11', e: '15' },
    { id: 'a96ac69c-0b26-4f24-8455-a231e86f0a64', lot_no: '006/26', proc: 'ผสม', s: '21', e: '25' },
    { id: '18eca22d-5455-43d4-8718-81554dfc15ae', lot_no: '006/26', proc: 'ผสม', s: '26', e: '30' },
    { id: '6163b57b-dc45-419f-8e4f-b4ee96b06c70', lot_no: '005/26', proc: 'ผสม', s: '25', e: '30' },
    { id: 'a7c28423-bd1e-49c3-ba4d-308ee15f7cd9', lot_no: '005/26', proc: 'บรรจุ', s: '25', e: '30' },
    { id: '93e2ea51-e809-4cd7-8a8c-b399e1851481', lot_no: '007/26', proc: 'บรรจุ', s: '49', e: '52' },
    { id: '061eba99-3865-4004-b243-eb7cfaf038ca', lot_no: '011/26', proc: 'ผสม', s: '21', e: '30' },
    { id: '201fadd3-194c-4321-971e-22e9aa34950d', lot_no: '011/26', proc: 'ผสม', s: '31', e: '40' },
    { id: 'ce4c4e6e-b50f-4eb6-8388-d8df4ab11ec4', lot_no: '012/26', proc: 'บรรจุ', s: '7', e: '7' },
    { id: '3a993633-6602-4469-aaa5-1c8c21bcff0e', lot_no: '012/26', proc: 'บรรจุ', s: '8', e: '8' },
    { id: '60db2bd4-31a8-4190-ae5e-038287d917fa', lot_no: '012/26', proc: 'บรรจุ', s: '9', e: '9' },
    { id: '956ab3d5-5dbe-4ea1-a389-e7c1fccda698', lot_no: '007/26', proc: 'POF', s: '41', e: '45' },
    { id: 'd3d19ca3-eb09-4a00-b0d0-4dcefc4cc5fc', lot_no: '008/26', proc: 'บรรจุ', s: '13', e: '16' },
    { id: '1f021ae6-e221-463d-bb1e-8d64cc5fa13a', lot_no: '008/26', proc: 'POF', s: '1', e: '5' },
    { id: 'f889f5ec-ec19-4254-b866-8785bf9682c9', lot_no: '008/26', proc: 'POF', s: '6', e: '10' },
    { id: 'badaef28-8a14-46ae-8020-b6644de95a7a', lot_no: '008/26', proc: 'POF', s: '11', e: '15' }
  ];

  const rowsToInsert = [];
  for (const t of tasksToRestore) {
    const lot = lotMap.get(t.lot_no);
    const procId = procMap.get(t.proc);
    if (!lot || !procId) {
      console.warn(`Could not find lot ${t.lot_no} or proc ${t.proc}`);
      continue;
    }

    const start = parseInt(t.s);
    const end = parseInt(t.e);
    const details = {};
    for (let i = start; i <= end; i++) {
      details[i] = 'WAITING';
    }

    rowsToInsert.push({
      id: t.id,
      production_lot_id: lot.id,
      process_id: procId,
      status: 'WAITING',
      activity_date: new Date().toISOString().split('T')[0],
      tank_start: t.s,
      tank_end: t.e,
      total_tanks: lot.total_tanks,
      tank_details: details,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('production_logs')
    .insert(rowsToInsert)
    .select();

  if (insertErr) {
    console.error('Error restoring tasks:', insertErr);
  } else {
    console.log(`Successfully restored ${inserted?.length || 0} tasks!`);
  }
}

restore();
