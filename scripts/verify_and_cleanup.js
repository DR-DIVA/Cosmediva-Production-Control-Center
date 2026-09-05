const pg = require('pg');
const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  // Deactivate demo seed accounts
  const demoCodes = ['EMP-ADM001', 'EXEC-001', 'HR-MGR001', 'HR-OFF001', 'PDT-MGR001'];
  const res = await client.query(`
    UPDATE employees 
    SET is_active = false, deleted_at = NOW() 
    WHERE employee_code = ANY($1::varchar[])
  `, [demoCodes]);
  console.log('Deactivated demo records:', res.rowCount);

  // Summary counts
  const emps = await client.query(`
    SELECT count(*) as total, 
           count(supervisor_id) as with_supervisor,
           count(CASE WHEN is_active THEN 1 END) as active_count
    FROM employees
  `);
  console.log('Employees Summary:', emps.rows[0]);

  const holidays = await client.query('SELECT count(*) as count FROM holidays WHERE is_active = true');
  console.log('Active Holidays Count:', holidays.rows[0]);

  const policies = await client.query('SELECT count(*) as count FROM leave_policies WHERE is_active = true');
  console.log('Active Leave Policies Count:', policies.rows[0]);

  const balances = await client.query(`
    SELECT t.type_code, count(b.id) as balance_count, sum(b.entitled) as total_entitled, sum(b.available) as total_available
    FROM leave_balances b
    JOIN leave_types t ON b.leave_type_id = t.id
    WHERE b.year = 2026
    GROUP BY t.type_code
  `);
  console.log('Leave Balances 2026 by Type:', balances.rows);

  await client.end();
}
run().catch(console.error);
