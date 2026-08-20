const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function inspectJHD318() {
  const { data: lots } = await supabase.from('production_lots')
    .select('id, lot_no, total_tanks, products(sku, product_name)')
    .order('lot_no');

  const jhd318Lots = lots.filter(l => l.products?.sku === 'JHD-318');
  console.log('JHD-318 Lots:', jhd318Lots);

  for (const l of jhd318Lots) {
    const { data: logs } = await supabase.from('production_logs')
      .select('id, tank_start, tank_end, activity_date, status, processes(process_name), tank_details')
      .eq('production_lot_id', l.id)
      .order('created_at', { ascending: true });

    console.log(`\n========================================`);
    console.log(`Lot ${l.lot_no} (${l.total_tanks} tanks) - Total logs: ${logs.length}`);
    console.log(`========================================`);
    
    const packingLogs = logs.filter(lg => lg.processes?.process_name.includes('บรรจุ'));
    console.log(`--- Packing logs (${packingLogs.length}) ---`);
    packingLogs.forEach(pl => {
      const d = pl.tank_details ? Object.keys(pl.tank_details).filter(k => !k.endsWith('_history')).map(k => `${k}:${pl.tank_details[k]?.status || pl.tank_details[k]}`).join(',') : '';
      console.log(`ID: ${pl.id} | Tanks: ${pl.tank_start}-${pl.tank_end} | Date: ${pl.activity_date} | Status: ${pl.status} | Details: ${d}`);
    });
  }
}

inspectJHD318();
