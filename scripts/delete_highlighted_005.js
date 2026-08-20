const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yzwldawflteyywuetzcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2xkYXdmbHRleXl3dWV0emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjkzMTYsImV4cCI6MjA5OTU0NTMxNn0.FrD9PlsRNAuQgiU_Klqmspercy8zTEwySs-X9LHHbPA'
);

async function deleteExact9() {
  const idsToDelete = [
    '813ef5a0-5edc-45ee-b263-3cc3a496d365', // Tanks 1-2
    'f896502e-c772-416b-b913-b5173bcf8341', // Tanks 3-4
    '2cd644c7-7b24-4074-8699-aaab05eca582', // Tanks 5-6
    '5308271a-eb62-4b6a-abf2-1eac61af635f', // Tanks 7-8
    '7c800012-2e03-4b21-bef8-d7f86a78d830', // Tanks 9-10
    '053ac28d-53e4-4fbd-981f-32012ad4b73f', // Tanks 11-12
    'e11e56dc-e1b1-48ff-a355-90a7242151c6', // Tanks 13-14
    '626208e7-f70a-4640-96d4-67f2225f0197', // Tanks 15-16
    '3e72a8c0-ff6b-49fc-9f2c-01d03e4d49d9', // Tanks 17-18
  ];

  console.log(`Deleting ${idsToDelete.length} highlighted packing tasks for JHD-317 (Lot 005/26)...`);

  const { data, error } = await supabase
    .from('production_logs')
    .delete()
    .in('id', idsToDelete)
    .select();

  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log(`Successfully deleted ${data?.length || 0} highlighted packing tasks!`);
  }
}

deleteExact9();
