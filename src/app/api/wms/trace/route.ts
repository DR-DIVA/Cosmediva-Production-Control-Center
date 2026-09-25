import { NextRequest, NextResponse } from 'next/server';
import { queryPeople } from '@/lib/peopleDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lotQuery = searchParams.get('lot');

    if (!lotQuery) {
      return NextResponse.json({ error: 'กรุณาระบุเลข Lot ที่ต้องการสืบย้อนกลับ' }, { status: 400 });
    }

    // 1. Locate lot
    const lotRes = await queryPeople(
      `SELECT l.*, i.item_code, i.item_name_th, i.item_name_en, i.item_type, i.base_uom
       FROM wms_inventory_lots l
       JOIN wms_items i ON l.item_id = i.item_id
       WHERE l.internal_lot_number = $1 OR l.supplier_lot_number = $1
       LIMIT 1`,
      [lotQuery]
    );

    if (lotRes.rows.length === 0) {
      return NextResponse.json({ error: `ไม่พบข้อมูลสำหรับ Lot: ${lotQuery}` }, { status: 404 });
    }

    const lot = lotRes.rows[0];

    // 2. Full History of Transactions for this Lot
    const txnsRes = await queryPeople(
      `SELECT t.*, 
              lf.location_barcode as from_barcode,
              lt.location_barcode as to_barcode
       FROM wms_inventory_transactions t
       LEFT JOIN wms_locations lf ON t.from_location_id = lf.location_id
       LEFT JOIN wms_locations lt ON t.to_location_id = lt.location_id
       WHERE t.lot_id = $1
       ORDER BY t.created_at ASC`,
      [lot.lot_id]
    );

    // 3. Current Stock Balances by Location
    const balancesRes = await queryPeople(
      `SELECT b.*, loc.location_barcode, loc.location_name
       FROM wms_inventory_balances b
       JOIN wms_locations loc ON b.location_id = loc.location_id
       WHERE b.lot_id = $1 AND b.physical_quantity > 0`,
      [lot.lot_id]
    );

    // 4. QC History
    const qcHistRes = await queryPeople(
      `SELECT * FROM wms_qc_status_history WHERE lot_id = $1 ORDER BY changed_at ASC`,
      [lot.lot_id]
    );

    // 5. Forward / Backward Genealogy
    const genealogyForwardRes = await queryPeople(
      `SELECT g.*, cl.internal_lot_number as child_lot_number, ci.item_code as child_item_code, ci.item_name_th as child_item_name
       FROM wms_lot_genealogy g
       JOIN wms_inventory_lots cl ON g.child_lot_id = cl.lot_id
       JOIN wms_items ci ON cl.item_id = ci.item_id
       WHERE g.parent_lot_id = $1`,
      [lot.lot_id]
    );

    const genealogyBackwardRes = await queryPeople(
      `SELECT g.*, pl.internal_lot_number as parent_lot_number, pi.item_code as parent_item_code, pi.item_name_th as parent_item_name
       FROM wms_lot_genealogy g
       JOIN wms_inventory_lots pl ON g.parent_lot_id = pl.lot_id
       JOIN wms_items pi ON pl.item_id = pi.item_id
       WHERE g.child_lot_id = $1`,
      [lot.lot_id]
    );

    return NextResponse.json({
      lot,
      transactions: txnsRes.rows,
      currentLocations: balancesRes.rows,
      qcHistory: qcHistRes.rows,
      forwardGenealogy: genealogyForwardRes.rows,
      backwardGenealogy: genealogyBackwardRes.rows,
    });
  } catch (err: any) {
    console.error('WMS Trace Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
