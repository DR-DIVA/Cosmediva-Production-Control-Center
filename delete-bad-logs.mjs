import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function main() {
  console.log('Fetching all production_logs...')
  const { data: logs, error } = await supabase.from('production_logs').select('id, tank_start, tank_end, total_tanks, activity_date')
  
  if (error) {
    console.error('Error fetching logs:', error)
    return
  }

  const badLogs = logs.filter(log => {
    const end = parseInt(log.tank_end)
    const total = parseInt(log.total_tanks)
    return !isNaN(end) && !isNaN(total) && end > total
  })

  console.log(`Found ${badLogs.length} bad logs exceeding total_tanks.`)
  
  for (const log of badLogs) {
    console.log(`Deleting log ID: ${log.id}, Tanks: ${log.tank_start}-${log.tank_end}, Total: ${log.total_tanks}`)
    const { error: delError } = await supabase.from('production_logs').delete().eq('id', log.id)
    if (delError) {
      console.error(`Failed to delete log ${log.id}:`, delError)
    } else {
      console.log(`Deleted successfully.`)
    }
  }
}

main()
