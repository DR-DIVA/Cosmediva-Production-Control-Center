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

    // 1. All loss calculations with joined observation & location details
    const lossDetailsRes = await client.query(`
      SELECT 
        lc.*,
        o.observation_no,
        o.activity_name,
        o.description as observation_description,
        o.severity,
        o.status as observation_status,
        d.department_name,
        d.department_code,
        l.line_name,
        l.line_code,
        s.station_name,
        s.station_code,
        hv.confirmed_primary_waste,
        hv.confirmed_root_cause,
        p.id as project_id,
        p.project_no,
        p.title as project_title,
        p.pdca_stage,
        p.finance_validated_hard_saving
      FROM improve_loss_calculations lc
      JOIN improve_observations o ON lc.observation_id = o.id
      LEFT JOIN departments d ON o.department_id = d.id
      LEFT JOIN improve_lines l ON o.line_id = l.id
      LEFT JOIN improve_stations s ON o.station_id = s.id
      LEFT JOIN improve_human_validations hv ON hv.observation_id = o.id
      LEFT JOIN improve_project_observations po ON po.observation_id = o.id
      LEFT JOIN improve_projects p ON po.project_id = p.id
      ORDER BY lc.annual_loss_thb DESC
    `);

    // 2. Cost Rates
    const ratesRes = await client.query(`
      SELECT * FROM improve_cost_rates ORDER BY rate_type ASC, amount_thb DESC
    `);

    await client.end();

    const rows = lossDetailsRes.rows;

    // Aggregate Multi-Loss Categories
    const multiLossSummary = {
      laborLoss: 0,
      machineDowntime: 0,
      scrapLoss: 0,
      reworkLoss: 0,
      opportunityLoss: 0,
      totalAnnualLoss: 0,
      totalMonthlyLoss: 0,
      totalLostHoursPerMonth: 0
    };

    rows.forEach(r => {
      const annual = Number(r.annual_loss_thb) || 0;
      const monthly = Number(r.monthly_loss_thb) || 0;
      const hours = Number(r.lost_hours_per_month) || 0;

      multiLossSummary.totalAnnualLoss += annual;
      multiLossSummary.totalMonthlyLoss += monthly;
      multiLossSummary.totalLostHoursPerMonth += hours;

      if (r.loss_type === 'LABOR_LOSS') multiLossSummary.laborLoss += annual;
      else if (r.loss_type === 'DOWNTIME') multiLossSummary.machineDowntime += annual;
      else if (r.loss_type === 'SCRAP') multiLossSummary.scrapLoss += annual;
      else if (r.loss_type === 'REWORK') multiLossSummary.reworkLoss += annual;
      else multiLossSummary.opportunityLoss += annual;
    });

    // Build Drill-Down Tree Structure: Factory -> Dept -> Line -> Waste Type -> Items
    const deptMap: Record<string, any> = {};

    rows.forEach(r => {
      const deptKey = r.department_name || 'แผนกอื่นๆ (Unassigned)';
      const lineKey = r.line_name || 'ทั่วไป (General)';
      const wasteKey = r.confirmed_primary_waste || r.loss_type || 'ความสูญเปล่าทั่วไป';

      if (!deptMap[deptKey]) {
        deptMap[deptKey] = {
          name: deptKey,
          totalAnnualLoss: 0,
          totalMonthlyLoss: 0,
          lines: {}
        };
      }

      deptMap[deptKey].totalAnnualLoss += Number(r.annual_loss_thb) || 0;
      deptMap[deptKey].totalMonthlyLoss += Number(r.monthly_loss_thb) || 0;

      if (!deptMap[deptKey].lines[lineKey]) {
        deptMap[deptKey].lines[lineKey] = {
          name: lineKey,
          totalAnnualLoss: 0,
          wastes: {}
        };
      }

      deptMap[deptKey].lines[lineKey].totalAnnualLoss += Number(r.annual_loss_thb) || 0;

      if (!deptMap[deptKey].lines[lineKey].wastes[wasteKey]) {
        deptMap[deptKey].lines[lineKey].wastes[wasteKey] = {
          wasteType: wasteKey,
          totalAnnualLoss: 0,
          items: []
        };
      }

      deptMap[deptKey].lines[lineKey].wastes[wasteKey].totalAnnualLoss += Number(r.annual_loss_thb) || 0;
      deptMap[deptKey].lines[lineKey].wastes[wasteKey].items.push(r);
    });

    return NextResponse.json({
      success: true,
      summary: multiLossSummary,
      tree: deptMap,
      rawItems: rows,
      rates: ratesRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching cost loss data:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
