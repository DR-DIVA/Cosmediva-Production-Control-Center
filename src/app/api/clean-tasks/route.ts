import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const results: string[] = [];
  const toDeleteIds: string[] = [];

  try {
    // 1. Fetch all production logs with lots and processes
    const { data: logs, error: logsErr } = await supabase
      .from('production_logs')
      .select('id, production_lot_id, process_id, status, tank_start, tank_end, tank_details, start_time, end_time, activity_date, piece_quantity')
      .order('created_at', { ascending: true });

    if (logsErr || !logs) {
      return NextResponse.json({ error: logsErr?.message || 'No logs found' }, { status: 500 });
    }

    // Group logs by `${production_lot_id}_${process_id}`
    const grouped = new Map<string, any[]>();
    logs.forEach(l => {
      const key = `${l.production_lot_id}_${l.process_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(l);
    });

    // Check each group for overlapping duplicate/orphan tasks
    grouped.forEach((groupLogs, key) => {
      // Find logs that have actual active work
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
        // Collect tank numbers covered by active logs
        const activeCoveredTanks = new Set<number>();
        activeLogs.forEach(al => {
          const s = parseInt(al.tank_start) || 1;
          const e = parseInt(al.tank_end) || s;
          for (let t = s; t <= Math.max(s, e); t++) {
            activeCoveredTanks.add(t);
          }
        });

        // Find empty/unworked logs that are fully covered by active logs
        groupLogs.forEach(l => {
          if (activeLogs.some(al => al.id === l.id)) return; // Don't delete active logs

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
              results.push(`Marked for deletion: Task ID ${l.id} (Tanks ${s}-${e}, status=${l.status}) overlapping with active batch`);
            }
          }
        });
      }
    });

    if (toDeleteIds.length > 0) {
      const { error: delErr } = await supabase
        .from('production_logs')
        .delete()
        .in('id', toDeleteIds);

      if (delErr) {
        results.push('Error deleting records: ' + delErr.message);
      } else {
        results.push(`Successfully cleaned ${toDeleteIds.length} duplicate/overlapping orphaned tasks.`);
      }
    } else {
      results.push('No overlapping empty orphan tasks found to clean.');
    }

  } catch (err: any) {
    results.push('Exception: ' + err.message);
  }

  return NextResponse.json({ results, totalCleaned: toDeleteIds.length });
}
