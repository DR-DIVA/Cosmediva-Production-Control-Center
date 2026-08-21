const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk2OTMxNiwiZXhwIjoyMDk5NTQ1MzE2fQ.gAyqPBCtL40XUI1n7pbGQKQyWAocj0iZ21AIgrlI3jU'
);

async function testRoleType() {
  const { data: p } = await supabase.from('profiles').select('*').eq('employee_id', 'PKPIT266').single();
  const oldRole = p.role;
  
  // Test updating role with custom string
  const testVal = 'custom:planner,production_pk,qc';
  const { error } = await supabase.from('profiles').update({ role: testVal }).eq('id', p.id);
  console.log('Update custom string error:', error);
  
  // Read back
  const { data: updated } = await supabase.from('profiles').select('*').eq('id', p.id).single();
  console.log('Read back role:', updated.role);
  
  // Revert back
  await supabase.from('profiles').update({ role: oldRole }).eq('id', p.id);
  console.log('Reverted back to:', oldRole);
}

testRoleType();
