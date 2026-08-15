const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  // 1. Fetch one row
  const { data: itemData, error: fetchError } = await supabase
    .from('production_lot_rms')
    .select('*, production_lots(lot_no, sku_id, products(sku), production_logs(activity_date, processes(process_name)))')
    .limit(1)
    .single();

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  // 2. Prepare payload
  const splittingItem = itemData;
  const { id, receive_date, control_no, production_lots, created_at, ...baseItem } = splittingItem;
  
  const insertPayload = {
    ...baseItem,
    quantity: 999,
    eta_date: '2026-08-20',
    bottom_remark: 'Test Split'
  };

  // 3. Try insert
  console.log('Trying to insert:', Object.keys(insertPayload));
  const { error: insertError } = await supabase
    .from('production_lot_rms')
    .insert([insertPayload]);

  if (insertError) {
    console.error('Insert error details:', insertError);
  } else {
    console.log('Insert SUCCESS!');
  }
}

testInsert();
