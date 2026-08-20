const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function syncAndCleanToPlanner() {
  console.log('--- Aligning all Packing tasks to Planner & Cleaning Duplicates ---');

  const { data: processes } = await supabase.from('processes').select('id, process_name');
  const packingProc = processes.find(p => p.process_name === 'บรรจุ');
  if (!packingProc) {
    console.error('Packing process not found');
    return;
  }

  // Fetch all lots
  const { data: lots } = await supabase.from('production_lots')
    .select('id, lot_no, total_tanks, products(sku, product_name)');

  for (const lot of lots) {
    const { data: packingLogs } = await supabase.from('production_logs')
      .select('*')
      .eq('production_lot_id', lot.id)
      .eq('process_id', packingProc.id)
      .order('created_at', { ascending: true });

    if (!packingLogs || packingLogs.length <= 1) continue;

    console.log(`\nProcessing Lot ${lot.lot_no} (${lot.products?.sku}) - ${packingLogs.length} packing logs`);

    // Detect duplicate/overlapping logs for this lot
    // 1. Check Lot 007/26 (JHD-318)
    if (lot.lot_no === '007/26' && lot.products?.sku === 'JHD-318') {
      // Planner canonical tasks are 4-tank slots: 1-4, 5-8, ..., 45-48, 49-52
      // Duplicate auto-handoff logs to merge and delete are 41-45 and 46-52
      const autoLogs = packingLogs.filter(l => (l.tank_start === 41 && l.tank_end === 45) || (l.tank_start === 46 && l.tank_end === 52));
      const plannerLogs = packingLogs.filter(l => !autoLogs.some(al => al.id === l.id));

      for (const autoLog of autoLogs) {
        console.log(`Merging progress from auto log ${autoLog.tank_start}-${autoLog.tank_end} into Planner tasks...`);
        const autoDetails = autoLog.tank_details || {};
        
        for (const pLog of plannerLogs) {
          const s = parseInt(pLog.tank_start);
          const e = parseInt(pLog.tank_end);
          let modified = false;
          const pDetails = { ...(pLog.tank_details || {}) };

          for (let t = s; t <= e; t++) {
            if (autoDetails[t]) {
              pDetails[t] = autoDetails[t];
              if (autoDetails[`${t}_history`]) {
                pDetails[`${t}_history`] = autoDetails[`${t}_history`];
              }
              modified = true;
            }
          }

          if (modified) {
            const hasSent = Object.keys(pDetails).some(k => !k.endsWith('_history') && (pDetails[k] === 'SENT_TO_POF' || pDetails[k]?.status === 'SENT_TO_POF'));
            const status = hasSent ? 'DONE' : 'IN_PROGRESS';
            await supabase.from('production_logs').update({ tank_details: pDetails, status }).eq('id', pLog.id);
            console.log(`Updated Planner task ${pLog.tank_start}-${pLog.tank_end} with merged status: ${status}`);
          }
        }

        // Delete the autoLog
        await supabase.from('production_logs').delete().eq('id', autoLog.id);
        console.log(`Deleted duplicate auto log ${autoLog.id} (${autoLog.tank_start}-${autoLog.tank_end})`);
      }
    }

    // 2. Check Lot 008/26 (JHD-318)
    if (lot.lot_no === '008/26' && lot.products?.sku === 'JHD-318') {
      // Planner canonical tasks are 4-tank slots: 1-4, 5-8, 9-12, 13-16, 17-20, 21-24, 25-28, 29-32, 33-36, 37-40, 41-44, 45-48, 49-52
      // Duplicate auto-handoff logs are 1-5, 6-10, 11-15
      const autoLogs = packingLogs.filter(l => (l.tank_start === 1 && l.tank_end === 5) || (l.tank_start === 6 && l.tank_end === 10) || (l.tank_start === 11 && l.tank_end === 15));
      const plannerLogs = packingLogs.filter(l => !autoLogs.some(al => al.id === l.id));

      for (const autoLog of autoLogs) {
        console.log(`Merging progress from auto log ${autoLog.tank_start}-${autoLog.tank_end} into Planner tasks...`);
        const autoDetails = autoLog.tank_details || {};

        for (const pLog of plannerLogs) {
          const s = parseInt(pLog.tank_start);
          const e = parseInt(pLog.tank_end);
          let modified = false;
          const pDetails = { ...(pLog.tank_details || {}) };

          for (let t = s; t <= e; t++) {
            if (autoDetails[t]) {
              pDetails[t] = autoDetails[t];
              if (autoDetails[`${t}_history`]) {
                pDetails[`${t}_history`] = autoDetails[`${t}_history`];
              }
              modified = true;
            }
          }

          if (modified) {
            const hasSent = Object.keys(pDetails).some(k => !k.endsWith('_history') && (pDetails[k] === 'SENT_TO_POF' || pDetails[k]?.status === 'SENT_TO_POF'));
            const status = hasSent ? 'DONE' : 'IN_PROGRESS';
            await supabase.from('production_logs').update({ tank_details: pDetails, status }).eq('id', pLog.id);
            console.log(`Updated Planner task ${pLog.tank_start}-${pLog.tank_end} with merged status: ${status}`);
          }
        }

        // Delete the autoLog
        await supabase.from('production_logs').delete().eq('id', autoLog.id);
        console.log(`Deleted duplicate auto log ${autoLog.id} (${autoLog.tank_start}-${autoLog.tank_end})`);
      }
    }
  }

  console.log('\n--- All tasks aligned with Planner successfully! ---');
}

syncAndCleanToPlanner();
