const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteRecord() {
  const { data, error } = await supabase
    .from('production_lot_rms')
    .delete()
    .eq('po_no', 'PO2607163')
    .eq('rm_code', 'RARBU-A')
    .select();

  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('Deleted records:', data.length);
    console.log(data);
  }
}

deleteRecord();
