const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function cleanPhantomAndCheckSort() {
  // 1. Delete 005/26 phantom tasks (tanks 25-30)
  const { data: lot5 } = await supabase.from('production_lots').select('id, lot_no, total_tanks').eq('lot_no', '005/26');
  if (lot5 && lot5[0]) {
    const { data: del5, error: del5Err } = await supabase.from('production_logs')
      .delete()
      .eq('production_lot_id', lot5[0].id)
      .gt('tank_start', 18)
      .select();
    console.log(`Deleted phantom tasks with tank_start > 18 for Lot 005/26: ${del5?.length || 0}`);
  }

  // 2. Check 006/26 tasks
  const { data: lot6 } = await supabase.from('production_lots').select('id, lot_no, total_tanks').eq('lot_no', '006/26');
  if (lot6 && lot6[0]) {
    const { data: logs6 } = await supabase.from('production_logs')
      .select('id, tank_start, tank_end, activity_date, status, processes(process_name)')
      .eq('production_lot_id', lot6[0].id)
      .order('tank_start', { ascending: true });
    console.log(`\nLot 006/26 tasks count: ${logs6?.length || 0}`);
  }
}

cleanPhantomAndCheckSort();
