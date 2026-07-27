'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Loader2, Calendar, FileText, Search } from 'lucide-react'
import { toast } from 'sonner'

export default function WorkHistoryPage() {
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [processFilter, setProcessFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  
  const supabase = createClient()

  // Process mapping for better readability
  const mapProcessName = (rawName: string) => {
    const name = rawName.toLowerCase()
    if (name.includes('ชั่ง') || name.includes('weigh')) return 'ชั่งสาร'
    if (name.includes('ผสม') || name.includes('mix')) return 'ผสม'
    if (name.includes('บรรจุ') || name.includes('packing')) return 'บรรจุ'
    if (name.includes('pof') || name.includes('อุโมงค์')) return 'POF/ลงลัง'
    if (name.includes('qc') || name.includes('รอตรวจสอบ')) return 'QC'
    return rawName
  }

  const fetchHistory = async () => {
    if (!startDate || !endDate) {
      toast.error('กรุณาเลือกช่วงวันที่')
      return
    }

    setLoading(true)
    setHasSearched(true)
    
    // Convert to ISO range covering full days
    const startIso = `${startDate}T00:00:00.000Z`
    const endIso = `${endDate}T23:59:59.999Z`

    const { data, error } = await supabase.from('production_logs')
      .select(`
        id, tank_details, updated_at, process_id, status,
        production_lots ( id, lot_no, products:sku_id (sku, product_name) ),
        processes ( id, process_name )
      `)
      .gte('updated_at', startIso)

    if (error) {
      toast.error('โหลดข้อมูลล้มเหลว')
      setLoading(false)
      return
    }

    if (data) {
      const items: any[] = []
      
      const startDateTime = new Date(startIso).getTime()
      const endDateTime = new Date(endIso).getTime()

      data.forEach(task => {
        const rawProcessName = Array.isArray(task.processes) ? task.processes[0]?.process_name : (task.processes as any)?.process_name
        if (!rawProcessName) return
        
        const mappedProcess = mapProcessName(rawProcessName)
        
        // Filter by process if not ALL
        if (processFilter !== 'ALL') {
          if (processFilter === 'WEIGHING' && mappedProcess !== 'ชั่งสาร') return
          if (processFilter === 'MIXING' && mappedProcess !== 'ผสม') return
          if (processFilter === 'PACKING' && mappedProcess !== 'บรรจุ') return
          if (processFilter === 'POF' && mappedProcess !== 'POF/ลงลัง') return
          if (processFilter === 'QC' && mappedProcess !== 'QC') return
        }
        
        const details = task.tank_details || {}
        
        // Special case for QC tasks (they store history in 'qc_history')
        if (mappedProcess === 'QC' && details.qc_history && Array.isArray(details.qc_history)) {
          details.qc_history.forEach((h: any) => {
            const hTime = new Date(h.timestamp).getTime()
            if (hTime >= startDateTime && hTime <= endDateTime) {
              items.push({
                taskId: task.id,
                lotNo: (task.production_lots as any)?.lot_no,
                sku: (task.production_lots as any)?.products?.sku,
                process: 'QC',
                tankNum: h.tank ? `ถัง ${h.tank}` : '-',
                action: h.action || h.status,
                user: h.user,
                timestamp: h.timestamp,
                qty: null,
                note: h.note
              })
            }
          })
          return // Skip checking _history keys for QC if it uses qc_history
        }

        // Standard process tasks (Weighing, Mixing, Packing, POF)
        Object.keys(details).forEach(key => {
          if (key.endsWith('_history')) {
            const tankNum = key.replace('_history', '')
            const histories = details[key] as any[]
            if (Array.isArray(histories)) {
              histories.forEach(h => {
                const hTime = new Date(h.timestamp).getTime()
                if (hTime >= startDateTime && hTime <= endDateTime) {
                  items.push({
                    taskId: task.id,
                    lotNo: task.production_lots?.lot_no,
                    sku: task.production_lots?.products?.sku,
                    process: mappedProcess,
                    tankNum: `ถัง/ชุด ${tankNum}`,
                    action: h.status,
                    user: h.user,
                    timestamp: h.timestamp,
                    qty: h.qty || null,
                    note: h.note
                  })
                }
              })
            }
          }
        })
      })
      
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setHistoryItems(items)
    }
    
    setLoading(false)
  }

  const exportToCSV = () => {
    if (historyItems.length === 0) {
      toast.error('ไม่มีข้อมูลให้ Export')
      return
    }

    // CSV Headers
    const headers = ['วันที่-เวลา', 'แผนก', 'ผู้ดำเนินการ', 'LOT No.', 'SKU', 'ถัง/ชุดที่', 'สถานะ/Action', 'ยอดที่ได้ (ชิ้น)', 'หมายเหตุ']
    
    // Map data to rows
    const rows = historyItems.map(item => [
      new Date(item.timestamp).toLocaleString('th-TH'),
      item.process,
      item.user,
      item.lotNo || '-',
      item.sku || '-',
      item.tankNum,
      item.action,
      item.qty || '',
      item.note || ''
    ])

    // Convert to CSV string, handling quotes
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Add UTF-8 BOM for Thai language support in Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `WorkHistory_${startDate}_to_${endDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper to format status text
  const getStatusDisplay = (action: string) => {
    const actionMap: Record<string, {text: string, color: string}> = {
      'DONE': { text: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700' },
      'IN_PROGRESS': { text: 'กำลังดำเนินการ', color: 'bg-yellow-100 text-yellow-700' },
      'MOVED': { text: 'ส่งต่อ', color: 'bg-sky-100 text-sky-700' },
      'SENT_TO_POF': { text: 'ไปห้อง POF', color: 'bg-sky-100 text-sky-700' },
      'SENT_TO_BOX': { text: 'ไปลงลัง', color: 'bg-sky-100 text-sky-700' },
      'SENT_TO_QC': { text: 'ส่ง QC', color: 'bg-sky-100 text-sky-700' },
      'SOAKING': { text: 'กำลังแช่', color: 'bg-orange-100 text-orange-700' },
      'MIXING': { text: 'กำลังปั่น', color: 'bg-[#D4AF37]/ text-[#D4AF37]' },
      'QC_PASS': { text: 'QC PASS', color: 'bg-green-100 text-green-700' },
      'PAUSED': { text: 'HOLD/PAUSED', color: 'bg-orange-100 text-orange-700' },
      'FAILED': { text: 'REJECT', color: 'bg-red-100 text-red-700' },
      'REPROCESS': { text: 'REPROCESS', color: 'bg-purple-100 text-purple-700' }
    }
    
    const mapped = actionMap[action]
    if (mapped) {
      return <Badge variant="secondary" className={mapped.color}>{mapped.text}</Badge>
    }
    return <Badge variant="outline">{action}</Badge>
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
          <FileText className="w-8 h-8 text-indigo-600" />
          รายงานประวัติการทำงาน (Work History)
        </h1>
        <p className="text-slate-500 mt-1 text-sm">ดูและส่งออกประวัติการทำงานของพนักงานตามช่วงเวลาและแผนกที่เลือก</p>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">วันที่เริ่มต้น</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">วันที่สิ้นสุด</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-2 flex-1 max-w-[250px]">
              <label className="text-sm font-medium text-slate-700">แผนก (Process)</label>
              <Select value={processFilter} onValueChange={setProcessFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">รวมทุกแผนก</SelectItem>
                  <SelectItem value="WEIGHING">ชั่งสาร (Weighing)</SelectItem>
                  <SelectItem value="MIXING">งานผสม (Mixing)</SelectItem>
                  <SelectItem value="PACKING">งานบรรจุ (Packing)</SelectItem>
                  <SelectItem value="POF">ห้องอุโมงค์ลงลัง (POF)</SelectItem>
                  <SelectItem value="QC">ตรวจสอบคุณภาพ (QC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 max-w-[250px]">
              <label className="text-sm font-medium text-slate-700">ค้นหา SKU / LOT</label>
              <Input 
                placeholder="ค้นหา..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchHistory} className="bg-[#D4AF37] hover:bg-[#B8962A] min-w-[120px]" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                ค้นหาข้อมูล
              </Button>
              <Button onClick={exportToCSV} variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" disabled={historyItems.length === 0 || loading}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <Card className="border-0 shadow-md ring-1 ring-slate-200">
          <CardHeader className="bg-[#F8F6F0] border-b py-4">
            <CardTitle className="text-base font-semibold text-slate-800 flex justify-between items-center">
              <span>ผลการค้นหา</span>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-normal">
                พบ {historyItems.length} รายการ
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                <p>กำลังดึงข้อมูล...</p>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Calendar className="w-12 h-12 mb-4 text-slate-200" />
                <p>ไม่พบประวัติการทำงานในช่วงเวลาที่กำหนด</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px]">
                <Table>
                  <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                    <TableRow>
                      <TableHead className="font-medium min-w-[150px]">วันที่-เวลา</TableHead>
                      <TableHead className="font-medium">แผนก</TableHead>
                      <TableHead className="font-medium min-w-[150px]">ผู้ดำเนินการ</TableHead>
                      <TableHead className="font-medium">LOT No.</TableHead>
                      <TableHead className="font-medium">ถัง/ชุดที่</TableHead>
                      <TableHead className="font-medium">สถานะ</TableHead>
                      <TableHead className="font-medium text-right">ยอดที่ได้ (ชิ้น)</TableHead>
                      <TableHead className="font-medium max-w-[200px]">หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {historyItems.filter(item => {
                      const term = searchQuery.toLowerCase()
                      const sku = (item.sku || '').toLowerCase()
                      const lotNo = (item.lotNo || '').toLowerCase()
                      return sku.includes(term) || lotNo.includes(term)
                    }).map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-[#F8F6F0] transition-colors">
                        <TableCell className="whitespace-nowrap text-slate-600">
                          {new Date(item.timestamp).toLocaleString('th-TH')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal border-slate-200">
                            {item.process}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-slate-700">
                          {item.user}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium text-[#D4AF37]">{item.lotNo}</span>
                          <div className="text-xs text-slate-400 mt-0.5">{item.sku}</div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {item.tankNum}
                        </TableCell>
                        <TableCell>
                          {getStatusDisplay(item.action)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {item.qty ? Number(item.qty).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 truncate max-w-[200px]" title={item.note}>
                          {item.note || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
