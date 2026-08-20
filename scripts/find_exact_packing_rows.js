const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function findRows() {
  const { data: logs } = await supabase.from('production_logs')
    .select(`
      id, tank_start, tank_end, activity_date, status, production_lot_id,
      production_lots(lot_no, products(sku)),
      processes(process_name)
    `)
    .order('created_at', { ascending: true });

  console.log('--- Matching Packing Rows for JHD-317 ---');
  const matched = [];
  logs.forEach(l => {
    const sku = l.production_lots?.products?.sku;
    const proc = l.processes?.process_name;
    const lotNo = l.production_lots?.lot_no;
    
    if (sku === 'JHD-317' && proc === 'บรรจุ') {
      console.log(`ID: ${l.id} | Lot: ${lotNo} | Tanks: ${l.tank_start}-${l.tank_end} | Date: ${l.activity_date} | Status: ${l.status}`);
      matched.push(l);
    }
  });

  console.log(`Total JHD-317 packing logs: ${matched.length}`);
}

findRows();
