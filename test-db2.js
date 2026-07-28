const dotenv = require('dotenv');
dotenv.config({ path: './.env.local' });

async function getDocs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  });
  const data = await res.json();
  const table = data.definitions.production_lot_rms;
  console.log('COLUMNS: ', Object.keys(table.properties));
}

getDocs();
