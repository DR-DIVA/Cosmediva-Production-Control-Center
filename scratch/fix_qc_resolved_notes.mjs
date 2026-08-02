import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: logs, error } = await supabase.from('production_logs').select('id, note, tank_details, production_lots(lot_no)')
  if (error) return console.error(error)

  let count = 0
  for (let log of logs) {
    if (!log.note) continue

    const lines = log.note.split('\n')
    let updated = false
    const details = log.tank_details || {}

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('[QC HOLD]') || line.includes('[QC REPROCESS]') || line.includes('[QC REJECT]')) {
        // If it's not resolved yet
        if (!line.includes('[Resolved')) {
          // Extract tank number
          const match = line.match(/ถัง\s*(\d+):/)
          if (match && match[1]) {
            const tankNum = parseInt(match[1], 10)
            const currentStatus = details[tankNum]
            
            // If the tank is actually QC_PASS now, but the note is not resolved
            if (currentStatus === 'QC_PASS') {
               console.log(`Found unresolved note for a PASS tank in log ${log.id} (LOT: ${log.production_lots?.lot_no}, Tank: ${tankNum})`)
               
               // Try to find the reason and time from history
               const history = details[`${tankNum}_history`] || []
               const passEvent = history.slice().reverse().find((h) => h.status === 'QC_PASS')
               const reason = passEvent?.note || 'ตรวจสอบแล้วผ่านตามสเปค'
               const time = passEvent?.timestamp ? new Date(passEvent.timestamp).toLocaleString('th-TH') : new Date().toLocaleString('th-TH')
               
               lines[i] = `${line} [Resolved: ${reason} - ${time}]`
               updated = true
            }
          }
        }
      }
    }

    if (updated) {
       const newNote = lines.join('\n')
       await supabase.from('production_logs').update({ note: newNote }).eq('id', log.id)
       console.log(`Fixed log ${log.id}`)
       count++
    }
  }
  
  console.log(`Done! Fixed ${count} logs.`)
}

run()
