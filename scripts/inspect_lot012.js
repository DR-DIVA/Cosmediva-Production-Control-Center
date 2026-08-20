const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function inspectLot012() {
  const { data: lots } = await supabase.from('production_lots')
    .select('id, lot_no, total_tanks, products(sku, product_name)')
    .eq('lot_no', '012/26');

  if (!lots || lots.length === 0) return console.log('Lot 012/26 not found');
  const lot = lots[0];
  console.log(`Lot: ${lot.lot_no} | Total tanks: ${lot.total_tanks} | Product: ${lot.products?.sku} - ${lot.products?.product_name}`);

  const { data: logs } = await supabase.from('production_logs')
    .select('id, tank_start, tank_end, activity_date, status, processes(process_name), tank_details')
    .eq('production_lot_id', lot.id)
    .order('created_at', { ascending: true });

  console.log(`\nTotal logs for Lot 012/26: ${logs.length}`);
  logs.forEach(l => {
    console.log(`[${l.processes?.process_name}] Tanks ${l.tank_start}-${l.tank_end} | Date: ${l.activity_date} | Status: ${l.status}`);
  });
}

inspectLot012();
