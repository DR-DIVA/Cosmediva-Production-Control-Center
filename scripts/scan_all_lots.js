const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function scanAllLots() {
  const { data: lots } = await supabase.from('production_lots')
    .select('id, lot_no, total_tanks, products(sku, product_name)')
    .order('lot_no');

  const { data: processes } = await supabase.from('processes').select('id, process_name');
  const procMap = new Map();
  processes.forEach(p => procMap.set(p.id, p.process_name));

  console.log(`Total active lots: ${lots.length}`);

  for (const lot of lots) {
    const { data: logs } = await supabase.from('production_logs')
      .select('id, process_id, tank_start, tank_end, activity_date, status, tank_details, piece_quantity, created_at')
      .eq('production_lot_id', lot.id)
      .order('created_at', { ascending: true });

    if (!logs || logs.length === 0) continue;

    // Group by process
    const byProc = new Map();
    logs.forEach(l => {
      const pName = procMap.get(l.process_id) || 'Unknown';
      if (!byProc.has(pName)) byProc.set(pName, []);
      byProc.get(pName).push(l);
    });

    console.log(`\n======================================================`);
    console.log(`LOT: ${lot.lot_no} | SKU: ${lot.products?.sku} | Tanks: ${lot.total_tanks} | Logs: ${logs.length}`);
    console.log(`======================================================`);

    byProc.forEach((pLogs, pName) => {
      console.log(`  [${pName}] (${pLogs.length} logs)`);
      pLogs.sort((a,b) => (parseInt(a.tank_start)||0) - (parseInt(b.tank_start)||0));
      pLogs.forEach(l => {
        const details = l.tank_details ? Object.keys(l.tank_details).filter(k => !k.endsWith('_history')).map(k => `${k}:${l.tank_details[k]?.status || l.tank_details[k]}`).join(',') : '';
        console.log(`    - ID: ${l.id} | Tanks: ${l.tank_start}-${l.tank_end} | Date: ${l.activity_date} | Status: ${l.status} | Details: ${details.slice(0, 50)}`);
      });
    });
  }
}

scanAllLots();
