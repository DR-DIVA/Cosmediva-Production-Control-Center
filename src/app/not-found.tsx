import Link from 'next/link'
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white border border-[#D4AF37]/30 rounded-3xl p-8 sm:p-12 shadow-xl max-w-md w-full space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#8B7355]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#8B7355] font-bold">
            CosmeFlow OS • Error 404
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
            ไม่พบหน้าที่คุณต้องการ
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            หน้านี้อาจถูกย้าย หรือที่อยู่ URL ไม่ถูกต้อง กรุณากลับสู่แดชบอร์ดหลักเพื่อทำงานต่อ
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="w-full">
            <Button className="w-full bg-[#2D2721] hover:bg-stone-800 text-white font-bold py-5 flex items-center justify-center gap-2">
              <Home className="w-4 h-4 text-[#D4AF37]" />
              กลับสู่แดชบอร์ดหลัก
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
