const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function inspectProfiles() {
  const { data: profiles, error } = await supabase.from('profiles').select('*').limit(3);
  console.log('Profiles sample:', profiles);
  console.log('Error if any:', error);
}

inspectProfiles();
