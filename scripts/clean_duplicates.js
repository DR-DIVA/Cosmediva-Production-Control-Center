const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk2OTMxNiwiZXhwIjoyMDk5NTQ1MzE2fQ.gAyqPBCtL40XUI1n7pbGQKQyWAocj0iZ21AIgrlI3jU'
);

async function cleanDuplicates() {
  console.log('--- Scanning Production Logs for Overlapping Orphan Tasks ---');

  const { data: logs, error: logsErr } = await supabase
    .from('production_logs')
    .select(`
      id, production_lot_id, process_id, status, tank_start, tank_end, tank_details, start_time, end_time, activity_date, piece_quantity,
      production_lots(lot_no),
      processes(process_name)
    `)
    .order('created_at', { ascending: true });

  if (logsErr || !logs) {
    console.error('Error fetching logs:', logsErr);
    return;
  }

  console.log(`Total logs in system: ${logs.length}`);

  const grouped = new Map();
  logs.forEach(l => {
    const key = `${l.production_lot_id}_${l.process_id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(l);
  });

  const toDeleteIds = [];

  grouped.forEach((groupLogs, key) => {
    // Find active logs with actual work
    const activeLogs = groupLogs.filter(l => {
      const details = typeof l.tank_details === 'object' && l.tank_details !== null ? l.tank_details : {};
      const hasHistory = Object.keys(details).some(k => k.endsWith('_history') && Array.isArray(details[k]) && details[k].length > 0);
      const hasNonWaiting = Object.keys(details).some(k => !k.endsWith('_history') && (details[k] === 'DONE' || details[k] === 'IN_PROGRESS' || details[k] === 'SENT_TO_POF' || details[k]?.status === 'DONE' || details[k]?.status === 'IN_PROGRESS' || details[k]?.status === 'SENT_TO_POF'));
      const hasWorkStatus = l.status === 'DONE' || l.status === 'IN_PROGRESS' || l.status === 'COMPLETED';
      const hasTime = !!l.start_time || !!l.end_time;
      const hasQty = Number(l.piece_quantity) > 0;
      return hasHistory || hasNonWaiting || hasWorkStatus || hasTime || hasQty;
    });

    if (activeLogs.length > 0) {
      const activeCoveredTanks = new Set();
      activeLogs.forEach(al => {
        const s = parseInt(al.tank_start) || 1;
        const e = parseInt(al.tank_end) || s;
        for (let t = s; t <= Math.max(s, e); t++) {
          activeCoveredTanks.add(t);
        }
      });

      groupLogs.forEach(l => {
        if (activeLogs.some(al => al.id === l.id)) return; // Keep active

        const details = typeof l.tank_details === 'object' && l.tank_details !== null ? l.tank_details : {};
        const hasHistory = Object.keys(details).some(k => k.endsWith('_history') && Array.isArray(details[k]) && details[k].length > 0);
        const hasNonWaiting = Object.keys(details).some(k => !k.endsWith('_history') && (details[k] === 'DONE' || details[k] === 'IN_PROGRESS' || details[k] === 'SENT_TO_POF' || details[k]?.status === 'DONE' || details[k]?.status === 'IN_PROGRESS' || details[k]?.status === 'SENT_TO_POF'));

        if (!hasHistory && !hasNonWaiting && (l.status === 'WAITING' || l.status === 'PLANNED' || !l.status)) {
          const s = parseInt(l.tank_start) || 1;
          const e = parseInt(l.tank_end) || s;
          let isOverlapping = false;
          for (let t = s; t <= Math.max(s, e); t++) {
            if (activeCoveredTanks.has(t)) {
              isOverlapping = true;
              break;
            }
          }

          if (isOverlapping) {
            toDeleteIds.push(l.id);
            console.log(`[DELETE TARGET] Lot ${l.production_lots?.lot_no} | ${l.processes?.process_name} | Tanks ${s}-${e} | ID: ${l.id}`);
          }
        }
      });
    }
  });

  console.log(`\nTotal duplicate/overlapping empty tasks identified: ${toDeleteIds.length}`);

  if (toDeleteIds.length > 0) {
    const { error: delErr } = await supabase
      .from('production_logs')
      .delete()
      .in('id', toDeleteIds);

    if (delErr) {
      console.error('Delete error:', delErr);
    } else {
      console.log(`Successfully cleaned and deleted ${toDeleteIds.length} duplicate/overlapping orphaned tasks!`);
    }
  } else {
    console.log('No duplicate/overlapping tasks need cleaning.');
  }
}

cleanDuplicates();
