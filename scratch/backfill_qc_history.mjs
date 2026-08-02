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
  const { data: qcProcess } = await supabase.from('processes').select('id').eq('process_name', 'รอ QC').single()
  const { data: mixProcess } = await supabase.from('processes').select('id').like('process_name', '%ผสม%').limit(1).single()

  const { data: qcLogs, error } = await supabase.from('production_logs').select('*').eq('process_id', qcProcess.id)
  
  if (error) return console.error(error)

  for (let log of qcLogs) {
    if (!log.tank_details) continue
    let details = typeof log.tank_details === 'object' ? { ...log.tank_details } : {}
    let updated = false
    
    // Check all tanks in this QC log
    const start = parseInt(log.tank_start) || 1
    const end = parseInt(log.tank_end) || 1
    const validEnd = Math.max(start, end)
    
    for (let i = start; i <= validEnd; i++) {
       if (details[i] && details[i] !== 'LOCKED') {
         let history = details[`${i}_history`] || []
         
         // If history is empty, backfill it
         if (history.length === 0) {
           console.log(`Backfilling history for Log ${log.id}, Tank ${i}`)
           
           // Find the mixing log to get timestamp and user (if possible)
           const { data: mixLog } = await supabase.from('production_logs')
             .select('updated_at, tank_details')
             .eq('process_id', mixProcess.id)
             .eq('production_lot_id', log.production_lot_id)
             .eq('tank_start', log.tank_start)
             .eq('tank_end', log.tank_end)
             .maybeSingle()

           let timestamp = log.created_at
           let user = 'System'

           if (mixLog && mixLog.tank_details && mixLog.tank_details[`${i}_history`]) {
               const mixHistory = mixLog.tank_details[`${i}_history`]
               const sendToQcEvent = mixHistory.find((h) => h.status === 'SENT_TO_QC')
               if (sendToQcEvent) {
                   timestamp = sendToQcEvent.timestamp
                   user = sendToQcEvent.user || 'System'
               }
           }
           
           history.push({ status: 'MX ส่ง QC', timestamp, user })
           details[`${i}_history`] = history
           updated = true
         } else {
           // Ensure the first event is MX ส่ง QC if not present
           const hasMxSent = history.some((h) => h.status === 'MX ส่ง QC' || h.status === 'SENT_TO_QC')
           if (!hasMxSent) {
               history.unshift({ status: 'MX ส่ง QC', timestamp: log.created_at, user: 'System' })
               details[`${i}_history`] = history
               updated = true
           }
         }
       }
    }
    
    if (updated) {
       await supabase.from('production_logs').update({ tank_details: details }).eq('id', log.id)
       console.log(`Updated QC Log ${log.id}`)
    }
  }
  
  console.log("Done backfilling!")
}

run()
