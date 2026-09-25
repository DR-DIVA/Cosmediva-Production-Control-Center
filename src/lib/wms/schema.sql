-- ============================================================================
-- CosmeFlow WMS - Enterprise Database Schema (PostgreSQL 16+)
-- Standards: Cosmetics GMP (ISO 22716), 21 CFR Part 11 / EU Annex 11
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Warehouses (All 10 Core Cosmetics Facilities)
CREATE TABLE IF NOT EXISTS wms_warehouses (
    warehouse_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_code VARCHAR(30) NOT NULL UNIQUE,
    warehouse_name VARCHAR(100) NOT NULL,
    warehouse_type VARCHAR(30) NOT NULL CHECK (warehouse_type IN (
        'WH-RM', 'WH-PM', 'WH-WEIGH', 'WH-BULK', 'WH-WIP', 'WH-FG', 
        'WH-HOLD', 'WH-REJECT', 'WH-RETURN', 'WH-SAMPLE'
    )),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Units of Measure
CREATE TABLE IF NOT EXISTS wms_units (
    uom_code VARCHAR(10) PRIMARY KEY,
    uom_name VARCHAR(50) NOT NULL,
    uom_type VARCHAR(20) NOT NULL CHECK (uom_type IN ('COUNT', 'WEIGHT', 'VOLUME', 'LENGTH')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. UOM Conversions
CREATE TABLE IF NOT EXISTS wms_uom_conversions (
    conversion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NULL,
    from_uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    to_uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    conversion_factor NUMERIC(18, 8) NOT NULL CHECK (conversion_factor > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_wms_uom_conversion UNIQUE (item_id, from_uom, to_uom)
);

-- 4. Locations Hierarchy (Sub-bin Level)
CREATE TABLE IF NOT EXISTS wms_locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(warehouse_id),
    zone_code VARCHAR(30) NOT NULL,
    rack_code VARCHAR(30) NOT NULL,
    bay_code VARCHAR(30) NOT NULL,
    level_code VARCHAR(30) NOT NULL,
    bin_code VARCHAR(30) NOT NULL,
    location_barcode VARCHAR(100) NOT NULL UNIQUE,
    location_name VARCHAR(100),
    location_type VARCHAR(30) NOT NULL CHECK (location_type IN ('RACK_BIN', 'FLOOR_PALLET', 'STAGING', 'DOCK_DOOR', 'VIRTUAL')),
    storage_condition VARCHAR(30) NOT NULL DEFAULT 'AMBIENT' CHECK (storage_condition IN ('AMBIENT', 'AIR_CON', 'COLD_ROOM', 'FLAMMABLE')),
    max_weight_kg NUMERIC(10, 2) NULL,
    max_volume_cbm NUMERIC(10, 4) NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lock_reason TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wms_location_coord UNIQUE (warehouse_id, zone_code, rack_code, bay_code, level_code, bin_code)
);
CREATE INDEX IF NOT EXISTS idx_wms_locations_barcode ON wms_locations(location_barcode);
CREATE INDEX IF NOT EXISTS idx_wms_locations_wh_zone ON wms_locations(warehouse_id, zone_code);

-- 5. Items Master (Packaging & Raw Materials)
CREATE TABLE IF NOT EXISTS wms_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(100) NOT NULL UNIQUE,
    item_name_th VARCHAR(255) NOT NULL,
    item_name_en VARCHAR(255) NOT NULL,
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('RAW_MATERIAL', 'PACKAGING_MATERIAL', 'BULK', 'WIP', 'FINISHED_GOODS', 'CONSUMABLE')),
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    base_uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    purchase_uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    issue_uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    storage_condition VARCHAR(30) NOT NULL DEFAULT 'AMBIENT' CHECK (storage_condition IN ('AMBIENT', 'AIR_CON', 'COLD_ROOM', 'FLAMMABLE')),
    standard_shelf_life_days INT NOT NULL DEFAULT 730 CHECK (standard_shelf_life_days >= 0),
    retest_period_days INT DEFAULT 0,
    qc_required BOOLEAN NOT NULL DEFAULT TRUE,
    lot_controlled BOOLEAN NOT NULL DEFAULT TRUE,
    expiry_controlled BOOLEAN NOT NULL DEFAULT TRUE,
    fefo_required BOOLEAN NOT NULL DEFAULT TRUE,
    barcode VARCHAR(100) NULL,
    min_stock_level NUMERIC(18, 4) DEFAULT 0,
    over_delivery_tolerance_pct NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wms_items_code ON wms_items(item_code);
CREATE INDEX IF NOT EXISTS idx_wms_items_barcode ON wms_items(barcode);
CREATE INDEX IF NOT EXISTS idx_wms_items_type ON wms_items(item_type);

-- 6. Inventory Lots (GMP Lot Master)
CREATE TABLE IF NOT EXISTS wms_inventory_lots (
    lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_lot_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_lot_number VARCHAR(100) NOT NULL,
    manufacturer_lot_number VARCHAR(100) NULL,
    item_id UUID NOT NULL REFERENCES wms_items(item_id),
    supplier_name VARCHAR(255) NOT NULL,
    manufacturing_date DATE NOT NULL,
    receiving_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    retest_date DATE NULL,
    qc_status VARCHAR(30) NOT NULL DEFAULT 'QUARANTINE' CHECK (qc_status IN (
        'QUARANTINE', 'WAITING_SAMPLING', 'TESTING', 'RELEASED', 'HOLD', 'REJECTED'
    )),
    stock_status VARCHAR(20) NOT NULL DEFAULT 'UNRESTRICTED' CHECK (stock_status IN ('UNRESTRICTED', 'RESTRICTED', 'SCRAP')),
    coa_document_url VARCHAR(500) NULL,
    qc_inspector VARCHAR(100) NULL,
    qc_released_at TIMESTAMPTZ NULL,
    qc_notes TEXT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wms_mfg_expiry CHECK (expiry_date >= manufacturing_date)
);
CREATE INDEX IF NOT EXISTS idx_wms_lots_item_fefo ON wms_inventory_lots(item_id, qc_status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_wms_lots_internal_num ON wms_inventory_lots(internal_lot_number);

-- 7. QC Status Audit History
CREATE TABLE IF NOT EXISTS wms_qc_status_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES wms_inventory_lots(lot_id),
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    test_result_summary TEXT NULL,
    changed_by_user VARCHAR(100) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wms_qc_hist_lot ON wms_qc_status_history(lot_id);

-- 8. Immutable Inventory Transactions Ledger
CREATE TABLE IF NOT EXISTS wms_inventory_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(60) NOT NULL UNIQUE,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'RECEIVE',
        'PUTAWAY',
        'TRANSFER_BIN',
        'TRANSFER_WH',
        'RESERVE',
        'UNRESERVE',
        'ISSUE_TO_STAGE',
        'ISSUE_TO_PROD',
        'CONSUME',
        'RETURN_FROM_PROD',
        'SCRAP',
        'COUNT_ADJUSTMENT',
        'REVERSAL',
        'MIGRATION_OPENING_BALANCE'
    )),
    item_id UUID NOT NULL REFERENCES wms_items(item_id),
    lot_id UUID NOT NULL REFERENCES wms_inventory_lots(lot_id),
    from_location_id UUID NULL REFERENCES wms_locations(location_id),
    to_location_id UUID NULL REFERENCES wms_locations(location_id),
    quantity NUMERIC(18, 4) NOT NULL CHECK (quantity > 0),
    uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    base_quantity NUMERIC(18, 4) NOT NULL CHECK (base_quantity > 0),
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN (
        'PO', 'GRN', 'PRODUCTION_ORDER', 'PICK_LIST', 'STOCK_COUNT', 'MANUAL_DEVIATION', 'RETURN_NOTE', 'MIGRATION'
    )),
    reference_id VARCHAR(100) NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NULL,
    device_id VARCHAR(100) NULL,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    reversal_of_transaction_id UUID NULL REFERENCES wms_inventory_transactions(transaction_id),
    reason_code VARCHAR(50) NULL,
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wms_txn_item_lot ON wms_inventory_transactions(item_id, lot_id);
CREATE INDEX IF NOT EXISTS idx_wms_txn_locations ON wms_inventory_transactions(from_location_id, to_location_id);
CREATE INDEX IF NOT EXISTS idx_wms_txn_ref ON wms_inventory_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wms_txn_created ON wms_inventory_transactions(created_at);

-- 9. Real-Time Derived Balances (Materialized Dimensions)
CREATE TABLE IF NOT EXISTS wms_inventory_balances (
    balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES wms_items(item_id),
    lot_id UUID NOT NULL REFERENCES wms_inventory_lots(lot_id),
    location_id UUID NOT NULL REFERENCES wms_locations(location_id),
    stock_status VARCHAR(20) NOT NULL DEFAULT 'UNRESTRICTED' CHECK (stock_status IN ('UNRESTRICTED', 'RESTRICTED', 'SCRAP')),
    qc_status VARCHAR(30) NOT NULL CHECK (qc_status IN (
        'QUARANTINE', 'WAITING_SAMPLING', 'TESTING', 'RELEASED', 'HOLD', 'REJECTED'
    )),
    physical_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (physical_quantity >= 0),
    reserved_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    hold_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (hold_quantity >= 0),
    available_quantity NUMERIC(18, 4) GENERATED ALWAYS AS (
        CASE 
            WHEN qc_status = 'RELEASED' AND stock_status = 'UNRESTRICTED' 
            THEN GREATEST(0, physical_quantity - reserved_quantity - hold_quantity)
            ELSE 0 
        END
    ) STORED,
    last_transaction_id UUID NULL REFERENCES wms_inventory_transactions(transaction_id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wms_balance_dim UNIQUE (item_id, lot_id, location_id, stock_status, qc_status),
    CONSTRAINT chk_wms_reserved_not_exceed_physical CHECK (reserved_quantity <= physical_quantity)
);
CREATE INDEX IF NOT EXISTS idx_wms_balances_lookup ON wms_inventory_balances(item_id, qc_status, available_quantity);
CREATE INDEX IF NOT EXISTS idx_wms_balances_location ON wms_inventory_balances(location_id);

-- 10. Material Allocations & Pick Lists
CREATE TABLE IF NOT EXISTS wms_pick_lists (
    pick_list_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_number VARCHAR(50) NOT NULL UNIQUE,
    production_order_id VARCHAR(100) NOT NULL,
    production_order_no VARCHAR(100) NOT NULL,
    target_warehouse_id UUID NOT NULL REFERENCES wms_warehouses(warehouse_id),
    staging_location_id UUID NOT NULL REFERENCES wms_locations(location_id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'STAGED', 'ISSUED', 'CANCELLED')),
    assigned_to_user VARCHAR(100) NULL,
    wave_number VARCHAR(50) NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wms_pick_list_items (
    item_pick_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_id UUID NOT NULL REFERENCES wms_pick_lists(pick_list_id),
    item_id UUID NOT NULL REFERENCES wms_items(item_id),
    lot_id UUID NOT NULL REFERENCES wms_inventory_lots(lot_id),
    location_id UUID NOT NULL REFERENCES wms_locations(location_id),
    required_qty NUMERIC(18, 4) NOT NULL CHECK (required_qty > 0),
    picked_qty NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (picked_qty >= 0),
    uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    status VARCHAR(30) NOT NULL DEFAULT 'ALLOCATED' CHECK (status IN ('ALLOCATED', 'PICKED', 'SHORTAGE', 'CANCELLED')),
    scanned_at TIMESTAMPTZ NULL,
    scanned_by_user VARCHAR(100) NULL,
    fefo_override BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason VARCHAR(100) NULL,
    override_authorized_by VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wms_pick_items_list ON wms_pick_list_items(pick_list_id);

-- 11. Stock Counts (Blind Counting)
CREATE TABLE IF NOT EXISTS wms_stock_counts (
    count_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_number VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(warehouse_id),
    zone_code VARCHAR(30) NULL,
    count_type VARCHAR(30) NOT NULL CHECK (count_type IN ('FULL', 'CYCLE', 'ZONE', 'ITEM')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'COUNTING', 'RECOUNT_REQUIRED', 'PENDING_APPROVAL', 'APPROVED', 'CANCELLED')),
    created_by_user VARCHAR(100) NOT NULL,
    approved_by_user VARCHAR(100) NULL,
    approved_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wms_stock_count_items (
    count_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_id UUID NOT NULL REFERENCES wms_stock_counts(count_id),
    location_id UUID NOT NULL REFERENCES wms_locations(location_id),
    item_id UUID NOT NULL REFERENCES wms_items(item_id),
    lot_id UUID NOT NULL REFERENCES wms_inventory_lots(lot_id),
    system_quantity NUMERIC(18, 4) NOT NULL,
    counted_quantity NUMERIC(18, 4) NULL,
    variance_quantity NUMERIC(18, 4) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    recounted_quantity NUMERIC(18, 4) NULL,
    uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COUNTED', 'MATCH', 'VARIANCE', 'ADJUSTED')),
    counted_by_user VARCHAR(100) NULL,
    counted_at TIMESTAMPTZ NULL,
    recounted_by_user VARCHAR(100) NULL,
    recounted_at TIMESTAMPTZ NULL,
    investigation_notes TEXT NULL
);

-- 12. Lot Genealogy (360° Traceability)
CREATE TABLE IF NOT EXISTS wms_lot_genealogy (
    genealogy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_lot_id UUID NOT NULL REFERENCES wms_inventory_lots(lot_id),
    child_lot_id UUID NOT NULL REFERENCES wms_inventory_lots(lot_id),
    production_order_no VARCHAR(100) NOT NULL,
    quantity_used NUMERIC(18, 4) NOT NULL,
    uom VARCHAR(10) NOT NULL REFERENCES wms_units(uom_code),
    operation_type VARCHAR(30) NOT NULL CHECK (operation_type IN ('COMPOUNDING', 'FILLING_PACKING', 'REPACKING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wms_genealogy_link UNIQUE (parent_lot_id, child_lot_id, production_order_no)
);
CREATE INDEX IF NOT EXISTS idx_wms_genealogy_parent ON wms_lot_genealogy(parent_lot_id);
CREATE INDEX IF NOT EXISTS idx_wms_genealogy_child ON wms_lot_genealogy(child_lot_id);

-- 13. Audit Trail (GMP / 21 CFR Part 11)
CREATE TABLE IF NOT EXISTS wms_audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'POST', 'OVERRIDE', 'REVERSE')),
    old_values JSONB NULL,
    new_values JSONB NULL,
    changed_fields TEXT[] NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NULL,
    user_ip VARCHAR(50) NULL,
    device_id VARCHAR(100) NULL,
    reason_code VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wms_audit_table_rec ON wms_audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_wms_audit_created ON wms_audit_logs(created_at);

-- 14. QC Release Enforcement Function & Trigger
CREATE OR REPLACE FUNCTION fn_wms_enforce_qc_release_for_production()
RETURNS TRIGGER AS $$
DECLARE
    v_qc_status VARCHAR(30);
BEGIN
    SELECT qc_status INTO v_qc_status 
    FROM wms_inventory_lots 
    WHERE lot_id = NEW.lot_id;

    IF NEW.transaction_type IN ('ISSUE_TO_PROD', 'RESERVE', 'ISSUE_TO_STAGE') AND v_qc_status != 'RELEASED' THEN
        RAISE EXCEPTION 'ข้อผิดพลาดมาตรฐาน GMP: ไม่สามารถจองหรือเบิกสินค้า Lot % ได้เนื่องจากสถานะ QC คือ % (ต้องเป็น RELEASED เท่านั้น)', 
            NEW.lot_id, v_qc_status USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wms_check_qc_before_issue ON wms_inventory_transactions;
CREATE TRIGGER trg_wms_check_qc_before_issue
BEFORE INSERT ON wms_inventory_transactions
FOR EACH ROW EXECUTE FUNCTION fn_wms_enforce_qc_release_for_production();

-- 15. Immutable Protection Rules
CREATE OR REPLACE RULE no_update_wms_transactions AS ON UPDATE TO wms_inventory_transactions DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_wms_transactions AS ON DELETE TO wms_inventory_transactions DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_update_wms_audit_logs AS ON UPDATE TO wms_audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_wms_audit_logs AS ON DELETE TO wms_audit_logs DO INSTEAD NOTHING;
