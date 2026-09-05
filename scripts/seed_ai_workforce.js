const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function seedAiWorkforce() {
  await client.connect();
  console.log('Seeding AI Workforce & Case Management Foundation...');

  // 1. Seed 6 Initial Digital Workers (Section 5)
  const agents = [
    {
      code: 'AGENT-HR-01',
      name: 'AI HR Officer',
      type: 'DIGITAL_WORKER',
      mission: 'Support daily HR operations by reviewing cases, collecting evidence, preparing work and bringing only relevant decisions to HR.',
      description: 'ผู้ช่วยงานบุคคลดิจิทัล: ช่วยตรวจสอบเคสพนักงาน รวบรวมเอกสาร และสรุปสาระสำคัญเสนอฝ่ายบุคคล',
      status: 'PLANNED', // Explicitly marked as PLANNED for V1
      risk_level: 'MEDIUM',
      default_role: 'HR Officer',
      prompt_ref: 'prompts/ai_hr_officer_v1.md',
      version: '1.0.0'
    },
    {
      code: 'AGENT-ATT-01',
      name: 'AI Attendance Officer',
      type: 'DIGITAL_WORKER',
      mission: 'Review attendance data and detect anomalies before HR begins manual investigation.',
      description: 'ผู้ช่วยตรวจเวลาเข้าออกงานดิจิทัล: สแกนข้อมูลลงเวลา ตรวจจับกรณีผิดปกติ (ขาด/สาย/ลืมสแกน) และจัดเตรียมรายงานข้อยกเว้นประจำวัน',
      status: 'PLANNED',
      risk_level: 'LOW',
      default_role: 'HR Officer',
      prompt_ref: 'prompts/ai_attendance_officer_v1.md',
      version: '1.0.0'
    },
    {
      code: 'AGENT-LEAVE-01',
      name: 'AI Leave Coordinator',
      type: 'DIGITAL_WORKER',
      mission: 'Help validate and coordinate leave requests across factory policies.',
      description: 'ผู้ประสานงานวันลาดิจิทัล: ตรวจสอบสิทธิ์วันลา กฎระเบียบโรงงาน และผลกระทบต่ออัตรากำลังคนก่อนส่งให้หัวหน้าอนุมัติ',
      status: 'PLANNED',
      risk_level: 'LOW',
      default_role: 'HR Officer',
      prompt_ref: 'prompts/ai_leave_coordinator_v1.md',
      version: '1.0.0'
    },
    {
      code: 'AGENT-WF-01',
      name: 'AI Workforce Analyst',
      type: 'DIGITAL_WORKER',
      mission: 'Analyze whether workforce availability is sufficient for factory operations.',
      description: 'นักวิเคราะห์กำลังคนดิจิทัล: ประเมินความพร้อมคนหน้างานตอนเช้า เทียบแผนผลิต และแจ้งเตือนจุดเสี่ยงคอขวดสายการผลิต',
      status: 'PLANNED',
      risk_level: 'HIGH',
      default_role: 'Executive',
      prompt_ref: 'prompts/ai_workforce_analyst_v1.md',
      version: '1.0.0'
    },
    {
      code: 'AGENT-COMP-01',
      name: 'AI Compliance Assistant',
      type: 'DIGITAL_WORKER',
      mission: 'Prepare evidence and policy references for HR compliance decisions.',
      description: 'ผู้ช่วยตรวจสอบนโยบายและความถูกต้อง: เตรียมสำนวนหลักฐาน กฎหมายแรงงาน และระเบียบปฏิบัติโรงงานสำหรับการตัดสินใจ',
      status: 'PLANNED',
      risk_level: 'HIGH',
      default_role: 'HR Manager',
      prompt_ref: 'prompts/ai_compliance_assistant_v1.md',
      version: '1.0.0'
    },
    {
      code: 'AGENT-PEOPLE-01',
      name: 'AI People Analyst',
      type: 'DIGITAL_WORKER',
      mission: 'Analyze people trends, absenteeism patterns, and workforce risks.',
      description: 'นักวิเคราะห์แนวโน้มบุคลากร: วิเคราะห์สถิติการขาด ลา มาสาย อัตราการลาออก และชั่วโมงล่วงเวลาเปรียบเทียบรายแผนก',
      status: 'PLANNED',
      risk_level: 'MEDIUM',
      default_role: 'HR Manager',
      prompt_ref: 'prompts/ai_people_analyst_v1.md',
      version: '1.0.0'
    }
  ];

  const agentIdMap = {};

  for (const a of agents) {
    const res = await client.query(`
      INSERT INTO ai_agents (agent_code, agent_name, agent_type, mission, description, status, risk_level, default_role_id, system_prompt_reference, version)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (agent_code) DO UPDATE SET
        agent_name = EXCLUDED.agent_name,
        mission = EXCLUDED.mission,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id, agent_code;
    `, [a.code, a.name, a.type, a.mission, a.description, a.status, a.risk_level, a.default_role, a.prompt_ref, a.version]);
    agentIdMap[a.code] = res.rows[0].id;

    // Seed agent version (Section 29)
    await client.query(`
      INSERT INTO ai_agent_versions (agent_id, version, prompt_reference, status)
      VALUES ($1, $2, $3, 'ACTIVE')
      ON CONFLICT DO NOTHING;
    `, [res.rows[0].id, a.version, a.prompt_ref]);
  }
  console.log(`Seeded ${agents.length} Digital Workers with version control.`);

  // 2. Seed Permissions (Section 6 & 7: Least Privilege & Prohibited Actions)
  const attAgentId = agentIdMap['AGENT-ATT-01'];
  if (attAgentId) {
    const permissions = [
      { resource: 'attendance', action: 'READ', scope: 'SITE', approval: false, risk: 'LOW' },
      { resource: 'leave', action: 'READ', scope: 'SITE', approval: false, risk: 'LOW' },
      { resource: 'schedule', action: 'READ', scope: 'SITE', approval: false, risk: 'LOW' },
      { resource: 'hr_case', action: 'CREATE', scope: 'SITE', approval: false, risk: 'MEDIUM' },
      { resource: 'recommendation', action: 'CREATE', scope: 'SITE', approval: false, risk: 'MEDIUM' },
      { resource: 'reminder', action: 'CREATE', scope: 'SITE', approval: true, risk: 'MEDIUM' },
      // Explicitly Prohibited High-Risk Actions
      { resource: 'raw_attendance', action: 'MODIFY', scope: 'NONE', approval: false, risk: 'CRITICAL', active: false },
      { resource: 'leave_balance', action: 'CHANGE', scope: 'NONE', approval: false, risk: 'CRITICAL', active: false },
      { resource: 'disciplinary_action', action: 'ISSUE', scope: 'NONE', approval: false, risk: 'CRITICAL', active: false },
      { resource: 'employee_termination', action: 'EXECUTE', scope: 'NONE', approval: false, risk: 'CRITICAL', active: false },
      { resource: 'payroll_data', action: 'CHANGE', scope: 'NONE', approval: false, risk: 'CRITICAL', active: false }
    ];

    for (const p of permissions) {
      await client.query(`
        INSERT INTO ai_agent_permissions (agent_id, resource, action, permission_scope, requires_human_approval, risk_level, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (agent_id, resource, action) DO UPDATE SET
          permission_scope = EXCLUDED.permission_scope,
          requires_human_approval = EXCLUDED.requires_human_approval,
          risk_level = EXCLUDED.risk_level,
          active = EXCLUDED.active;
      `, [attAgentId, p.resource, p.action, p.scope, p.approval, p.risk, p.active !== false]);
    }
    console.log(`Seeded Least-Privilege permissions for AI Attendance Officer.`);
  }

  // 3. Seed AI Jobs (Section 10)
  const jobs = [
    { code: 'JOB-ATT-DAILY', name: 'Daily Attendance Review (08:30)', agent_code: 'AGENT-ATT-01', cron: '30 8 * * *', risk: 'LOW' },
    { code: 'JOB-LEAVE-VALIDATE', name: 'Leave Pre-Validation & Overlap Check', agent_code: 'AGENT-LEAVE-01', cron: '*/15 * * * *', risk: 'LOW' },
    { code: 'JOB-APPROVAL-FOLLOWUP', name: 'Pending Approval Follow-up (4h SLA)', agent_code: 'AGENT-HR-01', cron: '0 */2 * * *', risk: 'MEDIUM' },
    { code: 'JOB-TRAIN-EXPIRY', name: 'GMP/Safety Training Expiry Check', agent_code: 'AGENT-COMP-01', cron: '0 9 * * 1', risk: 'LOW' },
    { code: 'JOB-WF-RISK', name: 'Morning Factory Workforce Risk Brief (07:45)', agent_code: 'AGENT-WF-01', cron: '45 7 * * *', risk: 'HIGH' }
  ];

  for (const j of jobs) {
    const aid = agentIdMap[j.agent_code];
    if (aid) {
      await client.query(`
        INSERT INTO ai_jobs (job_code, job_name, agent_id, trigger_type, schedule_expression, active, risk_level, human_review_required)
        VALUES ($1, $2, $3, 'CRON', $4, FALSE, $5, TRUE)
        ON CONFLICT (job_code) DO NOTHING;
      `, [j.code, j.name, aid, j.cron, j.risk]);
    }
  }
  console.log(`Seeded ${jobs.length} future-ready AI Job definitions.`);

  // 4. Seed V1 Active Action Items ("What Needs Your Attention?" - Section 43)
  const actionItems = [
    {
      action_type: 'LEAVE_APPROVAL',
      title: 'อนุมัติใบลา: น.ส.เบ็ญจพร พูลสวัสดิ์ (ลาพักร้อน 1 วัน)',
      description: 'ยื่นขอลาพักร้อนวันที่ 08/09/2026 รอการอนุมัติจากหัวหน้าแผนกบรรจุ (SLA เหลือ 2 ชม.)',
      priority: 'HIGH',
      assigned_to_role: 'Supervisor',
      status: 'PENDING',
      source: 'LEAVE_ENGINE'
    },
    {
      action_type: 'ATTENDANCE_CORRECTION',
      title: 'แก้ไขเวลาลงงาน: นายสุนทร มีโชค (ลืมสแกนนิ้วออก)',
      description: 'พบเข้างาน 07:55 น. แต่วันที่ 04/09/2026 ไม่มีเวลาสแกนออก กะปกติเลิก 17:00 น.',
      priority: 'MEDIUM',
      assigned_to_role: 'HR Officer',
      status: 'PENDING',
      source: 'ATTENDANCE_EXCEPTION'
    },
    {
      action_type: 'UNRESOLVED_EXCEPTION',
      title: 'ตรวจสอบการขาดงานไม่แจ้งล่วงหน้า (Line 2 บรรจุ)',
      description: 'พบพนักงาน 2 รายไม่เข้างานและไม่มีใบลาก่อนเวลา 08:30 น. เสี่ยงกระทบออเดอร์ JHD-309',
      priority: 'HIGH',
      assigned_to_role: 'Supervisor',
      status: 'PENDING',
      source: 'WORKFORCE_MONITOR'
    },
    {
      action_type: 'POLICY_DECISION',
      title: 'พิจารณาคำขอลาไม่รับค่าจ้าง (Leave Without Pay > 3 วัน)',
      description: 'พนักงานแผนกคลังสินค้า ยื่นขอลากิจไม่รับค่าจ้าง 5 วัน ติดต่อกัน ต้องผ่านการอนุมัติจาก HR Manager',
      priority: 'MEDIUM',
      assigned_to_role: 'HR Manager',
      status: 'PENDING',
      source: 'APPROVAL_MATRIX'
    }
  ];

  for (const item of actionItems) {
    await client.query(`
      INSERT INTO action_items (action_type, title, description, priority, assigned_to_role, status, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING;
    `, [item.action_type, item.title, item.description, item.priority, item.assigned_to_role, item.status, item.source]);
  }
  console.log(`Seeded active Action Items for V1 Action Inbox.`);

  // 5. Seed V1 Operational Case for Attendance Exception (Section 42)
  // Fetch an actual employee
  const empRes = await client.query(`SELECT id, department_id FROM employees WHERE employee_code = 'PK-BJP518' LIMIT 1;`);
  const emp = empRes.rows[0];

  if (emp) {
    const caseRes = await client.query(`
      INSERT INTO hr_cases (case_number, case_type, employee_id, department_id, source_type, severity, priority, status, summary, description)
      VALUES ('CASE-2026-001', 'Attendance', $1, $2, 'EXCEPTION', 'MEDIUM', 'HIGH', 'Open',
              'ตรวจสอบการไม่สแกนนิ้วออก (Missing Clock Out) วันที่ 04/09/2026',
              'ระบบสแกนนิ้วไม่พบเวลาบันทึกเลิกงานของ น.ส.เบ็ญจพร พูลสวัสดิ์ ขณะนี้รอหัวหน้างานยืนยันการปฏิบัติงาน')
      ON CONFLICT (case_number) DO UPDATE SET summary = EXCLUDED.summary
      RETURNING id;
    `, [emp.id, emp.department_id]);
    
    const caseId = caseRes.rows[0]?.id;
    if (caseId) {
      // Add Evidence (Section 15)
      await client.query(`
        INSERT INTO case_evidence (case_id, evidence_type, title, description, snapshot_data)
        VALUES ($1, 'Attendance', 'บันทึกเวลาดิบ (Raw Punch Log)', 'มีสแกนเข้า 07:58 น. แต่ไม่มีบันทึกออกหลัง 17:00 น.', '{"punch_in": "07:58:12", "punch_out": null}'::jsonb)
        ON CONFLICT DO NOTHING;
      `, [caseId]);

      // Add Comment (Section 16)
      await client.query(`
        INSERT INTO case_comments (case_id, comment_type, comment, author_type)
        VALUES ($1, 'INVESTIGATION', 'HR ได้โทรประสานงานกับหัวหน้ากะบรรจุ ยืนยันว่าพนักงานอยู่ทำงานจนถึง 17:00 น. จริง แต่รีบกลับเนื่องจากฝนตกหนัก', 'HR')
        ON CONFLICT DO NOTHING;
      `, [caseId]);

      // Add Proposed Case Action (Section 17)
      await client.query(`
        INSERT INTO case_actions (case_id, action_type, status, recommended_by, requires_approval)
        VALUES ($1, 'ATTENDANCE_TIME_ADJUSTMENT', 'PENDING', 'HR Officer (มนัสนันท์)', TRUE)
        ON CONFLICT DO NOTHING;
      `, [caseId]);

      console.log(`Seeded active HR Case CASE-2026-001 with evidence and comments.`);
    }
  }

  // 6. Seed Initial Domain Events (Section 44)
  await client.query(`
    INSERT INTO domain_events (event_name, entity_type, payload, correlation_id)
    VALUES 
      ('attendance.exception.detected', 'attendance_exceptions', '{"type": "MISSING_CLOCK_OUT", "count": 6}'::jsonb, 'BATCH-20260905-01'),
      ('leave.requested', 'leave_requests', '{"employee_code": "PK-BJP518", "type": "ANNUAL", "days": 1}'::jsonb, 'REQ-20260905-01')
    ON CONFLICT DO NOTHING;
  `);
  console.log(`Seeded initial domain events for audit trail.`);

  await client.end();
  console.log('AI Workforce Ready Foundation Seed Completed Successfully!');
}

seedAiWorkforce().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
