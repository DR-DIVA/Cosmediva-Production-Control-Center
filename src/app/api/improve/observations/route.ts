import { NextResponse } from 'next/server';
import pg from 'pg';
import { analyzeWithGembaAI } from '@/lib/improve/ai-orchestrator';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

function getClient() {
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

export async function GET(request: Request) {
  const client = getClient();
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    await client.connect();

    let query = `
      SELECT 
        o.*,
        d.department_name,
        d.department_code,
        l.line_name,
        l.line_code,
        s.station_name,
        s.station_code,
        json_agg(DISTINCT m.*) FILTER (WHERE m.id IS NOT NULL) as media_list,
        json_agg(DISTINCT ai.*) FILTER (WHERE ai.id IS NOT NULL) as ai_list,
        (SELECT row_to_json(hv.*) FROM improve_human_validations hv WHERE hv.observation_id = o.id ORDER BY hv.confirmed_at DESC LIMIT 1) as validation,
        (SELECT row_to_json(lc.*) FROM improve_loss_calculations lc WHERE lc.observation_id = o.id ORDER BY lc.created_at DESC LIMIT 1) as loss_calc
      FROM improve_observations o
      LEFT JOIN departments d ON o.department_id = d.id
      LEFT JOIN improve_lines l ON o.line_id = l.id
      LEFT JOIN improve_stations s ON o.station_id = s.id
      LEFT JOIN improve_observation_media m ON m.observation_id = o.id
      LEFT JOIN improve_ai_analysis ai ON ai.observation_id = o.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (departmentId) {
      params.push(departmentId);
      query += ` AND o.department_id = $${params.length}`;
    }
    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }
    if (severity && severity !== 'ALL') {
      params.push(severity);
      query += ` AND o.severity = $${params.length}`;
    }

    query += ` GROUP BY o.id, d.id, l.id, s.id ORDER BY o.created_at DESC`;

    const res = await client.query(query, params);
    await client.end();

    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    console.error('Error fetching observations:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = getClient();
  try {
    const body = await request.json();
    const {
      description,
      department_id,
      line_id,
      station_id,
      sku,
      product_name,
      lot_no,
      work_order,
      shift = 'Day Shift',
      activity_name,
      severity = 'MEDIUM',
      observer_name = 'Gemba Observer',
      media = [],
      trigger_ai = true
    } = body;

    if (!description || description.trim() === '') {
      return NextResponse.json({ success: false, error: 'Observation description is required' }, { status: 400 });
    }

    await client.connect();

    // Generate Observation No: OBS-YYYY-XXXX
    const year = new Date().getFullYear();
    const countRes = await client.query(`SELECT COUNT(*) FROM improve_observations WHERE observation_no LIKE $1`, [`OBS-${year}-%`]);
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0');
    const observation_no = `OBS-${year}-${nextSeq}`;

    // Insert Observation
    const insertRes = await client.query(`
      INSERT INTO improve_observations (
        observation_no,
        shift,
        department_id,
        line_id,
        station_id,
        sku,
        product_name,
        lot_no,
        work_order,
        activity_name,
        description,
        severity,
        status,
        observer_name,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'CAPTURED', $13, NOW())
      RETURNING *
    `, [
      observation_no,
      shift,
      department_id || null,
      line_id || null,
      station_id || null,
      sku || null,
      product_name || null,
      lot_no || null,
      work_order || null,
      activity_name || null,
      description,
      severity,
      observer_name
    ]);

    const newObs = insertRes.rows[0];

    // Insert Media if any
    if (media && media.length > 0) {
      for (const m of media) {
        await client.query(`
          INSERT INTO improve_observation_media (
            observation_id, media_type, file_url, file_name, file_size, mime_type, transcription
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          newObs.id,
          m.media_type || 'PHOTO',
          m.file_url,
          m.file_name || 'attachment',
          m.file_size || 0,
          m.mime_type || '',
          m.transcription || null
        ]);
      }
    }

    // Trigger AI Analysis if requested
    if (trigger_ai) {
      // Get department and line names for context
      let deptName = 'Packing';
      if (department_id) {
        const dRes = await client.query('SELECT department_name FROM departments WHERE id = $1', [department_id]);
        if (dRes.rows.length > 0) deptName = dRes.rows[0].department_name;
      }

      const aiResult = await analyzeWithGembaAI({
        description,
        departmentName: deptName,
        sku,
        activityName: activity_name
      });

      await client.query(`
        INSERT INTO improve_ai_analysis (
          observation_id,
          agent_type,
          model_name,
          prompt_version,
          finding_title,
          observed_condition,
          primary_waste,
          secondary_waste,
          potential_root_cause,
          quality_risk_assessment,
          gmp_risk_assessment,
          safety_risk_assessment,
          skill_gap_analysis,
          standard_work_gap_analysis,
          recommended_next_step,
          suggested_owner_dept,
          potential_cost_driver,
          gate_status,
          confidence_score,
          raw_output
        ) VALUES (
          $1, 'GEMBA_AI', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
      `, [
        newObs.id,
        aiResult.modelName,
        aiResult.promptVersion,
        aiResult.findingTitle,
        aiResult.observedCondition,
        aiResult.primaryWaste,
        aiResult.secondaryWaste,
        aiResult.potentialRootCause,
        aiResult.qualityRiskAssessment,
        aiResult.gmpRiskAssessment,
        aiResult.safetyRiskAssessment,
        aiResult.skillGapAnalysis,
        aiResult.standardWorkGapAnalysis,
        aiResult.recommendedNextStep,
        aiResult.suggestedOwnerDept,
        aiResult.potentialCostDriver,
        aiResult.gateStatus,
        aiResult.confidenceScore,
        JSON.stringify(aiResult)
      ]);

      // Update Observation status to AI_ANALYZED with risk flags
      await client.query(`
        UPDATE improve_observations 
        SET status = 'AI_ANALYZED',
            quality_risk = $1,
            gmp_risk = $2,
            safety_risk = $3,
            skill_gap = $4,
            standard_gap = $5
        WHERE id = $6
      `, [
        aiResult.qualityRisk,
        aiResult.gmpRisk,
        aiResult.safetyRisk,
        aiResult.skillGap,
        aiResult.standardWorkGap,
        newObs.id
      ]);
    }

    // Write Audit Log
    await client.query(`
      INSERT INTO improve_audit_logs (entity_type, entity_id, action, performed_by, new_value, reason)
      VALUES ('OBSERVATION', $1, 'CREATE', $2, $3, 'Gemba walk observation captured')
    `, [newObs.id, observer_name, JSON.stringify(newObs)]);

    await client.end();

    return NextResponse.json({ success: true, data: newObs });
  } catch (error: any) {
    console.error('Error creating observation:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
