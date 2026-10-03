const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  console.log('--- Applying Database Migration: Hard Closure Gate Trigger ---');
  await pgClient.connect();

  const sql = `
    CREATE OR REPLACE FUNCTION qms_trg_enforce_capa_closed_effective_gates()
    RETURNS TRIGGER AS $$
    DECLARE
      v_unverified_actions INT;
      v_total_actions INT;
      v_plan_decision VARCHAR;
      v_failed_results INT;
      v_evaluated_results INT;
      v_target_scope INT;
      v_confirmed_recurrences INT;
    BEGIN
      IF NEW.current_status = 'CLOSED_EFFECTIVE' AND (OLD.current_status IS DISTINCT FROM 'CLOSED_EFFECTIVE') THEN
        -- Gate 1: Phase 3 Actions
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status != 'VERIFIED')
        INTO v_total_actions, v_unverified_actions
        FROM qms_capa_actions
        WHERE capa_id = NEW.id;

        IF v_total_actions = 0 OR v_unverified_actions > 0 THEN
          RAISE EXCEPTION 'Hard Closure Gate Violation: All required Phase 3 actions must be VERIFIED (Found % unverified of %)', v_unverified_actions, v_total_actions;
        END IF;

        -- Gate 2 & 3: Effectiveness Plan and Results
        SELECT final_decision, scope_target_count
        INTO v_plan_decision, v_target_scope
        FROM qms_capa_effectiveness_plans
        WHERE capa_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_plan_decision IS DISTINCT FROM 'EFFECTIVE' THEN
          RAISE EXCEPTION 'Hard Closure Gate Violation: Effectiveness plan must have final_decision = EFFECTIVE (Found %)', v_plan_decision;
        END IF;

        -- Results failure check
        SELECT COUNT(*) FILTER (WHERE evaluation_status = 'FAIL'), COUNT(*) FILTER (WHERE evaluation_status != 'PENDING')
        INTO v_failed_results, v_evaluated_results
        FROM qms_capa_effectiveness_results
        WHERE capa_id = NEW.id;

        IF v_failed_results > 0 THEN
          RAISE EXCEPTION 'Hard Closure Gate Violation: Cannot close CAPA as CLOSED_EFFECTIVE with % failed monitoring results', v_failed_results;
        END IF;

        IF v_evaluated_results < COALESCE(v_target_scope, 1) THEN
          RAISE EXCEPTION 'Hard Closure Gate Violation: Monitoring scope incomplete (% of % evaluated)', v_evaluated_results, v_target_scope;
        END IF;

        -- Gate 4: Recurrence check
        SELECT COUNT(*)
        INTO v_confirmed_recurrences
        FROM qms_capa_recurrence_reviews
        WHERE capa_id = NEW.id AND review_status = 'CONFIRMED_RECURRENCE';

        IF v_confirmed_recurrences > 0 THEN
          RAISE EXCEPTION 'Hard Closure Gate Violation: Confirmed recurrence exists (% records). Cannot close as CLOSED_EFFECTIVE', v_confirmed_recurrences;
        END IF;

        -- Gate 6: Closure conclusion
        IF NEW.closure_conclusion IS NULL OR length(trim(NEW.closure_conclusion)) < 15 THEN
          RAISE EXCEPTION 'Hard Closure Gate Violation: Closure conclusion required (minimum 15 characters)';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_enforce_capa_closed_effective_gates ON qms_capas;
    CREATE TRIGGER trg_enforce_capa_closed_effective_gates
    BEFORE UPDATE ON qms_capas
    FOR EACH ROW
    EXECUTE FUNCTION qms_trg_enforce_capa_closed_effective_gates();
  `;

  await pgClient.query(sql);
  console.log('✅ Trigger trg_enforce_capa_closed_effective_gates installed successfully!');

  await pgClient.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
