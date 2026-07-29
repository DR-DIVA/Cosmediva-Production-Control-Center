const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function checkProducts() {
  const { data, error } = await supabase.from('products').select('*').eq('sku', 'JHD-178');
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

checkProducts();
