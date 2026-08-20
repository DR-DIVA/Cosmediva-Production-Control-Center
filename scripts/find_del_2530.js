const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function findAndDelete() {
  const { data: logs } = await supabase.from('production_logs').select('id, tank_start, tank_end, activity_date, production_lots(lot_no)').eq('activity_date', '2026-08-20');
  console.log('Logs on 2026-08-20:', logs);
  for (const l of logs) {
    if (l.production_lots?.lot_no === '005/26' || l.tank_start === '25') {
      const { data: d } = await supabase.from('production_logs').delete().eq('id', l.id).select();
      console.log('Deleted log ID:', l.id, d);
    }
  }
}

findAndDelete();
