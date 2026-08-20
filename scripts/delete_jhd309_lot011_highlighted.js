const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function deleteExact7() {
  const idsToDelete = [
    'bb2a6be1-24c2-4727-8886-b6702041454c', // Tanks 7-7 (5/8/2569)
    '2c899651-6324-48f7-8d70-a3a89ac99800', // Tanks 6-6 (3/8/2569)
    '802c0e83-d44f-4643-8329-70c80e1ca8a5', // Tanks 5-5 (30/7/2569)
    '19bc820b-e4e6-4328-bf11-ac40dcbee773', // Tanks 4-4 (27/7/2569)
    'abfd5bad-711a-4abb-8295-55fadc0067ff', // Tanks 3-3 (24/7/2569)
    'c63d8ccb-23d0-4134-817f-c45999823c10', // Tanks 2-2 (22/7/2569)
    'bc486e33-36eb-4d39-b967-1790dbe85fe7'  // Tanks 1-1 (20/7/2569)
  ];

  console.log(`Deleting ${idsToDelete.length} highlighted packing tasks for JHD-309 (Lot 011/26)...`);

  const { data, error } = await supabase
    .from('production_logs')
    .delete()
    .in('id', idsToDelete)
    .select();

  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log(`Successfully deleted ${data?.length || 0} highlighted packing tasks for Lot 011/26!`);
  }
}

deleteExact7();
