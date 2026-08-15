const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreRecord() {
  const payload = {
    id: '25342caf-5e8d-4e03-8172-d0f7b87c10fd',
    production_lot_id: 'a8f76291-7c02-45b3-a2f3-f166b1a79482',
    rm_code: 'RARBU-A',
    rm_name: 'Alpha Arbutin (NSG)',
    pr_no: 'PL-R2607-015',
    po_no: 'PO2607163',
    eta_date: '2026-08-04',
    status: 'RECEIVED',
    supplier: 'บริษัท วันรัต (หน่ําเซียน) จํากัด',
    po_date: '2026-07-31',
    warehouse: 'MMRM',
    quantity: 4,
    unit: 'KG',
    top_remark: 'PR:PL-R2607-015 ลว.30/07/26',
    bottom_remark: 'FOR JHD-317 L.006 / 26BZ.252x18=4,536KOrder150,100P / อางอิงราคาเดิม(Allantoin) / PZ.1,20KG.            1,260.00 / .',
    receive_date: '2026-08-04T10:05:50.441+00:00',
    file_link: 'https://yzwldawflteyywuetzcw.supabase.co/storage/v1/object/public/po-documents/1785691141160_99tzll.pdf',
  };

  const { data, error } = await supabase
    .from('production_lot_rms')
    .insert([payload])
    .select();

  if (error) {
    console.error('Restore error:', error);
  } else {
    console.log('Restored record:', data);
  }
}

restoreRecord();
