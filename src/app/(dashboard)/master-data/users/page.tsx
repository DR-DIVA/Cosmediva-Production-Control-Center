'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Search, RefreshCw, KeyRound, CheckSquare, 
  Layers, Check, ShieldCheck, UserCheck, Sparkles, X, ChevronDown, ChevronRight, Info,
  Eye, Edit3, Lock, Shield
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { getUsers, createUser, updateUser, deleteUser } from '@/app/actions/users'
import { 
  ALL_MODULE_IDS, 
  ROLE_TEMPLATES, 
  parseRolePermissions, 
  formatPermissionsToRole, 
  getRoleDisplay,
  AccessLevel 
} from '@/lib/permissions'

// Module groups for organized display
const MODULE_GROUPS = [
  {
    groupName: '📊 วางแผนและภาพรวม (Planning & Dashboard)',
    items: [
      { id: 'dashboard', label: 'CosmeFlow Dashboard', desc: 'แดชบอร์ดภาพรวมโรงงานและ Rolling Radar' },
      { id: 'planner', label: 'CosmeFlow Planning', desc: 'วางแผนการผลิตแม่บท (PD Master Plan & KPI)' },
    ]
  },
  {
    groupName: '🏭 กระบวนการผลิต (Production Workstations)',
    items: [
      { id: 'production_overview', label: 'ภาพรวมการผลิต (Overview)', desc: 'แดชบอร์ดติดตามคิวผลิตทุกไลน์' },
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
      { id: 'improve', label: 'CosmeFlow Improve', desc: 'เพิ่มประสิทธิภาพ ลดต้นทุน ไคเซ็น และ Gemba' },
      { id: 'maintenance', label: 'Maintenance', desc: 'ซ่อมบำรุงและบำรุงรักษาเครื่องจักร' },
      { id: 'people', label: 'People (บุคลากร)', desc: 'จัดการทีมงานและกำลังพล' },
      { id: 'master-data', label: 'Master Data & ผู้ใช้งาน', desc: 'ตั้งค่าระบบและจัดการสิทธิ์พนักงาน' },
    ]
  }
]

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
  const [newUserPerms, setNewUserPerms] = useState<Record<string, 'VIEW' | 'EDIT'>>({})
  const [newUserTemplate, setNewUserTemplate] = useState<string>('custom')

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserPassword, setEditUserPassword] = useState('')
  const [editUserPerms, setEditUserPerms] = useState<Record<string, 'VIEW' | 'EDIT'>>({})
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

  // Handle template preset change
  const handleTemplateSelect = (templateKey: string, isEdit: boolean) => {
    if (templateKey === 'all_edit') {
      const all: Record<string, 'VIEW' | 'EDIT'> = {}
      ALL_MODULE_IDS.forEach(m => all[m] = 'EDIT')
      if (isEdit) {
        setEditUserPerms(all)
        setEditUserTemplate('admin')
      } else {
        setNewUserPerms(all)
        setNewUserTemplate('admin')
      }
      return
    }

    if (templateKey === 'all_view') {
      const all: Record<string, 'VIEW' | 'EDIT'> = {}
      ALL_MODULE_IDS.forEach(m => all[m] = 'VIEW')
      if (isEdit) {
        setEditUserPerms(all)
        setEditUserTemplate('custom')
      } else {
        setNewUserPerms(all)
        setNewUserTemplate('custom')
      }
      return
    }

    if (templateKey === 'clear') {
      if (isEdit) {
        setEditUserPerms({})
        setEditUserTemplate('custom')
      } else {
        setNewUserPerms({})
        setNewUserTemplate('custom')
      }
      return
    }

    if (ROLE_TEMPLATES[templateKey]) {
      const targetPerms = { ...ROLE_TEMPLATES[templateKey].perms }
      if (isEdit) {
        setEditUserPerms(targetPerms)
        setEditUserTemplate(templateKey)
      } else {
        setNewUserPerms(targetPerms)
        setNewUserTemplate(templateKey)
      }
    } else {
      if (isEdit) setEditUserTemplate('custom')
      else setNewUserTemplate('custom')
    }
  }

  // Set permission level for a single module
  const handleSetModuleLevel = (moduleId: string, level: AccessLevel, isEdit: boolean) => {
    if (isEdit) {
      setEditUserPerms(prev => {
        const next = { ...prev }
        if (level === 'NONE') {
          delete next[moduleId]
        } else {
          next[moduleId] = level
        }
        setEditUserTemplate('custom')
        return next
      })
    } else {
      setNewUserPerms(prev => {
        const next = { ...prev }
        if (level === 'NONE') {
          delete next[moduleId]
        } else {
          next[moduleId] = level
        }
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
    setNewUserPerms({})
    setNewUserTemplate('custom')
    setIsAddModalOpen(true)
  }

  // Save new user
  const handleAddUser = async () => {
    if (!newUserId || !newUserName) {
      toast.error('กรุณากรอกรหัสพนักงานและชื่อ-นามสกุล')
      return
    }

    const permittedCount = Object.keys(newUserPerms).length
    if (permittedCount === 0) {
      toast.error('กรุณากำหนดสิทธิ์เข้าถึงโมดูลอย่างน้อย 1 โมดูล (ดูอย่างเดียว หรือ แก้ไขได้)')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('กำลังสร้างบัญชีพนักงาน...')

    try {
      const finalRole = formatPermissionsToRole(newUserPerms)
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
    
    const parsedPerms = parseRolePermissions(user.role)
    setEditUserPerms(parsedPerms)
    
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

    const permittedCount = Object.keys(editUserPerms).length
    if (permittedCount === 0) {
      toast.error('กรุณากำหนดสิทธิ์เข้าถึงโมดูลอย่างน้อย 1 โมดูล (ดูอย่างเดียว หรือ แก้ไขได้)')
      return
    }
    
    setIsSubmitting(true)
    const toastId = toast.loading('กำลังอัปเดตสิทธิ์การใช้งาน...')
    
    try {
      const finalRole = formatPermissionsToRole(editUserPerms)
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

  // Render Granular Module Permission Matrix inside Dialog
  const renderGranularPicker = (currentPerms: Record<string, 'VIEW' | 'EDIT' | undefined>, isEdit: boolean, currentTemplate: string) => {
    const totalAllowed = Object.values(currentPerms).filter(Boolean).length
    const editCount = Object.values(currentPerms).filter(v => v === 'EDIT').length
    const viewCount = Object.values(currentPerms).filter(v => v === 'VIEW').length

    return (
      <div className="space-y-4">
        {/* Quick Template Selector */}
        <div className="bg-[#F8F6F0] p-3 rounded-xl border border-[#D4AF37]/30 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <Label className="text-xs font-bold text-[#4A4238] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              เลือกสิทธิ์เริ่มต้นตามแผนก (Presets):
            </Label>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleTemplateSelect('all_edit', isEdit)}
                className="h-6 text-[10px] px-2 bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
              >
                ✏️ แก้ไขได้ทั้งหมด
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleTemplateSelect('all_view', isEdit)}
                className="h-6 text-[10px] px-2 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                👁️ ดูอย่างเดียวทั้งหมด
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleTemplateSelect('clear', isEdit)}
                className="h-6 text-[10px] px-2 bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
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
              <SelectItem value="custom">-- ⚙️ กำหนดระดับสิทธิ์เองอย่างอิสระ (Custom Matrix) --</SelectItem>
              <SelectItem value="admin">⭐ ผู้ดูแลระบบ (Admin - แก้ไขได้ทุกโมดูล)</SelectItem>
              <SelectItem value="planner">📋 ฝ่ายวางแผนผลิต (Planning)</SelectItem>
              <SelectItem value="ra">📑 ฝ่ายขึ้นทะเบียน (RA - ดูอย่างเดียวเกือบทั้งหมด)</SelectItem>
              <SelectItem value="acc">💰 ฝ่ายบัญชีและการเงิน (ACC - Costing Edit + View)</SelectItem>
              <SelectItem value="production">🏭 ฝ่ายผลิต (Production - ทุกสถานี)</SelectItem>
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

        {/* Granular Permission Rows */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between pb-1">
            <span>กำหนดสิทธิ์รายโมดูล:</span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                ✏️ แก้ไขได้ {editCount}
              </span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                👁️ ดูอย่างเดียว {viewCount}
              </span>
              <span className="text-slate-400 font-normal">
                (รวม {totalAllowed}/{ALL_MODULE_IDS.length})
              </span>
            </div>
          </div>

          {MODULE_GROUPS.map((group) => (
            <div key={group.groupName} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-2xs">
              <div className="text-xs font-bold text-slate-800 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>{group.groupName}</span>
                <div className="flex gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      group.items.forEach(i => handleSetModuleLevel(i.id, 'EDIT', isEdit))
                    }}
                    className="text-emerald-700 hover:underline font-semibold"
                  >
                    แก้ไขทั้งหมด
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      group.items.forEach(i => handleSetModuleLevel(i.id, 'VIEW', isEdit))
                    }}
                    className="text-blue-700 hover:underline font-semibold"
                  >
                    ดูทั้งหมด
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      group.items.forEach(i => handleSetModuleLevel(i.id, 'NONE', isEdit))
                    }}
                    className="text-slate-500 hover:underline"
                  >
                    ปิดกลุ่มนี้
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const currentLevel: AccessLevel = (currentPerms[item.id] as AccessLevel) || 'NONE'

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg border transition-all ${
                        currentLevel === 'EDIT'
                          ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                          : currentLevel === 'VIEW'
                          ? 'bg-blue-50/60 border-blue-300 text-blue-950'
                          : 'bg-slate-50/40 border-slate-200/80 text-slate-500 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                          {currentLevel === 'EDIT' ? (
                            <Edit3 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : currentLevel === 'VIEW' ? (
                            <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span>{item.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{item.desc}</div>
                      </div>

                      {/* 3-State Segmented Buttons */}
                      <div className="flex bg-white/90 p-0.5 rounded-lg border border-slate-200/90 shrink-0 shadow-2xs self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleSetModuleLevel(item.id, 'NONE', isEdit)}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                            currentLevel === 'NONE'
                              ? 'bg-slate-200 text-slate-800 shadow-2xs'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          ⚪ ปิด
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetModuleLevel(item.id, 'VIEW', isEdit)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                            currentLevel === 'VIEW'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          👁️ ดูอย่างเดียว
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetModuleLevel(item.id, 'EDIT', isEdit)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                            currentLevel === 'EDIT'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          ✏️ แก้ไขได้
                        </button>
                      </div>
                    </div>
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
    <div className="p-3 sm:p-5 md:p-6 max-w-6xl w-full mx-auto space-y-6 min-w-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            จัดการผู้ใช้งาน
          </h1>
          <p className="text-sm text-[#8B7355] mt-1 font-medium">
            กำหนดสิทธิ์การเข้าถึงโมดูลอย่างละเอียด: ดูได้อย่างเดียว (View Only) หรือ แก้ไข/บันทึกได้ (Can Edit)
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
            <DialogContent className="sm:max-w-[700px] max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#4A4238]">
                  <UserCheck className="w-5 h-5 text-[#D4AF37]" />
                  เพิ่มพนักงานใหม่ & กำหนดระดับสิทธิ์ (ดูอย่างเดียว / แก้ไขได้)
                </DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลพนักงานและเลือกระดับสิทธิ์ของแต่ละโมดูลอย่างอิสระ
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

                {/* Granular Permission Picker */}
                {renderGranularPicker(newUserPerms, false, newUserTemplate)}
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
        <DialogContent className="sm:max-w-[700px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#4A4238]">
              <UserCheck className="w-5 h-5 text-[#D4AF37]" />
              แก้ไขข้อมูล & ปรับระดับสิทธิ์พนักงาน
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

            {/* Granular Permission Picker */}
            {renderGranularPicker(editUserPerms, true, editUserTemplate)}
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
                  <th className="px-4 py-3 font-bold">สิทธิ์โมดูลที่เข้าถึงได้</th>
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
                    const userPerms = parseRolePermissions(user.role)
                    const entries = Object.entries(userPerms)

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

                            {/* Popover to view full granular permission breakdown */}
                            {entries.length > 0 && user.role !== 'admin' && (
                              <Popover>
                                <PopoverTrigger className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-0.5">
                                  <span>ดูรายละเอียด</span>
                                  <Info className="w-3 h-3" />
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-3 bg-white shadow-xl rounded-xl border border-slate-200 text-xs">
                                  <div className="font-bold text-slate-800 mb-2 border-b pb-1 flex justify-between items-center">
                                    <span>สิทธิ์การใช้งาน ({entries.length} โมดูล):</span>
                                  </div>
                                  <div className="space-y-1.5 max-h-56 overflow-y-auto text-[11px]">
                                    {entries.map(([mId, lvl]) => (
                                      <div key={mId} className="flex items-center justify-between gap-1.5 border-b border-slate-50 pb-1">
                                        <span className="text-slate-700 font-medium truncate">{mId}</span>
                                        {lvl === 'EDIT' ? (
                                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                            ✏️ แก้ไขได้
                                          </span>
                                        ) : (
                                          <span className="text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                            👁️ ดูอย่างเดียว
                                          </span>
                                        )}
                                      </div>
                                    ))}
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
                            className="h-7 text-xs border-slate-200 hover:bg-slate-100 text-slate-700 font-medium" 
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
