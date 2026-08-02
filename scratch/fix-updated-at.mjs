import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const { data: logs, error } = await supabase.from('production_logs')
    .select('id, updated_at, tank_details, processes!inner(process_name)')
    .eq('processes.process_name', 'รอ QC');

  if (error || !logs) {
      console.error(error);
      return;
  }

  let fixed = 0;
  for (const log of logs) {
      const details = log.tank_details || {};
      let maxTimestamp = new Date(log.updated_at).getTime();
      let shouldUpdate = false;

      Object.keys(details).forEach(key => {
          if (key.endsWith('_history')) {
              const histories = details[key];
              if (Array.isArray(histories)) {
                  histories.forEach(h => {
                      if (h.timestamp) {
                          const t = new Date(h.timestamp).getTime();
                          if (t > maxTimestamp) {
                              maxTimestamp = t;
                              shouldUpdate = true;
                          }
                      }
                  });
              }
          }
      });

      if (shouldUpdate) {
          const newDateStr = new Date(maxTimestamp).toISOString();
          console.log(`Fixing ${log.id}: ${log.updated_at} -> ${newDateStr}`);
          await supabase.from('production_logs').update({ updated_at: newDateStr }).eq('id', log.id);
          fixed++;
      }
  }
  console.log(`Fixed ${fixed} logs`);
}

fix().catch(console.error);
