'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Send, 
  Trash2, 
  RefreshCw,
  MessageSquare,
  Bot,
  HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { importLineChatHistory, getMtexKnowledgeStats, clearMtexChatHistory, askMtexAI } from '@/app/actions/mtex-ai'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ImportLineChatModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'import' | 'ask'>('import')
  const [rawText, setRawText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [stats, setStats] = useState<{
    chatCount: number
    workOrderCount: number
    machineCount: number
    sparePartCount: number
    recentChats: any[]
  }>({
    chatCount: 0,
    workOrderCount: 0,
    machineCount: 0,
    sparePartCount: 0,
    recentChats: []
  })

  // Ask AI Test state
  const [testQuery, setTestQuery] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [isAsking, setIsAsking] = useState(false)

  const loadStats = async () => {
    try {
      const res = await getMtexKnowledgeStats()
      setStats(res)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadStats()
      setAiAnswer('')
    }
  }, [isOpen])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.txt')) {
      toast.error('กรุณาเลือกไฟล์ประวัติแชทนามสกุล .txt')
      return
    }

    const reader = new FileReader()
    reader.onload = event => {
      const content = event.target?.result as string
      setRawText(content || '')
      toast.success(`โหลดไฟล์ ${file.name} สำเร็จ (${(file.size / 1024).toFixed(1)} KB)`)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!rawText.trim()) {
      toast.error('กรุณาเลือกไฟล์ .txt หรือวางข้อความแชทก่อนกดนำเข้า')
      return
    }

    setIsProcessing(true)
    try {
      const res = await importLineChatHistory(rawText)
      if (res.success) {
        toast.success(`🎉 นำเข้าสำเร็จ ${res.insertedCount} ข้อความ! (ตรวจพบการคุยเรื่องซ่อม ${res.troubleshootingCount} ข้อความ)`)
        setRawText('')
        await loadStats()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการนำเข้า')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติแชทที่นำเข้าทั้งหมด?')) return

    const res = await clearMtexChatHistory()
    if (res.success) {
      toast.success('ล้างประวัติแชทเรียบร้อยแล้ว')
      await loadStats()
    } else {
      toast.error(res.error || 'ล้างประวัติไม่สำเร็จ')
    }
  }

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testQuery.trim()) return

    setIsAsking(true)
    setAiAnswer('')
    try {
      const res = await askMtexAI(testQuery)
      setAiAnswer(res.answer)
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 border-stone-200">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 border border-emerald-300">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-stone-900">
                  คลังความรู้ช่าง & MTEX AI Assistant
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  นำเข้าประวัติแชทจาก LINE (.txt) เพื่อฝึกให้น้อง MTEX ค้นหาประวัติและตอบคำถามงานช่าง
                </DialogDescription>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('import')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'import' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                📥 นำเข้าไฟล์แชท
              </button>
              <button
                onClick={() => setActiveTab('ask')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === 'ask' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>ทดสอบถาม AI</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Knowledge Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-2">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
            <span className="text-[10px] text-stone-500 font-bold block uppercase">ข้อความแชทช่าง</span>
            <span className="text-lg font-black text-emerald-700">{stats.chatCount.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
            <span className="text-[10px] text-stone-500 font-bold block uppercase">ใบแจ้งซ่อม (WO)</span>
            <span className="text-lg font-black text-purple-700">{stats.workOrderCount.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
            <span className="text-[10px] text-stone-500 font-bold block uppercase">เครื่องจักรในระบบ</span>
            <span className="text-lg font-black text-blue-700">{stats.machineCount.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
            <span className="text-[10px] text-stone-500 font-bold block uppercase">รายการอะไหล่</span>
            <span className="text-lg font-black text-orange-700">{stats.sparePartCount.toLocaleString()}</span>
          </div>
        </div>

        {activeTab === 'import' ? (
          <div className="space-y-4 pt-2">
            {/* How to export guide banner */}
            <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>วิธีส่งออกประวัติแชทจากแอป LINE บนมือถือ:</span>
              </span>
              <p className="text-[11px] text-blue-900 leading-relaxed pl-5">
                เปิดกลุ่ม LINE ช่างซ่อม ➔ กดเมนูมุมขวาบน ➔ <b>ตั้งค่า (Settings)</b> ➔ <b>อื่นๆ (Other)</b> ➔ <b>ส่งออกประวัติการแชท (Export Chat History)</b> ➔ จะได้ไฟล์นามสกุล <code>.txt</code>
              </p>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-3xl p-6 text-center transition bg-stone-50/50">
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                id="line-chat-file"
                className="hidden"
              />
              <label
                htmlFor="line-chat-file"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-stone-800">
                  คลิกเพื่อเลือกไฟล์ประวัติแชท (.txt) จากเครื่อง
                </div>
                <div className="text-[10px] text-stone-500">
                  รองรับไฟล์ Export มาตรฐานของแอป LINE ทุกเวอร์ชัน
                </div>
              </label>
            </div>

            {/* Paste Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                หรือวางข้อความแชทโดยตรงที่นี่:
              </label>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                rows={5}
                placeholder="วางข้อความแชทจาก LINE เช่น&#10;14:20 ช่างสุรเชษฐ์: เครื่องผสม MX-02 ใบพัดเสียงดัง&#10;14:25 ช่างอานนท์: ลูกปืนแตก เปลี่ยนเบอร์ 6205 แล้วหายครับ"
                className="w-full text-xs font-mono p-3 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {rawText && (
                <div className="text-[11px] text-stone-500 flex justify-between">
                  <span>ความยาวข้อความ: {rawText.length.toLocaleString()} ตัวอักษร</span>
                  <button
                    onClick={() => setRawText('')}
                    className="text-red-500 hover:underline"
                  >
                    ล้างข้อความ
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              {stats.chatCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ล้างประวัติแชททั้งหมด</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" onClick={onClose} className="rounded-xl text-xs h-10">
                  ปิด
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isProcessing || !rawText.trim()}
                  className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 shadow-md flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>{isProcessing ? 'กำลังวิเคราะห์...' : 'ประมวลผลและนำเข้าคลังความรู้'}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Ask AI Test Tab */
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>จำลองการถามน้อง MTEX เหมือนในกลุ่ม LINE:</span>
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                ในกลุ่ม LINE ช่างสามารถพิมพ์ <b>@MTEX ตามด้วยคำถาม</b> หรือพิมพ์คำถามในแชทส่วนตัวกับ MTEX ได้ตลอด 24 ชม.
              </p>
            </div>

            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                type="text"
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder="เช่น 'เครื่องผสม MX-02 เคยเปลี่ยนอะไร?', 'ฮีตเตอร์เหลือไหม?'"
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button
                type="submit"
                disabled={isAsking || !testQuery.trim()}
                className="h-10 px-4 rounded-xl text-xs font-bold bg-[#2A2521] text-white hover:bg-stone-800 shrink-0"
              >
                {isAsking ? 'กำลังคิด...' : 'ส่งคำถาม'}
              </Button>
            </form>

            {aiAnswer && (
              <div className="p-4 bg-stone-900 text-stone-100 rounded-2xl space-y-2 text-xs border border-[#D4AF37]/30 shadow-lg">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                  <Bot className="w-4 h-4" />
                  <span>คำตอบจากน้อง MTEX:</span>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-stone-200 font-sans">
                  {aiAnswer}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
