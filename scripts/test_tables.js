const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk2OTMxNiwiZXhwIjoyMDk5NTQ1MzE2fQ.gAyqPBCtL40XUI1n7pbGQKQyWAocj0iZ21AIgrlI3jU'
);

async function testTables() {
  const tables = ['user_permissions', 'user_module_access', 'user_modules', 'roles_permissions', 'profiles'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(`Table '${t}':`, error ? error.message : `Exists (${data.length} rows)`);
  }
}

testTables();
