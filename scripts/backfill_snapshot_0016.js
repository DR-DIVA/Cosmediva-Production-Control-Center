const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function updateSnapshotFor0016() {
  const snapshot = {
    schema_version: "1.0",
    captured_at: "2026-09-25T18:23:16.386Z",
    reporter: {
      user_id: "029f20ec-49b2-469c-aa12-657854a636de",
      full_name: "นายสน (Line Operator)"
    },
    organization: {
      department_code: "PACKING",
      department_name: "แผนกบรรจุและตกแต่ง (Packaging & Finishing)",
      room_code: "PACK-02",
      room_name: "ห้องบรรจุผลิตภัณฑ์อัตโนมัติ ไลน์ 2",
      machine_code: "FILL-LINE-02",
      room_type: "CONTROLLED_PACKING"
    },
    manufacturing_context: {
      is_batch_related: true,
      product: {
        product_id: "prod-aloe-vera-gel-200ml",
        sku: "COS-GEL-002",
        product_name: "Aloe Vera Soothing Gel 200ml (CosmeDiva Standard)",
        product_size: "200ml",
        standard_batch_size: 500,
        default_unit: "ชิ้น"
      },
      production_lot: {
        lot_id: "lot-cos-20260925-01",
        lot_no: "LOT-20260925-01",
        po_no: "PO-2026-8891",
        order_no: "ORD-2026-4421",
        batch_size_kg: 100,
        planned_quantity: 500
      },
      material: {
        material_type: "PM",
        material_lot_no: "PM-L099",
        supplier_name: "Thai Label Packaging Co., Ltd."
      }
    },
    traceability_seal: {
      hash_algorithm: "SHA-256",
      alcoa_plus_compliant: true,
      data_integrity_status: "IMMUTABLE_LOCKED"
    }
  };

  const { data, error } = await supabase
    .from('qms_quality_events')
    .update({ snapshot_context: snapshot })
    .eq('event_no', 'QE-2026-0016')
    .select('event_no, snapshot_context')
    .single();

  if (error) {
    console.error('Error updating snapshot:', error);
  } else {
    console.log('Successfully updated snapshot_context for:', data.event_no);
    console.log('New snapshot:', JSON.stringify(data.snapshot_context, null, 2));
  }
}

updateSnapshotFor0016();
