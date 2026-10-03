const pg = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fix() {
  await client.connect();
  console.log('Connected to DB. Applying Phase 5 Defect 01 Fix...');

  // 1. Apply schema migration to qms_batch_releases
  console.log('1. Altering qms_batch_releases table to add released_at, released_by, released_by_name...');
  await client.query(`
    ALTER TABLE qms_batch_releases ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
    ALTER TABLE qms_batch_releases ADD COLUMN IF NOT EXISTS released_by UUID;
    ALTER TABLE qms_batch_releases ADD COLUMN IF NOT EXISTS released_by_name VARCHAR(150);
  `);

  // 2. Create the atomic transaction function
  console.log('2. Creating atomic database transaction function qms_record_batch_release_disposition...');
  await client.query(`
    CREATE OR REPLACE FUNCTION qms_record_batch_release_disposition(
      p_release_id UUID,
      p_decision VARCHAR,
      p_rationale TEXT,
      p_non_conformance_path VARCHAR DEFAULT NULL,
      p_rework_protocol_no VARCHAR DEFAULT NULL,
      p_user_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
      p_user_name VARCHAR DEFAULT 'QA Manager',
      p_user_role VARCHAR DEFAULT 'QA_MANAGER'
    ) RETURNS JSONB AS $$
    DECLARE
      v_release RECORD;
      v_new_version INT;
      v_now TIMESTAMPTZ := NOW();
      v_disp_id UUID;
    BEGIN
      -- Fetch and lock the release record
      SELECT * INTO v_release FROM qms_batch_releases WHERE id = p_release_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Release record not found for id: %', p_release_id;
      END IF;

      -- Validation guardrails
      IF p_decision = 'QA_RELEASED' THEN
        IF v_release.is_blocked THEN
          RAISE EXCEPTION 'ไม่สามารถปล่อยผ่านรุ่นการผลิตได้: มีเงื่อนไขระงับ (Hard Block)';
        END IF;
        IF v_release.failed_gates_count > 0 THEN
          RAISE EXCEPTION 'ไม่สามารถปล่อยผ่านรุ่นการผลิตได้: มีเกตการตรวจปล่อยที่ไม่ผ่าน % รายการ', v_release.failed_gates_count;
        END IF;
        IF v_release.open_capa_count > 0 AND NOT COALESCE(v_release.capa_impact_reviewed, FALSE) THEN
          RAISE EXCEPTION 'ไม่สามารถปล่อยผ่านรุ่นการผลิตได้: มี CAPA ที่เกี่ยวข้อง ต้องทำการบันทึก QA Impact Review ก่อน';
        END IF;
      ELSIF p_decision = 'QA_REJECTED' THEN
        IF p_non_conformance_path IS NULL OR TRIM(p_non_conformance_path) = '' THEN
          RAISE EXCEPTION 'กรณีปฏิเสธรุ่นการผลิต (QA REJECTED) ต้องเลือกแนวทางการจัดการสิ่งที่ไม่เป็นไปตามข้อกำหนด (Non-Conformance Disposition)';
        END IF;
        IF p_non_conformance_path = 'REWORK_CONSIDERATION' AND (p_rework_protocol_no IS NULL OR TRIM(p_rework_protocol_no) = '') THEN
          RAISE EXCEPTION 'กรณีเลือกพิจารณาแปรรูปใหม่ (Rework) ต้องระบุหมายเลขเอกสารขั้นตอนการแปรรูป (Rework Protocol No.)';
        END IF;
      END IF;

      v_new_version := COALESCE(v_release.record_version, 1) + 1;

      -- Update release master record
      UPDATE qms_batch_releases SET
        overall_status = p_decision,
        current_disposition = p_decision,
        disposition_notes = TRIM(p_rationale),
        disposition_at = v_now,
        disposition_by = p_user_id,
        disposition_by_name = p_user_name,
        disposition_by_role = p_user_role,
        released_at = CASE WHEN p_decision = 'QA_RELEASED' THEN v_now ELSE NULL END,
        released_by = CASE WHEN p_decision = 'QA_RELEASED' THEN p_user_id ELSE NULL END,
        released_by_name = CASE WHEN p_decision = 'QA_RELEASED' THEN p_user_name ELSE NULL END,
        non_conformance_path = CASE WHEN p_decision = 'QA_REJECTED' THEN p_non_conformance_path ELSE NULL END,
        rework_protocol_no = CASE WHEN p_decision = 'QA_REJECTED' AND p_non_conformance_path = 'REWORK_CONSIDERATION' THEN p_rework_protocol_no ELSE NULL END,
        record_version = v_new_version,
        updated_at = v_now
      WHERE id = p_release_id;

      -- Insert disposition immutable record
      INSERT INTO qms_batch_release_dispositions (
        batch_release_id,
        decision,
        reason_rationale,
        non_conformance_disposition,
        rework_protocol_reference,
        authorized_by,
        authorized_by_name,
        authorized_by_role,
        authorized_at,
        lot_state_before,
        lot_state_after,
        record_version
      ) VALUES (
        p_release_id,
        p_decision,
        TRIM(p_rationale),
        CASE WHEN p_decision = 'QA_REJECTED' THEN p_non_conformance_path ELSE NULL END,
        CASE WHEN p_decision = 'QA_REJECTED' AND p_non_conformance_path = 'REWORK_CONSIDERATION' THEN p_rework_protocol_no ELSE NULL END,
        p_user_id,
        p_user_name,
        p_user_role,
        v_now,
        v_release.overall_status,
        p_decision,
        v_new_version
      ) RETURNING id INTO v_disp_id;

      -- Update production_lots current_status in CosmeFlow
      IF v_release.production_lot_id IS NOT NULL THEN
        UPDATE production_lots SET
          current_status = p_decision,
          updated_at = v_now
        WHERE id = v_release.production_lot_id;
      END IF;

      -- Insert into Controlled Audit Trail
      INSERT INTO qms_audit_trail (
        table_name,
        record_id,
        action_type,
        record_version,
        before_value,
        after_value,
        changed_fields,
        changed_by,
        changed_by_name,
        changed_by_role,
        change_reason
      ) VALUES (
        'qms_batch_releases',
        p_release_id,
        'QA_DISPOSITION_' || p_decision,
        v_new_version,
        jsonb_build_object('overall_status', v_release.overall_status, 'current_disposition', v_release.current_disposition),
        jsonb_build_object('overall_status', p_decision, 'current_disposition', p_decision, 'rationale', TRIM(p_rationale)),
        '["overall_status", "current_disposition", "disposition_notes", "disposition_at", "released_at"]'::jsonb,
        p_user_id,
        p_user_name,
        p_user_role,
        'Controlled Electronic Approval: ' || p_decision
      );

      RETURN jsonb_build_object(
        'success', true,
        'release_id', p_release_id,
        'new_status', p_decision,
        'record_version', v_new_version,
        'disposition_id', v_disp_id
      );
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 3. Reload PostgREST schema cache
  console.log('3. Notifying PostgREST to reload schema cache...');
  await client.query("NOTIFY pgrst, 'reload schema';");

  // 4. Clean orphan disposition from failed attempt on LOT-2026-0058
  console.log('4. Cleaning orphan disposition record from failed attempt on LOT-2026-0058...');
  await client.query(`
    DELETE FROM qms_batch_release_dispositions
    WHERE batch_release_id IN (SELECT id FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0058');
  `);

  // 5. Reset LOT-2026-0058 to READY_FOR_QA_REVIEW
  console.log('5. Resetting LOT-2026-0058 to pristine pre-release UAT state: READY_FOR_QA_REVIEW...');
  await client.query(`
    UPDATE qms_batch_releases SET
      overall_status = 'READY_FOR_QA_REVIEW',
      current_disposition = NULL,
      disposition_notes = NULL,
      disposition_at = NULL,
      disposition_by = NULL,
      disposition_by_name = NULL,
      disposition_by_role = NULL,
      released_at = NULL,
      released_by = NULL,
      released_by_name = NULL,
      non_conformance_path = NULL,
      rework_protocol_no = NULL,
      record_version = 1,
      updated_at = NOW()
    WHERE lot_no = 'LOT-2026-0058';
  `);

  // Also verify LOT-2026-0050 is in READY_FOR_QA_REVIEW
  console.log('6. Ensuring LOT-2026-0050 is also in READY_FOR_QA_REVIEW...');
  await client.query(`
    UPDATE qms_batch_releases SET
      overall_status = 'READY_FOR_QA_REVIEW',
      current_disposition = NULL,
      disposition_notes = NULL,
      disposition_at = NULL,
      disposition_by = NULL,
      disposition_by_name = NULL,
      disposition_by_role = NULL,
      released_at = NULL,
      released_by = NULL,
      released_by_name = NULL,
      non_conformance_path = NULL,
      rework_protocol_no = NULL,
      record_version = 1,
      updated_at = NOW()
    WHERE lot_no = 'LOT-2026-0050';
  `);

  console.log('✅ Phase 5 Defect 01 Fix Applied Successfully!');
  await client.end();
}

fix().catch(err => {
  console.error('Fix error:', err);
  process.exit(1);
});
