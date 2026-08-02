import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrigger() {
  const { data, error } = await supabase.rpc('get_triggers', {});
  console.log("RPC Error (if any):", error);
  // fallback to fetching a record, updating it, and checking if updated_at changed
}

async function testUpdate() {
  const { data: logs } = await supabase.from('production_logs').select('id, updated_at').limit(1);
  if (!logs || logs.length === 0) return;
  const log = logs[0];
  console.log('Before:', log.updated_at);
  const { data: updated } = await supabase.from('production_logs')
     .update({ status: 'WAITING' })
     .eq('id', log.id)
     .select('updated_at')
     .single();
  console.log('After (without explicitly setting updated_at):', updated?.updated_at);
}

testUpdate().catch(console.error);
