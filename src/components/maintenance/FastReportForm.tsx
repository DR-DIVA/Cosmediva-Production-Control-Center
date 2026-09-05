'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  AlertOctagon, 
  Camera, 
  Mic, 
  Send, 
  CheckCircle2, 
  Flame, 
  Wrench,
  Volume2,
  Activity,
  Droplets,
  Zap,
  Eye,
  Cog,
  Wind,
  Thermometer,
  ShieldAlert,
  HelpCircle,
  Clock,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { MaintenanceMachine, SymptomCategory, ProductionImpact } from '@/types/maintenance'
import { createRepairRequest } from '@/app/actions/maintenance'

interface FastReportFormProps {
  initialMachine?: MaintenanceMachine | null
  machines: MaintenanceMachine[]
}

const SYMPTOMS: { label: SymptomCategory; icon: any; color: string }[] = [
  { label: 'เครื่องหยุดกลางงาน', icon: AlertOctagon, color: 'hover:border-red-500 hover:bg-red-50' },
  { label: 'เครื่องไม่ทำงาน', icon: Cog, color: 'hover:border-rose-500 hover:bg-rose-50' },
  { label: 'เสียงผิดปกติ', icon: Volume2, color: 'hover:border-amber-500 hover:bg-amber-50' },
  { label: 'สั่นผิดปกติ', icon: Activity, color: 'hover:border-orange-500 hover:bg-orange-50' },
  { label: 'รั่ว', icon: Droplets, color: 'hover:border-blue-500 hover:bg-blue-50' },
  { label: 'Sensor', icon: Eye, color: 'hover:border-purple-500 hover:bg-purple-50' },
  { label: 'Motor', icon: Wrench, color: 'hover:border-indigo-500 hover:bg-indigo-50' },
  { label: 'Pneumatic', icon: Wind, color: 'hover:border-cyan-500 hover:bg-cyan-50' },
  { label: 'ไฟฟ้า', icon: Zap, color: 'hover:border-yellow-500 hover:bg-yellow-50' },
  { label: 'Temperature', icon: Thermometer, color: 'hover:border-red-400 hover:bg-red-50' },
  { label: 'Quality Problem', icon: ShieldAlert, color: 'hover:border-pink-500 hover:bg-pink-50' },
  { label: 'Safety Problem', icon: Flame, color: 'hover:border-red-600 hover:bg-red-50' },
  { label: 'Other', icon: HelpCircle, color: 'hover:border-stone-400 hover:bg-stone-50' }
]

const IMPACTS: { label: ProductionImpact; text: string; badgeColor: string }[] = [
  { label: 'Production stopped', text: '🛑 Production หยุดทั้งหมด (สายการผลิตชะงัก)', badgeColor: 'bg-red-600 text-white' },
  { label: 'Machine stopped', text: '⏸️ เครื่องจักรหยุด (แต่แผนกอื่นยังเดินได้)', badgeColor: 'bg-orange-600 text-white' },
  { label: 'Quality risk', text: '⚠️ เสี่ยงกระทบคุณภาพสินค้า / ต้องซ่อมด่วน', badgeColor: 'bg-amber-500 text-white' },
  { label: 'Safety risk', text: '🚨 อันตรายต่อความปลอดภัยของผู้ปฏิบัติงาน', badgeColor: 'bg-rose-600 text-white' },
  { label: 'Production can continue', text: '🟢 เครื่องยังเดินต่อได้ (ซ่อมตามรอบ/มีนัดหมาย)', badgeColor: 'bg-emerald-600 text-white' }
]

export default function FastReportForm({ initialMachine, machines }: FastReportFormProps) {
  const router = useRouter()
  const [selectedMachine, setSelectedMachine] = useState<MaintenanceMachine | null>(initialMachine || machines[0] || null)
  const [symptom, setSymptom] = useState<SymptomCategory>('เครื่องหยุดกลางงาน')
  const [impact, setImpact] = useState<ProductionImpact>('Production stopped')
  const [isEmergency, setIsEmergency] = useState(true)
  const [description, setDescription] = useState('')
  const [requesterName, setRequesterName] = useState('พนักงานหน้างาน (Operator)')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedWO, setSubmittedWO] = useState<any>(null)
  const [isRecording, setIsRecording] = useState(false)

  // One-tap EMERGENCY BREAKDOWN trigger
  const handleTriggerEmergency = () => {
    setIsEmergency(true)
    setImpact('Production stopped')
    setSymptom('เครื่องหยุดกลางงาน')
    toast.error('🚨 โหมด BREAKDOWN NOW: กำหนดงานเป็น P1 Critical และจะจับเวลา Downtime ทันที', {
      duration: 3500
    })
  }

  // Handle Photo input
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Voice Input simulation
  const handleToggleVoice = () => {
    if (isRecording) {
      setIsRecording(false)
      toast.success('บันทึกเสียงเสร็จสิ้น')
    } else {
      setIsRecording(true)
      toast.info('🎙️ กำลังฟังเสียงพูด... (กดอีกครั้งเพื่อหยุด)')
      setTimeout(() => {
        if (!description) {
          setDescription('เครื่องมีเสียงดังผิดปกติและมีกลิ่นไหม้ตรงมอเตอร์หลัก')
        }
        setIsRecording(false)
      }, 3000)
    }
  }

  // Submit Handler (< 60s Flow)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMachine) {
      toast.error('กรุณาเลือกเครื่องจักร')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createRepairRequest({
        machine_code: selectedMachine.machine_code,
        symptom_category: symptom,
        symptom_description: description,
        production_impact: impact,
        is_emergency_breakdown: isEmergency,
        requester_name: requesterName,
        photo_before_urls: photoPreview ? [photoPreview] : []
      })

      if (res.success && res.data) {
        setSubmittedWO(res.data)
        toast.success(`สร้างใบแจ้งซ่อม ${res.data.wo_number} สำเร็จ!`)
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการแจ้งซ่อม')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถส่งข้อมูลได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submittedWO) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
            แจ้งซ่อมสำเร็จ • กำลังส่งช่างเข้าพื้นที่
          </div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">
            {submittedWO.wo_number}
          </h2>
          <p className="text-stone-600 text-sm mt-1">
            เครื่องจักร: <b className="text-stone-900">{submittedWO.machine_code} - {submittedWO.machine_name}</b>
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500">ระดับความเร่งด่วน:</span>
            <span className={`font-bold px-2 py-0.5 rounded ${
              submittedWO.priority === 'P1_CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {submittedWO.priority}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">อาการที่แจ้ง:</span>
            <span className="font-bold text-stone-900">{submittedWO.symptom_category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">สถานะผลกระทบ:</span>
            <span className="font-medium text-stone-800">{submittedWO.production_impact}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">เวลาที่แจ้ง:</span>
            <span className="font-mono text-stone-700">{new Date(submittedWO.reported_at).toLocaleTimeString('th-TH')} น.</span>
          </div>
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-600 shrink-0" />
          <span>ระบบเริ่มจับเวลา Downtime และแจ้งเตือนทีมช่างแล้ว</span>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => router.push('/maintenance/technician')}
            className="w-full bg-[#2A2521] hover:bg-stone-800 text-white font-bold h-12 rounded-xl text-sm"
          >
            ไปที่หน้าจอช่างซ่อมบำรุง
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setSubmittedWO(null)
              setDescription('')
              setPhotoPreview(null)
            }}
            className="w-full border-stone-300 text-stone-700 h-11 rounded-xl text-xs"
          >
            แจ้งซ่อมเครื่องจักรตัวอื่น
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-5 pb-10">
      {/* 1. MACHINE IDENTIFICATION */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-[#8B7355] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            เครื่องจักรที่เกิดปัญหา (Machine)
          </div>
          <span className="text-[11px] text-stone-400">ระบุจาก QR อัตโนมัติ</span>
        </div>

        <div className="relative">
          <select
            value={selectedMachine?.machine_code || ''}
            onChange={e => {
              const m = machines.find(item => item.machine_code === e.target.value) || null
              setSelectedMachine(m)
            }}
            className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-300 font-bold text-stone-900 text-base focus:ring-2 focus:ring-[#D4AF37] focus:outline-none appearance-none pr-10"
          >
            {machines.map(m => (
              <option key={m.id} value={m.machine_code}>
                {m.machine_code} - {m.machine_name} ({m.production_area || m.category})
              </option>
            ))}
          </select>
          <ChevronDown className="w-5 h-5 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {selectedMachine && (
          <div className="flex items-center justify-between text-xs text-stone-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/50">
            <div>
              <span className="text-stone-400">แผนก: </span>
              <span className="font-semibold text-stone-800">{selectedMachine.department_name}</span>
            </div>
            <div>
              <span className="text-stone-400">สถานะปัจจุบัน: </span>
              <span className={`font-bold ${selectedMachine.status === 'Running' ? 'text-emerald-700' : 'text-red-600'}`}>
                {selectedMachine.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. EMERGENCY BREAKDOWN BUTTON */}
      <button
        type="button"
        onClick={handleTriggerEmergency}
        className={`w-full p-4 rounded-3xl flex items-center justify-between transition-all transform active:scale-98 shadow-lg ${
          isEmergency
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-2 border-red-400 ring-4 ring-red-500/20 shadow-red-900/30'
            : 'bg-stone-100 text-stone-700 border border-stone-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400'
        }`}
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <Flame className="w-7 h-7 animate-bounce" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              🚨 BREAKDOWN NOW
              {isEmergency && <span className="text-xs bg-white text-red-700 font-extrabold px-2 py-0.5 rounded-full">เปิดใช้งาน</span>}
            </div>
            <div className="text-xs opacity-90">
              กดทันทีเมื่อเครื่องจักรหยุดและส่งผลให้การผลิตหยุดชะงัก (P1 Critical)
            </div>
          </div>
        </div>
      </button>

      {/* 3. SYMPTOM SELECTION (1 TAP) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            เลือกอาการที่พบ (TAP อาการ):
          </label>
          <span className="text-xs font-bold text-[#D4AF37] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            เลือก: {symptom}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SYMPTOMS.map(s => {
            const isSelected = symptom === s.label
            const Icon = s.icon
            return (
              <button
                type="button"
                key={s.label}
                onClick={() => setSymptom(s.label)}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all text-xs font-bold ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                    : `bg-stone-50 text-stone-700 border-stone-200 ${s.color}`
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#D4AF37]' : 'text-stone-500'}`} />
                <span className="truncate">{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. PRODUCTION IMPACT */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
          ผลกระทบต่อกระบวนการผลิต (Impact):
        </label>
        <div className="space-y-2">
          {IMPACTS.map(item => {
            const isSelected = impact === item.label
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  setImpact(item.label)
                  if (item.label === 'Production stopped') setIsEmergency(true)
                }}
                className={`w-full p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-50 border-[#D4AF37] text-stone-900 shadow-sm ring-1 ring-[#D4AF37]'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>{item.text}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. PHOTO & VOICE / TEXT NOTES */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
          ภาพถ่ายหน้างาน & คำอธิบายเพิ่มเติม:
        </label>

        <div className="flex gap-2 items-center">
          {/* Photo Button */}
          <label className="flex-1 h-12 rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#D4AF37] hover:bg-amber-50/50 flex items-center justify-center gap-2 text-xs font-bold text-stone-600 cursor-pointer transition-colors">
            <Camera className="w-4 h-4 text-[#D4AF37]" />
            <span>{photoPreview ? 'เปลี่ยนรูปภาพ' : 'ถ่ายรูป / แนบรูป'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
          </label>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`h-12 px-4 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all ${
              isRecording
                ? 'bg-red-600 text-white border-red-600 animate-pulse'
                : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{isRecording ? 'กำลังฟัง...' : 'พูดอธิบาย'}</span>
          </button>
        </div>

        {photoPreview && (
          <div className="relative rounded-2xl overflow-hidden border border-stone-300 max-h-48 w-full bg-black flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Preview" className="max-h-48 object-contain" />
            <button
              type="button"
              onClick={() => setPhotoPreview(null)}
              className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg"
            >
              ลบรูป
            </button>
          </div>
        )}

        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="พิมพ์หรือพูดอธิบายตำแหน่งที่มีปัญหา เช่น 'มีควันและกลิ่นไหม้ตรงมอเตอร์ด้านซ้าย' (ไม่จำเป็นต้องกรอกถ้าเลือกอาการชัดเจนแล้ว)"
          className="rounded-2xl border-stone-200 text-xs resize-none bg-stone-50"
          rows={2}
        />
      </div>

      {/* 6. REQUESTER IDENTITY */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm flex items-center gap-3">
        <span className="text-xs font-bold text-stone-500 whitespace-nowrap">ผู้แจ้งซ่อม:</span>
        <Input
          value={requesterName}
          onChange={e => setRequesterName(e.target.value)}
          placeholder="ชื่อผู้แจ้ง"
          className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
          required
        />
      </div>

      {/* 7. BIG SUBMIT BUTTON */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-14 rounded-2xl text-base font-extrabold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 transition-all transform active:scale-98"
      >
        {isSubmitting ? (
          <span>กำลังส่งข้อมูล...</span>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>ยืนยันการแจ้งซ่อมทันที (SUBMIT TICKET)</span>
          </>
        )}
      </Button>

      <p className="text-[11px] text-center text-stone-400">
        แจ้งได้ใน ≤ 60 วินาที • ระบบจะสร้าง Ticket และจับเวลาการตอบสนองอัตโนมัติ
      </p>
    </form>
  )
}
