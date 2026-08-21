'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Search, RefreshCw, KeyRound, CheckSquare, 
  Layers, Check, ShieldCheck, UserCheck, Sparkles, X, ChevronDown, ChevronRight, Info
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { getUsers, createUser, updateUser, deleteUser } from '@/app/actions/users'
import { APP_MODULES, ROLE_TEMPLATES, getRoleDisplay } from '@/lib/permissions'

// Module groups for organized display in checkboxes
const MODULE_GROUPS = [
  {
    groupName: '📊 วางแผนและภาพรวม (Planning & Dashboard)',
    items: [
      { id: 'dashboard', label: 'CosmeFlow Dashboard', desc: 'แดชบอร์ดภาพรวมโรงงาน' },
      { id: 'planner', label: 'CosmeFlow Planning', desc: 'วางแผนการผลิตแม่บท (PD Master Plan)' },
    ]
  },
  {
    groupName: '🏭 กระบวนการผลิต (Production Workstations)',
    items: [
      { id: 'production_overview', label: 'ภาพรวมการผลิต (Overview)', desc: 'แดชบอร์ดติดตามคิวผลิต' },
      { id: 'production_weighing', label: 'ชั่งสาร (Weighing)', desc: 'สถานีเตรียมและชั่งสารเคมี' },
      { id: 'production_mixing', label: 'งานผสม (Mixing)', desc: 'สถานีผสมเนื้อ Bulk' },
      { id: 'production_packing', label: 'งานบรรจุ (Packing)', desc: 'สถานีบรรจุและติดฉลาก' },
      { id: 'production_pof', label: 'งานลงลัง (Cartoning/POF)', desc: 'สถานีลงกล่องและซีลหด' },
    ]
  },
  {
    groupName: '📦 วัตถุดิบ จัดซื้อ และคลังสินค้า (Logistics & Warehouse)',
    items: [
      { id: 'incoming-rm', label: 'Material Control (RM/PM)', desc: 'ตรวจรับวัตถุดิบและบรรจุภัณฑ์' },
      { id: 'purchase', label: 'Purchase (จัดซื้อ)', desc: 'ระบบติดตามคำสั่งซื้อ PR/PO' },
      { id: 'fg', label: 'FG Warehouse (คลังสินค้า)', desc: 'รับเข้าและส่งมอบสินค้าสำเร็จรูป' },
    ]
  },
  {
    groupName: '🔍 คุณภาพและประกันคุณภาพ (Quality & Assurance)',
    items: [
      { id: 'qc', label: 'CosmeFlow Quality (QC)', desc: 'บันทึกผลแล็บและปล่อยผ่านถัง' },
      { id: 'issues', label: 'CosmeFlow Assurance (QA)', desc: 'ระบบแจ้งและจัดการปัญหาการผลิต' },
    ]
  },
  {
    groupName: '⚙️ ระบบและการบริหาร (Management & Costing)',
    items: [
      { id: 'costing', label: 'CosmeFlow Costing', desc: 'คำนวณและติดตามต้นทุนการผลิต' },
      { id: 'maintenance', label: 'Maintenance', desc: 'ซ่อมบำรุงและบำรุงรักษาเครื่องจักร' },
      { id: 'people', label: 'People (บุคลากร)', desc: 'จัดการทีมงานและกำลังพล' },
      { id: 'master-data', label: 'Master Data & ผู้ใช้งาน', desc: 'ตั้งค่าระบบและจัดการสิทธิ์พนักงาน' },
    ]
  }
]

const ALL_MODULE_IDS = MODULE_GROUPS.flatMap(g => g.items.map(i => i.id))

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newUserId, setNewUserId] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('123456')
  const [newUserSelectedModules, setNewUserSelectedModules] = useState<string[]>([])
  const [newUserTemplate, setNewUserTemplate] = useState<string>('custom')

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserPassword, setEditUserPassword] = useState('')
  const [editUserSelectedModules, setEditUserSelectedModules] = useState<string[]>([])
  const [editUserTemplate, setEditUserTemplate] = useState<string>('custom')

  const fetchUsersData = async () => {
    try {
      setLoading(true)
      const res = await getUsers()
      if (res.success && res.data) {
        setUsers(res.data)
      } else {
        toast.error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ: ' + res.error)
      }
    } catch (err) {
      console.error('Error fetching users', err)
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsersData()
  }, [])

  const filteredUsers = users.filter(u => 
    u.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Parse existing user role string into array of module IDs
  const parseRoleToModules = (roleString: string): string[] => {
    if (!roleString) return []
    if (roleString === 'admin') return [...ALL_MODULE_IDS]
    if (roleString.startsWith('custom:')) {
      return roleString.replace('custom:', '').split(',').map(s => s.trim()).filter(Boolean)
    }
    if (ROLE_TEMPLATES[roleString]) {
      return [...ROLE_TEMPLATES[roleString].modules]
    }
    return []
  }

  // Convert array of module IDs back into role string for saving
  const formatModulesToRole = (modules: string[]): string => {
    if (modules.length === 0) return 'custom:'
    // If all modules selected, mark as admin
    if (ALL_MODULE_IDS.every(m => modules.includes(m))) {
      return 'admin'
    }
    return `custom:${modules.join(',')}`
  }

  // Handle template preset change
  const handleTemplateSelect = (templateKey: string, isEdit: boolean) => {
    if (templateKey === 'all') {
      if (isEdit) {
        setEditUserSelectedModules([...ALL_MODULE_IDS])
        setEditUserTemplate('all')
      } else {
        setNewUserSelectedModules([...ALL_MODULE_IDS])
        setNewUserTemplate('all')
      }
      return
    }

    if (templateKey === 'clear') {
      if (isEdit) {
        setEditUserSelectedModules([])
        setEditUserTemplate('custom')
      } else {
        setNewUserSelectedModules([])
        setNewUserTemplate('custom')
      }
      return
    }

    if (ROLE_TEMPLATES[templateKey]) {
      const targetModules = ROLE_TEMPLATES[templateKey].modules
      if (isEdit) {
        setEditUserSelectedModules([...targetModules])
        setEditUserTemplate(templateKey)
      } else {
        setNewUserSelectedModules([...targetModules])
        setNewUserTemplate(templateKey)
      }
    } else {
      if (isEdit) setEditUserTemplate('custom')
      else setNewUserTemplate('custom')
    }
  }

  // Toggle single module checkbox
  const handleModuleToggle = (moduleId: string, isEdit: boolean) => {
    if (isEdit) {
      setEditUserSelectedModules(prev => {
        const next = prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId]
        setEditUserTemplate('custom')
        return next
      })
    } else {
      setNewUserSelectedModules(prev => {
        const next = prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId]
        setNewUserTemplate('custom')
        return next
      })
    }
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    setNewUserId('')
    setNewUserName('')
    setNewUserPassword('123456')
    setNewUserSelectedModules([])
    setNewUserTemplate('custom')
    setIsAddModalOpen(true)
  }

  // Save new user
  const handleAddUser = async () => {
    if (!newUserId || !newUserName) {
      toast.error('กรุณากรอกรหัสพนักงานและชื่อ-นามสกุล')
      return
    }

    if (newUserSelectedModules.length === 0) {
      toast.error('กรุณาเลือกโมดูลที่พนักงานสามารถเข้าถึงได้อย่างน้อย 1 โมดูล')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('กำลังสร้างบัญชีพนักงาน...')

    try {
      const finalRole = formatModulesToRole(newUserSelectedModules)
      const res = await createUser({
        employee_id: newUserId,
        full_name: newUserName,
        role: finalRole,
        password: newUserPassword
      })

      if (res.success) {
        toast.success('เพิ่มบัญชีพนักงานและกำหนดสิทธิ์เรียบร้อยแล้ว', { id: toastId })
        setIsAddModalOpen(false)
        await fetchUsersData()
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + res.error, { id: toastId })
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งข้อมูล', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Edit Modal
  const handleEditClick = (user: any) => {
    setEditingUser(user)
    setEditUserName(user.full_name || '')
    setEditUserPassword('')
    
    const parsedModules = parseRoleToModules(user.role)
    setEditUserSelectedModules(parsedModules)
    
    // Check if matches template
    if (user.role === 'admin') setEditUserTemplate('admin')
    else if (ROLE_TEMPLATES[user.role]) setEditUserTemplate(user.role)
    else setEditUserTemplate('custom')

    setIsEditModalOpen(true)
  }

  // Save edited user
  const handleUpdateUser = async () => {
    if (!editUserName) {
      toast.error('กรุณากรอกชื่อ-นามสกุล')
      return
    }

    if (editUserSelectedModules.length === 0) {
      toast.error('กรุณาเลือกโมดูลที่พนักงานสามารถเข้าถึงได้อย่างน้อย 1 โมดูล')
      return
    }
    
    setIsSubmitting(true)
    const toastId = toast.loading('กำลังอัปเดตสิทธิ์การใช้งาน...')
    
    try {
      const finalRole = formatModulesToRole(editUserSelectedModules)
      const res = await updateUser(editingUser.id, {
        full_name: editUserName,
        role: finalRole,
        password: editUserPassword || undefined
      })
      
      if (res.success) {
        toast.success('อัปเดตข้อมูลและสิทธิ์พนักงานสำเร็จเรียบร้อย', { id: toastId })
        setIsEditModalOpen(false)
        await fetchUsersData()
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + res.error, { id: toastId })
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งข้อมูล', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete User
  const handleDeleteUser = async () => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีพนักงาน ${editingUser?.employee_id} (${editingUser?.full_name})?`)) return
    
    setIsSubmitting(true)
    const toastId = toast.loading('กำลังลบพนักงาน...')
    
    try {
      const res = await deleteUser(editingUser.id)
      if (res.success) {
        toast.success('ลบพนักงานสำเร็จ', { id: toastId })
        setIsEditModalOpen(false)
        await fetchUsersData()
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + res.error, { id: toastId })
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งข้อมูล', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render Module Checkbox Picker inside Dialog
  const renderModulePicker = (selectedModules: string[], isEdit: boolean, currentTemplate: string) => {
    return (
      <div className="space-y-4">
        {/* Quick Template Selector */}
        <div className="bg-[#F8F6F0] p-3 rounded-xl border border-[#D4AF37]/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-[#4A4238] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              เลือกสิทธิ์เริ่มต้นจากแม่แบบ (Template):
            </Label>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleTemplateSelect('all', isEdit)}
                className="h-6 text-[11px] px-2 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
              >
                เลือกทั้งหมด ({ALL_MODULE_IDS.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleTemplateSelect('clear', isEdit)}
                className="h-6 text-[11px] px-2 bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
              >
                ล้างทั้งหมด
              </Button>
            </div>
          </div>

          <Select value={currentTemplate} onValueChange={(val) => handleTemplateSelect(val || 'custom', isEdit)}>
            <SelectTrigger className="w-full h-8 text-xs bg-white">
              <SelectValue placeholder="เลือกแม่แบบสิทธิ์ตามแผนก..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">-- กำหนดโมดูลเองอย่างอิสระ (Custom) --</SelectItem>
              <SelectItem value="admin">⭐ ผู้ดูแลระบบ (Admin - ทุกโมดูล)</SelectItem>
              <SelectItem value="planner">📋 ฝ่ายวางแผนผลิต (Planning)</SelectItem>
              <SelectItem value="production_mx">🥣 แผนกผสม (Production MX)</SelectItem>
              <SelectItem value="production_pk">📦 แผนกบรรจุและลงลัง (Production PK/POF)</SelectItem>
              <SelectItem value="qc">🔬 ฝ่ายควบคุมคุณภาพ (QC)</SelectItem>
              <SelectItem value="qa">🛡️ ฝ่ายประกันคุณภาพ (QA)</SelectItem>
              <SelectItem value="warehouse_mmrm_bu">🏭 คลังวัตถุดิบ (MMRM / BU)</SelectItem>
              <SelectItem value="warehouse_mmpm_fg">🏬 คลังบรรจุภัณฑ์และ FG (MMPM / FG)</SelectItem>
              <SelectItem value="purchase">🛒 ฝ่ายจัดซื้อ (Purchase)</SelectItem>
              <SelectItem value="maintenance">🔧 ฝ่ายซ่อมบำรุง (Maintenance)</SelectItem>
              <SelectItem value="people">👥 ฝ่ายบุคคล (People)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Checkbox Groups */}
        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>ติ๊กเลือกโมดูลที่ต้องการให้พนักงานคนนี้เข้าถึงได้:</span>
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
              เลือกแล้ว {selectedModules.length} / {ALL_MODULE_IDS.length} โมดูล
            </span>
          </div>

          {MODULE_GROUPS.map((group) => (
            <div key={group.groupName} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs">
              <div className="text-xs font-bold text-slate-800 pb-1 border-b border-slate-100 flex items-center justify-between">
                <span>{group.groupName}</span>
                <button
                  type="button"
                  onClick={() => {
                    const groupIds = group.items.map(i => i.id)
                    const allInGroup = groupIds.every(id => selectedModules.includes(id))
                    if (allInGroup) {
                      // uncheck all in this group
                      if (isEdit) setEditUserSelectedModules(prev => prev.filter(id => !groupIds.includes(id)))
                      else setNewUserSelectedModules(prev => prev.filter(id => !groupIds.includes(id)))
                    } else {
                      // check all in this group
                      if (isEdit) setEditUserSelectedModules(prev => Array.from(new Set([...prev, ...groupIds])))
                      else setNewUserSelectedModules(prev => Array.from(new Set([...prev, ...groupIds])))
                    }
                  }}
                  className="text-[10px] text-blue-600 hover:underline font-semibold"
                >
                  {group.items.every(i => selectedModules.includes(i.id)) ? 'ยกเลิกกลุ่มนี้' : 'เลือกทั้งกลุ่ม'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {group.items.map((item) => {
                  const isChecked = selectedModules.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300/40 text-blue-950' 
                          : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleModuleToggle(item.id, isEdit)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold leading-tight">{item.label}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{item.desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            จัดการผู้ใช้งาน
          </h1>
          <p className="text-sm text-[#8B7355] mt-1 font-medium">
            กำหนดสิทธิ์การเข้าถึงโมดูลของพนักงานแต่ละคนอย่างอิสระ ไม่จำกัดตามแผนก
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={fetchUsersData} className="flex-1 md:flex-none" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>

          <Button className="flex-1 md:flex-none bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white font-bold" onClick={handleOpenAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มพนักงาน
          </Button>

          {/* Add User Modal */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#4A4238]">
                  <UserCheck className="w-5 h-5 text-[#D4AF37]" />
                  เพิ่มพนักงานใหม่ & กำหนดสิทธิ์เข้าโมดูล
                </DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลพนักงานและติ๊กเลือกโมดูลที่ต้องการให้พนักงานคนนี้สามารถใช้งานได้
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="employee_id" className="text-xs font-bold">รหัสพนักงาน (Login ID) *</Label>
                    <Input 
                      id="employee_id" 
                      placeholder="เช่น PD001, WH001" 
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      disabled={isSubmitting}
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="full_name" className="text-xs font-bold">ชื่อ-นามสกุล *</Label>
                    <Input 
                      id="full_name" 
                      placeholder="เช่น สมชาย ใจดี" 
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      disabled={isSubmitting}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5 p-2.5 bg-slate-50 border rounded-xl">
                  <Label className="text-slate-500 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> 
                    รหัสผ่านเริ่มต้น (Default Password):
                  </Label>
                  <p className="text-xs font-mono font-bold text-slate-800">{newUserPassword}</p>
                </div>

                {/* Module Checkbox Selector */}
                {renderModulePicker(newUserSelectedModules, false, newUserTemplate)}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
                  ยกเลิก
                </Button>
                <Button onClick={handleAddUser} className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white font-bold" disabled={isSubmitting}>
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกพนักงาน'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#4A4238]">
              <UserCheck className="w-5 h-5 text-[#D4AF37]" />
              แก้ไขข้อมูล & ปรับสิทธิ์โมดูลพนักงาน
            </DialogTitle>
            <DialogDescription>
              พนักงานรหัส: <strong className="text-slate-900">{editingUser?.employee_id}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-500">รหัสพนักงาน</Label>
                <Input value={editingUser?.employee_id || ''} disabled className="bg-slate-100 h-9 font-mono font-bold" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name" className="text-xs font-bold">ชื่อ-นามสกุล *</Label>
                <Input 
                  id="edit-name" 
                  placeholder="เช่น สมชาย ใจดี" 
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  disabled={isSubmitting}
                  className="h-9"
                />
              </div>
            </div>

            {/* Reset password */}
            <div className="grid gap-1.5 p-3 bg-slate-50 border rounded-xl">
              <Label htmlFor="edit-password" className="text-slate-600 text-xs flex items-center gap-1.5 font-bold">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" /> 
                รีเซ็ตรหัสผ่านใหม่ (ไม่บังคับ):
              </Label>
              <Input 
                id="edit-password" 
                placeholder="ปล่อยว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน" 
                value={editUserPassword}
                onChange={(e) => setEditUserPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs bg-white"
              />
            </div>

            {/* Module Checkbox Selector */}
            {renderModulePicker(editUserSelectedModules, true, editUserTemplate)}
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between w-full pt-2 border-t border-slate-100">
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              ลบพนักงาน
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <Button onClick={handleUpdateUser} className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white font-bold" disabled={isSubmitting}>
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Users Table */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">รายชื่อพนักงานทั้งหมด</CardTitle>
              <CardDescription>พนักงานที่มีบัญชีและสิทธิ์การใช้งานในระบบ CosmeFlow OS</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหารหัสพนักงาน, ชื่อ..."
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-[#F8F6F0] text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold">รหัสพนักงาน</th>
                  <th className="px-4 py-3 font-bold">ชื่อ-สกุล</th>
                  <th className="px-4 py-3 font-bold">สิทธิ์โมดูลที่เข้าได้</th>
                  <th className="px-4 py-3 font-bold">วันที่สร้าง</th>
                  <th className="px-4 py-3 font-bold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-[#D4AF37]" />
                      กำลังโหลดข้อมูลพนักงาน...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      ไม่พบข้อมูลพนักงานที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const roleInfo = getRoleDisplay(user.role)
                    const userModules = parseRoleToModules(user.role)

                    return (
                      <tr key={user.id} className="hover:bg-[#F8F6F0]/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {user.employee_id}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {user.full_name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={roleInfo.className}>
                              {roleInfo.label}
                            </Badge>

                            {/* Popover to view full module list */}
                            {userModules.length > 0 && user.role !== 'admin' && (
                              <Popover>
                                <PopoverTrigger className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-0.5">
                                  <span>ดูโมดูล ({userModules.length})</span>
                                  <Info className="w-3 h-3" />
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3 bg-white shadow-xl rounded-xl border border-slate-200 text-xs">
                                  <div className="font-bold text-slate-800 mb-2 border-b pb-1">
                                    โมดูลที่อนุญาต ({userModules.length}):
                                  </div>
                                  <div className="space-y-1 max-h-48 overflow-y-auto text-[11px] text-slate-600">
                                    {userModules.map(mId => {
                                      const found = ALL_MODULE_IDS.includes(mId)
                                      return (
                                        <div key={mId} className="flex items-center gap-1.5">
                                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                          <span>{mId}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(user.created_at).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs border-slate-200 hover:bg-slate-100 text-slate-700" 
                            onClick={() => handleEditClick(user)}
                          >
                            แก้ไขสิทธิ์
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
