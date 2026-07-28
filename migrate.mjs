import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { error } = await supabase.rpc('run_sql', { sql_query: `CREATE TABLE IF NOT EXISTS daily_defects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), activity_date DATE NOT NULL, production_lot_id UUID REFERENCES production_lots(id) ON DELETE CASCADE, room_id UUID REFERENCES rooms(id) ON DELETE SET NULL, defect_quantity INT DEFAULT 0, note TEXT, created_at TIMESTAMPTZ DEFAULT NOW());` });
  console.log(error ? error : 'Success');
}
run();
