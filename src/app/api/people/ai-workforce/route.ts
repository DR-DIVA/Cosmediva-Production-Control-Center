import { NextRequest, NextResponse } from 'next/server';
import { queryPeople } from '@/lib/peopleDb';

export async function GET(req: NextRequest) {
  try {
    const agentsRes = await queryPeople(`
      SELECT * FROM ai_agents ORDER BY agent_code ASC;
    `);

    const permRes = await queryPeople(`
      SELECT * FROM ai_agent_permissions WHERE active = TRUE;
    `);

    const jobsRes = await queryPeople(`
      SELECT * FROM ai_jobs;
    `);

    const eventsRes = await queryPeople(`
      SELECT * FROM domain_events ORDER BY occurred_at DESC LIMIT 10;
    `);

    // Attach permissions and jobs to each agent
    const enrichedAgents = agentsRes.rows.map(agent => ({
      ...agent,
      permissions: permRes.rows.filter(p => p.agent_id === agent.id),
      jobs: jobsRes.rows.filter(j => j.agent_id === agent.id)
    }));

    return NextResponse.json({
      success: true,
      data: {
        agents: enrichedAgents || [],
        recentEvents: eventsRes.rows || [],
        status: 'AI_WORKFORCE_READY',
        execution_phase: 'PHASE_8_PLANNED'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
