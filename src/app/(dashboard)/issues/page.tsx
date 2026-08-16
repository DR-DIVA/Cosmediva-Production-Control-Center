"use client";
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { 
  AlertTriangle, 
  Hammer, 
  PackageSearch, 
  ShieldAlert, 
  CheckCircle2, 
  PlusCircle, 
  History, 
  User,
  Leaf,
  Box,
  FlaskConical,
  Package,
  TrendingUp,
  Filter,
  ShieldCheck,
  X,
  Layers,
  Sparkles
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getUsers } from "@/app/actions/users"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface QualityStreamMetrics {
  total: number
  passed: number
  hold: number
  reject: number
  passedPct: string
  holdPct: string
  rejectPct: string
}

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
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null)
  const [masterUsers, setMasterUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState<string>('System')
  const [streamFilter, setStreamFilter] = useState<'ALL' | 'RM' | 'PM' | 'BULK' | 'FG'>('ALL')

  // Quality KPI Metrics state
  const [qualityStats, setQualityStats] = useState<{
    rm: QualityStreamMetrics
    pm: QualityStreamMetrics
    bulk: QualityStreamMetrics
    fg: QualityStreamMetrics
    overall: {
      total: number
      passed: number
      hold: number
      reject: number
      fpyPct: string
    }
  }>({
    rm: { total: 0, passed: 0, hold: 0, reject: 0, passedPct: '100.0', holdPct: '0.0', rejectPct: '0.0' },
    pm: { total: 0, passed: 0, hold: 0, reject: 0, passedPct: '100.0', holdPct: '0.0', rejectPct: '0.0' },
    bulk: { total: 0, passed: 0, hold: 0, reject: 0, passedPct: '100.0', holdPct: '0.0', rejectPct: '0.0' },
    fg: { total: 0, passed: 0, hold: 0, reject: 0, passedPct: '100.0', holdPct: '0.0', rejectPct: '0.0' },
    overall: { total: 0, passed: 0, hold: 0, reject: 0, fpyPct: '100.0' }
  })
  
  const fetchQualityMetrics = async () => {
    try {
      // 1. Fetch RM & PM data
      const { data: rmData } = await supabase
        .from('production_lot_rms')
        .select('id, rm_code, qc_status, warehouse_status')

      let rmTotal = 0, rmPassed = 0, rmHold = 0, rmReject = 0
      let pmTotal = 0, pmPassed = 0, pmHold = 0, pmReject = 0

      ;(rmData || []).forEach((item: any) => {
        const isPM = item.rm_code?.toLowerCase().startsWith('p') || item.rm_code?.startsWith('CMD1') || item.rm_code?.startsWith('CMD2')
        const qc = item.qc_status?.toUpperCase()

        if (isPM) {
          if (qc === 'PASSED' || qc === 'HOLD' || qc === 'REJECTED' || item.warehouse_status === 'RECEIVED') {
            pmTotal++
            if (qc === 'PASSED') pmPassed++
            else if (qc === 'HOLD') pmHold++
            else if (qc === 'REJECTED') pmReject++
          }
        } else {
          if (qc === 'PASSED' || qc === 'HOLD' || qc === 'REJECTED' || item.warehouse_status === 'RECEIVED') {
            rmTotal++
            if (qc === 'PASSED') rmPassed++
            else if (qc === 'HOLD') rmHold++
            else if (qc === 'REJECTED') rmReject++
          }
        }
      })

      // 2. Fetch Bulk data
      const { data: bulkData } = await supabase
        .from('production_logs')
        .select('id, status, tank_start, tank_end, total_tanks, tank_details, processes(process_name)')

      let bulkTotal = 0, bulkPassed = 0, bulkHold = 0, bulkReject = 0

      ;(bulkData || []).forEach((task: any) => {
        const pName = Array.isArray(task.processes) ? task.processes[0]?.process_name : (task.processes as any)?.process_name
        if (pName === 'รอ QC' || task.tank_details) {
          const details = task.tank_details || {}
          const start = parseInt(task.tank_start) || 1
          const end = parseInt(task.tank_end) || start
          for (let i = start; i <= end; i++) {
            const s = details[i]
            if (s && s !== 'WAITING' && s !== 'LOCKED') {
              bulkTotal++
              if (s === 'QC_PASS' || s === 'SENT_TO_PACKING' || s === 'COMPLETED') {
                bulkPassed++
              } else if (s === 'PAUSED' || s === 'REPROCESS' || s === 'HOLD') {
                bulkHold++
              } else if (s === 'FAILED' || s === 'REJECTED') {
                bulkReject++
              }
            }
          }
        }
      })

      // 3. Fetch FG data
      const { data: fgData } = await supabase
        .from('fg_inventory')
        .select('id, qc_status')

      let fgTotal = 0, fgPassed = 0, fgHold = 0, fgReject = 0

      ;(fgData || []).forEach((item: any) => {
        const qc = item.qc_status?.toUpperCase()
        if (qc) {
          fgTotal++
          if (qc === 'RELEASED' || qc === 'PASSED' || qc === 'QC_PASS') {
            fgPassed++
          } else if (qc === 'QUARANTINE' || qc === 'HOLD' || qc === 'PAUSED') {
            fgHold++
          } else if (qc === 'REJECTED' || qc === 'FAILED') {
            fgReject++
          }
        }
      })

      const calcPcts = (total: number, passed: number, hold: number, reject: number) => {
        const t = total > 0 ? total : 0
        return {
          total: t,
          passed,
          hold,
          reject,
          passedPct: t > 0 ? ((passed / t) * 100).toFixed(1) : '100.0',
          holdPct: t > 0 ? ((hold / t) * 100).toFixed(1) : '0.0',
          rejectPct: t > 0 ? ((reject / t) * 100).toFixed(1) : '0.0'
        }
      }

      const rmMetrics = calcPcts(rmTotal, rmPassed, rmHold, rmReject)
      const pmMetrics = calcPcts(pmTotal, pmPassed, pmHold, pmReject)
      const bulkMetrics = calcPcts(bulkTotal, bulkPassed, bulkHold, bulkReject)
      const fgMetrics = calcPcts(fgTotal, fgPassed, fgHold, fgReject)

      const grandTotal = rmTotal + pmTotal + bulkTotal + fgTotal
      const grandPassed = rmPassed + pmPassed + bulkPassed + fgPassed
      const grandHold = rmHold + pmHold + bulkHold + fgHold
      const grandReject = rmReject + pmReject + bulkReject + fgReject

      setQualityStats({
        rm: rmMetrics,
        pm: pmMetrics,
        bulk: bulkMetrics,
        fg: fgMetrics,
        overall: {
          total: grandTotal,
          passed: grandPassed,
          hold: grandHold,
          reject: grandReject,
          fpyPct: grandTotal > 0 ? ((grandPassed / grandTotal) * 100).toFixed(1) : '100.0'
        }
      })
    } catch (err) {
      console.error('Error fetching quality metrics:', err)
    }
  }

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
      .or('note.ilike.%[QC HOLD]%,note.ilike.%[QC REJECT]%,note.ilike.%[QC REPROCESS]%,note.ilike.%[แจ้งปัญหา]%')
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
          if ((line.includes('[QC ') || line.includes('[แจ้งปัญหา]')) && !line.includes('[Resolved') && !line.includes('> [QA Approved]')) {
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
      .or('note.ilike.%[Resolved%,note.ilike.%> [QA Approved]%')
      .order('updated_at', { ascending: false })
      .limit(50)
      
    const parsedResolved: any[] = []
    ;(resolvedData || []).forEach(task => {
      if (task.note) {
        const lines = task.note.split('\n').filter((l: string) => l.trim())
        lines.forEach((line: string, idx: number) => {
          if ((line.includes('[QC ') || line.includes('[แจ้งปัญหา]')) && (line.includes('[Resolved') || line.includes('> [QA Approved]'))) {
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
    const { data } = await supabase.from('production_logs')
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

  const handleRefreshAll = () => {
    fetchIssues()
    fetchActiveTasks()
    fetchQualityMetrics()
    toast.success('รีเฟรชข้อมูลคุณภาพล่าสุดแล้ว')
  }

  useEffect(() => {
    const initData = async () => {
      let uList: any[] = []
      try {
        const res = await getUsers()
        if (res.success && res.data) {
          uList = res.data
          setMasterUsers(res.data)
        }
      } catch (err) {
        console.error('Error fetching master users:', err)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const email = user.email || ''
        const prefix = email.includes('@') ? email.split('@')[0].toLowerCase() : email.toLowerCase()
        
        const matched = uList.find(u => 
          u.id === user.id || 
          u.employee_id?.toLowerCase() === prefix ||
          u.employee_id?.toLowerCase() === user.user_metadata?.employee_id?.toLowerCase()
        )

        if (matched) {
          setCurrentUserInfo(matched)
          setCurrentUser(matched.employee_id.toUpperCase())
        } else {
          const empId = user.user_metadata?.employee_id 
            ? user.user_metadata.employee_id.toUpperCase() 
            : (prefix && prefix !== 'system' ? prefix.toUpperCase() : 'QA')
          setCurrentUser(empId)
        }
      }
    }

    initData()
    fetchIssues()
    fetchActiveTasks()
    fetchQualityMetrics()
  }, [])

  const openResolveDialog = (issue: any) => {
    setResolvingIssue(issue)
    setResolveNote('')
    setIsResolveOpen(true)
  }

  const handleResolveConfirm = async () => {
    if (!resolvingIssue) return
    
    const timestamp = new Date().toLocaleString('th-TH')
    const inspector = (currentUserInfo?.employee_id || currentUser || 'QA').toUpperCase()
    const resolutionText = resolveNote.trim() 
      ? ` > [QA Approved] ${resolveNote.replace(/\n/g, ' ')} (โดย ${inspector} - ${timestamp})` 
      : ` > [QA Approved] ตรวจสอบและอนุมัติแล้ว (โดย ${inspector} - ${timestamp})`
    
    const lines = resolvingIssue.originalNote.split('\n')
    lines[resolvingIssue.lineIndex] = `${lines[resolvingIssue.lineIndex]}${resolutionText}`
    const newNote = lines.join('\n')
    
    // Check if there are any lines left without [Resolved or > [QA Approved]
    const allResolved = lines.filter((l: string) => l.trim() && (l.includes('[QC ') || l.includes('[แจ้งปัญหา]')) && !l.includes('[Resolved') && !l.includes('> [QA Approved]')).length === 0
    
    const updateData: any = { note: newNote }
    if (resolvingIssue.status === 'PAUSED') {
      updateData.status = allResolved ? 'WAITING' : 'PAUSED'
    }

    const { error } = await supabase.from('production_logs').update(updateData).eq('id', resolvingIssue.id)

    if (error) {
      toast.error('บันทึกการแก้ไขปัญหาล้มเหลว')
      return
    }

    toast.success('แก้ไขปัญหาเรียบร้อยแล้ว')
    setIsResolveOpen(false)
    setResolvingIssue(null)
    fetchIssues()
    fetchActiveTasks()
    fetchQualityMetrics()
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
    fetchQualityMetrics()
  }

  const getIssueStyle = (note: string = '') => {
    if (note.includes('[QC REJECT]')) return 'bg-red-50 text-red-700 border-red-200'
    if (note.includes('[QC HOLD]')) return 'bg-orange-50 text-orange-700 border-orange-200'
    if (note.includes('[QC REPROCESS]')) return 'bg-purple-50 text-purple-700 border-purple-200'
    if (note.includes('[ช่างซ่อม]')) return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    if (note.includes('[รอของ]')) return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    return 'bg-[#F8F6F0] text-slate-700 border-slate-200'
  }

  // Filter issues based on search & active quality stream
  const filterIssuesList = (list: any[]) => {
    return list.filter(i => {
      // 1. Search Query
      const term = searchQuery.toLowerCase()
      const sku = (i.production_lots?.products?.sku || '').toLowerCase()
      const lotNo = (i.production_lots?.lot_no || '').toLowerCase()
      const matchesSearch = !term || sku.includes(term) || lotNo.includes(term)
      if (!matchesSearch) return false

      // 2. Stream Filter
      if (streamFilter === 'ALL') return true
      const note = i.parsedNote || ''
      const proc = i.processes?.process_name || ''
      if (streamFilter === 'RM') {
        return (note.includes('RM/PM') || note.includes(' RM [') || note.includes(' RM:')) && !note.includes(' PM [') && !note.includes(' PM:')
      }
      if (streamFilter === 'PM') {
        return note.includes(' PM [') || note.includes(' PM:')
      }
      if (streamFilter === 'BULK') {
        return note.includes(' ถัง ') || proc === 'รอ QC' || proc === 'ผสม'
      }
      if (streamFilter === 'FG') {
        return note.includes(' FG ') || note.includes(' FG(')
      }
      return true
    })
  }

  const activeFilteredIssues = filterIssuesList(issues)
  const resolvedFilteredIssues = filterIssuesList(resolvedIssues)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500 shrink-0" />
            CosmeFlow Assurance
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
            <div>Issues NC/CAR, Reprocess, Return, Complaint</div>
            <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              From QA Inspection to Confidence • Quality Performance Standard
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
            <Button onClick={handleRefreshAll} variant="outline" className="whitespace-nowrap">
              รีเฟรชข้อมูล
            </Button>
          </div>
        </div>
      </div>

      {/* 1. Executive Summary Bar */}
      <div className="bg-gradient-to-r from-[#2D2721] via-[#3E352B] to-[#2D2721] text-white p-5 rounded-2xl shadow-xl border border-[#D4AF37]/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-white flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Quality Yield & Performance Metrics
            </div>
            <div className="text-lg md:text-xl font-black text-white mt-0.5">
              Executive Quality Assurance KPI
            </div>
            <div className="text-xs text-stone-300 mt-0.5">
              มาตรฐานคุณภาพโรงงาน • ตรวจสอบสถิติ First-Pass Yield (FPY) และจุดเสี่ยง 4 สายการผลิต
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Overall FPY */}
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center">
            <div className="text-[11px] text-stone-300 font-medium">Overall FPY (อัตราผ่านรวม)</div>
            <div className="text-2xl font-black text-[#D4AF37] tracking-tight">
              {qualityStats.overall.fpyPct}%
            </div>
          </div>

          {/* Total Inspected */}
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center">
            <div className="text-[11px] text-stone-300 font-medium">ยอดตรวจรวมทั้งหมด</div>
            <div className="text-2xl font-black text-white">
              {qualityStats.overall.total} <span className="text-xs font-normal text-stone-300">รายการ</span>
            </div>
          </div>

          {/* Total Passed */}
          <div className="bg-emerald-500/15 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-400/30 text-center">
            <div className="text-[11px] text-emerald-200 font-medium">ผ่านเกณฑ์รวม (Passed)</div>
            <div className="text-2xl font-black text-emerald-400">
              {qualityStats.overall.passed} <span className="text-xs font-normal text-emerald-200">รายการ</span>
            </div>
          </div>

          {/* Open Issues Waiting QA */}
          <div className="bg-amber-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-400/30 text-center">
            <div className="text-[11px] text-amber-200 font-medium">ปัญหาที่รอ QA จัดการ</div>
            <div className="text-2xl font-black text-amber-300">
              {issues.length} <span className="text-xs font-normal text-amber-200">เคส</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four Quality Inspection Stream KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Raw Material (RM) */}
        <Card 
          onClick={() => setStreamFilter(streamFilter === 'RM' ? 'ALL' : 'RM')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${streamFilter === 'RM' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">1. วัตถุดิบ (RM)</div>
                  <div className="text-[11px] text-slate-500">Raw Material</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 font-semibold text-slate-700">
                เข้าตรวจ {qualityStats.rm.total}
              </Badge>
            </div>

            {/* Pass Rate Big Display */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-emerald-600">{qualityStats.rm.passedPct}%</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">Pass Rate</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                {qualityStats.rm.passed}/{qualityStats.rm.total}
              </Badge>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${qualityStats.rm.passedPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`Passed: ${qualityStats.rm.passedPct}%`} />
              <div style={{ width: `${qualityStats.rm.holdPct}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Hold: ${qualityStats.rm.holdPct}%`} />
              <div style={{ width: `${qualityStats.rm.rejectPct}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Reject: ${qualityStats.rm.rejectPct}%`} />
            </div>

            {/* Sub Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">ผ่าน (Pass)</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{qualityStats.rm.passed}</div>
                <div className="text-[9px] text-emerald-600 font-medium">{qualityStats.rm.passedPct}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                <div className="text-[10px] font-semibold text-amber-700">กัก (Hold)</div>
                <div className="text-xs font-bold text-amber-800 mt-0.5">{qualityStats.rm.hold}</div>
                <div className="text-[9px] text-amber-600 font-medium">{qualityStats.rm.holdPct}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <div className="text-[10px] font-semibold text-rose-700">ไม่ผ่าน (Rej)</div>
                <div className="text-xs font-bold text-rose-800 mt-0.5">{qualityStats.rm.reject}</div>
                <div className="text-[9px] text-rose-600 font-medium">{qualityStats.rm.rejectPct}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Packaging Material (PM) */}
        <Card 
          onClick={() => setStreamFilter(streamFilter === 'PM' ? 'ALL' : 'PM')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${streamFilter === 'PM' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-sm">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">2. บรรจุภัณฑ์ (PM)</div>
                  <div className="text-[11px] text-slate-500">Packaging</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 font-semibold text-slate-700">
                เข้าตรวจ {qualityStats.pm.total}
              </Badge>
            </div>

            {/* Pass Rate Big Display */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-blue-600">{qualityStats.pm.passedPct}%</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">Pass Rate</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                {qualityStats.pm.passed}/{qualityStats.pm.total}
              </Badge>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${qualityStats.pm.passedPct}%` }} className="bg-blue-500 h-full transition-all duration-500" title={`Passed: ${qualityStats.pm.passedPct}%`} />
              <div style={{ width: `${qualityStats.pm.holdPct}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Hold: ${qualityStats.pm.holdPct}%`} />
              <div style={{ width: `${qualityStats.pm.rejectPct}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Reject: ${qualityStats.pm.rejectPct}%`} />
            </div>

            {/* Sub Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">ผ่าน (Pass)</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">{qualityStats.pm.passed}</div>
                <div className="text-[9px] text-blue-600 font-medium">{qualityStats.pm.passedPct}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                <div className="text-[10px] font-semibold text-amber-700">กัก (Hold)</div>
                <div className="text-xs font-bold text-amber-800 mt-0.5">{qualityStats.pm.hold}</div>
                <div className="text-[9px] text-amber-600 font-medium">{qualityStats.pm.holdPct}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <div className="text-[10px] font-semibold text-rose-700">ไม่ผ่าน (Rej)</div>
                <div className="text-xs font-bold text-rose-800 mt-0.5">{qualityStats.pm.reject}</div>
                <div className="text-[9px] text-rose-600 font-medium">{qualityStats.pm.rejectPct}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Bulk (งานผสม) */}
        <Card 
          onClick={() => setStreamFilter(streamFilter === 'BULK' ? 'ALL' : 'BULK')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${streamFilter === 'BULK' ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/50' : 'border-slate-200 hover:border-purple-300 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-sm">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">3. งานผสม (Bulk)</div>
                  <div className="text-[11px] text-slate-500">Bulk Production</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 font-semibold text-slate-700">
                เข้าตรวจ {qualityStats.bulk.total} ถัง
              </Badge>
            </div>

            {/* Pass Rate Big Display */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-purple-600">{qualityStats.bulk.passedPct}%</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">Pass Rate</span>
              </div>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">
                {qualityStats.bulk.passed}/{qualityStats.bulk.total}
              </Badge>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${qualityStats.bulk.passedPct}%` }} className="bg-purple-500 h-full transition-all duration-500" title={`Passed: ${qualityStats.bulk.passedPct}%`} />
              <div style={{ width: `${qualityStats.bulk.holdPct}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Hold: ${qualityStats.bulk.holdPct}%`} />
              <div style={{ width: `${qualityStats.bulk.rejectPct}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Reject: ${qualityStats.bulk.rejectPct}%`} />
            </div>

            {/* Sub Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-100">
                <div className="text-[10px] font-semibold text-purple-700">ผ่าน (Pass)</div>
                <div className="text-xs font-bold text-purple-800 mt-0.5">{qualityStats.bulk.passed}</div>
                <div className="text-[9px] text-purple-600 font-medium">{qualityStats.bulk.passedPct}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                <div className="text-[10px] font-semibold text-amber-700">กัก/แก้ (Hold)</div>
                <div className="text-xs font-bold text-amber-800 mt-0.5">{qualityStats.bulk.hold}</div>
                <div className="text-[9px] text-amber-600 font-medium">{qualityStats.bulk.holdPct}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <div className="text-[10px] font-semibold text-rose-700">ไม่ผ่าน (Rej)</div>
                <div className="text-xs font-bold text-rose-800 mt-0.5">{qualityStats.bulk.reject}</div>
                <div className="text-[9px] text-rose-600 font-medium">{qualityStats.bulk.rejectPct}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Finished Goods (FG) */}
        <Card 
          onClick={() => setStreamFilter(streamFilter === 'FG' ? 'ALL' : 'FG')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${streamFilter === 'FG' ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30 bg-amber-50/50' : 'border-slate-200 hover:border-[#D4AF37]/50 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-[#8B7355] flex items-center justify-center font-bold shadow-sm">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">4. สำเร็จรูป (FG)</div>
                  <div className="text-[11px] text-slate-500">Finished Goods</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 font-semibold text-slate-700">
                เข้าตรวจ {qualityStats.fg.total}
              </Badge>
            </div>

            {/* Pass Rate Big Display */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-[#D4AF37]">{qualityStats.fg.passedPct}%</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">Release Rate</span>
              </div>
              <Badge className="bg-amber-100 text-[#8B7355] border-amber-200 text-[10px] font-bold">
                {qualityStats.fg.passed}/{qualityStats.fg.total}
              </Badge>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${qualityStats.fg.passedPct}%` }} className="bg-[#D4AF37] h-full transition-all duration-500" title={`Passed: ${qualityStats.fg.passedPct}%`} />
              <div style={{ width: `${qualityStats.fg.holdPct}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Quarantine: ${qualityStats.fg.holdPct}%`} />
              <div style={{ width: `${qualityStats.fg.rejectPct}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Reject: ${qualityStats.fg.rejectPct}%`} />
            </div>

            {/* Sub Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                <div className="text-[10px] font-semibold text-[#8B7355]">ปล่อย (Release)</div>
                <div className="text-xs font-bold text-amber-900 mt-0.5">{qualityStats.fg.passed}</div>
                <div className="text-[9px] text-[#8B7355] font-medium">{qualityStats.fg.passedPct}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-orange-50/70 border border-orange-100">
                <div className="text-[10px] font-semibold text-orange-700">กัก (Quaran)</div>
                <div className="text-xs font-bold text-orange-800 mt-0.5">{qualityStats.fg.hold}</div>
                <div className="text-[9px] text-orange-600 font-medium">{qualityStats.fg.holdPct}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <div className="text-[10px] font-semibold text-rose-700">ไม่ผ่าน (Rej)</div>
                <div className="text-xs font-bold text-rose-800 mt-0.5">{qualityStats.fg.reject}</div>
                <div className="text-[9px] text-rose-600 font-medium">{qualityStats.fg.rejectPct}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Bar (when a stream is clicked) */}
      {streamFilter !== 'ALL' && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm text-amber-900 font-medium">
            <Filter className="w-4 h-4 text-amber-700" />
            <span>กำลังกรองแสดงเฉพาะปัญหาของหมวด: <strong>{
              streamFilter === 'RM' ? '🌿 วัตถุดิบ (Raw Material)' :
              streamFilter === 'PM' ? '📦 บรรจุภัณฑ์ (Packaging)' :
              streamFilter === 'BULK' ? '🧪 งานผสม (Bulk Production)' :
              '🎁 สินค้าสำเร็จรูป (Finished Goods)'
            }</strong></span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setStreamFilter('ALL')}
            className="text-amber-800 hover:text-amber-950 hover:bg-amber-100 h-8 px-2.5 text-xs font-semibold"
          >
            <X className="w-3.5 h-3.5 mr-1" /> แสดงทั้งหมด (Clear Filter)
          </Button>
        </div>
      )}

      {/* 3. Issue Management Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            ปัญหาที่รอการแก้ไข ({activeFilteredIssues.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center">
            <History className="w-4 h-4 mr-2" />
            ประวัติการแก้ไขล่าสุด ({resolvedFilteredIssues.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>รายการปัญหาที่ต้องแก้ไข</span>
                {streamFilter !== 'ALL' && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
                    Filter: {streamFilter}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">SKU</TableHead>
                    <TableHead className="whitespace-nowrap">LOT No.</TableHead>
                    <TableHead className="w-[25%]">สินค้า</TableHead>
                    <TableHead className="whitespace-nowrap">ขั้นตอน / ห้อง</TableHead>
                    <TableHead className="w-[35%]">รายละเอียดปัญหา</TableHead>
                    <TableHead className="whitespace-nowrap">เวลาที่แจ้ง</TableHead>
                    <TableHead className="text-right whitespace-nowrap">จัดการ (QA)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeFilteredIssues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        {streamFilter !== 'ALL' 
                          ? `ไม่พบปัญหาในหมวด ${streamFilter} ที่เปิดอยู่ในขณะนี้ 🎉` 
                          : 'ไม่มีปัญหาที่เปิดอยู่ในขณะนี้ 🎉'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeFilteredIssues.map((issue, idx) => (
                      <TableRow key={`${issue.id}-${issue.lineIndex}-${idx}`}>
                        <TableCell className="font-medium text-purple-600 whitespace-nowrap">
                          <span className="whitespace-nowrap">{issue.production_lots?.products?.sku || '-'}</span>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 w-fit whitespace-nowrap">{issue.production_lots?.lot_no}</Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-normal break-words" title={issue.production_lots?.products?.product_name}>
                          {issue.production_lots?.products?.product_name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-sm font-semibold whitespace-nowrap">
                              {(() => {
                                const note = issue.parsedNote || ''
                                if (note.includes('RM/PM') || note.includes(' RM [') || note.includes(' RM:')) return 'QC RM'
                                if (note.includes(' PM [') || note.includes(' PM:')) return 'QC PM'
                                if (note.includes(' FG ') || note.includes(' FG(')) return 'QC FG'
                                if (note.includes(' ถัง ')) return 'QC Bulk'
                                if (issue.processes?.process_name === 'รอ QC') return 'QC Bulk'
                                return issue.processes?.process_name
                              })()}
                            </span>
                            {issue.rooms?.room_name && <span className="text-xs text-slate-500 whitespace-nowrap">({issue.rooms.room_name})</span>}
                          </div>
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
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {new Date(issue.updated_at).toLocaleString('th-TH')}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
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
              <CardTitle className="text-lg flex items-center justify-between">
                <span>ประวัติปัญหาที่แก้ไขแล้ว (50 รายการล่าสุด)</span>
                {streamFilter !== 'ALL' && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
                    Filter: {streamFilter}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">SKU</TableHead>
                    <TableHead className="whitespace-nowrap">LOT No.</TableHead>
                    <TableHead className="whitespace-nowrap">ขั้นตอน / ห้อง</TableHead>
                    <TableHead className="w-[50%]">รายละเอียด / บันทึกการแก้ไข</TableHead>
                    <TableHead className="whitespace-nowrap">ผู้ตรวจสอบ (QA)</TableHead>
                    <TableHead className="whitespace-nowrap">เวลาที่แก้ไขล่าสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedFilteredIssues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        {streamFilter !== 'ALL' 
                          ? `ไม่พบประวัติการแก้ไขในหมวด ${streamFilter}` 
                          : 'ยังไม่มีประวัติการแก้ไขปัญหา'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    resolvedFilteredIssues.map((issue, idx) => (
                      <TableRow key={`${issue.id}-${issue.lineIndex}-${idx}`} className="opacity-75">
                        <TableCell className="font-medium text-purple-600 whitespace-nowrap">
                          <span className="whitespace-nowrap">{issue.production_lots?.products?.sku || '-'}</span>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 w-fit whitespace-nowrap">{issue.production_lots?.lot_no}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-sm font-semibold whitespace-nowrap">
                              {(() => {
                                const note = issue.parsedNote || ''
                                if (note.includes('RM/PM') || note.includes(' RM [') || note.includes(' RM:')) return 'QC RM'
                                if (note.includes(' PM [') || note.includes(' PM:')) return 'QC PM'
                                if (note.includes(' FG ') || note.includes(' FG(')) return 'QC FG'
                                if (note.includes(' ถัง ')) return 'QC Bulk'
                                if (issue.processes?.process_name === 'รอ QC') return 'QC Bulk'
                                return issue.processes?.process_name
                              })()}
                            </span>
                          </div>
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
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center text-xs text-slate-700 whitespace-nowrap">
                            <User className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
                            {(() => {
                              const match = issue.parsedNote.match(/\(โดย (.*?) - /)
                              const inspectorId = match ? match[1] : '-'
                              const matchedUser = masterUsers.find(u => u.employee_id?.toLowerCase() === inspectorId.toLowerCase())
                              return (
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="bg-amber-50 text-[#8B7355] border-[#D4AF37]/30 font-bold px-2 py-0.5">
                                    {inspectorId}
                                  </Badge>
                                  {matchedUser && (
                                    <span className="text-slate-500 font-normal">({matchedUser.full_name})</span>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
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

      {/* Modal: Report New Issue */}
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

      {/* Modal: Resolve Issue (QA) */}
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>บันทึกการแก้ไขปัญหา (QA Resolution)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-[#F8F6F0] p-3.5 rounded-xl border border-[#D4AF37]/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#8B7355] font-medium">ผู้ตรวจสอบ (QA) ที่บันทึกรายการ</div>
                <div className="text-sm font-bold text-[#4A4238] flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-mono">{currentUserInfo?.employee_id || currentUser || 'QA'}</span>
                  {currentUserInfo?.full_name && (
                    <span className="text-xs font-normal text-slate-600">({currentUserInfo.full_name})</span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="bg-[#D4AF37]/15 text-[#8B7355] border-[#D4AF37]/40 text-xs">
                Auto-Stamp
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">หมายเหตุ / วิธีแก้ไข / ข้อสรุป NC (ตัวเลือก)</Label>
              <Textarea 
                value={resolveNote} 
                onChange={(e) => setResolveNote(e.target.value)} 
                placeholder="ระบุวิธีการแก้ไขปัญหา, ข้อสรุปการจัดการ NC, หรือผลตรวจซ้ำ..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveOpen(false)}>ยกเลิก</Button>
            <Button 
              onClick={handleResolveConfirm} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              บันทึกและปิดปัญหา
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
