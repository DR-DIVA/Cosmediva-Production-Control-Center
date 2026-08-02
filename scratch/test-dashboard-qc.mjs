import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: qaqc, error } = await supabase.from('production_logs')
    .select('id, status, updated_at, activity_date, processes(process_name), tank_details');

  if (error || !qaqc) {
      console.error(error);
      return;
  }

  const qcLogs = qaqc.filter(l => l.processes?.process_name === 'รอ QC');

  const dashboardDate = '2026-08-01';
  let qcCount = 0;

  qcLogs.forEach(log => {
      let passedToday = false;
      const details = log.tank_details || {};
      Object.keys(details).forEach(key => {
          if (key.endsWith('_history')) {
              const histories = details[key];
              if (Array.isArray(histories)) {
                  histories.forEach(h => {
                      if (h.status === 'QC_PASS') {
                          const d = new Date(h.timestamp).getTime();
                          const start = new Date(dashboardDate).setHours(0,0,0,0);
                          const end = new Date(dashboardDate).setHours(23,59,59,999);
                          if (d >= start && d <= end) {
                              passedToday = true;
                              console.log(`PASS TIME: ${h.timestamp} for ID: ${log.id}, updated_at: ${log.updated_at}`);
                          }
                      }
                  });
              }
          }
      });
      if (passedToday) {
          qcCount++;
      }
  });
}

main().catch(console.error);
