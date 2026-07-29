const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function testInsert() {
  const lotData = {
    sku_id: 'dummy-sku-id', // We'll just test the schema
    lot_no: '006/26',
    planned_quantity: 100000,
    total_tanks: 3,
    kg_per_tank: null,
    g_per_piece: null,
    capacity_min: 1000,
    capacity_max: 1500,
    pcs_per_carton: null,
    order_quantity: 100000,
    po_no: '69PL-056',
    order_type: 'MTO',
    fg_due_date: '2026-01-08',
    mfg_date: '2026-11-07',
    exp_date: '2028-11-07',
    status: 'PLANNED'
  };

  console.log('Testing insert...');
  const { data, error } = await supabase.from('production_lots').insert([lotData]);
  
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Inserted successfully:', data);
  }
}

testInsert();
