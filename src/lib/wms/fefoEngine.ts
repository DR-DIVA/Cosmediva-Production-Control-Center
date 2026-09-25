import { queryPeople } from '@/lib/peopleDb';

export interface AllocationResult {
  lot_id: string;
  internal_lot_number: string;
  location_id: string;
  location_barcode: string;
  expiry_date: string;
  allocated_qty: number;
}

/**
 * Deterministic FEFO Allocation Algorithm:
 * 1. Earliest Expiration Date first (expiry_date ASC)
 * 2. Released stock only (qc_status = 'RELEASED')
 * 3. Partial bin fragment sweep (available_quantity ASC)
 * 4. Oldest receiving date tie-breaker (receiving_date ASC)
 */
export async function runFefoAllocation(
  client: any,
  itemId: string,
  requiredQty: number,
  pickListId: string,
  uom: string
): Promise<{ success: boolean; allocations: AllocationResult[] }> {
  let remainingQty = requiredQty;
  const allocations: AllocationResult[] = [];

  const candidatesRes = await client.query(
    `SELECT 
       b.balance_id,
       b.lot_id,
       b.location_id,
       b.available_quantity,
       l.internal_lot_number,
       l.expiry_date,
       loc.location_barcode
     FROM wms_inventory_balances b
     JOIN wms_inventory_lots l ON b.lot_id = l.lot_id
     JOIN wms_locations loc ON b.location_id = loc.location_id
     WHERE b.item_id = $1
       AND b.qc_status = 'RELEASED'
       AND b.stock_status = 'UNRESTRICTED'
       AND b.available_quantity > 0
       AND loc.is_locked = FALSE
       AND l.expiry_date > CURRENT_DATE
     ORDER BY 
       l.expiry_date ASC,
       b.available_quantity ASC,
       l.receiving_date ASC
     FOR UPDATE OF b`,
    [itemId]
  );

  for (const row of candidatesRes.rows) {
    if (remainingQty <= 0) break;

    const avail = Number(row.available_quantity);
    const allocQty = Math.min(avail, remainingQty);

    // Reserve quantity on balance row
    await client.query(
      `UPDATE wms_inventory_balances 
       SET reserved_quantity = reserved_quantity + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE balance_id = $2`,
      [allocQty, row.balance_id]
    );

    // Insert pick list item task
    await client.query(
      `INSERT INTO wms_pick_list_items (
         pick_list_id, item_id, lot_id, location_id, required_qty, uom, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'ALLOCATED')`,
      [pickListId, itemId, row.lot_id, row.location_id, allocQty, uom]
    );

    allocations.push({
      lot_id: row.lot_id,
      internal_lot_number: row.internal_lot_number,
      location_id: row.location_id,
      location_barcode: row.location_barcode,
      expiry_date: row.expiry_date,
      allocated_qty: allocQty,
    });

    remainingQty -= allocQty;
  }

  if (remainingQty > 0) {
    throw new Error(
      `สินค้าไม่เพียงพอสำหรับการจัดสรร FEFO: ขาดอีก ${remainingQty} ${uom}`
    );
  }

  return {
    success: true,
    allocations,
  };
}
