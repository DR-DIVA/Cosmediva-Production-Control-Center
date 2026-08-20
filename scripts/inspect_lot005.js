const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function inspect() {
  const { data: lots } = await supabase.from('production_lots').select('id, lot_no').eq('lot_no', '005/26');
  if (!lots || lots.length === 0) return console.log('Lot 005/26 not found');
  const lotId = lots[0].id;

  const { data: logs } = await supabase.from('production_logs')
    .select('id, tank_start, tank_end, status, activity_date, processes(process_name), tank_details')
    .eq('production_lot_id', lotId)
    .order('created_at', { ascending: true });

  console.log(`--- Production Logs for Lot 005/26 (Total ${logs.length}) ---`);
  logs.forEach(l => {
    const details = l.tank_details ? Object.keys(l.tank_details).filter(k => !k.endsWith('_history')).map(k => `${k}:${l.tank_details[k]?.status || l.tank_details[k]}`).join(',') : '';
    console.log(`[${l.processes?.process_name}] Tanks ${l.tank_start}-${l.tank_end} | Date: ${l.activity_date} | Status: ${l.status} | Details: ${details}`);
  });
}

inspect();
