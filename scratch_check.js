require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data: procs } = await supabase.from('processes').select('*');
  console.log(procs);
  
  const { data, error } = await supabase.from('production_logs')
    .select('id, tank_details, process_id')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Logs:');
  console.log(JSON.stringify(data, null, 2));
}

check();
