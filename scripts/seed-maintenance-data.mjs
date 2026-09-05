import pg from 'pg';
const { Client } = pg;

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const dbUser = 'postgres.yzwldawflteyywuetzcw';
const dbHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const dbPort = '6543';
const dbName = 'postgres';

const client = new Client({
  connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Connecting to PostgreSQL for seed data...');
    await client.connect();

    // 1. Fetch department IDs for MIX, PKG, WGH, MT
    const deptRes = await client.query(`SELECT id, department_code, department_name FROM departments;`);
    const deptMap = {};
    deptRes.rows.forEach(d => {
      deptMap[d.department_code] = d.id;
    });

    const mixDeptId = deptMap['MIX'] || null;
    const pkgDeptId = deptMap['PKG'] || null;
    const mtDeptId = deptMap['MT'] || null;

    console.log('Clearing existing maintenance demo data to ensure clean idempotence...');
    await client.query(`TRUNCATE TABLE maintenance_wo_parts, maintenance_wo_status_logs, maintenance_notifications, maintenance_ai_insights, maintenance_pm_jobs, maintenance_spare_part_requests, maintenance_work_orders, maintenance_pm_plans, maintenance_spare_parts, maintenance_machines CASCADE;`);

    // 2. Insert 10 Machines
    console.log('Inserting 10 cosmetic production machines...');
    const machineInserts = [
      {
        asset_id: 'AST-MIX-001',
        machine_code: 'MX-01',
        machine_name: 'Mixing Tank 500L (High-Shear Mixer)',
        category: 'Mixing',
        department_id: mixDeptId,
        department_code: 'MIX',
        department_name: 'แผนกผสม (Mixing Department)',
        production_area: 'Cleanroom Mixing Hall A',
        line: 'Line 1 (Emulsion)',
        manufacturer: 'Silverson Machines',
        model: 'AX-500L Emulsifier',
        serial_number: 'SIL-2022-8812',
        installation_date: '2022-03-15',
        purchase_date: '2022-01-20',
        purchase_cost: 1850000.00,
        supplier: 'Silverson Process Technology Co., Ltd.',
        warranty_expiry: '2024-03-15',
        criticality: 'A',
        status: 'Running',
        responsible_technician_name: 'ช่างสมหมาย เก่งการช่าง',
        hourly_downtime_cost: 8500.00,
        specification: JSON.stringify({ capacity: '500 Liters', speed: '3000 RPM', material: 'SS316L Mirror Finish', heating: 'Steam Jacket 4 Bar' }),
        electrical_info: JSON.stringify({ power: '15 kW', voltage: '380V 3-Phase 50Hz', vfd: 'Schneider Altivar 71' }),
        maintenance_instruction: 'ตรวจสอบ Mechanical Seal และระดับน้ำมันเกียร์ทุก 30 วัน'
      },
      {
        asset_id: 'AST-MIX-004',
        machine_code: 'MX-04',
        machine_name: 'Vacuum Homogenizing Emulsifier 1000L',
        category: 'Mixing',
        department_id: mixDeptId,
        department_code: 'MIX',
        department_name: 'แผนกผสม (Mixing Department)',
        production_area: 'Cleanroom Mixing Hall B',
        line: 'Line 2 (Premium Cream)',
        manufacturer: 'IKA Works Inc.',
        model: 'Magic Plant 1000',
        serial_number: 'IKA-2023-9904',
        installation_date: '2023-05-10',
        purchase_date: '2023-02-15',
        purchase_cost: 3200000.00,
        supplier: 'IKA Process Equipment Thailand',
        warranty_expiry: '2025-05-10',
        criticality: 'A',
        status: 'Running',
        responsible_technician_name: 'ช่างวิชัย จักรกล',
        hourly_downtime_cost: 15000.00,
        specification: JSON.stringify({ capacity: '1000 Liters', vacuum: '-0.09 MPa', homogenizer_speed: '0-3600 RPM', scrape_speed: '0-65 RPM' }),
        electrical_info: JSON.stringify({ power: '22 kW + 7.5 kW scraper', voltage: '380V 3-Phase', plc: 'Siemens S7-1200' }),
        maintenance_instruction: 'ตรวจเช็ค Vacuum pump oil และซีลลูกปืนเพลาล่างก่อนเริ่มงานทุกกะ'
      },
      {
        asset_id: 'AST-MIX-002',
        machine_code: 'HG-01',
        machine_name: 'Ultra-High Pressure Homogenizer',
        category: 'Mixing',
        department_id: mixDeptId,
        department_code: 'MIX',
        department_name: 'แผนกผสม (Mixing Department)',
        production_area: 'Cleanroom Mixing Hall A',
        line: 'Line 1 (Emulsion)',
        manufacturer: 'GEA Niro Soavi',
        model: 'PandaPLUS 2000',
        serial_number: 'GEA-2021-4120',
        installation_date: '2021-08-01',
        purchase_date: '2021-06-10',
        purchase_cost: 2100000.00,
        supplier: 'GEA Process Engineering',
        warranty_expiry: '2023-08-01',
        criticality: 'A',
        status: 'Running',
        responsible_technician_name: 'ช่างสมหมาย เก่งการช่าง',
        hourly_downtime_cost: 10000.00,
        specification: JSON.stringify({ operating_pressure: 'Up to 1500 bar', flow_rate: '20 L/h to 100 L/h', stages: '2-Stage Tungsten Carbide valve' }),
        electrical_info: JSON.stringify({ power: '5.5 kW', voltage: '380V 3-Phase', control: 'Direct-on-line with inverter' }),
        maintenance_instruction: 'ล้างทำความสะอาดลูกสูบเซรามิกและเช็ค O-Ring ทุกครั้งหลังจบ Batch'
      },
      {
        asset_id: 'AST-PKG-001',
        machine_code: 'FL-01',
        machine_name: 'Rotary Tube Filling & Ultrasonic Sealing Machine',
        category: 'Filling',
        department_id: pkgDeptId,
        department_code: 'PKG',
        department_name: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)',
        production_area: 'Packing Cleanroom Room 1',
        line: 'Packaging Line 1 (Tube)',
        manufacturer: 'IWK Verpackungstechnik',
        model: 'TFS 80-2 Automatic',
        serial_number: 'IWK-2022-7711',
        installation_date: '2022-09-20',
        purchase_date: '2022-06-15',
        purchase_cost: 2850000.00,
        supplier: 'IWK Packaging Asia',
        warranty_expiry: '2024-09-20',
        criticality: 'A',
        status: 'Running',
        responsible_technician_name: 'ช่างวิชัย จักรกล',
        hourly_downtime_cost: 12000.00,
        specification: JSON.stringify({ output: '80 tubes/min', tube_diameter: '13-50 mm', filling_range: '5-250 ml', sealing: 'Ultrasonic + Hot Air' }),
        electrical_info: JSON.stringify({ power: '8.5 kW', voltage: '380V 3-Phase', air_consumption: '6 Bar 400 L/min' }),
        maintenance_instruction: 'อัดจารบี Food Grade ลูกเบี้ยวขับ Rotary ทุก 2 สัปดาห์ และเช็คหัวฮีตเตอร์'
      },
      {
        asset_id: 'AST-PKG-002',
        machine_code: 'FL-02',
        machine_name: 'Servo 4-Head Piston Bottle Filling Machine',
        category: 'Filling',
        department_id: pkgDeptId,
        department_code: 'PKG',
        department_name: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)',
        production_area: 'Packing Cleanroom Room 2',
        line: 'Packaging Line 2 (Bottle)',
        manufacturer: 'Universal Filling Systems',
        model: 'Posifill Servo-4',
        serial_number: 'UFS-2023-5502',
        installation_date: '2023-11-05',
        purchase_date: '2023-08-10',
        purchase_cost: 1650000.00,
        supplier: 'Universal Packaging Automation',
        warranty_expiry: '2025-11-05',
        criticality: 'A',
        status: 'Running',
        responsible_technician_name: 'ช่างอนุชา ซ่อมไว',
        hourly_downtime_cost: 9500.00,
        specification: JSON.stringify({ speed: '40-60 bottles/min', range: '30-500 ml', diving_nozzles: 'Bottom-up anti-foam' }),
        electrical_info: JSON.stringify({ power: '4.0 kW', servo: 'Delta Servo Drives x 4', hmi: 'Pro-face 10 inch' }),
        maintenance_instruction: 'ตรวจสอบ Seal ลูกสูบ Teflon และการรั่วซึมของ Rotary Valve ทุกสัปดาห์'
      },
      {
        asset_id: 'AST-PKG-003',
        machine_code: 'CP-01',
        machine_name: 'Automatic Multi-Torque Screw Capping Machine',
        category: 'Capping',
        department_id: pkgDeptId,
        department_code: 'PKG',
        department_name: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)',
        production_area: 'Packing Cleanroom Room 2',
        line: 'Packaging Line 2 (Bottle)',
        manufacturer: 'Arol Closure Systems',
        model: 'Euro PK Single Head',
        serial_number: 'AROL-2021-3310',
        installation_date: '2021-10-15',
        purchase_date: '2021-07-20',
        purchase_cost: 1200000.00,
        supplier: 'Arol Asia Pacific',
        warranty_expiry: '2023-10-15',
        criticality: 'B',
        status: 'Running',
        responsible_technician_name: 'ช่างอนุชา ซ่อมไว',
        hourly_downtime_cost: 6000.00,
        specification: JSON.stringify({ capacity: '45 caps/min', torque_control: 'Magnetic clutch 0.5 - 3.5 Nm' }),
        electrical_info: JSON.stringify({ power: '2.2 kW', voltage: '220V Single Phase' }),
        maintenance_instruction: 'ตรวจสอบแรงบิด Magnetic Clutch ด้วย Torque Meter ทุกวันจันทร์'
      },
      {
        asset_id: 'AST-PKG-004',
        machine_code: 'LB-01',
        machine_name: 'Automatic Round Bottle Sticker Labeling Machine',
        category: 'Labeling',
        department_id: pkgDeptId,
        department_code: 'PKG',
        department_name: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)',
        production_area: 'Packing Outer Packaging Hall',
        line: 'Packaging Line 2 (Bottle)',
        manufacturer: 'Herma Marking Systems',
        model: 'Herma 400 Rotary Wrap',
        serial_number: 'HER-2022-9014',
        installation_date: '2022-04-12',
        purchase_date: '2022-02-05',
        purchase_cost: 950000.00,
        supplier: 'Label Pack Solutions',
        warranty_expiry: '2024-04-12',
        criticality: 'B',
        status: 'Running',
        responsible_technician_name: 'ช่างอนุชา ซ่อมไว',
        hourly_downtime_cost: 4500.00,
        specification: JSON.stringify({ speed: 'Up to 120 bottles/min', accuracy: '+/- 0.5 mm', sensor: 'Leuze Ultrasonic clear label' }),
        electrical_info: JSON.stringify({ power: '1.5 kW', voltage: '220V Single Phase' }),
        maintenance_instruction: 'ทำความสะอาดคราบกาวบนลูกกลิ้งยางซิลิโคนทุกสิ้นกะด้วยแอลกอฮอล์'
      },
      {
        asset_id: 'AST-UTL-001',
        machine_code: 'AC-01',
        machine_name: 'Oil-Free Rotary Screw Air Compressor 50HP',
        category: 'Utility',
        department_id: mtDeptId,
        department_code: 'MT',
        department_name: 'ฝ่ายซ่อมบำรุงวิศวกรรม (Engineering & Maintenance)',
        production_area: 'Utility Building Room 1',
        line: 'Factory Main Compressed Air',
        manufacturer: 'Atlas Copco',
        model: 'ZT 37 VSD (Oil-Free Class 0)',
        serial_number: 'AC-2020-1194',
        installation_date: '2020-05-18',
        purchase_date: '2020-03-10',
        purchase_cost: 1950000.00,
        supplier: 'Atlas Copco (Thailand) Co., Ltd.',
        warranty_expiry: '2023-05-18',
        criticality: 'A',
        status: 'Running',
        responsible_technician_name: 'ช่างสมหมาย เก่งการช่าง',
        hourly_downtime_cost: 25000.00,
        specification: JSON.stringify({ fadr: '5.8 m3/min', max_pressure: '8.6 Bar', certification: 'ISO 8573-1 Class 0 Medical/Food' }),
        electrical_info: JSON.stringify({ power: '37 kW', vfd_drive: 'Built-in VSD 380V' }),
        maintenance_instruction: 'เดรนน้ำทิ้ง Auto Drain, เช็ค Delta P Air Filter และอุณหภูมิน้ำมันหล่อลื่นทุกวัน'
      },
      {
        asset_id: 'AST-UTL-002',
        machine_code: 'RO-01',
        machine_name: 'Double Pass Reverse Osmosis Water System (Purified Water)',
        category: 'Utility',
        department_id: mtDeptId,
        department_code: 'MT',
        department_name: 'ฝ่ายซ่อมบำรุงวิศวกรรม (Engineering & Maintenance)',
        production_area: 'Water Treatment Plant Room',
        line: 'Purified Water USP Loop',
        manufacturer: 'Veolia Water Technologies',
        model: 'Orion 2000S GMP',
        serial_number: 'VEO-2021-6502',
        installation_date: '2021-02-14',
        purchase_date: '2020-12-01',
        purchase_cost: 3800000.00,
        supplier: 'Veolia Water Solutions Thailand',
        warranty_expiry: '2023-02-14',
        criticality: 'A',
        status: 'Running',
        responsible_technician_name: 'ช่างสมหมาย เก่งการช่าง',
        hourly_downtime_cost: 30000.00,
        specification: JSON.stringify({ capacity: '2000 L/hr', conductivity: '< 1.3 uS/cm at 25C', edi_module: 'Ionpure MX-125' }),
        electrical_info: JSON.stringify({ power: '18 kW', plc: 'Rockwell Allen-Bradley CompactLogix' }),
        maintenance_instruction: 'จดบันทึกค่า Conductivity, Flow rate และค่า Differential Pressure เมมเบรนทุก 4 ชั่วโมง'
      },
      {
        asset_id: 'AST-UTL-003',
        machine_code: 'CH-01',
        machine_name: 'Water-Cooled Industrial Chiller 30TR',
        category: 'Utility',
        department_id: mtDeptId,
        department_code: 'MT',
        department_name: 'ฝ่ายซ่อมบำรุงวิศวกรรม (Engineering & Maintenance)',
        production_area: 'Utility Building Rooftop',
        line: 'Cooling Water Loop for Mixing Tanks',
        manufacturer: 'Daikin Industries',
        model: 'EWAD-CZ 30TR',
        serial_number: 'DAI-2022-8114',
        installation_date: '2022-07-25',
        purchase_date: '2022-05-15',
        purchase_cost: 1400000.00,
        supplier: 'Siam Daikin Sales Co., Ltd.',
        warranty_expiry: '2024-07-25',
        criticality: 'B',
        status: 'Running',
        responsible_technician_name: 'ช่างวิชัย จักรกล',
        hourly_downtime_cost: 8000.00,
        specification: JSON.stringify({ cooling_capacity: '105 kW (30 Ton)', refrigerant: 'R410A Eco-Friendly', supply_temp: '7 C' }),
        electrical_info: JSON.stringify({ power: '28 kW', voltage: '380V 3-Phase 50Hz' }),
        maintenance_instruction: 'ตรวจสอบระดับสารทำความเย็น และล้าง Cooling Tower strainer ทุกเดือน'
      }
    ];

    const machineMap = {};
    for (const m of machineInserts) {
      const res = await client.query(`
        INSERT INTO maintenance_machines (
          asset_id, machine_code, machine_name, category, department_id, department_code, department_name,
          production_area, line, manufacturer, model, serial_number, installation_date, purchase_date,
          purchase_cost, supplier, warranty_expiry, criticality, status, responsible_technician_name,
          hourly_downtime_cost, specification, electrical_info, maintenance_instruction
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        RETURNING id, machine_code;
      `, [
        m.asset_id, m.machine_code, m.machine_name, m.category, m.department_id, m.department_code, m.department_name,
        m.production_area, m.line, m.manufacturer, m.model, m.serial_number, m.installation_date, m.purchase_date,
        m.purchase_cost, m.supplier, m.warranty_expiry, m.criticality, m.status, m.responsible_technician_name,
        m.hourly_downtime_cost, m.specification, m.electrical_info, m.maintenance_instruction
      ]);
      machineMap[res.rows[0].machine_code] = res.rows[0].id;
    }

    // 3. Insert 15 Realistic Spare Parts
    console.log('Inserting 15 realistic cosmetic factory spare parts...');
    const spareParts = [
      {
        part_code: 'SP-BRG-6205',
        part_name: 'Deep Groove Ball Bearing 6205-2RSH (SKF)',
        category: 'Bearing',
        brand: 'SKF',
        model: '6205-2RSH/C3',
        specification: 'Inner 25mm, Outer 52mm, Width 15mm, Rubber Contact Seal',
        compatible_machines: ['MX-01', 'MX-04', 'FL-01', 'CP-01'],
        supplier: 'SKF Thailand Distributor',
        unit: 'ตลับ',
        stock_qty: 8,
        min_stock: 4,
        max_stock: 20,
        reorder_point: 5,
        average_cost: 380.00,
        last_purchase_price: 390.00,
        storage_location: 'Rack B1-03 (Bearings)'
      },
      {
        part_code: 'SP-BRG-6308',
        part_name: 'Heavy-Duty Motor Bearing 6308-2Z (NSK)',
        category: 'Bearing',
        brand: 'NSK',
        model: '6308-2Z/C3',
        specification: 'Inner 40mm, Outer 90mm, Metal Shielded for 15-22kW Motors',
        compatible_machines: ['MX-04', 'AC-01', 'CH-01'],
        supplier: 'NSK Bearings Thailand',
        unit: 'ตลับ',
        stock_qty: 3,
        min_stock: 2,
        max_stock: 8,
        reorder_point: 3,
        average_cost: 850.00,
        last_purchase_price: 880.00,
        storage_location: 'Rack B1-05 (Heavy Bearings)'
      },
      {
        part_code: 'SP-SEAL-V35',
        part_name: 'Sanitary Mechanical Seal 35mm Viton/SiC (Burgmann)',
        category: 'Seal & Gasket',
        brand: 'EagleBurgmann',
        model: 'M7N-35-Q1Q1VGG',
        specification: '35mm Shaft, Silicon Carbide vs Silicon Carbide, Viton O-ring, Food Grade FDA',
        compatible_machines: ['MX-01', 'MX-04'],
        supplier: 'EagleBurgmann Thailand',
        unit: 'ชุด',
        stock_qty: 2,
        min_stock: 2,
        max_stock: 6,
        reorder_point: 2,
        average_cost: 5400.00,
        last_purchase_price: 5500.00,
        storage_location: 'Rack S2-01 (Sanitary Seals)'
      },
      {
        part_code: 'SP-PNEU-V52',
        part_name: '5/2-Way Solenoid Valve 24VDC (Festo)',
        category: 'Pneumatic',
        brand: 'Festo',
        model: 'VUVS-L25-M52-MD-G14-1C1',
        specification: 'Port G1/4, 24VDC coil with LED indicator, 1000 L/min',
        compatible_machines: ['FL-01', 'FL-02', 'CP-01', 'LB-01'],
        supplier: 'Festo Ltd. Thailand',
        unit: 'ตัว',
        stock_qty: 5,
        min_stock: 3,
        max_stock: 12,
        reorder_point: 4,
        average_cost: 2650.00,
        last_purchase_price: 2700.00,
        storage_location: 'Rack P1-02 (Pneumatics)'
      },
      {
        part_code: 'SP-PNEU-CYL40',
        part_name: 'Compact Pneumatic Cylinder 40mm Bore 50mm Stroke',
        category: 'Pneumatic',
        brand: 'Festo',
        model: 'ADN-40-50-I-P-A',
        specification: 'ISO 21287, Magnetic Piston for Proximity Sensors',
        compatible_machines: ['FL-01', 'CP-01'],
        supplier: 'Festo Ltd. Thailand',
        unit: 'กระบอก',
        stock_qty: 2,
        min_stock: 1,
        max_stock: 5,
        reorder_point: 2,
        average_cost: 3400.00,
        last_purchase_price: 3500.00,
        storage_location: 'Rack P1-08 (Cylinders)'
      },
      {
        part_code: 'SP-SENS-E3Z',
        part_name: 'Compact Photoelectric Sensor NPN 1m Diffuse (Omron)',
        category: 'Sensor',
        brand: 'Omron',
        model: 'E3Z-D62 2M',
        specification: 'Sensing distance 1m diffuse-reflective, NPN Light-ON/Dark-ON, IP67',
        compatible_machines: ['FL-01', 'FL-02', 'CP-01', 'LB-01'],
        supplier: 'Omron Electronics Thailand',
        unit: 'ตัว',
        stock_qty: 6,
        min_stock: 3,
        max_stock: 15,
        reorder_point: 4,
        average_cost: 1450.00,
        last_purchase_price: 1500.00,
        storage_location: 'Rack E2-04 (Sensors)'
      },
      {
        part_code: 'SP-SENS-PRX12',
        part_name: 'Inductive Proximity Sensor M12 Shielded (Omron)',
        category: 'Sensor',
        brand: 'Omron',
        model: 'E2B-M12KS04-WP-B1 2M',
        specification: 'M12, Sn=4mm, PNP NO, Pre-wired 2m, Stainless steel body',
        compatible_machines: ['MX-01', 'MX-04', 'FL-01', 'CP-01'],
        supplier: 'Omron Electronics Thailand',
        unit: 'ตัว',
        stock_qty: 7,
        min_stock: 4,
        max_stock: 16,
        reorder_point: 5,
        average_cost: 820.00,
        last_purchase_price: 850.00,
        storage_location: 'Rack E2-06 (Sensors)'
      },
      {
        part_code: 'SP-HEAT-3000W',
        part_name: 'Sanitary Immersion Heating Element 3000W 220V SS316',
        category: 'Electrical',
        brand: 'Watlow / Thai Heating',
        model: 'TC-3000-220V-1.5TC',
        specification: '1.5 inch Tri-Clamp fitting, 3000W 220V, Incoloy 800 / SS316L',
        compatible_machines: ['MX-01', 'FL-01'],
        supplier: 'Premier Heating & Sensors Ltd.',
        unit: 'ชุด',
        stock_qty: 2,
        min_stock: 1,
        max_stock: 4,
        reorder_point: 1,
        average_cost: 2900.00,
        last_purchase_price: 2950.00,
        storage_location: 'Rack E3-02 (Heating Elements)'
      },
      {
        part_code: 'SP-ELEC-CONT24',
        part_name: 'Magnetic Contactor 24VDC 18A (Schneider TeSys D)',
        category: 'Electrical',
        brand: 'Schneider Electric',
        model: 'LC1D18BD',
        specification: '18A AC-3, 7.5kW @ 400V, 1NO+1NC aux, 24VDC coil with suppression',
        compatible_machines: ['MX-01', 'MX-04', 'AC-01', 'CH-01', 'FL-01'],
        supplier: 'Schneider Electric Partner',
        unit: 'ตัว',
        stock_qty: 4,
        min_stock: 2,
        max_stock: 8,
        reorder_point: 3,
        average_cost: 1350.00,
        last_purchase_price: 1380.00,
        storage_location: 'Rack E1-01 (Contactors)'
      },
      {
        part_code: 'SP-ELEC-RELAY',
        part_name: 'Miniature Plug-in Relay 24VDC 4PDT with Base (Finder)',
        category: 'Electrical',
        brand: 'Finder',
        model: '55.34.9.024.0040 + 94.04 Socket',
        specification: '4 CO 7A contacts, 24VDC coil with test button and mechanical indicator',
        compatible_machines: ['FL-01', 'FL-02', 'CP-01', 'LB-01', 'MX-04'],
        supplier: 'Siam Relay & Automation',
        unit: 'ชุด',
        stock_qty: 12,
        min_stock: 6,
        max_stock: 25,
        reorder_point: 8,
        average_cost: 320.00,
        last_purchase_price: 330.00,
        storage_location: 'Rack E1-05 (Relays)'
      },
      {
        part_code: 'SP-BELT-HTD8M',
        part_name: 'Timing Synchronous Belt HTD 8M Pitch 30mm Wide',
        category: 'Belt',
        brand: 'Gates',
        model: 'Gates PowerGrip 960-8M-30',
        specification: 'Pitch 8mm, Length 960mm, 120 teeth, Neoprene with fiberglass cords',
        compatible_machines: ['FL-01', 'CP-01', 'LB-01'],
        supplier: 'Gates Unitta Thailand',
        unit: 'เส้น',
        stock_qty: 3,
        min_stock: 2,
        max_stock: 6,
        reorder_point: 2,
        average_cost: 980.00,
        last_purchase_price: 1000.00,
        storage_location: 'Rack M1-04 (Belts)'
      },
      {
        part_code: 'SP-SEAL-TC15',
        part_name: 'Sanitary Tri-Clamp Gasket 1.5 inch Platinum Cured Silicone',
        category: 'Seal & Gasket',
        brand: 'Rubber Fab',
        model: '42MP-G-150-RX',
        specification: 'FDA CFR 177.2600, USP Class VI, Temperature -40 to +230 C',
        compatible_machines: ['MX-01', 'MX-04', 'HG-01', 'FL-01', 'RO-01'],
        supplier: 'Bio-Pure Process Components',
        unit: 'ชิ้น',
        stock_qty: 25,
        min_stock: 10,
        max_stock: 50,
        reorder_point: 15,
        average_cost: 95.00,
        last_purchase_price: 100.00,
        storage_location: 'Bin S1-01 (Sanitary Gaskets)'
      },
      {
        part_code: 'SP-SEAL-TC20',
        part_name: 'Sanitary Tri-Clamp Gasket 2.0 inch PTFE Envelope',
        category: 'Seal & Gasket',
        brand: 'Rubber Fab',
        model: 'A40MP-GR-200',
        specification: 'PTFE envelope with Viton core, 2.0 inch Tri-Clamp, Chemical proof',
        compatible_machines: ['MX-01', 'MX-04', 'HG-01'],
        supplier: 'Bio-Pure Process Components',
        unit: 'ชิ้น',
        stock_qty: 18,
        min_stock: 8,
        max_stock: 40,
        reorder_point: 10,
        average_cost: 160.00,
        last_purchase_price: 165.00,
        storage_location: 'Bin S1-02 (Sanitary Gaskets)'
      },
      {
        part_code: 'SP-PNEU-TUBE8',
        part_name: 'Polyurethane Pneumatic Tubing 8x5.5mm Blue (100m Roll)',
        category: 'Pneumatic',
        brand: 'SMC',
        model: 'TU0805BU-100',
        specification: 'OD 8mm, ID 5.5mm, Max 0.8 MPa at 20C, Flexible blue polyurethane',
        compatible_machines: ['FL-01', 'FL-02', 'CP-01', 'LB-01'],
        supplier: 'SMC Corporation Thailand',
        unit: 'ม้วน',
        stock_qty: 2,
        min_stock: 1,
        max_stock: 4,
        reorder_point: 2,
        average_cost: 1850.00,
        last_purchase_price: 1900.00,
        storage_location: 'Rack P2-01 (Hoses & Tubing)'
      },
      {
        part_code: 'SP-MOTOR-22KW',
        part_name: '3-Phase Induction Motor 2.2kW 4-Pole Foot Mount (ABB)',
        category: 'Motor',
        brand: 'ABB',
        model: 'M2BAX 100LA 4 (IE3 High Efficiency)',
        specification: '2.2kW 1440 RPM, 380-415V 50Hz, IP55, Class F, Shaft 28mm',
        compatible_machines: ['CP-01', 'LB-01', 'FL-02'],
        supplier: 'ABB Limited Thailand',
        unit: 'ตัว',
        stock_qty: 1,
        min_stock: 1,
        max_stock: 2,
        reorder_point: 1,
        average_cost: 11500.00,
        last_purchase_price: 11800.00,
        storage_location: 'Heavy Bay H1 (Motors)'
      }
    ];

    const partMap = {};
    for (const p of spareParts) {
      const res = await client.query(`
        INSERT INTO maintenance_spare_parts (
          part_code, part_name, category, brand, model, specification, compatible_machines,
          supplier, unit, stock_qty, min_stock, max_stock, reorder_point, average_cost,
          last_purchase_price, storage_location
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id, part_code;
      `, [
        p.part_code, p.part_name, p.category, p.brand, p.model, p.specification, p.compatible_machines,
        p.supplier, p.unit, p.stock_qty, p.min_stock, p.max_stock, p.reorder_point, p.average_cost,
        p.last_purchase_price, p.storage_location
      ]);
      partMap[res.rows[0].part_code] = res.rows[0].id;
    }

    // 4. Insert Historical Closed Work Orders (Realistic History for Machine 360 & AI Similar Failure)
    console.log('Inserting historical work orders for MX-04 and FL-01...');
    
    // History 1: MX-04 Motor Noise (Bearing failure 45 days ago)
    const woHist1 = await client.query(`
      INSERT INTO maintenance_work_orders (
        wo_number, machine_id, machine_code, machine_name, requester_name, priority, status,
        symptom_category, symptom_description, production_impact, is_emergency_breakdown,
        assigned_technician_name, reported_at, acknowledged_at, technician_arrived_at, repair_started_at,
        repair_completed_at, verified_at, closed_at, total_downtime_minutes, response_time_minutes,
        repair_time_minutes, problem_category, diagnosis, root_cause, root_cause_detail,
        corrective_action, preventive_recommendation, verification_status, verified_by_name,
        is_repeated_failure, total_part_cost, total_maintenance_cost, estimated_downtime_loss
      ) VALUES (
        'WO-2026-000084', $1, 'MX-04', 'Vacuum Homogenizing Emulsifier 1000L', 'สมปอง แผนกผสม',
        'P1_CRITICAL', 'CLOSED', 'เสียงผิดปกติ', 'มอเตอร์ใบกวนมีเสียงหอนดังผิดปกติขณะทำรอบ 2500 RPM เสี่ยงมอเตอร์ไหม้',
        'Production stopped', true, 'ช่างวิชัย จักรกล',
        NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days' + INTERVAL '4 minutes',
        NOW() - INTERVAL '45 days' + INTERVAL '10 minutes', NOW() - INTERVAL '45 days' + INTERVAL '12 minutes',
        NOW() - INTERVAL '45 days' + INTERVAL '95 minutes', NOW() - INTERVAL '45 days' + INTERVAL '115 minutes',
        NOW() - INTERVAL '45 days' + INTERVAL '120 minutes', 120, 4, 83,
        'Bearing', 'ตรวจพบตลับลูกปืนมอเตอร์ขับเมนหลวมคลอน จารบีแห้งกรอบและมีรอยตามด', 'Wear & Tear',
        'ลูกปืนรับภาระงานหนักต่อเนื่องและความร้อนสะสมสูง ทำให้จารบีเสื่อมสภาพเร็วกว่ากำหนด',
        'เปลี่ยนตลับลูกปืน NSK 6308-2Z จำนวน 1 ตลับ และปรับตั้ง Alignment เพลาขับ',
        'ให้อัดจารบีทนความร้อนสูง (High Temp Food Grade Grease) ทุก 1 เดือน',
        'PASS', 'หัวหน้าแผนกผสม สมชาย', false, 850.00, 850.00, 30000.00
      ) RETURNING id;
    `, [machineMap['MX-04']]);

    // Add part usage for History 1
    await client.query(`
      INSERT INTO maintenance_wo_parts (work_order_id, spare_part_id, part_code, part_name, quantity, unit, unit_cost, total_cost, issued_by_name)
      VALUES ($1, $2, 'SP-BRG-6308', 'Heavy-Duty Motor Bearing 6308-2Z (NSK)', 1, 'ตลับ', 850.00, 850.00, 'ช่างวิชัย จักรกล');
    `, [woHist1.rows[0].id, partMap['SP-BRG-6308']]);

    // History 2: MX-04 Mechanical Seal Leak (20 days ago)
    const woHist2 = await client.query(`
      INSERT INTO maintenance_work_orders (
        wo_number, machine_id, machine_code, machine_name, requester_name, priority, status,
        symptom_category, symptom_description, production_impact, is_emergency_breakdown,
        assigned_technician_name, reported_at, acknowledged_at, technician_arrived_at, repair_started_at,
        repair_completed_at, verified_at, closed_at, total_downtime_minutes, response_time_minutes,
        repair_time_minutes, problem_category, diagnosis, root_cause, root_cause_detail,
        corrective_action, preventive_recommendation, verification_status, verified_by_name,
        is_repeated_failure, repeat_count_90d, total_part_cost, total_maintenance_cost, estimated_downtime_loss
      ) VALUES (
        'WO-2026-000102', $1, 'MX-04', 'Vacuum Homogenizing Emulsifier 1000L', 'สมปอง แผนกผสม',
        'P2_HIGH', 'CLOSED', 'รั่ว', 'มีเนื้อครีมหยดซึมบริเวณใต้ก้นถังตรงแกน Homogenizer ด้านล่าง',
        'Quality risk', false, 'ช่างวิชัย จักรกล',
        NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '8 minutes',
        NOW() - INTERVAL '20 days' + INTERVAL '15 minutes', NOW() - INTERVAL '20 days' + INTERVAL '20 minutes',
        NOW() - INTERVAL '20 days' + INTERVAL '140 minutes', NOW() - INTERVAL '20 days' + INTERVAL '160 minutes',
        NOW() - INTERVAL '20 days' + INTERVAL '165 minutes', 165, 8, 120,
        'Mechanical', 'หน้าสัมผัสของ Mechanical Seal มีรอยสึกหรอและ O-Ring บวมจากสารทำความสะอาด CIP',
        'Chemical Exposure / Wear', 'การล้าง CIP ด้วยความร้อนสูงและกรดด่างกัดกร่อนหน้าซีล',
        'เปลี่ยนชุด Sanitary Mechanical Seal Viton 35mm และเปลี่ยน Tri-Clamp Gaskets',
        'ตรวจสอบอุณหภูมิและรอบเวลา CIP ไม่ให้เกิน 85 องศาเซลเซียส',
        'PASS', 'หัวหน้าแผนกผสม สมชาย', true, 1, 5495.00, 5495.00, 41250.00
      ) RETURNING id;
    `, [machineMap['MX-04']]);

    await client.query(`
      INSERT INTO maintenance_wo_parts (work_order_id, spare_part_id, part_code, part_name, quantity, unit, unit_cost, total_cost, issued_by_name)
      VALUES 
        ($1, $2, 'SP-SEAL-V35', 'Sanitary Mechanical Seal 35mm Viton/SiC (Burgmann)', 1, 'ชุด', 5400.00, 5400.00, 'ช่างวิชัย จักรกล'),
        ($1, $3, 'SP-SEAL-TC15', 'Sanitary Tri-Clamp Gasket 1.5 inch Platinum Cured Silicone', 1, 'ชิ้น', 95.00, 95.00, 'ช่างวิชัย จักรกล');
    `, [woHist2.rows[0].id, partMap['SP-SEAL-V35'], partMap['SP-SEAL-TC15']]);

    // History 3: FL-01 Tube filling sensor alignment (12 days ago)
    const woHist3 = await client.query(`
      INSERT INTO maintenance_work_orders (
        wo_number, machine_id, machine_code, machine_name, requester_name, priority, status,
        symptom_category, symptom_description, production_impact, is_emergency_breakdown,
        assigned_technician_name, reported_at, acknowledged_at, technician_arrived_at, repair_started_at,
        repair_completed_at, verified_at, closed_at, total_downtime_minutes, response_time_minutes,
        repair_time_minutes, problem_category, diagnosis, root_cause, root_cause_detail,
        corrective_action, preventive_recommendation, verification_status, verified_by_name,
        is_repeated_failure, total_part_cost, total_maintenance_cost, estimated_downtime_loss
      ) VALUES (
        'WO-2026-000115', $1, 'FL-01', 'Rotary Tube Filling & Ultrasonic Sealing Machine', 'พิมพ์ใจ หัวหน้าบรรจุ',
        'P2_HIGH', 'CLOSED', 'Sensor', 'เครื่องหยุดฟ้อง Tube Missing Error ทั้งๆ ที่มีหลอดในรางป้อน',
        'Machine stopped', false, 'ช่างอนุชา ซ่อมไว',
        NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days' + INTERVAL '5 minutes',
        NOW() - INTERVAL '12 days' + INTERVAL '12 minutes', NOW() - INTERVAL '12 days' + INTERVAL '15 minutes',
        NOW() - INTERVAL '12 days' + INTERVAL '45 minutes', NOW() - INTERVAL '12 days' + INTERVAL '55 minutes',
        NOW() - INTERVAL '12 days' + INTERVAL '60 minutes', 60, 5, 30,
        'Sensor', 'ขาจับ Photoelectric Sensor คลายตัวจากการสั่นสะเทือน ทำให้ลำแสงเบี่ยงเบน',
        'Loose Part', 'น็อตยึด Bracket หลวมจากการสั่นสะเทือนต่อเนื่อง',
        'ปรับตำแหน่งเซนเซอร์ ทำความสะอาดเลนส์ และขันน็อตพร้อมแต้ม Loctite 242 กันคลาย',
        'เพิ่มหัวข้อตรวจสอบน็อตยึด Bracket ใน Daily PM Checklist',
        'PASS', 'พิมพ์ใจ หัวหน้าบรรจุ', false, 0.00, 0.00, 12000.00
      ) RETURNING id;
    `, [machineMap['FL-01']]);

    // 5. Insert Live Active Work Orders
    console.log('Inserting live active work orders for Kanban & Technicians...');

    // Live WO 1: FL-02 Piston Filling - In Progress (Current active breakdown)
    await client.query(`
      INSERT INTO maintenance_work_orders (
        wo_number, machine_id, machine_code, machine_name, requester_name, priority, status,
        symptom_category, symptom_description, production_impact, is_emergency_breakdown,
        assigned_technician_name, reported_at, acknowledged_at, repair_started_at,
        total_downtime_minutes, problem_category, diagnosis
      ) VALUES (
        'WO-2026-000120', $1, 'FL-02', 'Servo 4-Head Piston Bottle Filling Machine', 'วนิดา เรืองศิลป์',
        'P1_CRITICAL', 'IN_PROGRESS', 'เครื่องหยุดกลางงาน', 'หัวจ่าย Nozzle 2 ไม่ยอมเลื่อนลงเพื่อเติมของเหลว แจ้งเตือนกระบอกลมติดขัด',
        'Production stopped', true, 'ช่างอนุชา ซ่อมไว',
        NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '30 minutes',
        45, 'Pneumatic', 'กำลังตรวจสอบ Solenoid Valve 24VDC ควบคุมหัวจ่าย Nozzle 2 มีไฟเข้าแต่แกนไม่สลับ'
      );
    `, [machineMap['FL-02']]);

    // Update FL-02 status to Under Repair
    await client.query(`UPDATE maintenance_machines SET status = 'Under Repair' WHERE machine_code = 'FL-02';`);

    // Live WO 2: CP-01 Capping Machine - Waiting Part
    await client.query(`
      INSERT INTO maintenance_work_orders (
        wo_number, machine_id, machine_code, machine_name, requester_name, priority, status,
        symptom_category, symptom_description, production_impact, is_emergency_breakdown,
        assigned_technician_name, reported_at, acknowledged_at, repair_started_at,
        total_downtime_minutes, problem_category, diagnosis, root_cause
      ) VALUES (
        'WO-2026-000121', $1, 'CP-01', 'Automatic Multi-Torque Screw Capping Machine', 'พิมพ์ใจ หัวหน้าบรรจุ',
        'P2_HIGH', 'WAITING_PART', 'สั่นผิดปกติ', 'สายพานขับหัวหมุนฝารูด มีเสียงเอี๊ยดและเศษยางหลุด',
        'Quality risk', false, 'ช่างสมหมาย เก่งการช่าง',
        NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 50 minutes', NOW() - INTERVAL '2 hours 30 minutes',
        180, 'Belt', 'สายพาน Timing Belt HTD 8M ฟันรูด 3 ซี่ จำเป็นต้องเปลี่ยนเส้นใหม่', 'Part Lifetime'
      );
    `, [machineMap['CP-01']]);

    // Update CP-01 status to Waiting Part
    await client.query(`UPDATE maintenance_machines SET status = 'Waiting Part' WHERE machine_code = 'CP-01';`);

    // 6. Insert PM Plans
    console.log('Inserting Preventive Maintenance Plans...');
    await client.query(`
      INSERT INTO maintenance_pm_plans (
        plan_code, plan_name, machine_id, machine_code, machine_name, frequency_type,
        frequency_interval, estimated_minutes, checklist_template, safety_requirements
      ) VALUES 
      (
        'PM-MX-M01', 'บำรุงรักษาประจำเดือน: ถังผสมสุญญากาศ (Vacuum Emulsifier)', $1, 'MX-04',
        'Vacuum Homogenizing Emulsifier 1000L', 'Monthly', 1, 90,
        $2::jsonb, 'ตัดเบรกเกอร์หลัก (LOTO), สวมแว่นตานิรภัยและถุงมือกันบาด, ตรวจสอบอุณหภูมิถังให้เย็นก่อนเข้าทำงาน'
      ),
      (
        'PM-FL-W01', 'บำรุงรักษารายสัปดาห์: เครื่องบรรจุหลอดอัตโนมัติ (Tube Filler)', $3, 'FL-01',
        'Rotary Tube Filling & Ultrasonic Sealing Machine', 'Weekly', 1, 60,
        $4::jsonb, 'กด E-Stop ทุกครั้งก่อนเอื้อมเข้าในรัศมีเครื่องจักร, ตรวจเช็คระบบตัดลมอัด'
      );
    `, [
      machineMap['MX-04'],
      JSON.stringify([
        { item: 'ตรวจเช็คระดับน้ำมันหล่อลื่น Vacuum Pump', standard: 'อยู่ในระดับกึ่งกลางตาแมว ใส ไม่มีฟอง', method: 'ตรวจสอบสายตา' },
        { item: 'ตรวจสอบการรั่วซึมของ Sanitary Mechanical Seal', standard: 'ไม่มีรอยหยดหรือคราบแห้งบริเวณเพลา', method: 'ตรวจด้วยสายตาและส่องไฟฉาย' },
        { item: 'วัดค่าความสั่นสะเทือนและเสียงของลูกปืนมอเตอร์ Homogenizer', standard: 'ไม่เกิน 2.8 mm/s RMS, ไม่มีเสียงหอน', method: 'ใช้เครื่องวัด Vibration Pen' },
        { item: 'ตรวจสอบสภาพสายไฟและขันแน่น Terminal ตู้คอนโทรล', standard: 'ไม่มีรอยไหม้ ขันแน่นตามพิกัดแรงบิด', method: 'ใช้ไขควงเช็คแรงบิด' },
        { item: 'ทดสอบระบบ Interlock ประตูนิรภัยและสวิตช์สุญญากาศ', standard: 'เครื่องหยุดหมุนทันทีเมื่อเปิดประตู', method: 'ทดสอบเปิดฝาขณะเดินเครื่องช้า' }
      ]),
      machineMap['FL-01'],
      JSON.stringify([
        { item: 'อัดจารบี Food Grade ลูกเบี้ยวขับจานหมุน Rotary', standard: 'อัดจารบีจนล้นขอบซีลเล็กน้อย เช็ดส่วนเกิน', method: 'ใช้กระบอกอัดจารบีมือ' },
        { item: 'ทำความสะอาดเลนส์เซนเซอร์ Photoelectric ตรวจจับหลอด', standard: 'ใสสะอาด ไม่มีคราบฝุ่นหรือสารเคลือบ', method: 'เช็ดด้วยผ้าไมโครไฟเบอร์และแอลกอฮอล์' },
        { item: 'ตรวจสอบรอยรั่วข้อต่อลมและสายลมอัด 8mm', standard: 'ไม่มีเสียงลมรั่ว แรงดันลมสม่ำเสมอ 6 Bar', method: 'ฟังเสียงและดูเกจวัดแรงดัน' },
        { item: 'ตรวจเช็คอุณหภูมิและความสะอาดหัวเชื่อมอัลตราโซนิก (Sonotrode)', standard: 'ผิวหน้าเรียบสนิท ไม่มีคราบพลาสติกไหม้', method: 'ตรวจสภาพพื้นผิว' }
      ])
    ]);

    console.log('Seed data inserted successfully!');
  } catch (err) {
    console.error('Error seeding demo data:', err);
  } finally {
    await client.end();
  }
}

run();
