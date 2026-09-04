const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk2OTMxNiwiZXhwIjoyMDk5NTQ1MzE2fQ.gAyqPBCtL40XUI1n7pbGQKQyWAocj0iZ21AIgrlI3jU'
);

async function main() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Total auth users:', data.users.length);
  console.log('Sample users:', data.users.slice(0, 8).map(u => ({ id: u.id, email: u.email, user_metadata: u.user_metadata })));
}

main();
