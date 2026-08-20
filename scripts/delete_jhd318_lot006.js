const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function deleteJHD318Lot006() {
  console.log('--- Deleting JHD-318 Lot 006/26 across entire system ---');

  // 1. Find Lot ID for JHD-318, Lot 006/26
  const { data: lots, error: lotErr } = await supabase.from('production_lots')
    .select('id, lot_no, products(sku, product_name)')
    .eq('lot_no', '006/26');

  if (lotErr || !lots) {
    console.error('Error fetching lot:', lotErr);
    return;
  }

  const targetLot = lots.find(l => l.products?.sku === 'JHD-318');
  if (!targetLot) {
    console.log('Could not find Lot 006/26 for JHD-318');
    return;
  }

  console.log(`Found Target Lot: ID ${targetLot.id} | SKU: ${targetLot.products?.sku} | Lot: ${targetLot.lot_no}`);

  // 2. Delete all production_logs for this lot
  const { data: delLogs, error: logErr } = await supabase
    .from('production_logs')
    .delete()
    .eq('production_lot_id', targetLot.id)
    .select();

  if (logErr) {
    console.error('Error deleting production_logs:', logErr);
  } else {
    console.log(`Deleted ${delLogs?.length || 0} production_logs records.`);
  }

  // 3. Delete from defect_logs if any
  try {
    const { data: delDefects } = await supabase
      .from('defect_logs')
      .delete()
      .eq('production_lot_id', targetLot.id)
      .select();
    console.log(`Deleted ${delDefects?.length || 0} defect_logs records.`);
  } catch (e) {
    console.log('defect_logs check passed or table empty');
  }

  // 4. Delete the production_lot header itself
  const { data: delLot, error: delLotErr } = await supabase
    .from('production_lots')
    .delete()
    .eq('id', targetLot.id)
    .select();

  if (delLotErr) {
    console.error('Error deleting production_lots header:', delLotErr);
  } else {
    console.log(`Successfully deleted production_lot ${targetLot.lot_no} (${targetLot.products?.sku})!`);
  }
}

deleteJHD318Lot006();
