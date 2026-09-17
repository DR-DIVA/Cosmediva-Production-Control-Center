'use client'

import React, { useState } from 'react'
import { 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  RotateCcw, 
  Settings2, 
  Sparkles,
  Layers,
  AlertCircle
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { PipelineStage, Deal } from './types'
import { DEFAULT_STAGES } from './mockData'

interface StageSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  stages: PipelineStage[]
  deals: Deal[]
  onSaveStages: (stages: PipelineStage[]) => void
}

export const StageSettingsModal: React.FC<StageSettingsModalProps> = ({
  isOpen,
  onClose,
  stages,
  deals,
  onSaveStages,
}) => {
  const [stageList, setStageList] = useState<PipelineStage[]>(stages)
  const [newStageName, setNewStageName] = useState('')
  const [newStageProb, setNewStageProb] = useState(50)

  React.useEffect(() => {
    setStageList([...stages].sort((a, b) => a.order - b.order))
  }, [stages, isOpen])

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...stageList]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    // Re-index orders
    updated.forEach((s, idx) => { s.order = idx + 1 })
    setStageList(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === stageList.length - 1) return
    const updated = [...stageList]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    // Re-index orders
    updated.forEach((s, idx) => { s.order = idx + 1 })
    setStageList(updated)
  }

  const handleNameChange = (id: string, name: string) => {
    setStageList(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }

  const handleProbChange = (id: string, probability: number) => {
    const valid = Math.max(0, Math.min(100, probability))
    setStageList(prev => prev.map(s => s.id === id ? { ...s, probability: valid } : s))
  }

  const handleDeleteStage = (stageId: string) => {
    const stageToDelete = stageList.find(s => s.id === stageId)
    if (stageToDelete?.isWon || stageToDelete?.isLost) {
      toast.error('ไม่สามารถลบสเตจระบบ (Won / Lost) ได้')
      return
    }

    const dealsInStage = deals.filter(d => d.stageId === stageId).length
    if (dealsInStage > 0) {
      if (!confirm(`มีดีลค้างอยู่ในสเตจนี้ ${dealsInStage} ดีล หากลบ ดีลเหล่านั้นจะต้องถูกย้ายไปสเตจแรก ต้องการดำเนินการต่อหรือไม่?`)) {
        return
      }
    }

    const updated = stageList.filter(s => s.id !== stageId)
    updated.forEach((s, idx) => { s.order = idx + 1 })
    setStageList(updated)
    toast.success('ลบสเตจเรียบร้อย')
  }

  const handleAddStage = () => {
    if (!newStageName.trim()) {
      toast.error('กรุณาระบุชื่อสเตจ')
      return
    }

    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name: newStageName.trim(),
      probability: newStageProb,
      color: 'bg-slate-100 text-slate-800 border-slate-300',
      order: stageList.length + 1,
      rottingDays: 7,
    }

    const updated = [...stageList, newStage]
    setStageList(updated)
    setNewStageName('')
    setNewStageProb(50)
    toast.success('เพิ่มสเตจใหม่เรียบร้อย')
  }

  const handleSave = () => {
    onSaveStages(stageList)
    toast.success('บันทึกการตั้งค่าสเตจเรียบร้อยแล้ว')
    onClose()
  }

  const handleResetDefault = () => {
    if (confirm('ต้องการรีเซ็ตสเตจกลับไปเป็นค่าเริ่มต้นของโรงงาน OEM/ODM หรือไม่?')) {
      setStageList([...DEFAULT_STAGES])
      toast.info('รีเซ็ตเป็นค่าเริ่มต้นแล้ว (กดบันทึกเพื่อยืนยัน)')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Settings2 className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                ตั้งค่าสเตจในไปป์ไลน์ (Pipeline Stages Customizer)
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            ปรับแต่ง เพิ่ม ลด เปลี่ยนชื่อ จัดลำดับ และกำหนดโอกาสชนะ (% Probability) ให้ตรงกับขั้นตอนงานจริงของโรงงาน
          </DialogDescription>
        </DialogHeader>

        {/* Stage List */}
        <div className="space-y-2.5 my-4">
          {stageList.map((stage, index) => (
            <div 
              key={stage.id} 
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                stage.isWon 
                  ? 'bg-emerald-50/60 border-emerald-200' 
                  : stage.isLost 
                  ? 'bg-rose-50/60 border-rose-200' 
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              {/* Order Controls */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === stageList.length - 1}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              <span className="font-mono text-xs font-bold text-slate-400 w-5 text-center">
                {index + 1}
              </span>

              {/* Stage Name Input */}
              <div className="flex-1">
                <Input
                  value={stage.name}
                  onChange={(e) => handleNameChange(stage.id, e.target.value)}
                  className="h-8 text-xs font-semibold bg-white"
                  placeholder="ชื่อสเตจ..."
                />
              </div>

              {/* Probability % */}
              <div className="flex items-center gap-1 w-24">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={stage.probability}
                  onChange={(e) => handleProbChange(stage.id, Number(e.target.value))}
                  className="h-8 text-xs font-bold text-center bg-white"
                />
                <span className="text-xs text-slate-500 font-semibold">%</span>
              </div>

              {/* Won / Lost badge or Delete button */}
              {stage.isWon ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                  Won
                </span>
              ) : stage.isLost ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">
                  Lost
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDeleteStage(stage.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="ลบสเตจนี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add New Stage Box */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            เพิ่มสเตจใหม่ในไปป์ไลน์
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="เช่น ส่งใบรับรองผลแล็บ (COA), ลูกค้าชำระงวดสุดท้าย..."
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              className="h-8 text-xs bg-white flex-1"
            />

            <div className="flex items-center gap-1 w-24">
              <Input
                type="number"
                min={0}
                max={100}
                value={newStageProb}
                onChange={(e) => setNewStageProb(Number(e.target.value))}
                className="h-8 text-xs bg-white text-center font-bold"
                placeholder="%"
              />
              <span className="text-xs text-slate-500 font-semibold">%</span>
            </div>

            <Button
              size="sm"
              onClick={handleAddStage}
              className="h-8 text-xs bg-slate-800 text-white hover:bg-slate-900"
            >
              เพิ่ม
            </Button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefault}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            คืนค่าโรงงานเริ่มต้น
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              ยกเลิก
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-[#2D2721] text-amber-400 hover:bg-[#3D352D] font-semibold text-xs border border-[#D4AF37]/50"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              บันทึกการตั้งค่า
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
