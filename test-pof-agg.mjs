import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase.from('production_logs')
    .select(`
      piece_quantity,
      production_lot_id,
      processes!inner(process_name)
    `)
    .eq('status', 'COMPLETED')
    .ilike('processes.process_name', '%POF%')
    
  console.log('Error:', error)
  console.log('Data:', data)
}

main()
