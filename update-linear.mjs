import fs from 'fs';

const file = 'src/app/(dashboard)/my-tasks/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Update COLUMNS
code = code.replace(
  /const COLUMNS = \[[\s\S]*?\]/,
  `const COLUMNS = [
  { id: 'MM-RM', title: '1. ชั่งสาร (MM-RM)', keywords: ['ชั่ง', 'mm-rm'] },
  { id: 'MIX', title: '2. ห้องผสม (Mix 1-6)', keywords: ['ผสม', 'mix'] },
  { id: 'QC', title: '3. สถานะ QC', keywords: ['qc', 'quarantine', 'passed', 'rejected'] },
  { id: 'PACKING', title: '4. ห้องบรรจุ (Packing)', keywords: ['บรรจุ', 'packing'] },
  { id: 'POF', title: '5. ห้องอุโมงค์ (POF)', keywords: ['pof', 'อุโมงค์'] },
  { id: 'FG', title: '6. เข้าคลัง FG', keywords: ['fg', 'คลัง', 'store'] }
]`
);

// 2. Add state
code = code.replace(
  /const \[qcPassTankEnd, setQcPassTankEnd\] = useState\(''\)/,
  `const [qcPassTankEnd, setQcPassTankEnd] = useState('')
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')`
);

// 3. Add fetchRooms
code = code.replace(
  /useEffect\(\(\) => \{\n    fetchTasks\(\)\n  \}, \[\]\)/,
  `useEffect(() => {
    fetchTasks()
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_name')
    if (data) setRooms(data)
  }`
);

// 4. In updateStatus, update the routing logic for Finish.
code = code.replace(
  /\/\/ If completing MM-RM, create new task for RM Storage[\s\S]*?\/\/ If completing MIX, create new task for QC/,
  `// Linear Workflow Logic:
      if (newStatus === 'COMPLETED' && extraData?.sourceTask) {
        const sourceTask = extraData.sourceTask;
        const lotId = sourceTask.production_lots?.id || sourceTask.production_lot_id;
        
        let nextProcessName = '';
        if (extraData.isWeighingTask) nextProcessName = 'ผสม'; // to Mix
        else if (extraData.isMixTask) nextProcessName = 'รอ QC'; // to QC
        else if (extraData.isPackingTask) nextProcessName = 'รออุโมงค์'; // to POF
        else if (extraData.isPofTask) nextProcessName = 'รอเข้าคลัง FG'; // to FG

        if (nextProcessName && lotId) {
          const { data: nextProc } = await supabase.from('processes').select('id').eq('process_name', nextProcessName).single()
          if (nextProc) {
            await supabase.from('production_logs').insert({
              production_lot_id: lotId,
              process_id: nextProc.id,
              status: 'WAITING',
              activity_date: new Date().toISOString().split('T')[0],
              tank_start: sourceTask.tank_start,
              tank_end: sourceTask.tank_end,
              total_tanks: sourceTask.total_tanks || sourceTask.production_lots?.total_tanks
            })
          }
        }
      }

      // legacy RM comment marker just to avoid breaking the regex match in the future`
);

// Replace the second half of that block
code = code.replace(
  /if \(newStatus === 'COMPLETED' && extraData\?\.isMixTask && extraData\?\.sourceTask\) \{[\s\S]*?fetchTasks\(\)/,
  `fetchTasks()`
);

// 5. Update handleStartClick to populate room and always show dialog
code = code.replace(
  /const handleStartClick = \(task: any, subStepOverride\?: string\) => \{[\s\S]*?\}\n\n  const handleStartConfirm = async/,
  `const handleStartClick = (task: any) => {
    setActiveStartTask(task)
    setTankStart(task.tank_start ? task.tank_start.toString() : '')
    setTankEnd(task.tank_end ? task.tank_end.toString() : '')
    setSelectedRoomId(task.rooms?.id || task.room_id || '')
    setIsStartDialogOpen(true)
  }

  const handleStartConfirm = async`
);

// 6. Update handleStartConfirm to handle Room and remove old RM storage mix logic
code = code.replace(
  /const handleStartConfirm = async \(\) => \{[\s\S]*?const handleFinishClick =/,
  `const handleStartConfirm = async () => {
    if (!activeStartTask) return
    
    if (!tankStart || !tankEnd) {
      toast.error('กรุณาระบุลำดับถังเริ่มต้นและสิ้นสุด')
      return
    }

    const isMixColumn = activeStartTask.processes?.process_name?.includes('ผสม') || activeStartTask.rooms?.room_name?.includes('Mix')
    const isPackingColumn = activeStartTask.processes?.process_name?.includes('บรรจุ')
    
    if ((isMixColumn || isPackingColumn) && !selectedRoomId) {
      toast.error('กรุณาเลือกห้อง')
      return
    }

    updateStatus(activeStartTask.id, 'IN_PROGRESS', {
      tank_start: tankStart,
      tank_end: tankEnd,
      room_id: selectedRoomId || null
    })

    if (selectedRoomId) {
       await supabase.from('production_logs').update({ room_id: selectedRoomId }).eq('id', activeStartTask.id)
    }

    setIsStartDialogOpen(false)
  }

  const handleFinishClick =`
);

// 7. Update handleFinishConfirm to use linear logic (removing RM Storage hardcoded insertions)
code = code.replace(
  /\/\/ 2\. Create WAITING RM Storage task[\s\S]*?\/\/ 3\. Update the original task/,
  `// 2. Create Next task for [originalStart - completedEnd]
        let nextProcessName = '';
        if (activeStartTask.processes?.process_name?.includes('ชั่งสาร')) nextProcessName = 'ผสม';
        else if (activeStartTask.processes?.process_name?.includes('ผสม') || activeStartTask.rooms?.room_name?.includes('Mix')) nextProcessName = 'รอ QC';
        else if (activeStartTask.processes?.process_name?.includes('บรรจุ')) nextProcessName = 'รออุโมงค์';
        else if (activeStartTask.processes?.process_name?.includes('อุโมงค์') || activeStartTask.processes?.process_name?.includes('POF')) nextProcessName = 'รอเข้าคลัง FG';

        if (nextProcessName) {
          const { data: nextProc } = await supabase.from('processes').select('id').eq('process_name', nextProcessName).single()
          if (nextProc) {
            await supabase.from('production_logs').insert({
              production_lot_id: activeStartTask.production_lots?.id || activeStartTask.production_lot_id,
              process_id: nextProc.id,
              status: 'WAITING',
              activity_date: new Date().toISOString().split('T')[0],
              tank_start: originalStart,
              tank_end: completedEnd,
              total_tanks: activeStartTask.total_tanks || activeStartTask.production_lots?.total_tanks
            })
          }
        }

        // 3. Update the original task`
);

code = code.replace(
  /updateStatus\(activeStartTask.id, 'COMPLETED', \{ \n      isWeighingTask[\s\S]*?\}\)/,
  `updateStatus(activeStartTask.id, 'COMPLETED', { 
      isWeighingTask: activeStartTask?.processes?.process_name?.includes('ชั่งสาร'), 
      isMixTask: activeStartTask?.processes?.process_name?.includes('ผสม') || activeStartTask?.rooms?.room_name?.includes('Mix'),
      isPackingTask: activeStartTask?.processes?.process_name?.includes('บรรจุ'),
      isPofTask: activeStartTask?.processes?.process_name?.includes('อุโมงค์') || activeStartTask?.processes?.process_name?.includes('POF'),
      sourceTask: activeStartTask 
    })`
);

// 8. Remove renderBatteryBar and renderMixingButtons
code = code.replace(/const renderBatteryBar = [\s\S]*?const getStatusColor =/g, `const getStatusColor =`);

// 9. Fix render of MIX column buttons in JSX
code = code.replace(
  /\{col\.id === 'MIX' \? \(\n                          renderMixingButtons\(task\)\n                        \) : col\.id === 'QC' \? \(/,
  `{col.id === 'QC' ? (`
);

// 10. Start Dialog Select Room dropdown
code = code.replace(
  /<div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">\n              จำนวนถังรวม:/,
  `{activeStartTask && (activeStartTask.processes?.process_name?.includes('ผสม') || activeStartTask.rooms?.room_name?.includes('Mix') || activeStartTask.processes?.process_name?.includes('บรรจุ')) && (
              <div className="space-y-2 col-span-2">
                <Label>เลือกห้อง</Label>
                <select 
                  className="w-full border rounded p-2"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="">-- กรุณาเลือกห้อง --</option>
                  {rooms.filter(r => activeStartTask.processes?.process_name?.includes('ผสม') ? r.room_name.includes('Mix') : r.room_name.includes('ห้อง')).map(r => (
                    <option key={r.id} value={r.id}>{r.room_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
              จำนวนถังรวม:`
);

fs.writeFileSync(file, code);
console.log('done replacing logic!');
