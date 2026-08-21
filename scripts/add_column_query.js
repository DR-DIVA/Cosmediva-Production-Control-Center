const fetch = require('node-fetch');

async function trySql() {
  const url = 'https://yzwldawflteyywuetzcw.supabase.co/rest/v1/rpc';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk2OTMxNiwiZXhwIjoyMDk5NTQ1MzE2fQ.gAyqPBCtL40XUI1n7pbGQKQyWAocj0iZ21AIgrlI3jU';
  
  // Try Supabase pgsql/query API or direct migration
  const res = await fetch('https://yzwldawflteyywuetzcw.supabase.co/pg/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({
      query: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_modules TEXT[] DEFAULT ARRAY[]::TEXT[];'
    })
  }).catch(e => e);

  console.log('Query endpoint status:', res.status, await res.text().catch(() => ''));
}

trySql();
