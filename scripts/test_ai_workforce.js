const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runTests() {
  await client.connect();
  console.log('====================================================');
  console.log('COSMEFLOW PEOPLE V1 — AI WORKFORCE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Verify all 16 tables exist in information_schema
    const tables = [
      'hr_cases', 'case_evidence', 'case_comments', 'case_actions',
      'action_items', 'domain_events', 'ai_agents', 'ai_agent_permissions',
      'ai_agent_versions', 'ai_jobs', 'ai_job_runs', 'ai_tasks',
      'ai_recommendations', 'ai_activity_logs', 'human_approvals', 'document_drafts'
    ];

    const tableRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ANY($1);
    `, [tables]);

    const foundTables = tableRes.rows.map(r => r.table_name);
    assert(foundTables.length === 16, `All 16 AI Workforce & Case tables exist (found ${foundTables.length}/16)`);

    // Test 2: Verify 6 AI Agents registered with status 'PLANNED'
    const agentRes = await client.query(`SELECT agent_code, agent_name, status FROM ai_agents ORDER BY agent_code;`);
    assert(agentRes.rows.length === 6, `6 Digital Workers registered in registry (found ${agentRes.rows.length})`);
    const allPlanned = agentRes.rows.every(a => a.status === 'PLANNED');
    assert(allPlanned, `All Digital Workers are strictly marked as 'PLANNED' (No fake execution)`);

    // Test 3: Verify Least Privilege Permissions & Prohibited Actions
    const permRes = await client.query(`
      SELECT p.resource, p.action, p.active, a.agent_code 
      FROM ai_agent_permissions p 
      JOIN ai_agents a ON p.agent_id = a.id
      WHERE a.agent_code = 'AGENT-ATT-01';
    `);
    assert(permRes.rows.length >= 10, `AI Attendance Officer has granular permission controls (found ${permRes.rows.length})`);

    const hasProhibited = permRes.rows.some(p => p.resource === 'raw_attendance' && p.action === 'MODIFY' && p.active === false);
    assert(hasProhibited, `Prohibited Action: 'MODIFY raw_attendance' is strictly disabled for AI Attendance Officer`);

    const hasTermProhibited = permRes.rows.some(p => p.resource === 'employee_termination' && p.active === false);
    assert(hasTermProhibited, `Prohibited Action: 'employee_termination' is strictly disabled for AI Attendance Officer`);

    // Test 4: Action Items Inbox
    const actionRes = await client.query(`SELECT COUNT(*) as cnt FROM action_items WHERE status = 'PENDING';`);
    const pendingCount = parseInt(actionRes.rows[0]?.cnt || '0');
    assert(pendingCount >= 4, `Action Items Inbox populated with active items (found ${pendingCount} pending items)`);

    // Test 5: HR Case Management with Evidence and Comments
    const caseRes = await client.query(`
      SELECT c.case_number, c.case_type, c.status, 
             COUNT(DISTINCT e.id) as ev_count, 
             COUNT(DISTINCT m.id) as cm_count
      FROM hr_cases c
      LEFT JOIN case_evidence e ON e.case_id = c.id
      LEFT JOIN case_comments m ON m.case_id = c.id
      WHERE c.case_number = 'CASE-2026-001'
      GROUP BY c.id, c.case_number, c.case_type, c.status;
    `);

    assert(caseRes.rows.length === 1, `HR Case CASE-2026-001 exists`);
    const hrCase = caseRes.rows[0];
    assert(parseInt(hrCase.ev_count) >= 1, `Case has attached evidence pack (found ${hrCase.ev_count} evidence items)`);
    assert(parseInt(hrCase.cm_count) >= 1, `Case has investigation comments (found ${hrCase.cm_count} comments)`);

    // Test 6: Domain Events Emission
    const testEventCorr = `TEST-${Date.now()}`;
    await client.query(`
      INSERT INTO domain_events (event_name, entity_type, payload, correlation_id)
      VALUES ('attendance.exception.detected', 'attendance_exceptions', '{"test": true}'::jsonb, $1);
    `, [testEventCorr]);

    const eventCheck = await client.query(`SELECT * FROM domain_events WHERE correlation_id = $1;`, [testEventCorr]);
    assert(eventCheck.rows.length === 1, `Domain event emitted and recorded successfully in domain_events table`);

    // Test 7: Self-Refutation Check: Verify AI cannot override System of Record (Leave Balances)
    // System of Record table leave_balances must NOT reference ai_agents directly as balance authority
    const balanceCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'leave_balances';
    `);
    const hasAiAuthCol = balanceCols.rows.some(c => c.column_name === 'ai_agent_id');
    assert(!hasAiAuthCol, `Integrity rule confirmed: AI Agent is NOT the System of Record for leave balances`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await client.end();
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
