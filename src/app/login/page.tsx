'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Factory, Lock, User } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employeeId || !password) {
      toast.error('กรุณากรอกรหัสพนักงานและรหัสผ่าน')
      return
    }

    setLoading(true)

    try {
      const email = `${employeeId.toLowerCase()}@cosmediva.local`
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง')
        } else {
          toast.error('เกิดข้อผิดพลาด: ' + error.message)
        }
        return
      }
      
      toast.success('เข้าสู่ระบบสำเร็จ')
      
      // Need to force a hard refresh or router refresh so middleware sees the session cookie
      window.location.href = '/dashboard'
      
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F6F0] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#D4AF37] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-cosme-gold/30">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#4A4238]">CosmeFlow OS</h1>
          <p className="text-[#8B7355] mt-1 font-medium text-lg">Connect • Control • Collaborate</p>
          
          <div className="mt-6 text-sm text-[#4A4238] space-y-2 bg-white/50 p-4 rounded-xl border border-[#D4AF37]/30 text-left w-full shadow-sm">
             <p className="font-bold text-center border-b border-[#D4AF37]/20 pb-2 mb-2 text-[#D4AF37]">Connect Every Process. Control Every Operation. Collaborate Without Limits.</p>
             <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span> <strong>Connect</strong> — เชื่อมทุกฝ่าย ทุกข้อมูล</p>
             <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span> <strong>Control</strong> — ควบคุมทุกกระบวนการ</p>
             <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span> <strong>Collaborate</strong> — ทุกแผนกทำงานบนข้อมูลเดียวกัน</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50">
          <CardHeader>
            <CardTitle className="text-xl text-center">เข้าสู่ระบบ (Sign In)</CardTitle>
            <CardDescription className="text-center">
              กรุณากรอกรหัสพนักงานและรหัสผ่านของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">รหัสพนักงาน (Employee ID)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="เช่น QC-001"
                    className="pl-9"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน (Password)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button type="button" onClick={handleLogin} className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white font-medium" disabled={loading}>
                {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-slate-500">
            หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ (Admin)
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
