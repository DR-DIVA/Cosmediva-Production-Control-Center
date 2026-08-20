const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk2OTMxNiwiZXhwIjoyMDk5NTQ1MzE2fQ.gAyqPBCtL40XUI1n7pbGQKQyWAocj0iZ21AIgrlI3jU'
);

async function deleteExact9Rows() {
  console.log('--- Finding exact 9 packing rows for JHD-317 Lot 005/26 ---');

  const { data: lots } = await supabase.from('production_lots').select('id').eq('lot_no', '005/26');
  if (!lots || lots.length === 0) return console.log('Lot 005/26 not found');
  const lotId = lots[0].id;

  const { data: processes } = await supabase.from('processes').select('id').eq('process_name', 'บรรจุ');
  if (!processes || processes.length === 0) return console.log('Process บรรจุ not found');
  const packingProcId = processes[0].id;

  // Find all packing logs for 005/26 with status WAITING / PLANNED and 2-tank chunks
  const targetTankPairs = [
    ['1', '2'], ['3', '4'], ['5', '6'], ['7', '8'], ['9', '10'],
    ['11', '12'], ['13', '14'], ['15', '16'], ['17', '18']
  ];

  const { data: packingLogs } = await supabase.from('production_logs')
    .select('id, tank_start, tank_end, activity_date, status, tank_details')
    .eq('production_lot_id', lotId)
    .eq('process_id', packingProcId);

  const matchedToDelete = [];
  packingLogs.forEach(l => {
    const isPair = targetTankPairs.some(p => String(l.tank_start) === p[0] && String(l.tank_end) === p[1]);
    const details = typeof l.tank_details === 'object' && l.tank_details !== null ? l.tank_details : {};
    const hasHistory = Object.keys(details).some(k => k.endsWith('_history') && Array.isArray(details[k]) && details[k].length > 0);
    
    // Only delete if it's one of the 9 2-tank pairs and has no actual piece progress or is WAITING
    if (isPair && (!hasHistory || l.status === 'WAITING' || l.status === 'PLANNED')) {
      matchedToDelete.push(l);
      console.log(`Matched to delete: ID ${l.id} | Tanks ${l.tank_start}-${l.tank_end} | Date: ${l.activity_date} | Status: ${l.status}`);
    }
  });

  console.log(`Total matched rows to delete: ${matchedToDelete.length}`);

  if (matchedToDelete.length > 0) {
    const ids = matchedToDelete.map(m => m.id);
    const { error: delErr } = await supabase.from('production_logs').delete().in('id', ids);
    if (delErr) {
      console.error('Delete error:', delErr);
    } else {
      console.log(`Successfully deleted ${matchedToDelete.length} rows!`);
    }
  }
}

deleteExact9Rows();
