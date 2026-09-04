'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  CheckSquare, 
  ListTodo, 
  ClipboardList, 
  Database, 
  LogOut, 
  Settings,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
  Package,
  Calculator,
  Menu, 
  ShoppingCart, 
  Users,
  KeyRound,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { hasAccessToRoute } from '@/lib/permissions'


const routes = [
  {
    label: 'CosmeFlow Dashboard',
    subtitle: 'Turn Factory Data into Business Decisions.',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'text-[#D4AF37]'
  },
  {
    label: 'CosmeFlow Planning',
    subtitle: 'Plan Smarter. Produce Better.',
    icon: ListTodo,
    href: '/planner',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner']
  },
  {
    label: 'CosmeFlow Material Control',
    subtitle: 'ระบบควบคุมวัตถุดิบและความพร้อมในการผลิต',
    icon: FileText,
    href: '/incoming-rm',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner', 'warehouse_mmrm_bu', 'warehouse_mmpm_fg', 'production_mx', 'purchase', 'qc', 'qa']
  },
  {
    label: 'CosmeFlow Production',
    subtitle: 'Track Every Step. Improve Every Batch.',
    icon: CheckSquare,
    href: '/my-tasks', // Used as base route for expansion
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner', 'production_mx', 'production_pk', 'warehouse_mmrm_bu', 'qa', 'qc'],
    subRoutes: [
      { label: 'ภาพรวม (Overview)', href: '/my-tasks/overview', allowedRoles: ['admin', 'planner', 'qa', 'qc'] },
      { label: 'ชั่งสาร (Weighing)', href: '/my-tasks/weighing', allowedRoles: ['admin', 'production_mx', 'warehouse_mmrm_bu', 'qa', 'qc'] },
      { label: 'งานผสม (Mixing)', href: '/my-tasks/mixing', allowedRoles: ['admin', 'production_mx', 'qa', 'qc'] },
      { label: 'งานบรรจุ (Packing)', href: '/my-tasks/packing', allowedRoles: ['admin', 'production_pk', 'qa', 'qc'] },
      { label: 'งานลงลัง (Cartoning/POF)', href: '/my-tasks/pof', allowedRoles: ['admin', 'production_pk', 'qa', 'qc'] }
    ]
  },
  {
    label: 'CosmeFlow Quality',
    subtitle: 'Quality You Can Trust. Visibility You Can Share.',
    icon: ClipboardList,
    href: '/qc-queue',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'qc', 'qa', 'planner']
  },
  {
    label: 'CosmeFlow Assurance',
    subtitle: 'ระบบจัดการปัญหาและคุณภาพ',
    icon: AlertTriangle,
    href: '/issues',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'qa', 'qc']
  },
  {
    label: 'CosmeFlow FG Warehouse',
    subtitle: 'Every Item. Every Movement. Fully Visible.',
    icon: Package,
    href: '/my-tasks/fg',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'warehouse_mmpm_fg', 'planner']
  },
  {
    label: 'CosmeFlow Purchase',
    subtitle: 'From Request to Receipt, Simplified.',
    icon: ShoppingCart,
    href: '/purchase',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner', 'purchase']
  },
  {
    label: 'CosmeFlow Maintenance',
    subtitle: 'Keep Every Machine Running at Its Best.',
    icon: Settings,
    href: '/maintenance',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin']
  },
  {
    label: 'CosmeFlow People',
    subtitle: 'Connecting People with Performance.',
    icon: Users,
    href: '/people',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin']
  },
  {
    label: 'CosmeFlow Costing',
    subtitle: 'Track Your Manufacturing Cost.',
    icon: Calculator,
    href: '/costing',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner'],
    subRoutes: [
      { label: 'ภาพรวม (Dashboard)', href: '/costing', allowedRoles: ['admin', 'planner'] },
      { label: 'ผูกสูตรต้นทุน (BOM)', href: '/costing/bom', allowedRoles: ['admin', 'planner'] },
      { label: 'ตั้งค่าต้นทุนมาตรฐาน (Setup)', href: '/costing/setup', allowedRoles: ['admin', 'planner'] },
      { label: 'บันทึกของเสีย (Defects)', href: '/costing/defects', allowedRoles: ['admin', 'planner'] },
    ]
  },
  {
    label: 'CosmeFlow Improve',
    subtitle: 'See Waste. Fix Process. Build Skill.',
    icon: TrendingUp,
    href: '/improve',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner', 'acc', 'production', 'production_pk', 'production_mx', 'qa', 'qc'],
    subRoutes: [
      { label: 'ภาพรวม (Command Center)', href: '/improve', allowedRoles: ['admin', 'planner', 'acc', 'production', 'production_pk', 'production_mx', 'qa', 'qc'] },
      { label: 'เดินตรวจหน้างาน (Gemba Walk)', href: '/improve/gemba', allowedRoles: ['admin', 'planner', 'acc', 'production', 'production_pk', 'production_mx', 'qa', 'qc'] },
      { label: 'รายการค้นพบ (Observations)', href: '/improve/observations', allowedRoles: ['admin', 'planner', 'acc', 'production', 'production_pk', 'production_mx', 'qa', 'qc'] },
      { label: 'โครงการไคเซ็น (Projects/PDCA)', href: '/improve/projects', allowedRoles: ['admin', 'planner', 'acc', 'production', 'production_pk', 'production_mx', 'qa', 'qc'] },
    ]
  },
  {
    label: 'ข้อมูลหลัก (Master Data)',
    icon: Database,
    href: '/master-data',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin']
  },
]


interface SidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
  onMobileClose?: () => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Real-time Notification Badges
  const [badgeCounts, setBadgeCounts] = useState<{
    fgQuarantine: number
    issues: number
    inboundFg: number
  }>({
    fgQuarantine: 0,
    issues: 0,
    inboundFg: 0
  })

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
          setUserRole(profile?.role || user.user_metadata?.role || 'user')
        } catch {
          setUserRole(user.user_metadata?.role || 'user')
        }
      }
    }
    fetchRole()

    const fetchBadges = async () => {
      try {
        const [{ count: fgQCount }, { data: issueLogs }, { count: inboundCount }] = await Promise.all([
          supabase.from('fg_inventory').select('id', { count: 'exact', head: true }).eq('qc_status', 'QUARANTINE'),
          supabase.from('production_logs').select('id, note').or('note.ilike.%[QC HOLD]%,note.ilike.%[QC REJECT]%,note.ilike.%[QC REPROCESS]%,note.ilike.%[แจ้งปัญหา]%'),
          supabase.from('production_logs').select('id', { count: 'exact', head: true }).in('status', ['WAITING', 'IN_PROGRESS']).ilike('processes.process_name', '%FG%')
        ])

        const activeIss = (issueLogs || []).filter((i: any) => {
          const lines = (i.note || '').split('\n')
          return lines.some((l: string) => (l.includes('[QC ') || l.includes('[แจ้งปัญหา]')) && !l.includes('[Resolved') && !l.includes('> [QA Approved]'))
        }).length

        setBadgeCounts({
          fgQuarantine: fgQCount || 0,
          issues: activeIss || 0,
          inboundFg: inboundCount || 0
        })
      } catch (err) {
        console.error('Error fetching notification badges:', err)
      }
    }

    fetchBadges()
    const interval = setInterval(fetchBadges, 15000)
    return () => clearInterval(interval)
  }, [])

  // Track expanded state for routes with subRoutes
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    '/my-tasks': pathname.startsWith('/my-tasks')
  })

  const toggleExpand = (href: string) => {
    setExpanded(prev => ({ ...prev, [href]: !prev[href] }))
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน')
      return
    }
    setIsChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsChangingPassword(false)
    if (error) {
      toast.error('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + error.message)
    } else {
      toast.success('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว')
      setIsPasswordModalOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleLinkClick = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  // Filter routes based on role and custom permissions
  const filteredRoutes = routes.filter(route => {
    if (!userRole) return false;
    if (userRole === 'admin') return true;
    if (userRole.startsWith('custom:')) {
      return hasAccessToRoute(route.href, userRole);
    }
    return !route.allowedRoles || route.allowedRoles.includes(userRole);
  }).map(route => {
    // Also filter subRoutes if they exist
    if (route.subRoutes) {
      return {
        ...route,
        subRoutes: route.subRoutes.filter(sub => {
          if (!userRole) return false;
          if (userRole === 'admin') return true;
          if (userRole.startsWith('custom:')) {
            return hasAccessToRoute(sub.href, userRole);
          }
          return !sub.allowedRoles || sub.allowedRoles.includes(userRole);
        })
      }
    }
    return route;
  }).filter(route => {
    if (route.subRoutes && route.subRoutes.length === 0) return false;
    return true;
  })

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#2D2721] text-white overflow-y-auto overflow-x-hidden sidebar-scroll">
      <div className="px-3 py-2 flex-1">
        <div className="flex items-center justify-between pl-3 mb-10 pr-3">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex flex-col" onClick={handleLinkClick}>
              <h1 className="text-2xl font-bold text-white tracking-tight truncate">
                CosmeFlow <span className="text-[#D4AF37]">OS</span>
              </h1>
            </Link>
          )}
          <button 
            onClick={() => setIsCollapsed?.(!isCollapsed)}
            className={cn("text-zinc-400 hover:text-white hover:bg-[#D4AF37]/ hover:text-[#D4AF37] p-2 rounded-lg transition", isCollapsed ? "mx-auto" : "")}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {filteredRoutes.map((route) => (
            <div key={route.href}>
              {route.subRoutes ? (
                <details 
                  className="group"
                  open={pathname.startsWith(route.href)}
                >
                  <summary
                    className={cn(
                      "flex p-3 w-full justify-between items-center cursor-pointer hover:text-white hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded-lg transition list-none",
                      pathname.startsWith(route.href) ? "text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 shadow-sm shadow-cosme-gold/10" : "text-zinc-400",
                      isCollapsed ? "justify-center px-0" : ""
                    )}
                    title={isCollapsed ? route.label : undefined}
                  >
                    <div className={cn("flex items-center", isCollapsed ? "justify-center flex-1" : "flex-1 overflow-hidden")}>
                      <route.icon className={cn("h-5 w-5 shrink-0", isCollapsed ? "" : "mr-3", route.color)} />
                      {!isCollapsed && (
                        <div className="flex flex-col overflow-hidden text-left">
                          <span className="font-semibold text-sm truncate">{route.label}</span>
                          {route.subtitle && <span className="text-[10px] text-zinc-500 truncate mt-0.5 leading-tight">{route.subtitle}</span>}
                        </div>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="shrink-0 ml-2">
                        <ChevronRight className="w-4 h-4 group-open:hidden" />
                        <ChevronDown className="w-4 h-4 hidden group-open:block" />
                      </div>
                    )}
                  </summary>
                  
                  {/* Render SubRoutes (handled natively by details tag) */}
                  {!isCollapsed && (
                    <div className="mt-1 ml-6 space-y-1 border-l-2 border-slate-700 pl-2">
                      {route.subRoutes.map((subRoute) => (
                        <Link
                          key={subRoute.href}
                          href={subRoute.href}
                          onClick={handleLinkClick}
                          className={cn(
                            "text-sm group flex p-2 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded-lg transition truncate",
                            pathname === subRoute.href ? "text-white bg-slate-800 font-semibold border border-slate-700" : "text-zinc-500"
                          )}
                        >
                          <span className="truncate">{subRoute.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </details>
              ) : (
                <Link
                  href={route.href}
                  onClick={handleLinkClick}
                  className={cn(
                    "group relative flex p-3 w-full justify-start cursor-pointer hover:text-white hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded-lg transition",
                    pathname === route.href ? "text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 shadow-sm shadow-[#D4AF37]/10" : "text-zinc-400",
                    isCollapsed ? "justify-center px-0" : ""
                  )}
                  title={isCollapsed ? route.label : undefined}
                >
                  <div className={cn("flex items-center", isCollapsed ? "justify-center flex-1" : "flex-1 overflow-hidden")}>
                    <route.icon className={cn("h-5 w-5 shrink-0", isCollapsed ? "" : "mr-3", route.color)} />
                    {!isCollapsed && (
                      <div className="flex flex-col overflow-hidden text-left">
                        <span className="font-semibold text-sm truncate">{route.label}</span>
                        {route.subtitle && <span className="text-[10px] text-zinc-500 truncate mt-0.5 leading-tight">{route.subtitle}</span>}
                      </div>
                    )}
                  </div>

                  {/* Real-time In-App Notification Badges */}
                  {!isCollapsed && (
                    <>
                      {route.href === '/my-tasks/fg' && badgeCounts.fgQuarantine > 0 && (
                        <span className="ml-auto shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          {badgeCounts.fgQuarantine} รอปล่อย
                        </span>
                      )}
                      {route.href === '/issues' && badgeCounts.issues > 0 && (
                        <span className="ml-auto shrink-0 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          {badgeCounts.issues} เคส
                        </span>
                      )}
                      {route.href === '/qc-queue' && badgeCounts.fgQuarantine > 0 && (
                        <span className="ml-auto shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          {badgeCounts.fgQuarantine} FG
                        </span>
                      )}
                    </>
                  )}

                  {/* Collapsed Dot Indicators */}
                  {isCollapsed && (
                    <>
                      {route.href === '/my-tasks/fg' && badgeCounts.fgQuarantine > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#2D2721] animate-pulse" />
                      )}
                      {route.href === '/issues' && badgeCounts.issues > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-[#2D2721]" />
                      )}
                    </>
                  )}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2 flex flex-col gap-1 border-t border-slate-700/50 mt-auto">
        <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
          <DialogTrigger
            className={cn(
              "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer text-zinc-400 hover:text-white hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded-lg transition",
              isCollapsed ? "justify-center px-0" : ""
            )}
            title={isCollapsed ? "เปลี่ยนรหัสผ่าน" : undefined}
          >
            <div className={cn("flex items-center", isCollapsed ? "justify-center flex-1" : "flex-1 overflow-hidden")}>
              <KeyRound className={cn("h-5 w-5 text-zinc-400 shrink-0", isCollapsed ? "" : "mr-3")} />
              {!isCollapsed && <span className="truncate">เปลี่ยนรหัสผ่าน</span>}
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleChangePassword}>
              <DialogHeader>
                <DialogTitle>เปลี่ยนรหัสผ่าน (Change Password)</DialogTitle>
                <DialogDescription>
                  รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>ยกเลิก</Button>
                <Button type="submit" disabled={isChangingPassword} className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white">
                  {isChangingPassword ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <button
          onClick={handleLogout}
          className={cn(
            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer text-zinc-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 rounded-lg transition",
            isCollapsed ? "justify-center px-0" : ""
          )}
          title={isCollapsed ? "ออกจากระบบ" : undefined}
        >
          <div className={cn("flex items-center", isCollapsed ? "justify-center flex-1" : "flex-1 overflow-hidden")}>
            <LogOut className={cn("h-5 w-5 text-red-400 shrink-0", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span className="truncate">ออกจากระบบ</span>}
          </div>
        </button>
      </div>
    </div>
  )
}
