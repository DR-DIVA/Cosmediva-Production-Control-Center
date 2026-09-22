'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
  Share2,
  Search,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { MaintenanceMachine, SymptomCategory, ProductionImpact } from '@/types/maintenance'
import { createRepairRequest } from '@/app/actions/maintenance'
import { uploadMaintenancePhoto, compressImage } from '@/lib/maintenanceMedia'

interface FastReportFormProps {
  initialMachine?: MaintenanceMachine | null
  machines: MaintenanceMachine[]
  initialType?: RepairTypeCategory
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
  { label: 'Facility no impact', text: '🟢 ไม่กระทบการผลิต (แจ้งซ่อมบริการ)', badgeColor: 'bg-emerald-600 text-white' },
  { label: 'Production stopped', text: '🛑 Production หยุดทั้งหมด (สายการผลิตชะงัก)', badgeColor: 'bg-red-600 text-white' },
  { label: 'Machine stopped', text: '⏸️ เครื่องจักรหยุด (แต่แผนกอื่นยังเดินได้)', badgeColor: 'bg-orange-600 text-white' },
  { label: 'Intermittent stops', text: '🔄 เครื่องยังเดินต่อได้ (แต่หยุดบ่อยเพราะไม่ปกติ)', badgeColor: 'bg-amber-500 text-stone-950' },
  { label: 'Quality risk', text: '⚠️ เสี่ยงกระทบคุณภาพสินค้า / ต้องซ่อมด่วน', badgeColor: 'bg-amber-500 text-white' },
  { label: 'Safety risk', text: '🚨 อันตรายต่อความปลอดภัยของผู้ปฏิบัติงาน', badgeColor: 'bg-rose-600 text-white' },
  { label: 'Production can continue', text: '🟢 เครื่องยังเดินต่อได้ (ซ่อมตามรอบ/มีนัดหมาย)', badgeColor: 'bg-emerald-600 text-white' }
]

export default function FastReportForm({ initialMachine, machines, initialType }: FastReportFormProps) {
  const router = useRouter()
  const defaultType: RepairTypeCategory = initialType || 'EMERGENCY'

  const [selectedMachine, setSelectedMachine] = useState<MaintenanceMachine | null>(initialMachine || machines[0] || null)
  const [machineSearchQuery, setMachineSearchQuery] = useState('')
  const [isSearchingMachine, setIsSearchingMachine] = useState(false)
  const [repairType, setRepairType] = useState<RepairTypeCategory>(defaultType)
  const [facilityLocation, setFacilityLocation] = useState('')
  const [symptom, setSymptom] = useState<SymptomCategory>(
    defaultType === 'SERVICE' ? ('💡 เปลี่ยนหลอดไฟ / แสงสว่าง' as any) : defaultType === 'GENERAL' ? 'เสียงผิดปกติ' : 'เครื่องหยุดกลางงาน'
  )
  const [customSymptom, setCustomSymptom] = useState('')
  const [impact, setImpact] = useState<ProductionImpact>(
    defaultType === 'SERVICE' ? 'Facility no impact' : defaultType === 'GENERAL' ? 'Production can continue' : 'Production stopped'
  )
  const [isEmergency, setIsEmergency] = useState(defaultType === 'EMERGENCY')
  const [description, setDescription] = useState('')
  const [requesterName, setRequesterName] = useState('พนักงานหน้างาน (Operator)')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedWO, setSubmittedWO] = useState<any>(null)
  const [isRecording, setIsRecording] = useState(false)

  // Listen to URL query params (e.g. ?type=EMERGENCY | GENERAL | SERVICE)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = (params.get('type') || '').toUpperCase() as RepairTypeCategory
      if (t === 'SERVICE') {
        setRepairType('SERVICE')
        setIsEmergency(false)
        setImpact('Facility no impact')
        setSymptom('💡 เปลี่ยนหลอดไฟ / แสงสว่าง' as any)
      } else if (t === 'GENERAL') {
        setRepairType('GENERAL')
        setIsEmergency(false)
        setImpact('Production can continue')
        setSymptom('เสียงผิดปกติ')
      } else if (t === 'EMERGENCY') {
        setRepairType('EMERGENCY')
        setIsEmergency(true)
        setImpact('Production stopped')
        setSymptom('เครื่องหยุดกลางงาน')
      }
    }
  }, [])

  // Live Machine Search Filter
  const filteredMachines = useMemo(() => {
    if (!machineSearchQuery.trim()) return machines
    const q = machineSearchQuery.toLowerCase().trim()
    return machines.filter(m => 
      m.machine_code.toLowerCase().includes(q) ||
      m.machine_name.toLowerCase().includes(q) ||
      (m.production_area && m.production_area.toLowerCase().includes(q)) ||
      (m.department_name && m.department_name.toLowerCase().includes(q)) ||
      (m.category && m.category.toLowerCase().includes(q))
    )
  }, [machines, machineSearchQuery])

  // Context-aware visible impacts: Service repair vs Machine repair
  const visibleImpacts = useMemo(() => {
    if (repairType === 'SERVICE') {
      return IMPACTS.filter(i => i.label === 'Facility no impact' || i.label === 'Safety risk' || i.label === 'Production can continue')
    }
    return IMPACTS.filter(i => i.label !== 'Facility no impact')
  }, [repairType])

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

  // Handle Photo input with smart client-side compression and cloud upload
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    // Instant local preview for immediate visual feedback (< 50ms)
    const localUrl = URL.createObjectURL(file)
    setPhotoPreview(localUrl)

    // Background upload directly to Supabase storage bucket 'maintenance-media'
    try {
      setIsUploadingPhoto(true)
      const compressed = await compressImage(file, 1280, 0.75)
      const res = await uploadMaintenancePhoto(compressed, file.name)
      if (res.success && res.url) {
        setPhotoPreview(res.url)
        toast.success('อัปโหลดรูปภาพเข้าสู่คลังจัดเก็บเรียบร้อย')
      }
    } catch (err) {
      console.warn('Background upload notice:', err)
    } finally {
      setIsUploadingPhoto(false)
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
    if (repairType !== 'SERVICE' && !selectedMachine) {
      toast.error('กรุณาเลือกเครื่องจักร')
      return
    }

    if (repairType === 'SERVICE' && !facilityLocation.trim()) {
      toast.error('กรุณาระบุห้อง หรือพื้นที่/จุดเกิดเหตุที่ต้องการให้ช่างบริการ')
      return
    }

    const finalSymptom = customSymptom.trim() || symptom
    const fullDescription = [
      facilityLocation.trim() ? `📍 จุดเกิดเหตุ/สถานที่: ${facilityLocation.trim()}` : null,
      repairType === 'SERVICE' 
        ? `[ประเภท: แจ้งซ่อมบริการ & อาคารสถานที่]` 
        : repairType === 'GENERAL' 
        ? `[ประเภท: แจ้งซ่อมทั่วไป (ไม่กระทบการผลิต)]` 
        : `[ประเภท: แจ้งซ่อมด่วนฉุกเฉิน (กระทบการผลิต)]`,
      description.trim() ? description.trim() : null
    ].filter(Boolean).join('\n')

    setIsSubmitting(true)
    try {
      let finalPhotoUrl = photoPreview || ''
      // If photoPreview is not yet uploaded to storage (e.g. still blob: or data:)
      if (finalPhotoUrl && !finalPhotoUrl.startsWith('http')) {
        toast.info('กำลังเชื่อมต่ออัปโหลดรูปภาพ...')
        try {
          if (photoFile) {
            const compressed = await compressImage(photoFile, 1280, 0.75)
            const upRes = await uploadMaintenancePhoto(compressed, photoFile.name)
            if (upRes.success && upRes.url) {
              finalPhotoUrl = upRes.url
            }
          } else if (finalPhotoUrl.startsWith('data:')) {
            const upRes = await uploadMaintenancePhoto(finalPhotoUrl)
            if (upRes.success && upRes.url) {
              finalPhotoUrl = upRes.url
            }
          }
        } catch (uploadErr) {
          console.warn('Upload fallback warning:', uploadErr)
        }
      }

      // Safeguard: Only send URL if it is a valid cloud URL or clean string, never a multi-megabyte raw blob
      const validPhotoUrls: string[] = []
      if (finalPhotoUrl && finalPhotoUrl.startsWith('http')) {
        validPhotoUrls.push(finalPhotoUrl)
      }

      const res = await createRepairRequest({
        machine_code: repairType === 'SERVICE' ? 'FACILITY' : selectedMachine!.machine_code,
        symptom_category: repairType === 'SERVICE' && !finalSymptom.includes('บริการ') ? `[บริการ] ${finalSymptom}` : finalSymptom,
        symptom_description: fullDescription,
        production_impact: impact,
        is_emergency_breakdown: isEmergency,
        requester_name: requesterName,
        requester_department_name: repairType === 'SERVICE' ? (facilityLocation.trim() || 'ฝ่ายบริการทั่วไป & อาคาร') : (selectedMachine?.department_name || undefined),
        photo_before_urls: validPhotoUrls
      })

      if (res.success && res.data) {
        setSubmittedWO(res.data)
        toast.success(`สร้างใบแจ้งซ่อม ${res.data.wo_number} สำเร็จ!`)
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการแจ้งซ่อม')
      }
    } catch (err: any) {
      console.error('Submit error:', err)
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
            {submittedWO.machine_code === 'FACILITY' ? (
              <span>จุดบริการ: <b className="text-stone-900">{submittedWO.requester_department_name || 'งานบริการอาคาร & สถานที่'}</b></span>
            ) : (
              <span>เครื่องจักร: <b className="text-stone-900">{submittedWO.machine_code} - {submittedWO.machine_name}</b></span>
            )}
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
          <span>ระบบบันทึกเวลาและแจ้งเตือนไปยังทีมช่างแล้ว</span>
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
                className="flex-1 py-2 px-3 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>โหลดเก็บไว้</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const shareText = submittedWO.machine_code === 'FACILITY'
                    ? `💡 แจ้งซ่อมบริการ & อาคาร (CosmeFlow)\nเลขที่: ${submittedWO.wo_number}\nสถานที่: ${submittedWO.requester_department_name || 'งานบริการอาคาร'}\nอาการ: ${submittedWO.symptom_category}\nผู้แจ้ง: ${submittedWO.requester_name}\nสถานะ: ส่งเรื่องให้ทีมช่างแล้ว`
                    : `🚨 แจ้งเครื่องเสียด่วน (CosmeFlow Maintenance)\nเลขที่: ${submittedWO.wo_number}\nเครื่องจักร: ${submittedWO.machine_code} - ${submittedWO.machine_name}\nระดับ: ${submittedWO.priority}\nอาการ: ${submittedWO.symptom_category}\nผู้แจ้ง: ${submittedWO.requester_name}\nสถานะ: ช่างกำลังเข้าตรวจสอบ`
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Case 1: แจ้งซ่อมด่วน (สีแดง) */}
          <button
            type="button"
            onClick={() => {
              setRepairType('EMERGENCY')
              setIsEmergency(true)
              setImpact('Production stopped')
              setSymptom('เครื่องหยุดกลางงาน')
              setCustomSymptom('')
            }}
            className={`p-4 rounded-2xl border-2 text-left transition-all relative cursor-pointer ${
              repairType === 'EMERGENCY'
                ? 'bg-red-600 border-red-700 text-white ring-4 ring-red-200 shadow-md shadow-red-600/20 scale-[1.02]'
                : 'bg-red-50/80 border-red-300 hover:bg-red-100 hover:border-red-400 text-red-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-black text-sm ${repairType === 'EMERGENCY' ? 'text-white' : 'text-red-700'}`}>
                🚨 แจ้งซ่อมด่วน
              </span>
              {repairType === 'EMERGENCY' ? (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-red-300 shrink-0" />
              )}
            </div>
            <div className={`text-[11px] mt-1.5 font-medium leading-tight ${repairType === 'EMERGENCY' ? 'text-red-100' : 'text-red-900/80'}`}>
              กระทบกับการผลิต (เครื่องหยุด / สายชะงัก)
            </div>
          </button>

          {/* Case 2: แจ้งซ่อมทั่วไป (สีน้ำเงิน) */}
          <button
            type="button"
            onClick={() => {
              setRepairType('GENERAL')
              setIsEmergency(false)
              setImpact('Production can continue')
              setSymptom('เสียงผิดปกติ')
              setCustomSymptom('')
            }}
            className={`p-4 rounded-2xl border-2 text-left transition-all relative cursor-pointer ${
              repairType === 'GENERAL'
                ? 'bg-blue-600 border-blue-700 text-white ring-4 ring-blue-200 shadow-md shadow-blue-600/20 scale-[1.02]'
                : 'bg-blue-50/80 border-blue-300 hover:bg-blue-100 hover:border-blue-400 text-blue-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-black text-sm ${repairType === 'GENERAL' ? 'text-white' : 'text-blue-700'}`}>
                🛠️ แจ้งซ่อมทั่วไป
              </span>
              {repairType === 'GENERAL' ? (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-300 shrink-0" />
              )}
            </div>
            <div className={`text-[11px] mt-1.5 font-medium leading-tight ${repairType === 'GENERAL' ? 'text-blue-100' : 'text-blue-900/80'}`}>
              ไม่กระทบกับการผลิต (เครื่องยังเดินต่อได้)
            </div>
          </button>

          {/* Case 3: แจ้งซ่อมบริการ (สีม่วง) */}
          <button
            type="button"
            onClick={() => {
              setRepairType('SERVICE')
              setIsEmergency(false)
              setImpact('Facility no impact')
              setSymptom('💡 เปลี่ยนหลอดไฟ / แสงสว่าง' as any)
              setCustomSymptom('')
            }}
            className={`p-4 rounded-2xl border-2 text-left transition-all relative cursor-pointer ${
              repairType === 'SERVICE'
                ? 'bg-purple-600 border-purple-700 text-white ring-4 ring-purple-200 shadow-md shadow-purple-600/20 scale-[1.02]'
                : 'bg-purple-50/80 border-purple-300 hover:bg-purple-100 hover:border-purple-400 text-purple-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-black text-sm ${repairType === 'SERVICE' ? 'text-white' : 'text-purple-700'}`}>
                💡 แจ้งซ่อมบริการ
              </span>
              {repairType === 'SERVICE' ? (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-300 shrink-0" />
              )}
            </div>
            <div className={`text-[11px] mt-1.5 font-medium leading-tight ${repairType === 'SERVICE' ? 'text-purple-100' : 'text-purple-900/80'}`}>
              งานบริการอาคาร (เปลี่ยนหลอดไฟ, แอร์, ประปา)
            </div>
          </button>
        </div>
      </div>

      {/* 1. LOCATION (FACILITY SERVICE) or MACHINE SELECTOR (EMERGENCY/GENERAL) */}
      {repairType === 'SERVICE' ? (
        <div className="bg-white rounded-3xl p-5 border border-purple-200 shadow-sm space-y-3 bg-purple-50/20">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              สถานที่ / ห้อง / จุดเกิดเหตุ (Location / Area) *
            </div>
            <span className="text-[11px] text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
              ไม่ต้องเลือกเครื่องจักร
            </span>
          </div>

          <Input
            type="text"
            value={facilityLocation}
            onChange={(e) => setFacilityLocation(e.target.value)}
            placeholder="พิมพ์ระบุจุดเกิดเหตุ เช่น ห้องประชุม 2, โรงอาหาร, แผนกแพ็คกิ้ง ชั้น 2, เสา B3..."
            className="h-12 rounded-2xl bg-white border-purple-300 text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-purple-400 focus:outline-none placeholder:text-stone-400"
            required
            autoFocus
          />

          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <span>💡 สำหรับงานบริการอาคาร เช่น หลอดไฟ แอร์ ประปา ไฟฟ้า ให้ระบุสถานที่เพื่อให้ช่างเข้าจุดได้ทันที</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#8B7355] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
              เครื่องจักรที่เกิดปัญหา (Machine) *
            </div>
            <span className="text-[11px] text-stone-400">
              {selectedMachine ? 'เลือกแล้ว' : 'กรุณาเลือกเครื่องจักร'}
            </span>
          </div>

          {/* If machine is selected and user is not searching, show selected machine card */}
          {selectedMachine && !isSearchingMachine ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300/80 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-stone-900 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-stone-900 text-[#D4AF37] font-mono text-xs font-bold">
                      {selectedMachine.machine_code}
                    </span>
                    <span className="text-sm">{selectedMachine.machine_name}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-2">
                    <span>📍 {selectedMachine.department_name || 'ฝ่ายผลิต'}</span>
                    {selectedMachine.production_area && <span>• {selectedMachine.production_area}</span>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSearchingMachine(true)
                    setMachineSearchQuery('')
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>ค้นหา / เปลี่ยนเครื่อง</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-600 pt-2 border-t border-amber-200/60">
                <span className="text-stone-500">หมวดหมู่: {selectedMachine.category || 'เครื่องจักร'}</span>
                <span className={`font-bold ${selectedMachine.status === 'Running' ? 'text-emerald-700' : 'text-red-600'}`}>
                  ● สถานะ: {selectedMachine.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={machineSearchQuery}
                  onChange={(e) => setMachineSearchQuery(e.target.value)}
                  placeholder="พิมพ์ค้นหา เช่น SINK, MIX, 003, แผนก..."
                  className="w-full h-12 pl-10 pr-10 rounded-2xl bg-stone-50 border border-stone-300 font-bold text-stone-900 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:bg-white focus:outline-none transition"
                  autoFocus={isSearchingMachine}
                />
                {machineSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => setMachineSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  selectedMachine && (
                    <button
                      type="button"
                      onClick={() => setIsSearchingMachine(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )
                )}
              </div>

              {/* Filtered Machine Results List */}
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-stone-200 divide-y divide-stone-100 bg-white shadow-inner">
                {filteredMachines.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400">
                    ไม่พบเครื่องจักรที่ตรงกับ &quot;{machineSearchQuery}&quot;
                  </div>
                ) : (
                  filteredMachines.map((m) => {
                    const isCur = selectedMachine?.machine_code === m.machine_code
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => {
                          setSelectedMachine(m)
                          setIsSearchingMachine(false)
                          setMachineSearchQuery('')
                        }}
                        className={`w-full p-3 text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isCur ? 'bg-amber-50 text-amber-950 font-bold' : 'hover:bg-stone-50 text-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-900 font-bold shrink-0">
                            {m.machine_code}
                          </span>
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate">{m.machine_name}</div>
                            <div className="text-[10px] text-stone-400 truncate">
                              {m.department_name} {m.production_area ? `• ${m.production_area}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5 ml-2">
                          <span className={`text-[10px] font-bold ${m.status === 'Running' ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {m.status}
                          </span>
                          {isCur && <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                พบ {filteredMachines.length} เครื่องจักร (แตะเพื่อเลือกเครื่องที่ต้องการแจ้งซ่อม)
              </p>
            </div>
          )}
        </div>
      )}

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
          {visibleImpacts.map(item => {
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
              onClick={() => {
                setPhotoPreview(null)
                setPhotoFile(null)
              }}
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
        className={`w-full h-14 rounded-2xl text-base font-extrabold text-white shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer ${
          repairType === 'EMERGENCY'
            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-900/30'
            : repairType === 'GENERAL'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30'
            : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 shadow-purple-900/30'
        }`}
      >
        {isSubmitting ? (
          <span>กำลังส่งข้อมูล...</span>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>
              {repairType === 'SERVICE'
                ? 'ยืนยันแจ้งซ่อมบริการ (SUBMIT SERVICE)'
                : repairType === 'GENERAL'
                ? 'ยืนยันแจ้งซ่อมทั่วไป (SUBMIT TICKET)'
                : 'ยืนยันแจ้งซ่อมด่วนทันที (BREAKDOWN NOW)'}
            </span>
          </>
        )}
      </Button>

      <p className="text-[11px] text-center text-stone-400">
        แจ้งได้ใน ≤ 60 วินาที • ระบบจะสร้าง Ticket และจับเวลาการตอบสนองอัตโนมัติ
      </p>
    </form>
  )
}
