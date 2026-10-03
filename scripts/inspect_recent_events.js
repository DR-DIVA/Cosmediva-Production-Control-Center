const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  const { data: events } = await supabase
    .from('qms_quality_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent 5 events:');
  events.forEach(e => {
    console.log(`[${e.event_no}] ${e.title} - reporter: ${e.reporter_name} - snapshot:`, JSON.stringify(e.snapshot_context));
  });
}

main();
