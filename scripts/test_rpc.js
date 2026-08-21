const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk2OTMxNiwiZXhwIjoyMDk5NTQ1MzE2fQ.gAyqPBCtL40XUI1n7pbGQKQyWAocj0iZ21AIgrlI3jU'
);

async function testRpc() {
  const rpcs = ['exec_sql', 'execute_sql', 'sql', 'run_sql', 'exec'];
  for (const r of rpcs) {
    const { data, error } = await supabase.rpc(r, { query: 'SELECT 1;' });
    console.log(`RPC '${r}':`, error ? error.message : data);
  }
}

testRpc();
