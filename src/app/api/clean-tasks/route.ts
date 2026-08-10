import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const results: string[] = [];

  try {
    // 1. Update created_by for old records to PLPTB1234
    const { data: users, error: userErr } = await supabase.from('profiles').select('id, full_name').eq('employee_id', 'PLPTB1234');
    if (userErr || !users || users.length === 0) {
      results.push('Error finding user PLPTB1234 in profiles: ' + (userErr?.message || 'Not found'));
    } else {
      const plannerId = users[0].id;
      // Update logs where created_by is null
      const { data: updateData, error: updateErr } = await supabase.from('production_logs').update({ created_by: plannerId }).is('created_by', null).select();
      if (updateErr) {
        results.push('Error updating historical created_by: ' + updateErr.message);
      } else {
        results.push('Updated ' + (updateData?.length || 0) + ' historical logs to user ' + users[0].full_name);
      }
    }

    // 2. Find Lot 004/26
    const { data: lot, error: lotErr } = await supabase.from('production_lots').select('id').eq('lot_no', '004/26').single();
    if (lotErr || !lot) {
      results.push('Error finding Lot 004/26');
      return NextResponse.json({ results });
    }
    const lotId = lot.id;

    // 3. Find processes
    const { data: processes } = await supabase.from('processes').select('id, process_name');
    // Using hex codes to avoid encoding issues just in case
    const packingProc = processes?.find(p => p.process_name === '\u0E1A\u0E23\u0E23\u0E08\u0E38');
    const mixingProc = processes?.find(p => p.process_name === '\u0E1C\u0E2A\u0E21');

    // 4. Delete packing tasks on 25/7/2569 (2026-07-25)
    if (packingProc) {
      const { data: delPacking, error: delPackingErr } = await supabase.from('production_logs')
        .delete()
        .eq('production_lot_id', lotId)
        .eq('process_id', packingProc.id)
        .eq('activity_date', '2026-07-25')
        .select();
      if (delPackingErr) results.push('Error deleting packing tasks: ' + delPackingErr.message);
      else results.push('Deleted ' + (delPacking?.length || 0) + ' packing tasks on 2026-07-25');
    }

    // 5. Delete mixing tasks NOT on 31/7/2569 (2026-07-31)
    if (mixingProc) {
      const { data: mixLogs } = await supabase.from('production_logs')
        .select('id, activity_date')
        .eq('production_lot_id', lotId)
        .eq('process_id', mixingProc.id);
        
      if (mixLogs) {
        const toDeleteIds = mixLogs.filter(l => l.activity_date !== '2026-07-31').map(l => l.id);
        if (toDeleteIds.length > 0) {
          const { error: delMixErr } = await supabase.from('production_logs').delete().in('id', toDeleteIds);
          if (delMixErr) results.push('Error deleting mixing tasks: ' + delMixErr.message);
          else results.push('Deleted ' + toDeleteIds.length + ' mixing tasks NOT on 2026-07-31');
        } else {
          results.push('No mixing tasks found that are NOT on 2026-07-31');
        }
      }
    }

  } catch (err: any) {
    results.push('Exception: ' + err.message);
  }

  return NextResponse.json({ results });
}
