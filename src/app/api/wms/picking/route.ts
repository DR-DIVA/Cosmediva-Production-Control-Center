import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, queryPeople } from '@/lib/peopleDb';
import { runFefoAllocation } from '@/lib/wms/fefoEngine';
import { executeLedgerTransaction } from '@/lib/wms/wmsLedger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pickListId = searchParams.get('pick_list_id');

    if (pickListId) {
      const itemsRes = await queryPeople(
        `SELECT 
           pi.*,
           i.item_code,
           i.item_name_th,
           l.internal_lot_number,
           l.expiry_date,
           loc.location_barcode,
           loc.zone_code
         FROM wms_pick_list_items pi
         JOIN wms_items i ON pi.item_id = i.item_id
         JOIN wms_inventory_lots l ON pi.lot_id = l.lot_id
         JOIN wms_locations loc ON pi.location_id = loc.location_id
         WHERE pi.pick_list_id = $1
         ORDER BY loc.zone_code, loc.location_barcode`,
        [pickListId]
      );

      const headerRes = await queryPeople(
        `SELECT * FROM wms_pick_lists WHERE pick_list_id = $1`,
        [pickListId]
      );

      return NextResponse.json({
        header: headerRes.rows[0],
        items: itemsRes.rows,
      });
    }

    // List all active pick lists with items aggregated
    const listsRes = await queryPeople(
      `SELECT 
         p.*,
         w.warehouse_code as target_warehouse,
         loc.location_barcode as staging_location,
         COUNT(pi.item_pick_id) as total_items,
         COUNT(CASE WHEN pi.status = 'PICKED' THEN 1 END) as picked_items,
         COALESCE(
           json_agg(
             json_build_object(
               'item_pick_id', pi.item_pick_id,
               'item_id', pi.item_id,
               'item_code', i.item_code,
               'item_name_th', i.item_name_th,
               'lot_id', pi.lot_id,
               'internal_lot_number', l.internal_lot_number,
               'expiry_date', l.expiry_date,
               'location_id', pi.location_id,
               'location_barcode', ploc.location_barcode,
               'required_qty', pi.required_qty,
               'picked_qty', pi.picked_qty,
               'uom', pi.uom,
               'status', pi.status
             )
           ) FILTER (WHERE pi.item_pick_id IS NOT NULL),
           '[]'::json
         ) as items
       FROM wms_pick_lists p
       JOIN wms_warehouses w ON p.target_warehouse_id = w.warehouse_id
       JOIN wms_locations loc ON p.staging_location_id = loc.location_id
       LEFT JOIN wms_pick_list_items pi ON p.pick_list_id = pi.pick_list_id
       LEFT JOIN wms_items i ON pi.item_id = i.item_id
       LEFT JOIN wms_inventory_lots l ON pi.lot_id = l.lot_id
       LEFT JOIN wms_locations ploc ON pi.location_id = ploc.location_id
       GROUP BY p.pick_list_id, w.warehouse_code, loc.location_barcode
       ORDER BY p.created_at DESC`
    );

    return NextResponse.json({ pickLists: listsRes.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. ACTION: CREATE_WAVE (Generate Pick List with automated FEFO Allocation)
    if (action === 'CREATE_WAVE') {
      const {
        production_order_no,
        items, // Array of { item_id, required_qty, uom }
        staging_location_barcode = 'WH-PM-STAGE-LINE-01',
        user_id = 'PLANNER-01',
        notes,
      } = body;

      if (!production_order_no || !items || items.length === 0) {
        return NextResponse.json({ error: 'กรุณาระบุเลขที่คำสั่งผลิตและรายการสินค้าที่ต้องการเบิก' }, { status: 400 });
      }

      const result = await withTransaction(async (client) => {
        // Resolve staging location
        const stageLocRes = await client.query(
          `SELECT location_id, warehouse_id FROM wms_locations WHERE location_barcode = $1`,
          [staging_location_barcode]
        );
        if (stageLocRes.rows.length === 0) {
          throw new Error(`ไม่พบพิกัดจุดพักรอหน้าไลน์: ${staging_location_barcode}`);
        }
        const { location_id: stagingLocationId, warehouse_id: targetWhId } = stageLocRes.rows[0];

        // Generate Pick List Number
        const ym = new Date().toISOString().slice(0, 7).replace('-', '');
        const countRes = await client.query(
          `SELECT COUNT(*) FROM wms_pick_lists WHERE pick_list_number LIKE 'PICK-' || $1 || '-%'`,
          [ym]
        );
        const seq = String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0');
        const pickListNumber = `PICK-${ym}-${seq}`;

        // Create Pick List Header
        const insertListRes = await client.query(
          `INSERT INTO wms_pick_lists (
             pick_list_number, production_order_id, production_order_no,
             target_warehouse_id, staging_location_id, status, notes
           ) VALUES ($1, $2, $2, $3, $4, 'IN_PROGRESS', $5)
           RETURNING pick_list_id`,
          [pickListNumber, production_order_no, targetWhId, stagingLocationId, notes || null]
        );
        const pickListId = insertListRes.rows[0].pick_list_id;

        // Run Deterministic FEFO for each item
        const allAllocations = [];
        for (const it of items) {
          const allocRes = await runFefoAllocation(
            client,
            it.item_id,
            parseFloat(it.required_qty),
            pickListId,
            it.uom || 'PCS'
          );
          allAllocations.push(...allocRes.allocations);
        }

        return {
          pick_list_id: pickListId,
          pick_list_number: pickListNumber,
          production_order_no,
          allocations: allAllocations,
        };
      });

      return NextResponse.json({ success: true, data: result });
    }

    // 2. ACTION: CONFIRM_PICK_STEP (Worker scans location, item, lot, quantity)
    if (action === 'CONFIRM_PICK_STEP') {
      const {
        item_pick_id,
        scanned_location_barcode,
        scanned_lot_number,
        picked_qty,
        user_name = 'Warehouse Picker',
      } = body;

      const result = await withTransaction(async (client) => {
        // Fetch pick task
        const pickRes = await client.query(
          `SELECT pi.*, l.internal_lot_number, loc.location_barcode 
           FROM wms_pick_list_items pi
           JOIN wms_inventory_lots l ON pi.lot_id = l.lot_id
           JOIN wms_locations loc ON pi.location_id = loc.location_id
           WHERE pi.item_pick_id = $1`,
          [item_pick_id]
        );
        if (pickRes.rows.length === 0) throw new Error('ไม่พบรายการหยิบนี้');
        const task = pickRes.rows[0];

        // Strict Scan Validation
        if (task.location_barcode !== scanned_location_barcode) {
          throw new Error(`พิกัดไม่ถูกต้อง! ระบบสั่งให้หยิบที่ ${task.location_barcode} แต่สแกนได้ ${scanned_location_barcode}`);
        }
        if (task.internal_lot_number !== scanned_lot_number) {
          throw new Error(`Lot ไม่ถูกต้อง! ระบบสั่งให้หยิบ Lot ${task.internal_lot_number} แต่สแกนได้ ${scanned_lot_number}`);
        }

        // Update pick task status
        await client.query(
          `UPDATE wms_pick_list_items 
           SET picked_qty = $1, status = 'PICKED', scanned_at = CURRENT_TIMESTAMP, scanned_by_user = $2
           WHERE item_pick_id = $3`,
          [parseFloat(picked_qty), user_name, item_pick_id]
        );

        return { success: true, item_pick_id, status: 'PICKED' };
      });

      return NextResponse.json({ success: true, data: result });
    }

    // 2.1 ACTION: CONFIRM_PICK_ITEM (One-click pick confirmation from Web Console)
    if (action === 'CONFIRM_PICK_ITEM') {
      const { item_pick_id, user_name = 'เจ้าหน้าที่คลังสินค้า' } = body;
      if (!item_pick_id) {
        return NextResponse.json({ error: 'ไม่พบรหัสรายการหยิบ' }, { status: 400 });
      }

      await withTransaction(async (client) => {
        await client.query(
          `UPDATE wms_pick_list_items 
           SET picked_qty = required_qty, status = 'PICKED', scanned_at = CURRENT_TIMESTAMP, scanned_by_user = $1
           WHERE item_pick_id = $2`,
          [user_name, item_pick_id]
        );
      });

      return NextResponse.json({ success: true, message: 'ยืนยันการหยิบสินค้าเข้าสู่จุดเตรียมส่งมอบเรียบร้อย' });
    }

    // 2.2 ACTION: PICK_ALL (Confirm all items in pick list for Web Console)
    if (action === 'PICK_ALL') {
      const { pick_list_id, user_name = 'เจ้าหน้าที่คลังสินค้า' } = body;
      if (!pick_list_id) {
        return NextResponse.json({ error: 'ไม่พบรหัสใบสั่งหยิบ' }, { status: 400 });
      }

      await withTransaction(async (client) => {
        await client.query(
          `UPDATE wms_pick_list_items 
           SET picked_qty = required_qty, status = 'PICKED', scanned_at = CURRENT_TIMESTAMP, scanned_by_user = $1
           WHERE pick_list_id = $2 AND status = 'ALLOCATED'`,
          [user_name, pick_list_id]
        );
      });

      return NextResponse.json({ success: true, message: 'ยืนยันหยิบสินค้าครบทุกรายการเรียบร้อยแล้ว' });
    }

    // 3. ACTION: HANDOVER_TO_PRODUCTION (Line Leader Dual-Scan and commit ISSUE_TO_PROD)
    if (action === 'HANDOVER_TO_PRODUCTION') {
      const {
        pick_list_id,
        warehouse_user = 'Warehouse Handover',
        line_leader_user = 'Line Leader',
        idempotency_key = `HANDOVER-${Date.now()}`,
      } = body;

      const result = await withTransaction(async (client) => {
        const listRes = await client.query(
          `SELECT p.*, loc.location_barcode 
           FROM wms_pick_lists p
           JOIN wms_locations loc ON p.staging_location_id = loc.location_id
           WHERE p.pick_list_id = $1`,
          [pick_list_id]
        );
        if (listRes.rows.length === 0) throw new Error('ไม่พบใบสั่งหยิบ');
        const pickList = listRes.rows[0];

        // Fetch all picked items
        let itemsRes = await client.query(
          `SELECT * FROM wms_pick_list_items WHERE pick_list_id = $1 AND status = 'PICKED'`,
          [pick_list_id]
        );

        // Graceful Auto-Pick: If user hasn't explicitly clicked Pick on web console, auto-confirm allocated items
        if (itemsRes.rows.length === 0) {
          const allocatedRes = await client.query(
            `SELECT * FROM wms_pick_list_items WHERE pick_list_id = $1 AND status = 'ALLOCATED'`,
            [pick_list_id]
          );

          if (allocatedRes.rows.length === 0) {
            throw new Error('ไม่พบรายการสินค้าที่ต้องส่งมอบในใบสั่งนี้');
          }

          // Auto-confirm all allocated items to PICKED
          await client.query(
            `UPDATE wms_pick_list_items 
             SET picked_qty = required_qty, status = 'PICKED', scanned_at = CURRENT_TIMESTAMP, scanned_by_user = $1
             WHERE pick_list_id = $2 AND status = 'ALLOCATED'`,
            [warehouse_user, pick_list_id]
          );

          // Re-fetch picked items
          itemsRes = await client.query(
            `SELECT * FROM wms_pick_list_items WHERE pick_list_id = $1 AND status = 'PICKED'`,
            [pick_list_id]
          );
        }

        // Post Immutable Transactions for each item: ISSUE_TO_PROD
        for (const item of itemsRes.rows) {
          // Release reservation
          await client.query(
            `UPDATE wms_inventory_balances 
             SET reserved_quantity = GREATEST(0, reserved_quantity - $1)
             WHERE item_id = $2 AND lot_id = $3 AND location_id = $4`,
            [item.picked_qty, item.item_id, item.lot_id, item.location_id]
          );

          // Commit Ledger Deduction: from location to staging/production
          await executeLedgerTransaction(client, {
            transaction_type: 'ISSUE_TO_PROD',
            item_id: item.item_id,
            lot_id: item.lot_id,
            from_location_id: item.location_id,
            to_location_id: pickList.staging_location_id,
            quantity: parseFloat(item.picked_qty),
            uom: item.uom,
            reference_type: 'PRODUCTION_ORDER',
            reference_id: pickList.pick_list_id,
            reference_number: `PO-PD: ${pickList.production_order_no} / Pick: ${pickList.pick_list_number}`,
            user_id: warehouse_user,
            user_name: `${warehouse_user} & ${line_leader_user}`,
            device_id: 'HANDOVER-TERMINAL',
            idempotency_key: `${idempotency_key}-${item.item_pick_id}`,
            reason_code: 'PRODUCTION_LINE_HANDOVER',
            remarks: `ส่งมอบเข้าไลน์ผลิต ${pickList.production_order_no} โดยหัวหน้าไลน์ ${line_leader_user}`,
          });
        }

        // Mark pick list as ISSUED
        await client.query(
          `UPDATE wms_pick_lists SET status = 'ISSUED', updated_at = CURRENT_TIMESTAMP WHERE pick_list_id = $1`,
          [pick_list_id]
        );

        return {
          pick_list_id,
          pick_list_number: pickList.pick_list_number,
          status: 'ISSUED',
        };
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('WMS Picking Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
