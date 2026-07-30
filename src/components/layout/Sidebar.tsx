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
  Menu, 
  ShoppingCart, 
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'


const routes = [
  {
    label: 'CosmeFlow Executive',
    subtitle: 'Turn Factory Data into Business Decisions.',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner']
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
    label: 'CosmeFlow RM Control',
    subtitle: 'ระบบควบคุมวัตถุดิบและความพร้อมในการผลิต',
    icon: FileText,
    href: '/incoming-rm',
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner', 'warehouse_mmrm_bu', 'warehouse_mmpm_fg', 'production_mx', 'purchase']
  },
  {
    label: 'CosmeFlow Production',
    subtitle: 'Track Every Step. Improve Every Batch.',
    icon: CheckSquare,
    href: '/my-tasks', // Used as base route for expansion
    color: 'text-[#D4AF37]',
    allowedRoles: ['admin', 'planner', 'production_mx', 'production_pk', 'warehouse_mmrm_bu'],
    subRoutes: [
      { label: 'ภาพรวม (Overview)', href: '/my-tasks/overview', allowedRoles: ['admin', 'planner'] },
      { label: 'ชั่งสาร (Weighing)', href: '/my-tasks/weighing', allowedRoles: ['admin', 'production_mx', 'warehouse_mmrm_bu'] },
      { label: 'งานผสม (Mixing)', href: '/my-tasks/mixing', allowedRoles: ['admin', 'production_mx'] },
      { label: 'งานบรรจุ (Packing)', href: '/my-tasks/packing', allowedRoles: ['admin', 'production_pk'] },
      { label: 'งานลงลัง (Cartoning/POF)', href: '/my-tasks/pof', allowedRoles: ['admin', 'production_pk'] }
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
    allowedRoles: ['admin', 'qa']
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

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserRole(user?.user_metadata?.role || 'user')
    }
    fetchRole()
  }, [])

  // Track expanded state for routes with subRoutes
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    '/my-tasks': pathname.startsWith('/my-tasks')
  })

  const toggleExpand = (href: string) => {
    setExpanded(prev => ({ ...prev, [href]: !prev[href] }))
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

  // Filter routes based on role
  const filteredRoutes = routes.filter(route => {
    if (!route.allowedRoles) return true; // if no restrictions, allow all
    return userRole && route.allowedRoles.includes(userRole);
  }).map(route => {
    // Also filter subRoutes if they exist
    if (route.subRoutes) {
      return {
        ...route,
        subRoutes: route.subRoutes.filter(sub => {
          if (!sub.allowedRoles) return true;
          return userRole && sub.allowedRoles.includes(userRole);
        })
      }
    }
    return route;
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
                    "group flex p-3 w-full justify-start cursor-pointer hover:text-white hover:bg-[#D4AF37]/ hover:text-[#D4AF37] rounded-lg transition",
                    pathname === route.href ? "text-[#D4AF37] bg-[#D4AF37]/ border border-[#D4AF37]/30 shadow-sm shadow-cosme-gold/10" : "text-zinc-400",
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
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <button
          onClick={handleLogout}
          className={cn(
            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer text-zinc-400 hover:text-white hover:bg-[#D4AF37]/ hover:text-[#D4AF37] rounded-lg transition",
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
