import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function fixMissingPackingTasks() {
  console.log('Fetching mixing tasks with QC_PASS or SENT_TO_PACKING...')
  
  const { data: mixProc } = await supabase.from('processes').select('id').ilike('process_name', '%ผสม%').limit(1).single()
  const { data: packProc } = await supabase.from('processes').select('id').ilike('process_name', '%บรรจุ%').limit(1).single()
  
  if (!mixProc || !packProc) {
    console.error('Processes not found')
    return
  }

  const { data: mixingTasks } = await supabase.from('production_logs').select('*').eq('process_id', mixProc.id)
  
  if (mixingTasks) {
    for (const task of mixingTasks) {
      const details = typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {}
      
      let needsPacking = false
      const tanksToPack = []
      
      for (const key of Object.keys(details)) {
        if (!key.includes('_')) {
          if (details[key] === 'QC_PASS' || details[key] === 'SENT_TO_PACKING') {
            needsPacking = true
            tanksToPack.push(key)
          }
        }
      }
      
      if (needsPacking) {
        console.log(`Task ${task.id} (Lot ${task.production_lot_id}) has tanks for packing:`, tanksToPack)
        
        const { data: existingPack } = await supabase.from('production_logs')
          .select('id, tank_details')
          .eq('production_lot_id', task.production_lot_id)
          .eq('process_id', packProc.id)
          .eq('tank_start', task.tank_start)
          .eq('tank_end', task.tank_end)
          .maybeSingle()
          
        if (!existingPack) {
          console.log('Creating missing packing task...')
          const start = parseInt(task.tank_start) || 1
          const end = parseInt(task.tank_end) || 1
          const initialPackingDetails: any = {}
          for(let i=start; i<=end; i++) {
             initialPackingDetails[i] = tanksToPack.includes(i.toString()) ? 'WAITING' : 'LOCKED'
          }
          await supabase.from('production_logs').insert({
            production_lot_id: task.production_lot_id,
            process_id: packProc.id,
            status: 'WAITING',
            activity_date: new Date().toISOString().split('T')[0],
            tank_start: task.tank_start,
            tank_end: task.tank_end,
            total_tanks: task.total_tanks,
            tank_details: initialPackingDetails
          })
          console.log('Created!')
        } else {
           console.log('Packing task already exists, making sure tanks are WAITING instead of LOCKED')
           let packDetails = { ...existingPack.tank_details }
           let updated = false
           for (const t of tanksToPack) {
              if (packDetails[t] === 'LOCKED' || !packDetails[t]) {
                 packDetails[t] = 'WAITING'
                 updated = true
              }
           }
           if (updated) {
              await supabase.from('production_logs').update({ tank_details: packDetails }).eq('id', existingPack.id)
              console.log('Updated existing packing task.')
           }
        }
        
        // Update mixing task to SENT_TO_PACKING if it was QC_PASS
        let mixUpdated = false
        for (const t of tanksToPack) {
          if (details[t] === 'QC_PASS') {
             details[t] = 'SENT_TO_PACKING'
             mixUpdated = true
          }
        }
        if (mixUpdated) {
          await supabase.from('production_logs').update({ tank_details: details }).eq('id', task.id)
          console.log('Updated mixing task status to SENT_TO_PACKING.')
        }
      }
    }
  }
  console.log('Done!')
}

fixMissingPackingTasks()
