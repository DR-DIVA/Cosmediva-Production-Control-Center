'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw,
  HelpCircle,
  Smartphone,
  ShieldCheck,
  Layers,
  Wrench,
  Factory,
  FileText,
  Package,
  Activity,
  Sparkles,
  Copy
} from 'lucide-react'
import { toast } from 'sonner'
import { LineChannelConfig } from '@/lib/lineService'
import { getLineChannels, updateLineChannel, testLineChannel } from '@/app/actions/line'

interface LineSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const CHANNEL_ICONS: Record<string, any> = {
  maintenance: Wrench,
  production: Factory,
  qc_qa: Activity,
  dcc: FileText,
  warehouse: Package
}

export default function LineSettingsModal({ isOpen, onClose }: LineSettingsModalProps) {
  const [channels, setChannels] = useState<LineChannelConfig[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('maintenance')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // Edit form state for current channel
  const [channelName, setChannelName] = useState('')
  const [token, setToken] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [events, setEvents] = useState({
    on_breakdown: true,
    on_assigned: true,
    on_completed: true
  })

  const loadChannels = async () => {
    setIsLoading(true)
    try {
      const res = await getLineChannels()
      if (res.success && res.data.length > 0) {
        setChannels(res.data)
        const current = res.data.find(c => c.channel_key === selectedKey) || res.data[0]
        if (current) {
          setSelectedKey(current.channel_key)
          populateForm(current)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const populateForm = (channel: LineChannelConfig) => {
    setChannelName(channel.channel_name || '')
    setToken(channel.channel_access_token || '')
    setDestinationId(channel.destination_id || '')
    setIsActive(channel.is_active ?? true)
    if (channel.notify_events) {
      setEvents({
        on_breakdown: channel.notify_events.on_breakdown ?? true,
        on_assigned: channel.notify_events.on_assigned ?? true,
        on_completed: channel.notify_events.on_completed ?? true
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadChannels()
    }
  }, [isOpen])

  const handleSelectChannel = (key: string) => {
    setSelectedKey(key)
    const ch = channels.find(c => c.channel_key === key)
    if (ch) populateForm(ch)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await updateLineChannel(selectedKey, {
        channel_name: channelName,
        channel_access_token: token,
        destination_id: destinationId,
        is_active: isActive,
        notify_events: events
      })

      if (res.success) {
        toast.success(`บันทึกการตั้งค่า LINE ช่องทาง "${channelName}" สำเร็จ!`)
        // Update local state
        setChannels(prev => prev.map(c => 
          c.channel_key === selectedKey 
            ? { ...c, channel_name: channelName, channel_access_token: token, destination_id: destinationId, is_active: isActive, notify_events: events }
            : c
        ))
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถบันทึกการตั้งค่าได้')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!token.trim()) {
      toast.error('กรุณาระบุ Channel Access Token ก่อนทดสอบ')
      return
    }
    if (!destinationId.trim()) {
      toast.error('กรุณาระบุ Group ID / Destination ID ก่อนทดสอบ')
      return
    }

    setIsTesting(true)
    try {
      const res = await testLineChannel(selectedKey, token.trim(), destinationId.trim())
      if (res.success) {
        toast.success(`🎉 ส่งข้อความทดสอบเข้า LINE สำเร็จแล้ว! กรุณาตรวจสอบในกลุ่ม LINE`)
      } else {
        toast.error(`ส่งข้อความไม่สำเร็จ: ${res.error}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการทดสอบ')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl w-[96vw] p-6 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#06C755]/15 flex items-center justify-center text-[#06C755] border border-[#06C755]/30">
                <MessageSquare className="w-5 h-5 fill-[#06C755]" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
                  <span>ศูนย์ตั้งค่า LINE แจ้งเตือนอัจฉริยะ (Multi-Channel Gateway)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#06C755]/10 text-[#06C755] border border-[#06C755]/20">
                    LINE OA API
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  บริหาร LINE Bot แยกรายแผนก ส่งการ์ดแจ้งเตือน Flex Message แบบ Real-time ทันทีที่มีเหตุการณ์
                </DialogDescription>
              </div>
            </div>

            <span className="text-xs text-stone-400 font-mono hidden sm:inline">
              Enterprise Hub
            </span>
          </div>
        </DialogHeader>

        {/* Multi-Channel Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-stone-100 rounded-2xl border border-stone-200 mt-2">
          {channels.map(ch => {
            const isSelected = ch.channel_key === selectedKey
            const Icon = CHANNEL_ICONS[ch.channel_key] || Layers
            const isConfigured = Boolean(ch.channel_access_token && ch.destination_id)

            return (
              <button
                key={ch.channel_key}
                type="button"
                onClick={() => handleSelectChannel(ch.channel_key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-sm border border-stone-200 ring-1 ring-stone-300'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#06C755]' : 'text-stone-400'}`} />
                <span>{ch.channel_name.split('(')[0].trim()}</span>
                {isConfigured ? (
                  <span className="w-2 h-2 rounded-full bg-[#06C755]" title="เชื่อมต่อแล้ว"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-stone-300" title="ยังไม่ตั้งค่า"></span>
                )}
              </button>
            )
          })}
        </div>

        {/* Main Content Grid: Settings on Left, Flex Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          {/* Left Column: Form Settings (7 cols) */}
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
            {/* Channel Status Header */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-400 block font-mono">CHANNEL KEY: {selectedKey}</span>
                <h4 className="text-sm font-bold text-stone-800">{channelName}</h4>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-stone-600 cursor-pointer">เปิดใช้งาน</label>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#06C755] cursor-pointer"
                />
              </div>
            </div>

            {/* Token Input */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-stone-800">
                    LINE Channel Access Token (v2.1 Long-Lived) *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>ความลับสูงสุด (พรางรหัส)</span>
                  </span>
                </div>
                <a
                  href="https://developers.line.biz/console/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#06C755] hover:underline flex items-center gap-0.5 font-normal"
                >
                  <span>LINE Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder={token ? 'วางใหม่เพื่อเปลี่ยน Token...' : 'วาง Channel Access Token ที่ได้จาก LINE Developers...'}
                  className="h-10 text-xs font-mono pr-10 rounded-xl bg-stone-50 border-stone-300"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-stone-500">
                🔐 <b>ความปลอดภัย:</b> รหัสนี้จะถูกจัดเก็บเป็นความลับและพรางตา (••••) ทันที ไม่มีใครสามารถกดอ่านรหัสเต็มย้อนหลังได้ หรือสามารถใส่ตรงใน Railway Environment Variables ได้เช่นกันค่ะ
              </p>
            </div>

            {/* Destination / Group ID Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 block">
                  Destination ID (Group ID หรือ User ID ที่ต้องการให้แจ้งเตือน) *
                </label>
                {destinationId && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    มี Group ID แล้ว
                  </span>
                )}
              </div>
              <Input
                value={destinationId}
                onChange={e => setDestinationId(e.target.value)}
                placeholder="เช่น C1234567890abcdef... หรือพิมพ์ /id ในกลุ่มไลน์"
                className="h-10 text-xs font-mono rounded-xl bg-stone-50 border-stone-300"
              />

              {/* Webhook Auto-detect helper */}
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ระบบบันทึก Group ID อัตโนมัติ (แนะนำ ไม่ต้องพิมพ์เอง)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://cosmeflow.up.railway.app'}/api/line/webhook`
                      navigator.clipboard.writeText(url)
                      toast.success('คัดลอก Webhook URL เรียบร้อยแล้ว!')
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 shadow-2xs"
                  >
                    <Copy className="w-3 h-3" />
                    <span>คัดลอก Webhook URL</span>
                  </button>
                </div>
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  นำ Webhook URL ไปวางใน LINE Developers Console &gt; แท็บ Messaging API &gt; Webhook URL แล้วกด Verify
                  จากนั้นเพียงดึงบอทเข้ากลุ่ม LINE หรือพิมพ์ <b>/id</b> ในกลุ่ม ระบบจะดึงรหัสกลุ่มมาบันทึกที่นี่ให้อัตโนมัติทันทีค่ะ!
                </p>
              </div>
            </div>

            {/* Notification Event Toggles for Maintenance */}
            {selectedKey === 'maintenance' && (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <span className="text-xs font-bold text-stone-800 block">
                  🔔 เหตุการณ์ที่ต้องการให้ยิงแจ้งเตือนอัตโนมัติ:
                </span>
                <div className="space-y-2 text-xs text-stone-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={events.on_breakdown}
                      onChange={e => setEvents({ ...events, on_breakdown: e.target.checked })}
                      className="w-4 h-4 accent-red-600 rounded"
                    />
                    <span>🚨 แจ้งเครื่องเสียด่วน / บันทึกขอซ่อม (Breakdown Report)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={events.on_assigned}
                      onChange={e => setEvents({ ...events, on_assigned: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span>🔧 ช่างรับงานซ่อม / เริ่มเข้าหน้าเครื่อง (In Progress)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={events.on_completed}
                      onChange={e => setEvents({ ...events, on_completed: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>✅ ปิดงานซ่อม / เครื่องจักรพร้อมเดินระบบแล้ว (Closed)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !token.trim() || !destinationId.trim()}
                className="h-10 text-xs font-bold rounded-xl border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTesting ? 'กำลังส่งทดสอบ...' : '🧪 ทดสอบส่งเข้า LINE'}</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="h-10 text-xs rounded-xl"
                >
                  ปิด
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 bg-[#2A2521] hover:bg-stone-800 text-white font-bold text-xs px-5 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-[#D4AF37]" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
                </Button>
              </div>
            </div>
          </form>

          {/* Right Column: Live Flex Message Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-stone-600" />
                <span>ตัวอย่างการ์ด Flex ในแอป LINE</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                LINE Certified Card
              </span>
            </div>

            {/* Mock Phone Bubble */}
            <div className="bg-[#788896] p-3 sm:p-4 rounded-3xl shadow-inner max-w-sm mx-auto">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-300 text-left font-sans">
                {/* Bubble Header */}
                <div className="bg-[#B91C1C] p-3 text-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">🚨 แจ้งซ่อมเครื่องจักร</span>
                    <span className="text-[10px] text-yellow-300 font-mono font-bold">WO-2026-100012</span>
                  </div>
                  <div className="text-[10px] text-yellow-100 font-bold mt-0.5">
                    🚨 ฉุกเฉิน: หยุดการผลิต (Critical)
                  </div>
                </div>

                {/* Bubble Body */}
                <div className="p-3 space-y-2.5 text-xs">
                  {/* Machine box */}
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-slate-900">MIX-004</span>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 rounded">Grade A</span>
                    </div>
                    <div className="font-bold text-xs text-slate-700">เครื่องผสมครีมสุญญากาศ 200L</div>
                    <div className="text-[10px] text-slate-500">📍 ฝ่ายผลิต • ห้องผสมครีม 1</div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">อาการเสีย:</span>
                      <span className="font-bold text-red-600">เครื่องหยุดกลางงาน</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">รายละเอียด:</span>
                      <span className="text-slate-800">มอเตอร์ตัด มีกลิ่นไหม้</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ผลกระทบ:</span>
                      <span className="font-bold text-slate-900">Production stopped</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ผู้แจ้งซ่อม:</span>
                      <span className="text-slate-700">สมชาย (19 ก.ย. 19:15 น.)</span>
                    </div>
                  </div>
                </div>

                {/* Bubble Footer Buttons */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-150 space-y-1.5">
                  <div className="w-full py-1.5 text-center text-xs font-bold bg-[#1E293B] text-white rounded-lg shadow-xs cursor-pointer">
                    🛠️ รับงานซ่อม / บันทึกผล
                  </div>
                  <div className="w-full py-1 text-center text-[11px] font-bold text-slate-600 hover:underline cursor-pointer">
                    🔍 ดูประวัติเครื่องจักร 360°
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Setup Guide Box */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1.5">
              <span className="font-bold text-amber-950 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>ขั้นตอนตั้งค่าสั้นๆ:</span>
              </span>
              <ol className="list-decimal pl-4 text-[11px] text-amber-900 space-y-0.5">
                <li>เปิด <b>LINE Official Account</b> ฟรีที่ <a href="https://manager.line.biz" target="_blank" className="underline font-bold">manager.line.biz</a></li>
                <li>เปิดใช้งาน Messaging API ใน <b>LINE Developers Console</b></li>
                <li>คัดลอก <b>Channel access token</b> มาวางในช่องด้านบน</li>
                <li>ดึงบอทเข้ากลุ่ม LINE ของฝ่ายช่าง และกด <b>"🧪 ทดสอบส่งเข้า LINE"</b></li>
              </ol>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
