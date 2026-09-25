import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, queryPeople } from '@/lib/peopleDb';
import { emitDomainEvent } from '@/lib/events/domainEvents';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'QUARANTINE';

    const lotsRes = await queryPeople(
      `SELECT 
         l.lot_id,
         l.internal_lot_number,
         l.supplier_lot_number,
         l.supplier_name,
         l.manufacturing_date,
         l.receiving_date,
         l.expiry_date,
         l.qc_status,
         l.stock_status,
         l.remarks,
         i.item_code,
         i.item_name_th,
         i.base_uom,
         b.physical_quantity,
         loc.location_barcode
       FROM wms_inventory_lots l
       JOIN wms_items i ON l.item_id = i.item_id
       LEFT JOIN wms_inventory_balances b ON l.lot_id = b.lot_id
       LEFT JOIN wms_locations loc ON b.location_id = loc.location_id
       WHERE l.qc_status = $1 OR ($1 = 'ALL')
       ORDER BY l.receiving_date DESC`,
      [status]
    );

    return NextResponse.json({ lots: lotsRes.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lot_id,
      new_status, // 'RELEASED' | 'HOLD' | 'REJECTED'
      reason_code = 'ROUTINE_QC_INSPECTION',
      test_result_summary,
      inspector_user = 'QC Inspector',
      qc_notes,
    } = body;

    if (!lot_id || !new_status) {
      return NextResponse.json({ error: 'กรุณาระบุ Lot และสถานะคุณภาพใหม่' }, { status: 400 });
    }

    if (!['RELEASED', 'HOLD', 'REJECTED', 'TESTING'].includes(new_status)) {
      return NextResponse.json({ error: 'สถานะ QC ไม่ถูกต้อง (ต้องเป็น RELEASED, HOLD, REJECTED, หรือ TESTING)' }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      // 1. Fetch current Lot state
      const lotRes = await client.query(
        'SELECT lot_id, internal_lot_number, item_id, qc_status FROM wms_inventory_lots WHERE lot_id = $1 FOR UPDATE',
        [lot_id]
      );
      if (lotRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูล Lot นี้ในระบบ');
      }
      const prevStatus = lotRes.rows[0].qc_status;

      // 2. Update Lot QC status
      await client.query(
        `UPDATE wms_inventory_lots 
         SET qc_status = $1, 
             qc_inspector = $2, 
             qc_released_at = CASE WHEN $1 = 'RELEASED' THEN CURRENT_TIMESTAMP ELSE qc_released_at END,
             qc_notes = $3
         WHERE lot_id = $4`,
        [new_status, inspector_user, qc_notes || null, lot_id]
      );

      // 3. Update Balance table qc_status dimension
      // In dimension model: we update balances row matching this lot
      await client.query(
        `UPDATE wms_inventory_balances 
         SET qc_status = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE lot_id = $2`,
        [new_status, lot_id]
      );

      // 4. Record QC Status History (21 CFR Part 11)
      await client.query(
        `INSERT INTO wms_qc_status_history (
           lot_id, previous_status, new_status, reason_code, test_result_summary, changed_by_user
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [lot_id, prevStatus, new_status, reason_code, test_result_summary || null, inspector_user]
      );

      // 5. Audit Log
      await client.query(
        `INSERT INTO wms_audit_logs (
           table_name, record_id, action, old_values, new_values, user_id, user_name, reason_code
         ) VALUES ($1, $2, 'UPDATE', $3, $4, $5, $5, $6)`,
        [
          'wms_inventory_lots',
          lot_id,
          JSON.stringify({ qc_status: prevStatus }),
          JSON.stringify({ qc_status: new_status, inspector: inspector_user }),
          inspector_user,
          reason_code,
        ]
      );

      // 6. Emit Domain Event
      await emitDomainEvent('WMS_QC_LOT_DISPOSITION', 'INVENTORY_LOT', lot_id, {
        internal_lot_number: lotRes.rows[0].internal_lot_number,
        previous_status: prevStatus,
        new_status,
        inspector: inspector_user,
      });

      return {
        lot_id,
        internal_lot_number: lotRes.rows[0].internal_lot_number,
        previous_status: prevStatus,
        new_status,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('WMS QC Disposition Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
