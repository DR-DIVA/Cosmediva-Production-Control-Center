import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, queryPeople } from '@/lib/peopleDb';
import { executeLedgerTransaction } from '@/lib/wms/wmsLedger';
import { formatQrPayload } from '@/lib/wms/barcodeParser';
import { generateZplPalletLabel } from '@/lib/wms/zplPrinter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Return recent goods receipts and items in dock quarantine
    const dockRes = await queryPeople(
      `SELECT 
         b.balance_id,
         i.item_id,
         i.item_code,
         i.item_name_th,
         i.base_uom,
         l.lot_id,
         l.internal_lot_number,
         l.supplier_lot_number,
         l.supplier_name,
         l.manufacturing_date,
         l.expiry_date,
         l.qc_status,
         b.physical_quantity,
         loc.location_id,
         loc.location_barcode,
         b.updated_at
       FROM wms_inventory_balances b
       JOIN wms_items i ON b.item_id = i.item_id
       JOIN wms_inventory_lots l ON b.lot_id = l.lot_id
       JOIN wms_locations loc ON b.location_id = loc.location_id
       WHERE loc.location_type = 'DOCK_DOOR' AND b.physical_quantity > 0
       ORDER BY b.updated_at DESC;`
    );
    return NextResponse.json({ dockItems: dockRes.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      po_number,
      supplier_name,
      item_id,
      quantity,
      uom = 'PCS',
      supplier_lot_number,
      manufacturing_date,
      expiry_date,
      user_id = 'USR-OPERATOR-01',
      user_name = 'Warehouse Operator',
      idempotency_key = `RCV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      remarks,
    } = body;

    if (!po_number || !supplier_name || !item_id || !quantity || !supplier_lot_number || !manufacturing_date || !expiry_date) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (PO, ซัพพลายเออร์, สินค้า, จำนวน, Lot, วันผลิต, วันหมดอายุ)' }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      // 1. Fetch Item Master
      const itemRes = await client.query('SELECT * FROM wms_items WHERE item_id = $1', [item_id]);
      if (itemRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลสินค้ารหัสนี้ในระบบ');
      }
      const item = itemRes.rows[0];

      // 2. Fetch Dock Quarantine Location for WH-PM
      const dockLocRes = await client.query(
        `SELECT loc.location_id, loc.location_barcode 
         FROM wms_locations loc
         JOIN wms_warehouses w ON loc.warehouse_id = w.warehouse_id
         WHERE w.warehouse_code = 'WH-PM' AND loc.location_type = 'DOCK_DOOR'
         LIMIT 1`
      );
      if (dockLocRes.rows.length === 0) {
        throw new Error('ไม่พบจุดรับเข้ากักกัน (DOCK) ของคลัง WH-PM ในระบบ');
      }
      const dockLocation = dockLocRes.rows[0];

      // 3. Generate Internal Lot Number (e.g. LOT-PM-202609-00042)
      const d = new Date();
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      const countRes = await client.query(
        `SELECT COUNT(*) FROM wms_inventory_lots WHERE internal_lot_number LIKE 'LOT-PM-' || $1 || '-%'`,
        [ym]
      );
      const nextSeq = String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0');
      const internalLotNumber = `LOT-PM-${ym}-${nextSeq}`;

      // 4. Insert Inventory Lot
      const insertLotRes = await client.query(
        `INSERT INTO wms_inventory_lots (
           internal_lot_number, supplier_lot_number, item_id, supplier_name,
           manufacturing_date, receiving_date, expiry_date, qc_status, stock_status, remarks
         ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, 'QUARANTINE', 'UNRESTRICTED', $7)
         RETURNING lot_id`,
        [
          internalLotNumber,
          supplier_lot_number,
          item_id,
          supplier_name,
          manufacturing_date,
          expiry_date,
          remarks || `Received against PO: ${po_number}`,
        ]
      );
      const lot_id = insertLotRes.rows[0].lot_id;

      // 5. Post Immutable Ledger RECEIVE Transaction
      const grnNumber = `GRN-${ym}-${nextSeq}`;
      const txnRes = await executeLedgerTransaction(client, {
        transaction_type: 'RECEIVE',
        item_id,
        lot_id,
        from_location_id: null,
        to_location_id: dockLocation.location_id,
        quantity: parseFloat(quantity),
        uom,
        base_quantity: parseFloat(quantity),
        reference_type: 'GRN',
        reference_id: grnNumber,
        reference_number: `PO: ${po_number} / ${grnNumber}`,
        user_id,
        user_name,
        device_id: 'WEB-RECEIVING',
        idempotency_key,
        reason_code: 'INBOUND_RECEIPT',
        remarks: `รับเข้าจาก ${supplier_name} ตามใบสั่งซื้อ ${po_number}`,
      });

      // 6. Generate QR payload & ZPL
      const qrPayload = formatQrPayload({
        type: 'PALLET',
        id: lot_id,
        itemCode: item.item_code,
        lotNumber: internalLotNumber,
        quantity: parseFloat(quantity),
        expiryDate: expiry_date,
      });

      const zplCode = generateZplPalletLabel({
        itemCode: item.item_code,
        itemName: item.item_name_th,
        lotNumber: internalLotNumber,
        supplierName: supplier_name,
        quantity: parseFloat(quantity),
        uom,
        mfgDate: manufacturing_date,
        expiryDate: expiry_date,
        qrPayload,
      });

      return {
        lot_id,
        internal_lot_number: internalLotNumber,
        grn_number: grnNumber,
        transaction_number: txnRes.transaction_number,
        dock_location: dockLocation.location_barcode,
        qr_payload: qrPayload,
        zpl_code: zplCode,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('WMS Receiving Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
