const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function inspectJHD309Packing() {
  const { data: logs } = await supabase.from('production_logs')
    .select(`
      id, tank_start, tank_end, activity_date, status, piece_quantity, tank_details,
      production_lots(id, lot_no, products(sku, product_name)),
      processes(process_name)
    `)
    .order('created_at', { ascending: true });

  console.log('--- Matching Packing Logs for JHD-309 Lot 011/26 ---');
  logs.forEach(l => {
    const sku = l.production_lots?.products?.sku;
    const lotNo = l.production_lots?.lot_no;
    const proc = l.processes?.process_name;

    if (sku === 'JHD-309' && proc === 'บรรจุ') {
      console.log(`ID: ${l.id} | Lot: ${lotNo} | Tanks: ${l.tank_start}-${l.tank_end} | Date: ${l.activity_date} | Status: ${l.status} | Pcs: ${l.piece_quantity}`);
    }
  });
}

inspectJHD309Packing();
