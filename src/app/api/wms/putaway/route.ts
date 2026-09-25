import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, queryPeople } from '@/lib/peopleDb';
import { executeLedgerTransaction } from '@/lib/wms/wmsLedger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('item_id');
    const lotId = searchParams.get('lot_id');

    if (!itemId) {
      return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });
    }

    // Rule-Based Put-Away Slotting Engine:
    // 1. Same Item + Same Lot existing bin (if capacity allows)
    // 2. Same Item existing bin
    // 3. Compatible storage condition empty/partially filled bin in WH-PM
    const suggestQuery = `
      WITH item_info AS (
        SELECT storage_condition FROM wms_items WHERE item_id = $1
      ),
      same_lot_bins AS (
        SELECT loc.location_id, loc.location_barcode, loc.location_name, 1 as priority
        FROM wms_inventory_balances b
        JOIN wms_locations loc ON b.location_id = loc.location_id
        WHERE b.item_id = $1 AND b.lot_id = $2 AND loc.location_type = 'RACK_BIN' AND loc.is_locked = FALSE
        LIMIT 1
      ),
      same_item_bins AS (
        SELECT loc.location_id, loc.location_barcode, loc.location_name, 2 as priority
        FROM wms_inventory_balances b
        JOIN wms_locations loc ON b.location_id = loc.location_id
        WHERE b.item_id = $1 AND loc.location_type = 'RACK_BIN' AND loc.is_locked = FALSE
        LIMIT 1
      ),
      available_bins AS (
        SELECT loc.location_id, loc.location_barcode, loc.location_name, 3 as priority
        FROM wms_locations loc, item_info
        JOIN wms_warehouses w ON loc.warehouse_id = w.warehouse_id
        WHERE w.warehouse_code = 'WH-PM'
          AND loc.location_type = 'RACK_BIN'
          AND loc.is_locked = FALSE
          AND (loc.storage_condition = item_info.storage_condition OR loc.storage_condition = 'AMBIENT')
        ORDER BY loc.zone_code, loc.rack_code, loc.bay_code, loc.level_code, loc.bin_code
        LIMIT 5
      )
      SELECT * FROM same_lot_bins
      UNION ALL
      SELECT * FROM same_item_bins WHERE NOT EXISTS (SELECT 1 FROM same_lot_bins)
      UNION ALL
      SELECT * FROM available_bins WHERE NOT EXISTS (SELECT 1 FROM same_lot_bins) AND NOT EXISTS (SELECT 1 FROM same_item_bins)
      ORDER BY priority ASC
      LIMIT 1;
    `;

    const suggestRes = await queryPeople(suggestQuery, [itemId, lotId || '00000000-0000-0000-0000-000000000000']);
    const recommendedLocation = suggestRes.rows[0] || null;

    // Available target locations list
    const allLocationsRes = await queryPeople(
      `SELECT loc.location_id, loc.location_barcode, loc.location_name, loc.zone_code, loc.storage_condition
       FROM wms_locations loc
       JOIN wms_warehouses w ON loc.warehouse_id = w.warehouse_id
       WHERE w.warehouse_code = 'WH-PM' AND loc.location_type = 'RACK_BIN' AND loc.is_locked = FALSE
       ORDER BY loc.zone_code, loc.rack_code, loc.bay_code, loc.level_code, loc.bin_code`
    );

    return NextResponse.json({
      recommendedLocation,
      locations: allLocationsRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      item_id,
      lot_id,
      from_location_barcode,
      target_location_barcode,
      quantity,
      uom = 'PCS',
      user_id = 'USR-OPERATOR-01',
      user_name = 'Warehouse Operator',
      idempotency_key = `PUT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    } = body;

    if (!item_id || !lot_id || !from_location_barcode || !target_location_barcode || !quantity) {
      return NextResponse.json({ error: 'กรุณาระบุข้อมูลให้ครบถ้วน (สินค้า, Lot, พิกัดต้นทาง, พิกัดปลายทาง, จำนวน)' }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      // 1. Resolve Locations
      const fromLocRes = await client.query('SELECT location_id, location_barcode FROM wms_locations WHERE location_barcode = $1', [from_location_barcode]);
      const toLocRes = await client.query('SELECT location_id, location_barcode FROM wms_locations WHERE location_barcode = $1', [target_location_barcode]);

      if (fromLocRes.rows.length === 0) throw new Error(`ไม่พบพิกัดต้นทาง: ${from_location_barcode}`);
      if (toLocRes.rows.length === 0) throw new Error(`ไม่พบพิกัดปลายทาง: ${target_location_barcode}`);

      const fromLocationId = fromLocRes.rows[0].location_id;
      const toLocationId = toLocRes.rows[0].location_id;

      // 2. Fetch Item & Lot info
      const lotRes = await client.query('SELECT internal_lot_number FROM wms_inventory_lots WHERE lot_id = $1', [lot_id]);
      const lotNumber = lotRes.rows[0]?.internal_lot_number || 'UNKNOWN';

      // 3. Post Ledger PUTAWAY Transaction
      const txnRes = await executeLedgerTransaction(client, {
        transaction_type: 'PUTAWAY',
        item_id,
        lot_id,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity: parseFloat(quantity),
        uom,
        reference_type: 'GRN',
        reference_id: `PUT-${lotNumber}`,
        reference_number: `Put-away to ${target_location_barcode}`,
        user_id,
        user_name,
        device_id: 'MOBILE-PUTAWAY',
        idempotency_key,
        reason_code: 'PUTAWAY_CONFIRMATION',
        remarks: `จัดเก็บสินค้าจาก ${from_location_barcode} เข้าสู่ ${target_location_barcode}`,
      });

      return {
        transaction_number: txnRes.transaction_number,
        item_id,
        lot_id,
        from_location: from_location_barcode,
        to_location: target_location_barcode,
        quantity,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('WMS Putaway Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
