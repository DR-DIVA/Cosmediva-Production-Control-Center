import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data: processes } = await supabase.from('processes').select('*')
  console.log('Processes:', processes)

  let mixProcess = processes.find(p => p.process_name.includes('ผสม'))

  if (!mixProcess) {
    console.log('Mix process not found')
    return
  }

  const { data: rooms, error } = await supabase.from('rooms').select('*')
  console.log('Error:', error)
  console.log('All Rooms:', rooms)

  const mixRooms = rooms ? rooms.filter(r => r.room_name.toLowerCase().includes('mix')) : []
  console.log('Current Mix Rooms:', mixRooms)

  const desiredRooms = ['Mix 1', 'Mix 2', 'Mix 3', 'Mix 4', 'Mix 5', 'Mix 6']
  
  for (const rName of desiredRooms) {
    const exists = mixRooms.find(r => r.room_name === rName || r.room_name.replace(' ', '') === rName.replace(' ', ''))
    if (!exists) {
       console.log('Inserting room:', rName)
       await supabase.from('rooms').insert({
         process_id: null,
         room_name: rName
       })
    } else if (exists.room_name !== rName) {
       console.log('Updating room name:', exists.room_name, 'to', rName)
       await supabase.from('rooms').update({ room_name: rName }).eq('id', exists.id)
    }
  }

  const { data: finalRooms } = await supabase.from('rooms').select('*').eq('process_id', mixProcess.id)
  console.log('Final Mix Rooms:', finalRooms)
}

main()
