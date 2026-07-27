"use client";
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { AlertTriangle, Hammer, PackageSearch, ShieldAlert, CheckCircle2, PlusCircle, History } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([])
  const [resolvedIssues, setResolvedIssues] = useState<any[]>([])
  const [activeTasks, setActiveTasks] = useState<any[]>([])
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [reportNote, setReportNote] = useState('')
  
  const [isResolveOpen, setIsResolveOpen] = useState(false)
  const [resolvingIssue, setResolvingIssue] = useState<any>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const fetchIssues = async () => {
    const { data, error } = await supabase.from('production_logs')
      .select(`
        id,
        status,
        note,
        updated_at,
        tank_start,
        tank_end,
        production_lots (
          lot_no,
          products:sku_id (product_name, sku)
        ),
        processes (process_name),
        rooms (room_name)
      `)
      .eq('status', 'PAUSED')
      .order('updated_at', { ascending: false })

    if (error) {
      toast.error('โหลดข้อมูลปัญหาล้มเหลว')
      return
    }

    const parsedActive: any[] = []
    ;(data || []).forEach(task => {
      if (task.note) {
        const lines = task.note.split('\n').filter((l: string) => l.trim())
        lines.forEach((line: string, idx: number) => {
          if (!line.includes('[Resolved')) {
            parsedActive.push({
              ...task,
              parsedNote: line,
              lineIndex: idx,
              originalNote: task.note
            })
          }
        })
      }
    })
    setIssues(parsedActive)
    
    // Fetch Resolved Issues
    const { data: resolvedData } = await supabase.from('production_logs')
      .select(`
        id, status, note, updated_at, tank_start, tank_end,
        production_lots (lot_no, products:sku_id (product_name, sku)),
        processes (process_name), rooms (room_name)
      `)
      .ilike('note', '%[Resolved%')
      .order('updated_at', { ascending: false })
      .limit(50)
      
    const parsedResolved: any[] = []
    ;(resolvedData || []).forEach(task => {
      if (task.note) {
        const lines = task.note.split('\n').filter((l: string) => l.trim())
        lines.forEach((line: string, idx: number) => {
          if (line.includes('[Resolved')) {
            parsedResolved.push({
              ...task,
              parsedNote: line,
              lineIndex: idx,
              originalNote: task.note
            })
          }
        })
      }
    })
    setResolvedIssues(parsedResolved)
  }

  const fetchActiveTasks = async () => {
    const { data, error } = await supabase.from('production_logs')
      .select(`
        id,
        status,
        production_lots (
          lot_no,
          products:sku_id (product_name)
        ),
        processes (process_name)
      `)
      .in('status', ['WAITING', 'IN_PROGRESS'])
      .order('updated_at', { ascending: false })

    if (data) {
      setActiveTasks(data)
    }
  }

  useEffect(() => {
    fetchIssues()
    fetchActiveTasks()
  }, [])

  const openResolveDialog = (issue: any) => {
    setResolvingIssue(issue)
    setResolveNote('')
    setIsResolveOpen(true)
  }

  const handleResolveConfirm = async () => {
    if (!resolvingIssue) return
    
    const timestamp = new Date().toLocaleString('th-TH')
    const resolutionText = resolveNote.trim() ? `[Resolved: ${resolveNote.replace(/\n/g, ' ')} - ${timestamp}]` : `[Resolved: ${timestamp}]`
    
    const lines = resolvingIssue.originalNote.split('\n')
    lines[resolvingIssue.lineIndex] = `${lines[resolvingIssue.lineIndex]} ${resolutionText}`
    const newNote = lines.join('\n')
    
    // Check if there are any lines left without [Resolved
    const allResolved = lines.filter((l: string) => l.trim() && !l.includes('[Resolved')).length === 0
    
    const { error } = await supabase.from('production_logs').update({
      status: allResolved ? 'WAITING' : 'PAUSED', // กลับไปรอทำงานต่อเมื่อแก้ปัญหาครบทุกข้อความ
      note: newNote
    }).eq('id', resolvingIssue.id)

    if (error) {
      toast.error('บันทึกการแก้ไขปัญหาล้มเหลว')
      return
    }

    toast.success('แก้ไขปัญหาเรียบร้อยแล้ว')
    setIsResolveOpen(false)
    setResolvingIssue(null)
    fetchIssues()
    fetchActiveTasks()
  }

  const handleReportSubmit = async () => {
    if (!selectedTaskId) {
      toast.error('กรุณาเลือกรายการที่เกิดปัญหา')
      return
    }
    if (!reportNote.trim()) {
      toast.error('กรุณาระบุรายละเอียดปัญหา')
      return
    }

    const { error } = await supabase.from('production_logs').update({
      status: 'PAUSED',
      note: `[แจ้งปัญหาใหม่] ${reportNote.replace(/\n/g, ' ')}`
    }).eq('id', selectedTaskId)

    if (error) {
      toast.error('บันทึกปัญหาล้มเหลว')
      return
    }

    toast.success('บันทึกปัญหาและระงับงานเรียบร้อยแล้ว')
    setIsReportOpen(false)
    setSelectedTaskId('')
    setReportNote('')
    fetchIssues()
    fetchActiveTasks()
  }

  // Summary counts
  const qcHoldCount = issues.filter(i => i.note?.includes('[QC HOLD]')).length
  const qcRejectCount = issues.filter(i => i.note?.includes('[QC REJECT]')).length
  const waitingMaterialCount = issues.filter(i => i.note?.includes('[รอของ]')).length
  const maintenanceCount = issues.filter(i => i.note?.includes('[ช่างซ่อม]')).length
  const otherCount = issues.length - (qcHoldCount + qcRejectCount + waitingMaterialCount + maintenanceCount)

  const getIssueStyle = (note: string = '') => {
    if (note.includes('[QC REJECT]')) return 'bg-red-50 text-red-700 border-red-200'
    if (note.includes('[QC HOLD]')) return 'bg-orange-50 text-orange-700 border-orange-200'
    if (note.includes('[QC REPROCESS]')) return 'bg-purple-50 text-purple-700 border-purple-200'
    if (note.includes('[ช่างซ่อม]')) return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    if (note.includes('[รอของ]')) return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    return 'bg-[#F8F6F0] text-slate-700 border-slate-200'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-400 shrink-0" />
            CosmeFlow Assurance
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>Issues NC/CAR, Reprocess, Return, Complaint</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              From QA Inspection to Confidence.
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          <div className="w-full sm:w-64">
            <Input 
              placeholder="ค้นหา SKU หรือ LOT..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsReportOpen(true)} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white whitespace-nowrap">
              <PlusCircle className="w-4 h-4 mr-2" />
              แจ้งปัญหาใหม่
            </Button>
            <Button onClick={fetchIssues} variant="outline" className="whitespace-nowrap">
              รีเฟรชข้อมูล
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-8 h-8 text-red-600 mb-2" />
            <div className="text-2xl font-bold text-red-700">{qcRejectCount}</div>
            <div className="text-xs text-red-600 font-medium">QC Reject</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-8 h-8 text-orange-600 mb-2" />
            <div className="text-2xl font-bold text-orange-700">{qcHoldCount}</div>
            <div className="text-xs text-orange-600 font-medium">QC Hold</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <PackageSearch className="w-8 h-8 text-yellow-600 mb-2" />
            <div className="text-2xl font-bold text-yellow-700">{waitingMaterialCount}</div>
            <div className="text-xs text-yellow-600 font-medium">รอของ / วัตถุดิบ</div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Hammer className="w-8 h-8 text-indigo-600 mb-2" />
            <div className="text-2xl font-bold text-indigo-700">{maintenanceCount}</div>
            <div className="text-xs text-indigo-600 font-medium">ช่างซ่อม / เครื่องเสีย</div>
          </CardContent>
        </Card>
        <Card className="bg-[#F8F6F0] border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-8 h-8 text-slate-600 mb-2" />
            <div className="text-2xl font-bold text-slate-700">{otherCount}</div>
            <div className="text-xs text-slate-600 font-medium">ปัญหาอื่นๆ</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            ปัญหาที่รอการแก้ไข ({issues.filter(i => {
              const term = searchQuery.toLowerCase();
              const sku = (i.production_lots?.products?.sku || '').toLowerCase();
              const lotNo = (i.production_lots?.lot_no || '').toLowerCase();
              return sku.includes(term) || lotNo.includes(term);
            }).length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center">
            <History className="w-4 h-4 mr-2" />
            ประวัติการแก้ไขล่าสุด ({resolvedIssues.filter(i => {
              const term = searchQuery.toLowerCase();
              const sku = (i.production_lots?.products?.sku || '').toLowerCase();
              const lotNo = (i.production_lots?.lot_no || '').toLowerCase();
              return sku.includes(term) || lotNo.includes(term);
            }).length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">รายการปัญหาที่ต้องแก้ไข</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LOT No.</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>ขั้นตอน / ห้อง</TableHead>
                    <TableHead>รายละเอียดปัญหา</TableHead>
                    <TableHead>เวลาที่แจ้ง</TableHead>
                    <TableHead className="text-right">จัดการ (QA)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.filter(i => {
                    const term = searchQuery.toLowerCase();
                    const sku = (i.production_lots?.products?.sku || '').toLowerCase();
                    const lotNo = (i.production_lots?.lot_no || '').toLowerCase();
                    return sku.includes(term) || lotNo.includes(term);
                  }).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        ไม่มีปัญหาที่เปิดอยู่ในขณะนี้ 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    issues.filter(i => {
                      const term = searchQuery.toLowerCase();
                      const sku = (i.production_lots?.products?.sku || '').toLowerCase();
                      const lotNo = (i.production_lots?.lot_no || '').toLowerCase();
                      return sku.includes(term) || lotNo.includes(term);
                    }).map((issue, idx) => (
                      <TableRow key={`${issue.id}-${issue.lineIndex}-${idx}`}>
                        <TableCell className="font-medium">{issue.production_lots?.lot_no}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={issue.production_lots?.products?.product_name}>
                          {issue.production_lots?.products?.product_name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">{issue.processes?.process_name}</div>
                          {issue.rooms?.room_name && <div className="text-xs text-slate-500">{issue.rooms.room_name}</div>}
                        </TableCell>
                        <TableCell>
                          <div className={`text-xs p-2 rounded border inline-block ${getIssueStyle(issue.parsedNote)}`}>
                            <div className="mb-0.5 whitespace-pre-wrap">
                              {issue.parsedNote.includes('[') ? 
                                <span><strong>{issue.parsedNote.split(']')[0] + ']'}</strong> {issue.parsedNote.split(']').slice(1).join(']')}</span> : 
                                <span>{issue.parsedNote}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {new Date(issue.updated_at).toLocaleString('th-TH')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            onClick={() => openResolveDialog(issue)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> รับทราบ / แก้ไขแล้ว
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resolved">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ประวัติปัญหาที่แก้ไขแล้ว (50 รายการล่าสุด)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LOT No.</TableHead>
                    <TableHead>ขั้นตอน</TableHead>
                    <TableHead>รายละเอียด / บันทึกการแก้ไข</TableHead>
                    <TableHead>เวลาที่แก้ไขล่าสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedIssues.filter(i => {
                    const term = searchQuery.toLowerCase();
                    const sku = (i.production_lots?.products?.sku || '').toLowerCase();
                    const lotNo = (i.production_lots?.lot_no || '').toLowerCase();
                    return sku.includes(term) || lotNo.includes(term);
                  }).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        ยังไม่มีประวัติการแก้ไขปัญหา
                      </TableCell>
                    </TableRow>
                  ) : (
                    resolvedIssues.filter(i => {
                      const term = searchQuery.toLowerCase();
                      const sku = (i.production_lots?.products?.sku || '').toLowerCase();
                      const lotNo = (i.production_lots?.lot_no || '').toLowerCase();
                      return sku.includes(term) || lotNo.includes(term);
                    }).map((issue, idx) => (
                      <TableRow key={`${issue.id}-${issue.lineIndex}-${idx}`} className="opacity-75">
                        <TableCell className="font-medium">{issue.production_lots?.lot_no}</TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">{issue.processes?.process_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`text-xs p-2 rounded border inline-block bg-[#F8F6F0] text-slate-700 border-slate-200`}>
                            <div className="mb-0.5 whitespace-pre-wrap">
                              {issue.parsedNote.includes('[') ? 
                                <span><strong className={issue.parsedNote.includes('Resolved') ? 'text-green-600' : ''}>{issue.parsedNote.split(']')[0] + ']'}</strong> {issue.parsedNote.split(']').slice(1).join(']')}</span> : 
                                <span>{issue.parsedNote}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {new Date(issue.updated_at).toLocaleString('th-TH')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แจ้งปัญหาการผลิตใหม่</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>รายการงานที่เกิดปัญหา (เลือกจากงานที่เปิดอยู่)</Label>
              <select 
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- กรุณาเลือกรายการงาน --</option>
                {activeTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    LOT: {t.production_lots?.lot_no} | ขั้นตอน: {t.processes?.process_name} ({t.status})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>รายละเอียดปัญหา</Label>
              <Textarea 
                value={reportNote} 
                onChange={(e) => setReportNote(e.target.value)} 
                placeholder="เช่น พบสิ่งเจือปน, อุณหภูมิไม่คงที่, สีเพี้ยน..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleReportSubmit} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white">บันทึกปัญหา</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>บันทึกการแก้ไขปัญหา</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>หมายเหตุ / วิธีแก้ไข (ตัวเลือก)</Label>
              <Textarea 
                value={resolveNote} 
                onChange={(e) => setResolveNote(e.target.value)} 
                placeholder="ระบุวิธีการแก้ไขปัญหา หรือคำแนะนำเพิ่มเติม..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleResolveConfirm} className="bg-green-600 hover:bg-green-700 text-white">บันทึกและปิดปัญหา</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
