const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRecord() {
  const { data, error } = await supabase
    .from('production_lot_rms')
    .update({
      supplier: 'บริษัท วันรัต (หน่ำเซียน) จำกัด',
      top_remark: 'PR:PL-R2607-015 ลว.30/07/26',
      bottom_remark: 'FOR JHD-317 L.006 / 26BZ.252x18=4,536KOrder150,100P / อ้างอิงราคาเดิม(Allantoin) / PZ.1,20KG.            1,260.00 / .'
    })
    .eq('id', '25342caf-5e8d-4e03-8172-d0f7b87c10fd')
    .select();

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Updated record:', data);
  }
}

updateRecord();
