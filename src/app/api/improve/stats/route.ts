import { NextResponse } from 'next/server';
import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

function getClient() {
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

export async function GET() {
  const client = getClient();
  try {
    await client.connect();

    // 1. Observations Summary
    const obsStatsRes = await client.query(`
      SELECT 
        COUNT(*) as total_observations,
        COUNT(*) FILTER (WHERE status NOT IN ('CLOSED', 'REJECTED')) as open_observations,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL' OR quality_risk = true OR gmp_risk = true) as critical_findings,
        COALESCE(SUM(estimated_monthly_loss), 0) as total_monthly_loss,
        COALESCE(SUM(estimated_annual_loss), 0) as total_annual_loss,
        COALESCE(SUM(potential_saving), 0) as total_potential_saving
      FROM improve_observations
    `);

    // 2. Projects Summary & Finance Validated Savings
    const projStatsRes = await client.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS' OR status = 'TRIAL') as in_progress_projects,
        COUNT(*) FILTER (WHERE status = 'VERIFIED' OR status = 'STANDARDIZED' OR status = 'CLOSED') as verified_projects,
        COALESCE(SUM(finance_validated_hard_saving), 0) as validated_hard_saving_ytd,
        COALESCE(SUM(released_capacity_hours), 0) as total_released_capacity_hours
      FROM improve_projects
    `);

    // 3. Waste Breakdown (DOWNTIME Pareto)
    const wasteBreakdownRes = await client.query(`
      SELECT 
        COALESCE(hv.confirmed_primary_waste, ai.primary_waste, 'Other') as waste_name,
        COUNT(o.id) as count,
        COALESCE(SUM(o.estimated_annual_loss), 0) as total_loss_thb
      FROM improve_observations o
      LEFT JOIN improve_human_validations hv ON hv.observation_id = o.id
      LEFT JOIN improve_ai_analysis ai ON ai.observation_id = o.id
      GROUP BY 1
      ORDER BY total_loss_thb DESC
    `);

    // 4. Department Breakdown
    const deptBreakdownRes = await client.query(`
      SELECT 
        COALESCE(d.department_name, 'Unknown') as department_name,
        COUNT(o.id) as count,
        COALESCE(SUM(o.estimated_annual_loss), 0) as total_loss_thb
      FROM improve_observations o
      LEFT JOIN departments d ON o.department_id = d.id
      GROUP BY 1
      ORDER BY total_loss_thb DESC
    `);

    // 5. Recent Findings
    const recentFindingsRes = await client.query(`
      SELECT 
        o.id,
        o.observation_no,
        o.description,
        o.severity,
        o.status,
        o.estimated_annual_loss,
        o.quality_risk,
        o.gmp_risk,
        o.created_at,
        d.department_name,
        l.line_name
      FROM improve_observations o
      LEFT JOIN departments d ON o.department_id = d.id
      LEFT JOIN improve_lines l ON o.line_id = l.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    await client.end();

    const obsStats = obsStatsRes.rows[0];
    const projStats = projStatsRes.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          openObservations: Number(obsStats.open_observations) || 0,
          criticalFindings: Number(obsStats.critical_findings) || 0,
          estimatedMonthlyLoss: Number(obsStats.total_monthly_loss) || 0,
          estimatedAnnualLoss: Number(obsStats.total_annual_loss) || 0,
          potentialSaving: Number(obsStats.total_potential_saving) || 0,
          inProgressProjects: Number(projStats.in_progress_projects) || 0,
          verifiedProjects: Number(projStats.verified_projects) || 0,
          financeValidatedSavingYtd: Number(projStats.validated_hard_saving_ytd) || 0,
          releasedCapacityHours: Number(projStats.total_released_capacity_hours) || 0
        },
        wasteBreakdown: wasteBreakdownRes.rows.map(r => ({
          name: r.waste_name,
          count: Number(r.count),
          loss: Number(r.total_loss_thb)
        })),
        departmentBreakdown: deptBreakdownRes.rows.map(r => ({
          name: r.department_name,
          count: Number(r.count),
          loss: Number(r.total_loss_thb)
        })),
        recentFindings: recentFindingsRes.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
