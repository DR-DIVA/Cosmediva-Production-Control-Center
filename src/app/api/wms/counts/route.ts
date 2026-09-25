import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, queryPeople } from '@/lib/peopleDb';
import { executeLedgerTransaction } from '@/lib/wms/wmsLedger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const countId = searchParams.get('count_id');
    const isBlind = searchParams.get('blind') === 'true'; // For operator mobile

    if (countId) {
      const headerRes = await queryPeople('SELECT * FROM wms_stock_counts WHERE count_id = $1', [countId]);
      
      // If blind, we DO NOT return system_quantity or variance_quantity
      const itemsQuery = isBlind
        ? `SELECT 
             ci.count_item_id, ci.count_id, ci.location_id, ci.item_id, ci.lot_id,
             ci.counted_quantity, ci.uom, ci.status,
             i.item_code, i.item_name_th, l.internal_lot_number, loc.location_barcode
           FROM wms_stock_count_items ci
           JOIN wms_items i ON ci.item_id = i.item_id
           JOIN wms_inventory_lots l ON ci.lot_id = l.lot_id
           JOIN wms_locations loc ON ci.location_id = loc.location_id
           WHERE ci.count_id = $1
           ORDER BY loc.location_barcode`
        : `SELECT 
             ci.*,
             i.item_code, i.item_name_th, l.internal_lot_number, loc.location_barcode
           FROM wms_stock_count_items ci
           JOIN wms_items i ON ci.item_id = i.item_id
           JOIN wms_inventory_lots l ON ci.lot_id = l.lot_id
           JOIN wms_locations loc ON ci.location_id = loc.location_id
           WHERE ci.count_id = $1
           ORDER BY loc.location_barcode`;

      const itemsRes = await queryPeople(itemsQuery, [countId]);

      return NextResponse.json({
        header: headerRes.rows[0],
        items: itemsRes.rows,
      });
    }

    const countsRes = await queryPeople(
      `SELECT c.*, w.warehouse_code, COUNT(ci.count_item_id) as total_bins
       FROM wms_stock_counts c
       JOIN wms_warehouses w ON c.warehouse_id = w.warehouse_id
       LEFT JOIN wms_stock_count_items ci ON c.count_id = ci.count_id
       GROUP BY c.count_id, w.warehouse_code
       ORDER BY c.created_at DESC`
    );

    return NextResponse.json({ counts: countsRes.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. CREATE_COUNT (Manager opens cycle count)
    if (action === 'CREATE_COUNT') {
      const {
        warehouse_code = 'WH-PM',
        zone_code = 'ZONE-A',
        count_type = 'ZONE',
        created_by_user = 'Warehouse Manager',
        notes,
      } = body;

      const result = await withTransaction(async (client) => {
        const whRes = await client.query('SELECT warehouse_id FROM wms_warehouses WHERE warehouse_code = $1', [warehouse_code]);
        const warehouseId = whRes.rows[0].warehouse_id;

        const ym = new Date().toISOString().slice(0, 7).replace('-', '');
        const countSeqRes = await client.query(
          `SELECT COUNT(*) FROM wms_stock_counts WHERE count_number LIKE 'CNT-' || $1 || '-%'`,
          [ym]
        );
        const seq = String(parseInt(countSeqRes.rows[0].count) + 1).padStart(4, '0');
        const countNumber = `CNT-${ym}-${seq}`;

        const insertCountRes = await client.query(
          `INSERT INTO wms_stock_counts (
             count_number, warehouse_id, zone_code, count_type, status, created_by_user, notes
           ) VALUES ($1, $2, $3, $4, 'OPEN', $5, $6)
           RETURNING count_id`,
          [countNumber, warehouseId, zone_code, count_type, created_by_user, notes || null]
        );
        const countId = insertCountRes.rows[0].count_id;

        // Populate count items from existing balances in that zone
        await client.query(
          `INSERT INTO wms_stock_count_items (
             count_id, location_id, item_id, lot_id, system_quantity, uom, status
           )
           SELECT 
             $1, b.location_id, b.item_id, b.lot_id, b.physical_quantity, i.base_uom, 'PENDING'
           FROM wms_inventory_balances b
           JOIN wms_locations loc ON b.location_id = loc.location_id
           JOIN wms_items i ON b.item_id = i.item_id
           WHERE loc.warehouse_id = $2 
             AND (loc.zone_code = $3 OR $3 = 'ALL')
             AND b.physical_quantity > 0`,
          [countId, warehouseId, zone_code]
        );

        return { count_id: countId, count_number: countNumber };
      });

      return NextResponse.json({ success: true, data: result });
    }

    // 2. SUBMIT_BLIND_COUNT (Operator inputs counted quantity)
    if (action === 'SUBMIT_BLIND_COUNT') {
      const {
        count_item_id,
        counted_quantity,
        counted_by_user = 'Count Operator',
      } = body;

      const result = await withTransaction(async (client) => {
        await client.query(
          `UPDATE wms_stock_count_items 
           SET counted_quantity = $1, 
               status = 'COUNTED',
               counted_by_user = $2,
               counted_at = CURRENT_TIMESTAMP
           WHERE count_item_id = $3`,
          [parseFloat(counted_quantity), counted_by_user, count_item_id]
        );
        return { success: true, count_item_id };
      });

      return NextResponse.json({ success: true, data: result });
    }

    // 3. APPROVE_ADJUSTMENT (Manager / Plant Director approves variance)
    if (action === 'APPROVE_ADJUSTMENT') {
      const {
        count_item_id,
        approved_by_user = 'Warehouse Manager',
        investigation_notes,
      } = body;

      const result = await withTransaction(async (client) => {
        const itemRes = await client.query(
          `SELECT ci.*, c.count_number 
           FROM wms_stock_count_items ci
           JOIN wms_stock_counts c ON ci.count_id = c.count_id
           WHERE ci.count_item_id = $1 FOR UPDATE`,
          [count_item_id]
        );
        if (itemRes.rows.length === 0) throw new Error('ไม่พบรายการนับ');
        const item = itemRes.rows[0];

        const variance = Number(item.variance_quantity);
        if (variance === 0) {
          await client.query(`UPDATE wms_stock_count_items SET status = 'MATCH' WHERE count_item_id = $1`, [count_item_id]);
          return { success: true, message: 'ยอดตรงกัน ไม่ต้องปรับปรุง' };
        }

        // Post COUNT_ADJUSTMENT
        // If variance > 0: Found stock (From NULL to Location)
        // If variance < 0: Lost/damaged stock (From Location to NULL)
        const absQty = Math.abs(variance);
        const fromLoc = variance < 0 ? item.location_id : null;
        const toLoc = variance > 0 ? item.location_id : null;

        await executeLedgerTransaction(client, {
          transaction_type: 'COUNT_ADJUSTMENT',
          item_id: item.item_id,
          lot_id: item.lot_id,
          from_location_id: fromLoc,
          to_location_id: toLoc,
          quantity: absQty,
          uom: item.uom,
          reference_type: 'STOCK_COUNT',
          reference_id: item.count_id,
          reference_number: `Count: ${item.count_number}`,
          user_id: approved_by_user,
          user_name: approved_by_user,
          device_id: 'DESKTOP-ADJUST',
          idempotency_key: `ADJ-${item.count_item_id}-${Date.now()}`,
          reason_code: variance > 0 ? 'FOUND_STOCK_VARIANCE' : 'MISSING_STOCK_VARIANCE',
          remarks: investigation_notes || 'ปรับปรุงยอดผลต่างจากการตรวจนับ Cycle Count',
        });

        await client.query(
          `UPDATE wms_stock_count_items 
           SET status = 'ADJUSTED', investigation_notes = $1 
           WHERE count_item_id = $2`,
          [investigation_notes || 'Approved adjustment', count_item_id]
        );

        return { success: true, variance };
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('WMS Counts Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
