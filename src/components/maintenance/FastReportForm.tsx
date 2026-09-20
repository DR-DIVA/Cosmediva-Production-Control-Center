'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  ChevronDown,
  Download,
  Share2
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

const FACILITY_SYMPTOMS: { label: string; icon: any; color: string }[] = [
  { label: '💡 เปลี่ยนหลอดไฟ / แสงสว่าง', icon: Zap, color: 'hover:border-amber-500 hover:bg-amber-50' },
  { label: '❄️ แอร์ไม่เย็น / น้ำแอร์หยด', icon: Thermometer, color: 'hover:border-cyan-500 hover:bg-cyan-50' },
  { label: '🚰 ประปา / ก๊อกน้ำรั่ว / ท่อตัน', icon: Droplets, color: 'hover:border-blue-500 hover:bg-blue-50' },
  { label: '🔌 ปลั๊กไฟ / สวิตช์ / ไฟดับ', icon: Zap, color: 'hover:border-yellow-500 hover:bg-yellow-50' },
  { label: '🚪 ประตู / หน้าต่าง / ลูกบิดชำรุด', icon: Wrench, color: 'hover:border-purple-500 hover:bg-purple-50' },
  { label: '🧹 ท่อระบายน้ำ / กลิ่นผิดปกติ', icon: HelpCircle, color: 'hover:border-stone-500 hover:bg-stone-50' },
  { label: '📦 งานช่างบริการอื่นๆ', icon: HelpCircle, color: 'hover:border-stone-400 hover:bg-stone-50' }
]

export type RepairTypeCategory = 'EMERGENCY' | 'GENERAL' | 'SERVICE'

const IMPACTS: { label: ProductionImpact; text: string; badgeColor: string }[] = [
  { label: 'Production stopped', text: '🛑 Production หยุดทั้งหมด (สายการผลิตชะงัก)', badgeColor: 'bg-red-600 text-white' },
  { label: 'Machine stopped', text: '⏸️ เครื่องจักรหยุด (แต่แผนกอื่นยังเดินได้)', badgeColor: 'bg-orange-600 text-white' },
  { label: 'Intermittent stops', text: '🔄 เครื่องยังเดินต่อได้ (แต่หยุดบ่อยเพราะไม่ปกติ)', badgeColor: 'bg-amber-500 text-stone-950' },
  { label: 'Quality risk', text: '⚠️ เสี่ยงกระทบคุณภาพสินค้า / ต้องซ่อมด่วน', badgeColor: 'bg-amber-500 text-white' },
  { label: 'Safety risk', text: '🚨 อันตรายต่อความปลอดภัยของผู้ปฏิบัติงาน', badgeColor: 'bg-rose-600 text-white' },
  { label: 'Production can continue', text: '🟢 เครื่องยังเดินต่อได้ (ซ่อมตามรอบ/มีนัดหมาย)', badgeColor: 'bg-emerald-600 text-white' }
]

export default function FastReportForm({ initialMachine, machines }: FastReportFormProps) {
  const router = useRouter()
  const [selectedMachine, setSelectedMachine] = useState<MaintenanceMachine | null>(initialMachine || machines[0] || null)
  const [repairType, setRepairType] = useState<RepairTypeCategory>('EMERGENCY')
  const [facilityLocation, setFacilityLocation] = useState('')
  const [symptom, setSymptom] = useState<SymptomCategory>('เครื่องหยุดกลางงาน')
  const [customSymptom, setCustomSymptom] = useState('')
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
    setRepairType('EMERGENCY')
    setIsEmergency(true)
    setImpact('Production stopped')
    setSymptom('เครื่องหยุดกลางงาน')
    setCustomSymptom('')
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

    const finalSymptom = customSymptom.trim() || symptom
    const fullDescription = [
      facilityLocation.trim() ? `📍 พื้นที่/จุดเกิดเหตุ: ${facilityLocation.trim()}` : null,
      repairType === 'SERVICE' ? `[ประเภท: แจ้งซ่อมบริการ & อาคารสถานที่]` : repairType === 'GENERAL' ? `[ประเภท: แจ้งซ่อมทั่วไป (ไม่กระทบการผลิต)]` : `[ประเภท: แจ้งซ่อมด่วนฉุกเฉิน (กระทบการผลิต)]`,
      description.trim() ? description.trim() : null
    ].filter(Boolean).join('\n')

    setIsSubmitting(true)
    try {
      const res = await createRepairRequest({
        machine_code: selectedMachine.machine_code,
        symptom_category: repairType === 'SERVICE' && !finalSymptom.includes('บริการ') ? `[บริการ] ${finalSymptom}` : finalSymptom,
        symptom_description: fullDescription,
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

        {/* Photo attached preview & Share to LINE / Download */}
        {photoPreview && (
          <div className="space-y-2 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-left">
            <span className="font-bold text-stone-700 block">รูปภาพ/วิดีโอที่แนบส่งทีมช่าง:</span>
            <div className="relative rounded-xl overflow-hidden border border-stone-300 max-h-44 bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Attached symptom" className="max-h-44 object-contain" />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = photoPreview
                  a.download = `symptom-${submittedWO.wo_number}.jpg`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  toast.success('ดาวน์โหลดรูปภาพลงมือถือเรียบร้อยแล้ว')
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>โหลดเก็บไว้</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const shareText = `🚨 แจ้งเครื่องเสียด่วน (CosmeFlow Maintenance)\nเลขที่: ${submittedWO.wo_number}\nเครื่องจักร: ${submittedWO.machine_code} - ${submittedWO.machine_name}\nระดับ: ${submittedWO.priority}\nอาการ: ${submittedWO.symptom_category}\nผู้แจ้ง: ${submittedWO.requester_name}\nสถานะ: ช่างกำลังเข้าตรวจสอบ`
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: 'แจ้งซ่อมเครื่องจักร CosmeFlow',
                        text: shareText
                      })
                      toast.success('เปิดเมนูแชร์ส่งต่อเรียบร้อยแล้ว')
                    } catch (err: any) {
                      if (err.name !== 'AbortError') console.error(err)
                    }
                  } else {
                    navigator.clipboard.writeText(shareText)
                    toast.success('คัดลอกข้อความแจ้งซ่อมแล้ว นำไปวางใน LINE ได้เลยค่ะ')
                  }
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>ส่งต่อเข้า LINE</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => router.push('/maintenance/technician')}
            className="w-full bg-[#2A2521] hover:bg-stone-800 text-white font-bold h-12 rounded-xl text-sm"
          >
            ไปที่หน้าจอช่างซ่อมบำรุง
          </Button>

          <Link
            href={`/maintenance/work-orders/${submittedWO.wo_number}/eform`}
            target="_blank"
            className="w-full inline-flex items-center justify-center gap-2 border-2 border-stone-800 bg-white hover:bg-stone-50 text-stone-900 font-bold h-11 rounded-xl text-xs transition shadow-xs"
          >
            <span>📄 เปิดดูใบแจ้งซ่อม E-form (DCC MT-PF-001D)</span>
          </Link>

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
      {/* 0. REPAIR TYPE SELECTOR (3 CASES) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
          ประเภทการแจ้งซ่อม (เลือก 1 กรณี):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Case 1: แจ้งซ่อมด่วน */}
          <button
            type="button"
            onClick={() => {
              setRepairType('EMERGENCY')
              setIsEmergency(true)
              setImpact('Production stopped')
              setSymptom('เครื่องหยุดกลางงาน')
              setCustomSymptom('')
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all relative ${
              repairType === 'EMERGENCY'
                ? 'bg-red-50/80 border-red-500 ring-2 ring-red-400 text-red-950 shadow-sm'
                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm text-red-700">🚨 แจ้งซ่อมด่วน</span>
              {repairType === 'EMERGENCY' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
            </div>
            <div className="text-[11px] text-stone-600 mt-1 font-medium leading-tight">
              กระทบกับการผลิต (เครื่องหยุด / สายชะงัก)
            </div>
          </button>

          {/* Case 2: แจ้งซ่อมทั่วไป */}
          <button
            type="button"
            onClick={() => {
              setRepairType('GENERAL')
              setIsEmergency(false)
              setImpact('Production can continue')
              setSymptom('เสียงผิดปกติ')
              setCustomSymptom('')
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all relative ${
              repairType === 'GENERAL'
                ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400 text-blue-950 shadow-sm'
                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm text-blue-700">🛠️ แจ้งซ่อมทั่วไป</span>
              {repairType === 'GENERAL' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <div className="text-[11px] text-stone-600 mt-1 font-medium leading-tight">
              ไม่กระทบกับการผลิต (เครื่องยังเดินต่อได้)
            </div>
          </button>

          {/* Case 3: แจ้งซ่อมบริการ */}
          <button
            type="button"
            onClick={() => {
              setRepairType('SERVICE')
              setIsEmergency(false)
              setImpact('Production can continue')
              setSymptom('เปลี่ยนหลอดไฟ / แสงสว่าง')
              setCustomSymptom('')
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all relative ${
              repairType === 'SERVICE'
                ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-400 text-purple-950 shadow-sm'
                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm text-purple-700">💡 แจ้งซ่อมบริการ</span>
              {repairType === 'SERVICE' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
            </div>
            <div className="text-[11px] text-stone-600 mt-1 font-medium leading-tight">
              งานบริการอาคาร (เปลี่ยนหลอดไฟ, แอร์, ประปา)
            </div>
          </button>
        </div>
      </div>

      {/* 1. MACHINE / LOCATION IDENTIFICATION */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-[#8B7355] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            {repairType === 'SERVICE' ? 'เครื่องจักรหรือพื้นที่อาคารที่เกี่ยวข้อง (Location/Asset)' : 'เครื่องจักรที่เกิดปัญหา (Machine)'}
          </div>
          <span className="text-[11px] text-stone-400">ระบุจาก QR หรือเลือกเอง</span>
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

        {/* Extra location field for Facility Service */}
        {repairType === 'SERVICE' && (
          <div className="pt-2 border-t border-stone-100 space-y-1.5">
            <label className="text-xs font-bold text-stone-700">
              📍 ระบุห้อง / จุดเกิดเหตุ (เช่น ห้องประชุม 2, โรงอาหาร, แผนกแพ็คกิ้ง, เสา B3):
            </label>
            <Input
              type="text"
              value={facilityLocation}
              onChange={(e) => setFacilityLocation(e.target.value)}
              placeholder="พิมพ์ระบุจุดติดตั้งหรือห้องที่ต้องการให้ช่างไปบริการ..."
              className="h-11 rounded-xl bg-stone-50 border-stone-200 text-xs font-medium text-stone-900 focus:bg-white"
            />
          </div>
        )}

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

      {/* 2. MODE BANNER */}
      {repairType === 'EMERGENCY' ? (
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
      ) : repairType === 'GENERAL' ? (
        <div className="p-4 rounded-3xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-blue-900 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-blue-800">โหมด: แจ้งซ่อมทั่วไป (ไม่กระทบกับการผลิต)</div>
            <div className="text-[11px] text-blue-600 mt-0.5">ระบบจะจัดคิวงานระดับปกติ (P3 Normal) เพื่อให้ช่างเข้าตรวจสอบตามรอบคิวงาน</div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-purple-50 border border-purple-200 flex items-center gap-3 text-purple-900 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-purple-800">โหมด: แจ้งซ่อมบริการ & อาคารสถานที่ (Facility Service)</div>
            <div className="text-[11px] text-purple-600 mt-0.5">สำหรับงานบริการ เช่น เปลี่ยนหลอดไฟ แอร์ ประปา สุขาภิบาล ช่างบริการจะเข้าดูแลโดยเร็ว</div>
          </div>
        </div>
      )}

      {/* 3. SYMPTOM SELECTION (1 TAP) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            {repairType === 'SERVICE' ? 'เลือกประเภทงานบริการที่ต้องการ (TAP อาการ):' : 'เลือกอาการที่พบ (TAP อาการ):'}
          </label>
          <span className="text-xs font-bold text-[#D4AF37] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 max-w-[200px] truncate">
            {customSymptom.trim() ? `ระบุเอง: ${customSymptom}` : `เลือก: ${symptom}`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(repairType === 'SERVICE' ? FACILITY_SYMPTOMS : SYMPTOMS).map(s => {
            const isSelected = !customSymptom.trim() && symptom === s.label
            const Icon = s.icon
            return (
              <button
                type="button"
                key={s.label}
                onClick={() => {
                  setSymptom(s.label as SymptomCategory)
                  setCustomSymptom('')
                }}
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

        {/* Custom Symptom Input Field */}
        <div className="pt-3 border-t border-stone-100 space-y-1.5">
          <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <span>✍️ หรือระบุ/พิมพ์อาการเสียด้วยตัวเอง (กรณีไม่มีในตัวเลือก):</span>
          </label>
          <div className="relative">
            <Input
              type="text"
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              placeholder="พิมพ์ระบุอาการเสียเอง เช่น ซีลยางขาด, ความร้อนไม่ขึ้น, ฟิล์มติดขัด..."
              className="w-full h-11 px-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:bg-white transition-all placeholder:text-stone-400"
            />
            {customSymptom && (
              <button
                type="button"
                onClick={() => setCustomSymptom('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-900 bg-stone-200 px-2 py-0.5 rounded-md font-bold"
              >
                ล้าง
              </button>
            )}
          </div>
          <p className="text-[11px] text-stone-400">
            * หากพิมพ์ระบุในช่องนี้ ระบบจะใช้อาการที่คุณพิมพ์เป็นหัวข้อหลักในการแจ้งเตือนทันที
          </p>
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
            <span>{photoPreview ? 'เปลี่ยนรูปภาพ / วิดีโอ' : 'ถ่ายรูป / วิดีโอ / แนบไฟล์'}</span>
            <input type="file" accept="image/*,video/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
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
          <div className="relative rounded-2xl overflow-hidden border border-stone-300 max-h-52 w-full bg-black flex items-center justify-center group">
            {photoPreview.startsWith('data:video') ? (
              <video src={photoPreview} controls className="max-h-52 object-contain" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photoPreview} alt="Preview" className="max-h-52 object-contain" />
            )}

            {/* Quick Action Overlay on Preview */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 p-1 rounded-xl backdrop-blur-xs">
              <button
                type="button"
                title="ดาวน์โหลดลงเครื่อง"
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = photoPreview
                  a.download = `preview-${Date.now()}.jpg`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  toast.success('ดาวน์โหลดลงมือถือแล้ว')
                }}
                className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-900 transition"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                title="ส่งต่อ / แชร์"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: 'ภาพอาการหน้างาน CosmeFlow',
                        text: 'ภาพอาการเครื่องจักรหน้างาน CosmeFlow Maintenance'
                      })
                    } catch (e) {}
                  } else {
                    toast.info('สามารถดาวน์โหลดแล้วส่งต่อได้เลยค่ะ')
                  }
                }}
                className="p-1.5 rounded-lg bg-[#D4AF37] hover:bg-amber-400 text-stone-900 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPhotoPreview(null)}
              className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/20 transition"
            >
              ลบไฟล์
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
