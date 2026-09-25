import { queryPeople, withTransaction } from '@/lib/peopleDb';
import { emitDomainEvent } from '@/lib/events/domainEvents';

export type TransactionType =
  | 'RECEIVE'
  | 'PUTAWAY'
  | 'TRANSFER_BIN'
  | 'TRANSFER_WH'
  | 'RESERVE'
  | 'UNRESERVE'
  | 'ISSUE_TO_STAGE'
  | 'ISSUE_TO_PROD'
  | 'CONSUME'
  | 'RETURN_FROM_PROD'
  | 'SCRAP'
  | 'COUNT_ADJUSTMENT'
  | 'REVERSAL'
  | 'MIGRATION_OPENING_BALANCE';

export interface PostTransactionParams {
  transaction_type: TransactionType;
  item_id: string;
  lot_id: string;
  from_location_id?: string | null;
  to_location_id?: string | null;
  quantity: number;
  uom: string;
  base_quantity?: number;
  reference_type: 'PO' | 'GRN' | 'PRODUCTION_ORDER' | 'PICK_LIST' | 'STOCK_COUNT' | 'MANUAL_DEVIATION' | 'RETURN_NOTE' | 'MIGRATION';
  reference_id: string;
  reference_number: string;
  user_id: string;
  user_name?: string;
  device_id?: string;
  idempotency_key: string;
  reason_code?: string;
  remarks?: string;
  reversal_of_transaction_id?: string | null;
}

export interface InventoryBalanceRow {
  balance_id: string;
  item_id: string;
  lot_id: string;
  location_id: string;
  stock_status: string;
  qc_status: string;
  physical_quantity: number;
  reserved_quantity: number;
  hold_quantity: number;
  available_quantity: number;
}

/**
 * Generates human-readable transaction sequence (e.g., TXN-202609-000124)
 */
export function generateTransactionNumber(): string {
  const d = new Date();
  const yearMonth = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const randSeq = Math.floor(100000 + Math.random() * 900000);
  return `TXN-${yearMonth}-${randSeq}`;
}

/**
 * Posts an immutable transaction to the WMS ledger and synchronizes materialized balances.
 * Must run inside an atomic database client or transaction.
 */
export async function executeLedgerTransaction(
  client: any,
  params: PostTransactionParams
): Promise<{ success: boolean; transaction_id: string; transaction_number: string }> {
  // 1. Idempotency Check: Check if transaction with this idempotency key already exists
  const existingTxn = await client.query(
    'SELECT transaction_id, transaction_number FROM wms_inventory_transactions WHERE idempotency_key = $1',
    [params.idempotency_key]
  );
  if (existingTxn.rows.length > 0) {
    return {
      success: true,
      transaction_id: existingTxn.rows[0].transaction_id,
      transaction_number: existingTxn.rows[0].transaction_number,
    };
  }

  const baseQty = params.base_quantity ?? params.quantity;
  const txnNumber = generateTransactionNumber();

  // 2. Fetch Item & Lot Metadata to obtain accurate QC and Stock statuses
  const lotRes = await client.query(
    'SELECT qc_status, stock_status FROM wms_inventory_lots WHERE lot_id = $1',
    [params.lot_id]
  );
  if (lotRes.rows.length === 0) {
    throw new Error(`Lot not found: ${params.lot_id}`);
  }
  const { qc_status, stock_status } = lotRes.rows[0];

  // 3. Negative Stock Invariant & From-Location Check
  if (params.from_location_id) {
    const fromBalanceRes = await client.query(
      `SELECT balance_id, physical_quantity, reserved_quantity, available_quantity 
       FROM wms_inventory_balances 
       WHERE item_id = $1 AND lot_id = $2 AND location_id = $3 AND stock_status = $4 AND qc_status = $5
       FOR UPDATE`,
      [params.item_id, params.lot_id, params.from_location_id, stock_status, qc_status]
    );

    if (fromBalanceRes.rows.length === 0 || Number(fromBalanceRes.rows[0].physical_quantity) < baseQty) {
      const curQty = fromBalanceRes.rows.length > 0 ? Number(fromBalanceRes.rows[0].physical_quantity) : 0;
      throw new Error(
        `สต็อกไม่เพียงพอ: พิกัดต้นทางมียอดคงเหลือ ${curQty} ${params.uom} ไม่พอสำหรับการตัดจ่าย ${baseQty} ${params.uom}`
      );
    }

    // Deduct physical quantity from source location
    await client.query(
      `UPDATE wms_inventory_balances 
       SET physical_quantity = physical_quantity - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE balance_id = $2`,
      [baseQty, fromBalanceRes.rows[0].balance_id]
    );
  }

  // 4. To-Location Upsert Balance
  if (params.to_location_id) {
    await client.query(
      `INSERT INTO wms_inventory_balances (
         item_id, lot_id, location_id, stock_status, qc_status, physical_quantity, reserved_quantity, hold_quantity
       ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
       ON CONFLICT (item_id, lot_id, location_id, stock_status, qc_status)
       DO UPDATE SET 
         physical_quantity = wms_inventory_balances.physical_quantity + EXCLUDED.physical_quantity,
         updated_at = CURRENT_TIMESTAMP`,
      [params.item_id, params.lot_id, params.to_location_id, stock_status, qc_status, baseQty]
    );
  }

  // 5. Insert Immutable Ledger Record
  const insertTxnRes = await client.query(
    `INSERT INTO wms_inventory_transactions (
       transaction_number, transaction_type, item_id, lot_id, from_location_id, to_location_id,
       quantity, uom, base_quantity, reference_type, reference_id, reference_number,
       user_id, user_name, device_id, idempotency_key, reversal_of_transaction_id, reason_code, remarks
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
     ) RETURNING transaction_id`,
    [
      txnNumber,
      params.transaction_type,
      params.item_id,
      params.lot_id,
      params.from_location_id || null,
      params.to_location_id || null,
      params.quantity,
      params.uom,
      baseQty,
      params.reference_type,
      params.reference_id,
      params.reference_number,
      params.user_id,
      params.user_name || 'System User',
      params.device_id || 'WEB-CLIENT',
      params.idempotency_key,
      params.reversal_of_transaction_id || null,
      params.reason_code || null,
      params.remarks || null,
    ]
  );

  const transaction_id = insertTxnRes.rows[0].transaction_id;

  // 6. Update last_transaction_id on balance records
  if (params.to_location_id) {
    await client.query(
      `UPDATE wms_inventory_balances 
       SET last_transaction_id = $1 
       WHERE item_id = $2 AND lot_id = $3 AND location_id = $4`,
      [transaction_id, params.item_id, params.lot_id, params.to_location_id]
    );
  }

  // 7. Audit Log Entry
  await client.query(
    `INSERT INTO wms_audit_logs (
       table_name, record_id, action, new_values, user_id, user_name, reason_code
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      'wms_inventory_transactions',
      transaction_id,
      'POST',
      JSON.stringify({
        transaction_number: txnNumber,
        type: params.transaction_type,
        qty: params.quantity,
        uom: params.uom,
        ref: params.reference_number,
      }),
      params.user_id,
      params.user_name || 'System User',
      params.reason_code || params.transaction_type,
    ]
  );

  // 8. Publish Domain Event for CosmeFlow Integration (Async Outbox)
  try {
    await emitDomainEvent(
      `WMS_${params.transaction_type}`,
      'INVENTORY_TRANSACTION',
      transaction_id,
      {
        transaction_number: txnNumber,
        type: params.transaction_type,
        item_id: params.item_id,
        lot_id: params.lot_id,
        quantity: params.quantity,
        reference: params.reference_number,
        user: params.user_name,
      }
    );
  } catch (err) {
    console.warn('[wmsLedger] Failed to emit domain event:', err);
  }

  return {
    success: true,
    transaction_id,
    transaction_number: txnNumber,
  };
}

/**
 * High-level helper wrapping transaction execution inside withTransaction
 */
export async function postTransaction(params: PostTransactionParams) {
  return await withTransaction(async (client) => {
    return await executeLedgerTransaction(client, params);
  });
}
