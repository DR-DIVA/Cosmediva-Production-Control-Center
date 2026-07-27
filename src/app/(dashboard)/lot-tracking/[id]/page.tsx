'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, Activity, Info } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export default function LotDashboardPage() {
  const { id } = useParams()
  const router = useRouter()
  const [lot, setLot] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLotData()
  }, [id])

  const fetchLotData = async () => {
    setLoading(true)
    
    // Fetch lot
    const { data: lotData } = await supabase
      .from('production_lots')
      .select('*, products(sku, product_name)')
      .eq('id', id)
      .single()
      
    if (lotData) {
      setLot(lotData)
    }

    // Fetch all logs for this lot
    const { data: logsData } = await supabase
      .from('production_logs')
      .select('*, processes(process_name)')
      .eq('production_lot_id', id)
      
    if (logsData) {
      setLogs(logsData)
    }
    
    setLoading(false)
  }

  // Get state for a specific tank across all processes
  const getTankState = (tankIndex: number) => {
    let weighing = { status: 'PENDING', label: 'รอชั่งสาร', color: 'bg-slate-100 text-slate-400 border-slate-200' }
    let mixing = null
    let qc = null
    let packing = null
    let pof = null
    let fg = null

    // 1. Check Weighing
    const weighingLogs = logs.filter(l => l.processes?.process_name?.includes('ชั่ง') || l.processes?.process_name?.toLowerCase().includes('weigh'))
    const weighingLog = weighingLogs.find(l => {
      if (l.tank_details && l.tank_details[tankIndex]) return true;
      return tankIndex >= parseInt(l.tank_start) && tankIndex <= parseInt(l.tank_end)
    })
    if (weighingLog) {
      const details = weighingLog.tank_details || {}
      const st = details[tankIndex]
      if (st === 'WAITING') { weighing = { status: 'WAITING', label: 'รอชั่งสาร', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' } }
      else if (st === 'IN_PROGRESS') { weighing = { status: 'IN_PROGRESS', label: 'กำลังชั่ง', color: 'bg-[#D4AF37]/ text-[#D4AF37] border-[#D4AF37]/' } }
      else if (st === 'DONE') { weighing = { status: 'DONE', label: 'ชั่งเสร็จ', color: 'bg-green-100 text-green-700 border-green-300' } }
      else if (st === 'MOVED') { weighing = { status: 'MOVED', label: 'ส่งผสมแล้ว', color: 'bg-emerald-500 text-white border-emerald-600' } }
    }

    // 2. Check Mixing
    const mixingLogs = logs.filter(l => l.processes?.process_name?.includes('ผสม') || l.processes?.process_name?.toLowerCase().includes('mix'))
    const mixingLog = mixingLogs.find(l => {
      if (l.tank_details && l.tank_details[tankIndex]) return true;
      return tankIndex >= parseInt(l.tank_start) && tankIndex <= parseInt(l.tank_end)
    })
    if (mixingLog) {
      const details = mixingLog.tank_details || {}
      const st = details[tankIndex]?.status || details[tankIndex] // Support both string and object
      const room = details[tankIndex]?.room || ''
      if (st === 'WAITING') { mixing = { status: 'WAITING', label: 'รอผสม', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', room } }
      else if (st === 'MIXING') { mixing = { status: 'MIXING', label: 'กำลังปั่น', color: 'bg-[#D4AF37]/ text-[#D4AF37] border-[#D4AF37]/', room } }
      else if (st === 'DONE') { mixing = { status: 'DONE', label: 'ปั่นเสร็จ', color: 'bg-green-100 text-green-700 border-green-300', room } }
      else if (st === 'SENT_TO_QC') { mixing = { status: 'SENT_TO_QC', label: 'ส่ง QC แล้ว', color: 'bg-emerald-500 text-white border-emerald-600', room } }
    }

    // 3. Check QC
    const qcLogs = logs.filter(l => l.processes?.process_name?.includes('QC'))
    const qcLog = qcLogs.find(l => {
      // Check tank_details first
      if (l.tank_details && l.tank_details[tankIndex]) return true;
      // Fallback to legacy tank_start/end
      return tankIndex >= parseInt(l.tank_start) && tankIndex <= parseInt(l.tank_end)
    })
    if (qcLog) {
      const details = qcLog.tank_details || {}
      const st = details[tankIndex]?.status || details[tankIndex] || qcLog.status
      if (st === 'WAITING' || st === 'IN_PROGRESS' || st === 'PAUSED') { qc = { status: st, label: st==='WAITING'?'รอตรวจ QC':(st==='PAUSED'?'รอตัดสินใจ':'กำลังตรวจ'), color: st==='PAUSED'?'bg-orange-100 text-orange-700 border-orange-300':'bg-sky-100 text-sky-700 border-sky-300' } }
      else if (st === 'COMPLETED' || st === 'DONE' || st === 'QC_PASS') { qc = { status: 'QC_PASS', label: 'QC Pass', color: 'bg-green-100 text-green-700 border-green-300' } }
      else if (st === 'FAILED' || st === 'QC_REJECT') { qc = { status: 'QC_REJECT', label: 'ติดปัญหา', color: 'bg-red-100 text-red-700 border-red-300' } }
    }

    // 4. Check Packing
    const packLogs = logs.filter(l => l.processes?.process_name?.includes('บรรจุ'))
    const packLog = packLogs.find(l => {
      if (l.tank_details && l.tank_details[tankIndex]) return true;
      return tankIndex >= parseInt(l.tank_start) && tankIndex <= parseInt(l.tank_end)
    })
    if (packLog) {
      const details = packLog.tank_details || {}
      const st = details[tankIndex]?.status || details[tankIndex] || packLog.status
      const pcs = details[tankIndex]?.pieces
      if (st === 'WAITING') { packing = { status: 'WAITING', label: 'รอบรรจุ', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', pieces: pcs } }
      else if (st === 'IN_PROGRESS') { packing = { status: 'IN_PROGRESS', label: 'กำลังบรรจุ', color: 'bg-[#D4AF37]/ text-[#D4AF37] border-[#D4AF37]/', pieces: pcs } }
      else if (st === 'DONE' || st === 'COMPLETED' || st === 'SENT_TO_POF') { packing = { status: 'DONE', label: 'บรรจุเสร็จ', color: 'bg-green-100 text-green-700 border-green-300', pieces: pcs } }
    }

    // 5. Check POF
    const pofLogs = logs.filter(l => l.processes?.process_name?.includes('POF') || l.processes?.process_name?.includes('อุโมงค์'))
    const pofLog = pofLogs.find(l => {
      if (l.tank_details && l.tank_details[tankIndex]) return true;
      return tankIndex >= parseInt(l.tank_start) && tankIndex <= parseInt(l.tank_end)
    })
    if (pofLog) {
      const details = pofLog.tank_details || {}
      const st = details[tankIndex]?.status || details[tankIndex] || pofLog.status
      if (st === 'WAITING') { pof = { status: 'WAITING', label: 'รออบฟิล์ม', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' } }
      else if (st === 'IN_PROGRESS') { pof = { status: 'IN_PROGRESS', label: 'กำลังอบฟิล์ม', color: 'bg-[#D4AF37]/ text-[#D4AF37] border-[#D4AF37]/' } }
      else if (st === 'DONE' || st === 'COMPLETED') { pof = { status: 'DONE', label: 'อบฟิล์มเสร็จ', color: 'bg-emerald-500 text-white border-emerald-600' } }
    }

    // Determine Final Display State based on progression
    // The highest process reached dictates the main color/icon
    let finalState: any = { ...weighing, stage: 'ชั่งสาร' }
    
    // Only advance the stage if the next stage has actually received it (not LOCKED)
    if (mixing && mixing.status !== 'LOCKED') {
      finalState = { ...mixing, stage: 'ผสม' }
    }
    if (qc && qc.status !== 'LOCKED') {
      finalState = { ...qc, stage: 'QC' }
    }
    if (packing && packing.status !== 'LOCKED') {
      finalState = { ...packing, stage: 'บรรจุ' }
    }
    if (pof && pof.status !== 'LOCKED') {
      finalState = { ...pof, stage: 'POF' }
    }

    return finalState
  }

  if (loading) return <div className="p-8 text-center text-slate-500">กำลังโหลด...</div>
  if (!lot) return <div className="p-8 text-center text-red-500">ไม่พบข้อมูล Lot</div>

  const totalTanks = parseInt(lot.total_tanks) || 0
  const tanks = Array.from({ length: totalTanks }, (_, i) => i + 1)

  // Calculate total packed pieces
  let totalPackedPieces = 0
  const packLogsForSummary = logs.filter(l => l.processes?.process_name?.includes('บรรจุ'))
  packLogsForSummary.forEach(pl => {
    const details = pl.tank_details || {}
    Object.keys(details).forEach(key => {
      if (key.includes('_history')) return
      const pieces = details[key]?.pieces
      if (pieces && !isNaN(parseInt(pieces))) {
        totalPackedPieces += parseInt(pieces)
      }
    })
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/lot-tracking')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">แผงคุมรวม LOT: {lot.lot_no}</h1>
          <p className="text-sm text-[#8B7355] mt-2 font-medium">สินค้า: {lot.products?.sku} {lot.products?.product_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-slate-500">จำนวนถังรวม</p>
            <h3 className="text-3xl font-bold">{totalTanks} <span className="text-base font-normal">ถัง</span></h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-slate-500">ยอดออเดอร์ (เป้าหมาย)</p>
            <h3 className="text-3xl font-bold text-slate-700">{lot.order_quantity ? Number(lot.order_quantity).toLocaleString() : '-'} <span className="text-base font-normal">ชิ้น</span></h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-emerald-600">บรรจุแล้ว (Packed)</p>
            <h3 className="text-3xl font-bold text-emerald-600">{totalPackedPieces.toLocaleString()} <span className="text-base font-normal">ชิ้น</span></h3>
          </CardContent>
        </Card>
        <Card className="col-span-1 md:col-span-2">
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-slate-500">ทางลัดไปยังแผนก</p>
            <div className="flex gap-2 mt-2">
              <Link href="/my-tasks/weighing"><Button variant="outline" size="sm">ชั่งสาร</Button></Link>
              <Link href="/my-tasks/mixing"><Button variant="outline" size="sm">งานผสม</Button></Link>
              <Link href="/qc-queue"><Button variant="outline" size="sm">QC</Button></Link>
              <Link href="/my-tasks/packing"><Button variant="outline" size="sm">บรรจุ</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Activity className="w-5 h-5" /> สถานะถัง (Tank Tracking)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-slate-100 border-slate-200 border"></div> รอดำเนินการ</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-100 border-yellow-300 border"></div> พร้อมทำ/รอคิว</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#D4AF37]/ border-[#D4AF37]/ border"></div> กำลังทำ</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-100 border-green-300 border"></div> เสร็จขั้นตอนนี้</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-emerald-500 border-emerald-600 border"></div> ส่งต่อแผนกถัดไป</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-100 border-orange-300 border"></div> รอตัดสินใจ (Hold)</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-100 border-red-300 border"></div> ติดปัญหา (Reject)</div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
            {tanks.map(tankNum => {
              const state = getTankState(tankNum)
              return (
                <div 
                  key={tankNum} 
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-help ${state.color} shadow-sm group`}
                  title={`ถังที่ ${tankNum}\nแผนกปัจจุบัน: ${state.stage}\nสถานะ: ${state.label}${state.room ? '\nห้อง: '+state.room : ''}`}
                >
                  <span className="text-xs font-semibold opacity-70 mb-1">{state.stage}</span>
                  <span className="text-xl font-bold">{tankNum}</span>
                  
                  {/* Tooltip Hover Overlay (for touch devices / better visibility) */}
                  <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg whitespace-nowrap z-10 pointer-events-none transition-opacity">
                    <div className="font-bold">ถังที่ {tankNum}</div>
                    <div>แผนก: {state.stage}</div>
                    <div>สถานะ: {state.label}</div>
                    {state.room && <div>ห้อง: {state.room}</div>}
                    {state.pieces ? <div>ยอดจัด: {state.pieces.toLocaleString()} ชิ้น</div> : null}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
