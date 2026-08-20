const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function delete2530() {
  const { data: lot5 } = await supabase.from('production_lots').select('id').eq('lot_no', '005/26');
  if (lot5 && lot5[0]) {
    const { data: del, error } = await supabase.from('production_logs')
      .delete()
      .eq('production_lot_id', lot5[0].id)
      .eq('tank_start', '25')
      .select();
    console.log('Deleted 25-30 for 005/26:', del?.length || 0, error || '');
  }
}

delete2530();
