const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/overview/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Insert State Variables
if (!content.includes('const [allDefects, setAllDefects]')) {
  content = content.replace(
    '  const [isQcPassDialogOpen, setIsQcPassDialogOpen] = useState(false)',
    `  const [allDefects, setAllDefects] = useState<any[]>([])
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false)
  const [defectLotId, setDefectLotId] = useState('')
  const [defectQuantity, setDefectQuantity] = useState('')
  const [defectNote, setDefectNote] = useState('')
  const [isQcPassDialogOpen, setIsQcPassDialogOpen] = useState(false)`
  );
}

// 2. Insert Fetch Logic
if (!content.includes('eq(\'status\', \'DEFECT\')')) {
  const fetchTasksEndRegex = /(const fetchTasks = async \(\) => \{[\s\S]*?)(\s*if \(data\)\s*\{\s*setTasks\(data\)\s*\})/;
  content = content.replace(fetchTasksEndRegex, (match, p1, p2) => {
    return p1 + `      // Fetch Defects for alert
      const today = new Date().toISOString().split('T')[0]
      const { data: defects } = await supabase
        .from('production_logs')
        .select('*')
        .eq('status', 'DEFECT')
        .gte('activity_date', today)
      if (defects) setAllDefects(defects)\n` + p2;
  });
}

// 3. Insert isDefectReportMissing
if (!content.includes('const isDefectReportMissing')) {
  content = content.replace(
    '  const isOverLimit = activeStartTask',
    `  const isDefectReportMissing = allDefects.length === 0 && tasks.length > 0;
  
  const isOverLimit = activeStartTask`
  );
}

// 4. Insert handleDefectSubmit
if (!content.includes('handleDefectSubmit')) {
  content = content.replace(
    '  const handleQcPassSubmit = async',
    `  const handleDefectSubmit = async () => {
    if (!defectLotId || !defectQuantity) return toast.error('กรุณาระบุข้อมูลให้ครบถ้วน')
    await supabase.from('production_logs').insert({
      status: 'DEFECT',
      activity_date: new Date().toISOString().split('T')[0],
      production_lot_id: defectLotId,
      piece_quantity: parseInt(defectQuantity),
      note: defectNote,
      created_at: new Date().toISOString()
    })
    toast.success('บันทึกของเสียเรียบร้อยแล้ว')
    setIsDefectModalOpen(false)
    setDefectQuantity('')
    setDefectNote('')
    fetchTasks()
  }

  const handleQcPassSubmit = async`
  );
}

// 5. Insert Alert JSX
if (!content.includes('หัวหน้าห้องยังไม่มีการรายงานของเสียประจำวัน')) {
  content = content.replace(
    '<div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">',
    `{/* Alert for Defect Report */}
      {isDefectReportMissing && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex justify-between items-center shadow-sm mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm text-red-700 font-medium">⚠️ หัวหน้าห้องยังไม่มีการรายงานของเสียประจำวัน โปรดบันทึกของเสียเพื่อความแม่นยำของระบบ</p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setIsDefectModalOpen(true)}>
            <ClipboardCheck className="w-4 h-4 mr-2" /> บันทึกของเสียเดี๋ยวนี้
          </Button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">`
  );
}

// 6. Insert Modal JSX
if (!content.includes('บันทึกของเสียประจำวัน')) {
  content = content.replace(
    '{/* Start Tank Modal */}',
    `{/* Defect Modal */}
      <Dialog open={isDefectModalOpen} onOpenChange={setIsDefectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกของเสียประจำวัน (Daily Defect Report)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>เลือก LOT. No. ที่พบของเสีย</Label>
              <Select value={defectLotId} onValueChange={(val) => setDefectLotId(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="-- กรุณาเลือก LOT. No. --" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(tasks.map(t => t.production_lots?.id))).map(lotId => {
                    const t = tasks.find(x => x.production_lots?.id === lotId)
                    if (!t) return null
                    return (
                      <SelectItem key={lotId as string} value={lotId as string}>
                        {t.production_lots?.lot_no} ({t.production_lots?.products?.sku_code})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>จำนวนของเสีย (ชิ้น)</Label>
              <Input type="number" value={defectQuantity} onChange={e => setDefectQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>สาเหตุ / หมายเหตุ</Label>
              <Input value={defectNote} onChange={e => setDefectNote(e.target.value)} placeholder="เช่น ซีลแตก, พิมพ์เบลอ" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDefectModalOpen(false)}>ยกเลิก</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDefectSubmit}>บันทึกข้อมูล</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Tank Modal */}`
  );
}

fs.writeFileSync(file, content);
console.log('Injection complete.');
