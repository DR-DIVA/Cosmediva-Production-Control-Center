-- ============================================================================
-- CosmeFlow WMS - Master Data & WH-PM Pilot Seed
-- ============================================================================

-- 1. Warehouses Seed
INSERT INTO wms_warehouses (warehouse_code, warehouse_name, warehouse_type, description)
VALUES 
    ('WH-RM', 'คลังวัตถุดิบเคมีและสารสกัด', 'WH-RM', 'คลังเก็บสารเคมี น้ำหอม น้ำมัน และสารสกัด'),
    ('WH-PM', 'คลังบรรจุภัณฑ์', 'WH-PM', 'คลังเก็บขวด กระปุก ฝา ปั๊ม กล่อง ฉลาก (Pilot Phase 1)'),
    ('WH-WEIGH', 'คลังชั่งจ่ายและพักคอยเข้าผลิต', 'WH-WEIGH', 'ห้องคลีนรูมชั่งสารเคมีและเตรียมเซ็ตบรรจุภัณฑ์หน้าไลน์'),
    ('WH-BULK', 'คลังเนื้อกึ่งสำเร็จรูป Bulk Tanks', 'WH-BULK', 'จุดจอดถังสเตนเลส 300L, 500L, 1000L และถัง IBC'),
    ('WH-WIP', 'คลังสินค้าระหว่างกระบวนการผลิต', 'WH-WIP', 'สินค้ากึ่งสำเร็จรูปที่รอการบรรจุหรือติดฉลาก'),
    ('WH-FG', 'คลังสินค้าสำเร็จรูปพร้อมส่งมอบ', 'WH-FG', 'คลังจัดเก็บพาเลทสินค้าแบรนด์ลูกค้า OEM/ODM'),
    ('WH-HOLD', 'คลังกักกันเพื่อตรวจสอบคุณภาพ', 'WH-HOLD', 'พื้นที่กักกันสินค้าที่มีปัญหาทางเทคนิคหรือรอการตรวจพิเศษ'),
    ('WH-REJECT', 'คลังของเสีย/รอทำลาย/รอส่งคืน', 'WH-REJECT', 'คลังเก็บของไม่ผ่านคุณภาพ รอทำลายหรือเคลมซัพพลายเออร์'),
    ('WH-RETURN', 'คลังสินค้าและบรรจุภัณฑ์รับคืน', 'WH-RETURN', 'คลังพักรับของเหลือจากสายการผลิตหรือของคืนจากลูกค้า'),
    ('WH-SAMPLE', 'คลังจัดเก็บตัวอย่างอ้างอิง GMP Retain', 'WH-SAMPLE', 'ห้องจัดเก็บตัวอย่างอ้างอิงตามข้อกำหนด อย. และ ISO 22716')
ON CONFLICT (warehouse_code) DO NOTHING;

-- 2. Units Seed
INSERT INTO wms_units (uom_code, uom_name, uom_type)
VALUES
    ('PCS', 'ชิ้น (Pieces)', 'COUNT'),
    ('BOX', 'กล่อง (Box)', 'COUNT'),
    ('PACK', 'แพ็ก (Pack)', 'COUNT'),
    ('SET', 'ชุด (Set)', 'COUNT'),
    ('ROLL', 'ม้วน (Roll)', 'COUNT'),
    ('KG', 'กิโลกรัม (Kilogram)', 'WEIGHT'),
    ('G', 'กรัม (Gram)', 'WEIGHT'),
    ('L', 'ลิตร (Liter)', 'VOLUME'),
    ('ML', 'มิลลิลิตร (Milliliter)', 'VOLUME')
ON CONFLICT (uom_code) DO NOTHING;

-- 3. Standard UOM Conversions
INSERT INTO wms_uom_conversions (item_id, from_uom, to_uom, conversion_factor)
VALUES
    (NULL, 'KG', 'G', 1000.00000000),
    (NULL, 'G', 'KG', 0.00100000),
    (NULL, 'L', 'ML', 1000.00000000),
    (NULL, 'ML', 'L', 0.00100000)
ON CONFLICT DO NOTHING;

-- 4. Locations for WH-PM (Pilot Scope)
DO $$
DECLARE
    v_wh_id UUID;
    v_wh_hold_id UUID;
BEGIN
    SELECT warehouse_id INTO v_wh_id FROM wms_warehouses WHERE warehouse_code = 'WH-PM';
    SELECT warehouse_id INTO v_wh_hold_id FROM wms_warehouses WHERE warehouse_code = 'WH-HOLD';

    -- Dock Quarantine Inbound
    INSERT INTO wms_locations (warehouse_id, zone_code, rack_code, bay_code, level_code, bin_code, location_barcode, location_name, location_type, storage_condition)
    VALUES (v_wh_id, 'DOCK', 'IN', '01', '01', '01', 'WH-PM-DOCK-QUAR-01', 'จุดพักรับกักกันสินค้าเข้า WH-PM', 'DOCK_DOOR', 'AMBIENT')
    ON CONFLICT (location_barcode) DO NOTHING;

    -- Staging Line Handover
    INSERT INTO wms_locations (warehouse_id, zone_code, rack_code, bay_code, level_code, bin_code, location_barcode, location_name, location_type, storage_condition)
    VALUES (v_wh_id, 'STAGE', 'OUT', '01', '01', '01', 'WH-PM-STAGE-LINE-01', 'จุดส่งมอบบรรจุภัณฑ์หน้าไลน์ผลิต 1', 'STAGING', 'AIR_CON')
    ON CONFLICT (location_barcode) DO NOTHING;

    -- Zone A (Ambient Racks for Bottles, Jars, Cartons)
    -- Rack 1: 2 Bays, 3 Levels, 2 Bins each
    FOR b IN 1..2 LOOP
        FOR l IN 1..3 LOOP
            FOR bn IN 1..2 LOOP
                INSERT INTO wms_locations (
                    warehouse_id, zone_code, rack_code, bay_code, level_code, bin_code,
                    location_barcode, location_name, location_type, storage_condition, max_weight_kg
                ) VALUES (
                    v_wh_id, 'ZONE-A', 'R01', 
                    LPAD(b::TEXT, 2, '0'), 
                    LPAD(l::TEXT, 2, '0'), 
                    LPAD(bn::TEXT, 2, '0'),
                    'WH-PM-A-R01-B' || LPAD(b::TEXT, 2, '0') || '-L' || LPAD(l::TEXT, 2, '0') || '-BN' || LPAD(bn::TEXT, 2, '0'),
                    'ชั้นเก็บ Zone A R01-B' || b || '-L' || l || '-BN' || bn,
                    'RACK_BIN', 'AMBIENT', 500.00
                ) ON CONFLICT (location_barcode) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    -- Zone B (Air-Conditioned for Labels and Dropper Rubber Tops)
    FOR b IN 1..2 LOOP
        FOR l IN 1..2 LOOP
            INSERT INTO wms_locations (
                warehouse_id, zone_code, rack_code, bay_code, level_code, bin_code,
                location_barcode, location_name, location_type, storage_condition, max_weight_kg
            ) VALUES (
                v_wh_id, 'ZONE-B', 'R01', 
                LPAD(b::TEXT, 2, '0'), 
                LPAD(l::TEXT, 2, '0'), 
                '01',
                'WH-PM-B-R01-B' || LPAD(b::TEXT, 2, '0') || '-L' || LPAD(l::TEXT, 2, '0') || '-BN01',
                'ชั้นเก็บห้องปรับอากาศ Zone B R01-B' || b || '-L' || l,
                'RACK_BIN', 'AIR_CON', 300.00
            ) ON CONFLICT (location_barcode) DO NOTHING;
        END LOOP;
    END LOOP;

END $$;

-- 5. Cosmetic Packaging Items Master (Sample PM SKUs)
INSERT INTO wms_items (
    item_code, item_name_th, item_name_en, item_type, category, 
    base_uom, purchase_uom, issue_uom, storage_condition, standard_shelf_life_days, barcode
) VALUES 
    ('PM-BOT-030ML-CLR', 'ขวดแก้วใสทรงหยดน้ำ 30ml (Dropper Bottle)', 'Clear Glass Dropper Bottle 30ml', 'PACKAGING_MATERIAL', 'BOTTLE', 'PCS', 'BOX', 'PCS', 'AMBIENT', 1095, '8850001001011'),
    ('PM-PUMP-020GLD', 'หัวปั๊มเซรั่มคอ 20/410 สีทองเงา', 'Gold Serum Pump 20/410 Glossy', 'PACKAGING_MATERIAL', 'PUMP', 'PCS', 'BOX', 'PCS', 'AMBIENT', 730, '8850001001028'),
    ('PM-JAR-050ACR', 'กระปุกครีมอะคริลิกสองชั้น 50g สีขาวมุก', 'Double-wall Acrylic Cream Jar 50g Pearl White', 'PACKAGING_MATERIAL', 'JAR', 'PCS', 'BOX', 'PCS', 'AMBIENT', 1095, '8850001001035'),
    ('PM-CAP-050GLD', 'ฝากระปุกครีมอะคริลิก 50g สีทองเงา', 'Glossy Gold Cap for 50g Jar', 'PACKAGING_MATERIAL', 'CAP', 'PCS', 'BOX', 'PCS', 'AMBIENT', 1095, '8850001001042'),
    ('PM-LBL-SRM-030', 'ฉลากสติกเกอร์กันน้ำเซรั่มสูตรกระจ่างใส 30ml', 'Waterproof PP Sticker Label for Serum 30ml', 'PACKAGING_MATERIAL', 'LABEL', 'PCS', 'ROLL', 'PCS', 'AIR_CON', 730, '8850001001059'),
    ('PM-BOX-SRM-030', 'กล่องกระดาษเคลือบฟอยล์ทอง เซรั่ม 30ml', 'Paper Folding Box Gold Foil Serum 30ml', 'PACKAGING_MATERIAL', 'BOX', 'PCS', 'BOX', 'PCS', 'AMBIENT', 730, '8850001001066')
ON CONFLICT (item_code) DO NOTHING;
