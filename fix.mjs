import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: mixProcess } = await supabase.from('processes').select('id').like('process_name', '%ผสม%').limit(1).single()
  
  if (!mixProcess) return console.log("No mix process found")

  const { data: logs, error } = await supabase.from('production_logs').select('*').eq('process_id', mixProcess.id)
  
  if (error) return console.error(error)

  for (let log of logs) {
    if (!log.tank_details) continue
    let details = typeof log.tank_details === 'object' ? { ...log.tank_details } : {}
    let updated = false
    
    // Check missing tanks that should be waiting
    const start = parseInt(log.tank_start) || 1
    const end = parseInt(log.tank_end) || 1
    const validEnd = Math.max(start, end)
    
    for (let i = start; i <= validEnd; i++) {
       // if it's missing (undefined), it was accidentally cleared!
       if (details[i] === undefined) {
         details[i] = 'WAITING'
         updated = true
         console.log(`Log ${log.id}: Restoring tank ${i} to WAITING`)
       }
    }
    
    if (updated) {
       await supabase.from('production_logs').update({ tank_details: details }).eq('id', log.id)
    }
  }
  
  console.log("Done fixing!")
}

run()
