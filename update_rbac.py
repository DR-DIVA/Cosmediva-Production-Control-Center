import os
import re

path = r"c:\Users\hp\Dropbox\AI AGENT\Antigravity\Update PD Daily Status\cosmediva-os\src\components\layout\sidebar.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update import to include useEffect
content = content.replace(
    "import { useState } from 'react'",
    "import { useState, useEffect } from 'react'"
)

# Update the Sidebar function to fetch role and filter routes
sidebar_func_regex = r"export function Sidebar\(\{ isCollapsed, setIsCollapsed, onMobileClose \}: SidebarProps\) \{(.*?)\n  return \("
sidebar_func_body = """
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
"""

content = re.sub(sidebar_func_regex, "export function Sidebar({ isCollapsed, setIsCollapsed, onMobileClose }: SidebarProps) {" + sidebar_func_body + "\n  return (", content, flags=re.DOTALL)

# Replace routes.map with filteredRoutes.map
content = content.replace("routes.map((route)", "filteredRoutes.map((route)")

# Now, we need to inject allowedRoles into the routes array.
routes_def_replacement = """
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
    allowedRoles: ['admin', 'planner', 'warehouse_mmrm_bu', 'warehouse_mmpm_fg', 'production_mx']
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
    allowedRoles: ['admin', 'planner']
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
"""

content = re.sub(r"const routes = \[.*?\n\]\n", routes_def_replacement + "\n", content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Update Complete")
