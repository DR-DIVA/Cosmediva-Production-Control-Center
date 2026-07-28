import os

path = r"c:\Users\hp\Dropbox\AI AGENT\Antigravity\Update PD Daily Status\cosmediva-os\src\app\(dashboard)\master-data\users\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import { getUsers, createUser } from '@/app/actions/users'",
    "import { getUsers, createUser, updateUser, deleteUser } from '@/app/actions/users'"
)

content = content.replace(
    "const [newUserPassword, setNewUserPassword] = useState('123456') // Default password",
    "const [newUserPassword, setNewUserPassword] = useState('123456') // Default password\n\n  // Edit User State\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false)\n  const [editingUser, setEditingUser] = useState<any>(null)\n  const [editUserName, setEditUserName] = useState('')\n  const [editUserRole, setEditUserRole] = useState('')\n  const [editUserPassword, setEditUserPassword] = useState('')\n"
)

handleEditCode = """
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
"""

content = content.replace(
    "return (\n    <div className=\"p-6",
    handleEditCode + "\n\n  return (\n    <div className=\"p-6"
)

content = content.replace(
    '<Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">แก้ไข</Button>',
    '<Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={() => handleEditClick(user)}>แก้ไข</Button>'
)

editDialogCode = """
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
"""

content = content.replace(
    "          </div>\n        </div>\n  \n        <Card>",
    "          </div>\n" + editDialogCode + "\n        </div>\n  \n        <Card>"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Update Complete')
