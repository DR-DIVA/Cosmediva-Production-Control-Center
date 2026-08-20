const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function cleanLot012() {
  const idsToDelete = [
    'd548f63e-7acb-4397-ace5-047f136e26f2', // 1-1
    'ff814306-3d47-4114-9a45-6cb97c06d2f0', // 2-2
    'd39a23dc-7cc7-4d99-b697-15b86909c1d4', // 3-3
    '09cb599d-8200-4d4b-9c29-0c35be25ac04', // 4-4
    'd411afd2-2864-4a0c-a2c9-95181bd84d49', // 5-5
    'bafd0c2a-ce2d-450b-8d4e-3323b23fa6d0', // 6-6
    'ce4c4e6e-b50f-4eb6-8388-d8df4ab11ec4', // 7-7
    '3a993633-6602-4469-aaa5-1c8c21bcff0e', // 8-8
    '60db2bd4-31a8-4190-ae5e-038287d917fa'  // 9-9
  ];

  console.log(`Deleting ${idsToDelete.length} redundant single-tank packing tasks for Lot 012/26...`);

  const { data, error } = await supabase
    .from('production_logs')
    .delete()
    .in('id', idsToDelete)
    .select();

  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log(`Successfully deleted ${data?.length || 0} redundant tasks for Lot 012/26!`);
  }
}

cleanLot012();
