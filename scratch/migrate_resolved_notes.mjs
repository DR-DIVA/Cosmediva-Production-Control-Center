import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: logs, error } = await supabase.from('production_logs').select('id, note').ilike('note', '%[Resolved%')
  if (error) return console.error(error)

  let count = 0
  for (let log of logs) {
    if (!log.note) continue

    // The note might contain newlines INSIDE the [Resolved:] block, so we shouldn't split by newline
    // Instead we can replace globally using a regex with the 's' flag (dotall) or [\s\S]
    
    let updated = false
    let newNote = log.note

    if (newNote.includes('[Resolved:')) {
      // First, replace for QC issues
      const qcRegex = /(?:\[QC HOLD\]|\[QC REPROCESS\]|\[QC REJECT\])[^\[]*?\[Resolved:\s*([\s\S]*?)\]/g
      newNote = newNote.replace(qcRegex, (match, p1) => {
        // match is the whole string starting from [QC...] to the end of ]
        // Wait, replacing the whole match means we lose the first part!
        // It's better to just replace the [Resolved: ...] part
        return match.replace(/\[Resolved:\s*([\s\S]*?)\]/, `> [QC PASSED] $1`)
      })

      // Next, replace any remaining [Resolved: ...] with QA Approved
      const qaRegex = /\[Resolved:\s*([\s\S]*?)\]/g
      newNote = newNote.replace(qaRegex, (match, p1) => {
        return `> [QA Approved] ${p1}`
      })

      if (newNote !== log.note) {
        await supabase.from('production_logs').update({ note: newNote }).eq('id', log.id)
        console.log(`Updated log ${log.id}`)
        count++
      }
    }
  }
  
  console.log(`Done! Updated ${count} logs.`)
}

run()
