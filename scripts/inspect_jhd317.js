const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function inspectJHD317() {
  const { data: lots } = await supabase.from('production_lots')
    .select('id, lot_no, total_tanks, products(sku)')
    .order('lot_no');

  const jhdLots = lots.filter(l => l.products?.sku === 'JHD-317');
  console.log('JHD-317 Lots:', jhdLots);

  for (const l of jhdLots) {
    const { data: logs } = await supabase.from('production_logs')
      .select('id, tank_start, tank_end, activity_date, status, processes(process_name)')
      .eq('production_lot_id', l.id);
    
    console.log(`\nLot ${l.lot_no} (${l.total_tanks} tanks) - Total logs: ${logs.length}`);
    const packingLogs = logs.filter(lg => lg.processes?.process_name.includes('บรรจุ'));
    console.log(`  Packing logs: ${packingLogs.length}`);
    packingLogs.sort((a,b) => (parseInt(a.tank_start)||0) - (parseInt(b.tank_start)||0));
    packingLogs.forEach(pl => {
      console.log(`    Tanks ${pl.tank_start}-${pl.tank_end} | Date: ${pl.activity_date} | Status: ${pl.status}`);
    });
  }
}

inspectJHD317();
