'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, RefreshCw, KeyRound } from 'lucide-react'
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

import { getUsers, createUser, updateUser, deleteUser } from '@/app/actions/users'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  // New User Form State
  const [newUserId, setNewUserId] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('123456') // Default password

  // Edit User State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserRole, setEditUserRole] = useState('')
  const [editUserPassword, setEditUserPassword] = useState('')


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

  const handleAddUser = async () => {
    if (!newUserId || !newUserName || !newUserRole) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('กำลังสร้างบัญชีพนักงาน...')

    try {
      const res = await createUser({
        employee_id: newUserId,
        full_name: newUserName,
        role: newUserRole,
        password: newUserPassword
      })

      if (res.success) {
        toast.success('เพิ่มบัญชีพนักงานสำเร็จเรียบร้อย', { id: toastId })
        // Close modal & Reset form
        setIsAddModalOpen(false)
        setNewUserId('')
        setNewUserName('')
        setNewUserRole('')
        // Refresh table
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

  
  const handleEditClick = (user: any) => {
    setEditingUser(user)
    setEditUserName(user.full_name || '')
    setEditUserRole(user.role || '')
    setEditUserPassword('')
    setIsEditModalOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!editUserName || !editUserRole) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    
    setIsSubmitting(true)
    const toastId = toast.loading('กำลังอัปเดตข้อมูล...')
    
    try {
      const res = await updateUser(editingUser.id, {
        full_name: editUserName,
        role: editUserRole,
        password: editUserPassword || undefined
      })
      
      if (res.success) {
        toast.success('อัปเดตข้อมูลสำเร็จเรียบร้อย', { id: toastId })
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

  const handleDeleteUser = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานคนนี้?')) return;
    
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


  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-[#8B7355] mt-2 font-medium">จัดการบัญชีพนักงานและสิทธิ์การเข้าถึงระบบ</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={fetchUsersData} className="flex-1 md:flex-none" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>

          <Button className="flex-1 md:flex-none bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มพนักงาน
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>เพิ่มพนักงานใหม่</DialogTitle>
                <DialogDescription>
                  สร้างบัญชีให้พนักงานเพื่อเข้าสู่ระบบ CosmeFlow OS
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="employee_id">รหัสพนักงาน (ใช้สำหรับ Login)</Label>
                  <Input 
                    id="employee_id" 
                    placeholder="เช่น PD001, WH001" 
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
                  <Input 
                    id="full_name" 
                    placeholder="เช่น สมชาย ใจดี" 
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">สิทธิ์การใช้งาน (Role)</Label>
                  <Select value={newUserRole} onValueChange={(val) => setNewUserRole(val || '')} disabled={isSubmitting}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="เลือกสิทธิ์การใช้งาน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">ผู้ดูแลระบบ (Admin)</SelectItem>
                      <SelectItem value="production_mx">แผนกผสม (MX)</SelectItem>
                      <SelectItem value="production_pk">แผนกบรรจุและลงลัง (PK/POF)</SelectItem>
                      <SelectItem value="qc">ฝ่ายควบคุมคุณภาพ (QC)</SelectItem>
                      <SelectItem value="qa">ฝ่ายประกันคุณภาพ (QA)</SelectItem>
                      <SelectItem value="purchase">ฝ่ายจัดซื้อ (PU)</SelectItem>
                      <SelectItem value="warehouse_mmrm_bu">คลังวัตถุดิบ (MMRM/BU)</SelectItem>
                      <SelectItem value="warehouse_mmpm_fg">คลังบรรจุภัณฑ์และ FG (MMPM/FG)</SelectItem>
                      <SelectItem value="planner">ฝ่ายวางแผนผลิต (Planning)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 p-3 bg-slate-50 border rounded-lg mt-2">
                  <Label className="text-slate-500 flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> 
                    รหัสผ่านเริ่มต้น (Default Password)
                  </Label>
                  <p className="text-sm font-mono font-medium text-slate-800">{newUserPassword}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>ยกเลิก</Button>
                <Button onClick={handleAddUser} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white" disabled={isSubmitting}>
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลพนักงาน</DialogTitle>
            <DialogDescription>
              ปรับปรุงข้อมูลพนักงาน เปลี่ยนสิทธิ์ หรือตั้งรหัสผ่านใหม่
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>รหัสพนักงาน</Label>
              <Input value={editingUser?.employee_id || ''} disabled className="bg-slate-100" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">ชื่อ-นามสกุล</Label>
              <Input 
                id="edit-name" 
                placeholder="เช่น สมชาย ใจดี" 
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">สิทธิ์การใช้งาน (Role)</Label>
              <Select value={editUserRole} onValueChange={(val) => setEditUserRole(val || '')} disabled={isSubmitting}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกสิทธิ์การใช้งาน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">ผู้ดูแลระบบ (Admin)</SelectItem>
                  <SelectItem value="production_mx">แผนกผสม (MX)</SelectItem>
                  <SelectItem value="production_pk">แผนกบรรจุและลงลัง (PK/POF)</SelectItem>
                  <SelectItem value="qc">ฝ่ายควบคุมคุณภาพ (QC)</SelectItem>
                  <SelectItem value="qa">ฝ่ายประกันคุณภาพ (QA)</SelectItem>
                  <SelectItem value="purchase">ฝ่ายจัดซื้อ (PU)</SelectItem>
                  <SelectItem value="warehouse_mmrm_bu">คลังวัตถุดิบ (MMRM/BU)</SelectItem>
                  <SelectItem value="warehouse_mmpm_fg">คลังบรรจุภัณฑ์และ FG (MMPM/FG)</SelectItem>
                  <SelectItem value="planner">ฝ่ายวางแผนผลิต (Planning)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 p-3 bg-slate-50 border rounded-lg mt-2">
              <Label htmlFor="edit-password" className="text-slate-500 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> 
                รีเซ็ตรหัสผ่านใหม่ (ไม่บังคับ)
              </Label>
              <Input 
                id="edit-password" 
                placeholder="ปล่อยว่างไว้หากไม่ต้องการเปลี่ยน" 
                value={editUserPassword}
                onChange={(e) => setEditUserPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>ลบพนักงาน</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>ยกเลิก</Button>
              <Button onClick={handleUpdateUser} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white" disabled={isSubmitting}>
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกแก้ไข'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อพนักงานทั้งหมด</CardTitle>
          <CardDescription>พนักงานที่มีบัญชีในระบบ CosmeFlow OS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="ค้นหารหัสพนักงาน, ชื่อ..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#F8F6F0] text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium">รหัสพนักงาน</th>
                  <th className="px-4 py-3 font-medium">ชื่อ-สกุล</th>
                  <th className="px-4 py-3 font-medium">แผนก/สิทธิ์ (Role)</th>
                  <th className="px-4 py-3 font-medium">วันที่สร้าง</th>
                  <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">กำลังโหลด...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      ไม่พบข้อมูลพนักงาน
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F8F6F0] transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{user.employee_id}</td>
                      <td className="px-4 py-3 text-slate-600">{user.full_name || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                          user.role === 'qc' || user.role === 'qa' ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30' :
                          user.role === 'purchase' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(user.created_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={() => handleEditClick(user)}>แก้ไข</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
