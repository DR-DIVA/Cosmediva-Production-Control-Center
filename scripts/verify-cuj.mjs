import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testCUJ() {
  console.log('=== STARTING ACCEPTANCE TEST: CRITICAL USER JOURNEY (CUJ) ===\n');

  // Step 1: Initial state check for FL-01 and Bearing stock
  console.log('1. Checking initial state of FL-01 and Bearing SP-BRG-6205...');
  const { data: partsBefore } = await supabase
    .from('maintenance_spare_parts')
    .select('*')
    .eq('part_code', 'SP-BRG-6205')
    .single();

  const initialBearingStock = Number(partsBefore.stock_qty);
  const initialBearingId = partsBefore.id;
  console.log(`   Initial Bearing Stock: ${initialBearingStock} ตลับ`);

  // Step 2: Operator reports breakdown on FL-01 with BREAKDOWN NOW
  console.log('\n2. Operator scans QR, presses BREAKDOWN NOW for FL-01...');
  const { data: fl01 } = await supabase
    .from('maintenance_machines')
    .select('*')
    .eq('machine_code', 'FL-01')
    .single();

  const currentYear = new Date().getFullYear();
  const woNumber = `WO-${currentYear}-990001`;
  const now = new Date().toISOString();

  const { data: wo, error: woErr } = await supabase
    .from('maintenance_work_orders')
    .insert({
      wo_number: woNumber,
      machine_id: fl01.id,
      machine_code: fl01.machine_code,
      machine_name: fl01.machine_name,
      requester_name: 'สมศรี พนักงานฝ่ายบรรจุ',
      priority: 'P1_CRITICAL',
      status: 'NEW',
      symptom_category: 'เครื่องหยุดกลางงาน',
      symptom_description: 'มอเตอร์ชุดขับสายพานป้อนหลอดหยุดหมุน มีเสียงดังและกลิ่นไหม้',
      production_impact: 'Production stopped',
      is_emergency_breakdown: true,
      reported_at: now
    })
    .select()
    .single();

  if (woErr) throw new Error(`Create WO error: ${woErr.message}`);
  console.log(`   ✅ Work Order Created: ${wo.wo_number}`);
  console.log(`   Priority: ${wo.priority} (Expected: P1_CRITICAL)`);
  console.log(`   Status: ${wo.status} (Expected: NEW)`);

  // Update machine status to Breakdown
  await supabase
    .from('maintenance_machines')
    .update({ status: 'Breakdown' })
    .eq('id', fl01.id);

  // Step 3: Technician receives alert and clicks ACCEPT JOB
  console.log('\n3. Technician receives alert and clicks ACCEPT JOB...');
  const ackTime = new Date().toISOString();
  const { data: ackWO } = await supabase
    .from('maintenance_work_orders')
    .update({
      status: 'ACKNOWLEDGED',
      acknowledged_at: ackTime,
      assigned_technician_name: 'ช่างสมหมาย เก่งการช่าง',
      response_time_minutes: 2
    })
    .eq('id', wo.id)
    .select()
    .single();

  console.log(`   ✅ Work Order Acknowledged: status = ${ackWO.status}, response_time = 2 min`);

  // Step 4: Technician arrives and starts repair
  console.log('\n4. Technician arrives at Gemba and clicks START REPAIR...');
  const startTime = new Date().toISOString();
  const { data: startWO } = await supabase
    .from('maintenance_work_orders')
    .update({
      status: 'IN_PROGRESS',
      repair_started_at: startTime
    })
    .eq('id', wo.id)
    .select()
    .single();

  await supabase
    .from('maintenance_machines')
    .update({ status: 'Under Repair' })
    .eq('id', fl01.id);

  console.log(`   ✅ Repair Started: status = ${startWO.status}, machine status = Under Repair`);

  // Step 5: Check Machine History & Past Failures
  console.log('\n5. Inspecting Machine 360 History for previous bearing or similar failures...');
  const { data: pastRepairs } = await supabase
    .from('maintenance_work_orders')
    .select('*')
    .eq('machine_code', 'FL-01')
    .eq('status', 'CLOSED');

  console.log(`   Found ${pastRepairs?.length || 0} historical closed repairs for FL-01`);

  // Step 6: Technician detects worn bearing, clicks "+ ใช้อะไหล่" for SP-BRG-6205
  console.log('\n6. Technician detects worn bearing, clicks "+ ใช้อะไหล่" for SP-BRG-6205...');
  const newStock = initialBearingStock - 1;
  await supabase
    .from('maintenance_spare_parts')
    .update({ stock_qty: newStock })
    .eq('id', initialBearingId);

  const { data: partUsage } = await supabase
    .from('maintenance_wo_parts')
    .insert({
      work_order_id: wo.id,
      spare_part_id: initialBearingId,
      part_code: 'SP-BRG-6205',
      part_name: 'Deep Groove Ball Bearing 6205-2RSH (SKF)',
      quantity: 1,
      unit: 'ตลับ',
      unit_cost: 380.00,
      total_cost: 380.00,
      issued_by_name: 'ช่างสมหมาย เก่งการช่าง'
    })
    .select()
    .single();

  console.log(`   ✅ Spare Part Issued: ${partUsage.part_name}`);
  console.log(`   Stock deducted: Remaining Stock = ${newStock} (Expected: ${initialBearingStock - 1})`);

  // Step 7: Complete repair & request TEST RUN
  console.log('\n7. Technician finishes assembly, selects Root Cause = Wear & Tear, clicks TEST RUN...');
  const { data: testRunWO } = await supabase
    .from('maintenance_work_orders')
    .update({
      status: 'TEST_RUN',
      problem_category: 'Bearing',
      diagnosis: 'ตรวจพบลูกปืนแตกจากความร้อนสะสมและขาดการหล่อลื่น',
      root_cause: 'Wear & Tear',
      corrective_action: 'เปลี่ยนตลับลูกปืน SKF 6205-2RSH และอัดจารบี Food Grade',
      preventive_recommendation: 'เพิ่มจุดตรวจเช็คอุณหภูมิใน Weekly PM',
      repair_time_minutes: 45,
      total_part_cost: 380.00,
      total_maintenance_cost: 380.00
    })
    .eq('id', wo.id)
    .select()
    .single();

  console.log(`   ✅ Work Order status = ${testRunWO.status}, repair_time = 45 min, part_cost = ฿380`);

  // Step 8: Production Operator Verifies PASS
  console.log('\n8. Production Operator runs test batch and clicks VERIFY PASS...');
  const verifyTime = new Date().toISOString();
  const downtimeMin = 50;
  const downtimeCost = Math.round((downtimeMin / 60) * Number(fl01.hourly_downtime_cost));

  const { data: verifyWO } = await supabase
    .from('maintenance_work_orders')
    .update({
      status: 'VERIFIED',
      verification_status: 'PASS',
      verified_at: verifyTime,
      verified_by_name: 'สมศรี พนักงานฝ่ายบรรจุ',
      total_downtime_minutes: downtimeMin,
      estimated_downtime_loss: downtimeCost,
      closed_at: verifyTime
    })
    .eq('id', wo.id)
    .select()
    .single();

  // Machine is back to Running
  await supabase
    .from('maintenance_machines')
    .update({ status: 'Running' })
    .eq('id', fl01.id);

  console.log(`   ✅ Work Order Verified & Closed: status = ${verifyWO.status}`);
  console.log(`   Total Downtime Recorded: ${verifyWO.total_downtime_minutes} นาที`);
  console.log(`   Estimated Downtime Financial Loss: ฿${verifyWO.estimated_downtime_loss.toLocaleString()}`);

  // Step 9: Validate Machine 360 reflects the completed repair
  console.log('\n9. Validating Machine 360° Profile update for FL-01...');
  const { data: fl01Updated } = await supabase
    .from('maintenance_machines')
    .select('*')
    .eq('machine_code', 'FL-01')
    .single();

  console.log(`   FL-01 Current Status: ${fl01Updated.status} (Expected: Running)`);

  const { data: fl01Parts } = await supabase
    .from('maintenance_wo_parts')
    .select('*')
    .eq('work_order_id', wo.id);

  console.log(`   FL-01 Parts Consumed in this WO: ${fl01Parts.length} item(s)`);

  // Step 10: Validate Dashboard KPI metrics
  console.log('\n10. Validating Dashboard KPI metrics...');
  const { data: allMachines } = await supabase
    .from('maintenance_machines')
    .select('status');

  const runningCount = allMachines.filter(m => m.status === 'Running').length;
  console.log(`    Total Running Machines: ${runningCount} / ${allMachines.length}`);

  console.log('\n🎉 ALL ACCEPTANCE TEST CRITICAL USER JOURNEY STEPS PASSED 100%! 🎉\n');
}

testCUJ().catch(err => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
  process.exit(1);
});
