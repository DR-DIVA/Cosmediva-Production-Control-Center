require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fix() {
  const { data: processes } = await supabase.from('processes').select('*');
  const mixProc = processes.find(p => p.process_name === 'ผสม');
  
  if (!mixProc) return console.log('no mix proc');
  
  const { data: mixingTasks } = await supabase.from('production_logs')
    .select('id, tank_details')
    .eq('process_id', mixProc.id)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (mixingTasks.length > 0) {
    let task = mixingTasks[0];
    let details = task.tank_details;
    
    // Update tanks 1, 2, 3 to QC_PASS
    for (let t of [1, 2, 3]) {
      details[t] = 'QC_PASS';
      if (!details[`${t}_history`]) details[`${t}_history`] = [];
      details[`${t}_history`].push({
        user: 'QA Team',
        status: 'QC_PASS',
        timestamp: new Date().toISOString(),
        note: 'QC Passed (System Sync)'
      });
    }
    
    await supabase.from('production_logs').update({ tank_details: details }).eq('id', task.id);
    console.log('Fixed tank 1, 2, 3 to QC_PASS for task', task.id);
  } else {
    console.log('No tasks found');
  }
}

fix();
