import { NextRequest, NextResponse } from 'next/server';
import { queryPeople } from '@/lib/peopleDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'summary';
    const warehouseCode = searchParams.get('warehouse') || 'WH-PM';

    if (view === 'summary') {
      // 1. Executive Control Tower Metrics
      const metricsQuery = `
        SELECT 
          COALESCE(SUM(b.physical_quantity), 0) AS total_physical,
          COALESCE(SUM(b.available_quantity), 0) AS total_available,
          COALESCE(SUM(b.reserved_quantity), 0) AS total_reserved,
          COALESCE(SUM(b.hold_quantity), 0) AS total_hold,
          COALESCE(SUM(CASE WHEN b.qc_status = 'QUARANTINE' THEN b.physical_quantity ELSE 0 END), 0) AS total_quarantine,
          COALESCE(SUM(CASE WHEN b.qc_status = 'REJECTED' THEN b.physical_quantity ELSE 0 END), 0) AS total_rejected
        FROM wms_inventory_balances b
        JOIN wms_locations loc ON b.location_id = loc.location_id
        JOIN wms_warehouses w ON loc.warehouse_id = w.warehouse_id
        WHERE w.warehouse_code = $1;
      `;
      const metricsRes = await queryPeople(metricsQuery, [warehouseCode]);

      // 2. Count pending tasks
      const pendingQcRes = await queryPeople(
        `SELECT COUNT(*) as count FROM wms_inventory_lots WHERE qc_status IN ('QUARANTINE', 'WAITING_SAMPLING', 'TESTING')`
      );
      const pendingPutawayRes = await queryPeople(
        `SELECT COUNT(*) as count 
         FROM wms_inventory_balances b
         JOIN wms_locations loc ON b.location_id = loc.location_id
         WHERE loc.location_type = 'DOCK_DOOR' AND b.physical_quantity > 0`
      );
      const pendingPickRes = await queryPeople(
        `SELECT COUNT(*) as count FROM wms_pick_lists WHERE status IN ('PENDING', 'IN_PROGRESS')`
      );

      // 3. Near Expiry Lots (Within 90 days)
      const nearExpiryRes = await queryPeople(
        `SELECT l.internal_lot_number, l.expiry_date, i.item_code, i.item_name_th, 
                SUM(b.physical_quantity) as total_qty, i.base_uom
         FROM wms_inventory_lots l
         JOIN wms_items i ON l.item_id = i.item_id
         JOIN wms_inventory_balances b ON l.lot_id = b.lot_id
         WHERE l.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
           AND b.physical_quantity > 0
         GROUP BY l.internal_lot_number, l.expiry_date, i.item_code, i.item_name_th, i.base_uom
         ORDER BY l.expiry_date ASC
         LIMIT 10;`
      );

      // 4. Balances with Location and Item Details
      const balancesRes = await queryPeople(
        `SELECT 
           b.balance_id,
           i.item_code,
           i.item_name_th,
           i.item_name_en,
           i.category,
           i.base_uom,
           l.internal_lot_number,
           l.supplier_lot_number,
           l.manufacturing_date,
           l.expiry_date,
           b.qc_status,
           b.stock_status,
           b.physical_quantity,
           b.reserved_quantity,
           b.hold_quantity,
           b.available_quantity,
           loc.location_barcode,
           loc.location_name,
           loc.zone_code,
           w.warehouse_code
         FROM wms_inventory_balances b
         JOIN wms_items i ON b.item_id = i.item_id
         JOIN wms_inventory_lots l ON b.lot_id = l.lot_id
         JOIN wms_locations loc ON b.location_id = loc.location_id
         JOIN wms_warehouses w ON loc.warehouse_id = w.warehouse_id
         WHERE w.warehouse_code = $1 AND b.physical_quantity > 0
         ORDER BY i.item_code ASC, l.expiry_date ASC;`,
        [warehouseCode]
      );

      // 5. Recent 20 Transactions
      const transactionsRes = await queryPeople(
        `SELECT 
           t.transaction_id,
           t.transaction_number,
           t.transaction_type,
           i.item_code,
           i.item_name_th,
           l.internal_lot_number,
           loc_from.location_barcode as from_location,
           loc_to.location_barcode as to_location,
           t.quantity,
           t.uom,
           t.reference_number,
           t.user_name,
           t.reason_code,
           t.created_at
         FROM wms_inventory_transactions t
         JOIN wms_items i ON t.item_id = i.item_id
         JOIN wms_inventory_lots l ON t.lot_id = l.lot_id
         LEFT JOIN wms_locations loc_from ON t.from_location_id = loc_from.location_id
         LEFT JOIN wms_locations loc_to ON t.to_location_id = loc_to.location_id
         ORDER BY t.created_at DESC
         LIMIT 20;`
      );

      return NextResponse.json({
        metrics: metricsRes.rows[0],
        pending: {
          qc: parseInt(pendingQcRes.rows[0].count),
          putaway: parseInt(pendingPutawayRes.rows[0].count),
          picking: parseInt(pendingPickRes.rows[0].count),
        },
        nearExpiry: nearExpiryRes.rows,
        balances: balancesRes.rows,
        recentTransactions: transactionsRes.rows,
      });
    }

    if (view === 'items') {
      const itemsRes = await queryPeople(
        `SELECT * FROM wms_items WHERE is_active = TRUE ORDER BY item_code ASC`
      );
      return NextResponse.json({ items: itemsRes.rows });
    }

    if (view === 'locations') {
      const locsRes = await queryPeople(
        `SELECT loc.*, w.warehouse_code 
         FROM wms_locations loc
         JOIN wms_warehouses w ON loc.warehouse_id = w.warehouse_id
         WHERE loc.is_active = TRUE 
         ORDER BY w.warehouse_code, loc.zone_code, loc.rack_code, loc.bay_code, loc.level_code, loc.bin_code`
      );
      return NextResponse.json({ locations: locsRes.rows });
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('WMS Inventory API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
