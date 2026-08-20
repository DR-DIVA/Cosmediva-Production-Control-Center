const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function inspect() {
  const { data: lots } = await supabase.from('production_lots').select('id, lot_no').eq('lot_no', '005/26');
  const lotId = lots[0].id;

  const { data: processes } = await supabase.from('processes').select('id').eq('process_name', 'บรรจุ');
  const packingProcId = processes[0].id;

  const { data: logs } = await supabase.from('production_logs')
    .select('id, tank_start, tank_end, activity_date, status, tank_details')
    .eq('production_lot_id', lotId)
    .eq('process_id', packingProcId)
    .order('created_at', { ascending: true });

  console.log(`--- All Packing Logs for Lot 005/26 (Total ${logs.length}) ---`);
  logs.forEach((l, idx) => {
    console.log(`${idx + 1}. ID: ${l.id} | Tanks: ${l.tank_start}-${l.tank_end} | Date: ${l.activity_date} | Status: ${l.status}`);
  });
}

inspect();
