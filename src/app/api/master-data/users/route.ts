import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolveDepartmentFromEmployeeId, formatUserMasterDisplayName, MasterUserOption } from '@/lib/userMemory'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, employee_id, full_name, role')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching profiles in /api/master-data/users:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const masterUsers: MasterUserOption[] = (data || []).map((u: any) => {
      const cleanName = (u.full_name || '').trim().replace(/\s+/g, ' ')
      const cleanId = (u.employee_id || '').trim()
      return {
        id: u.id,
        employeeId: cleanId,
        fullName: cleanName,
        displayName: formatUserMasterDisplayName(cleanName, cleanId),
        department: resolveDepartmentFromEmployeeId(cleanId, u.role),
        role: u.role
      }
    })

    return NextResponse.json({ success: true, data: masterUsers })
  } catch (err: any) {
    console.error('Unexpected error in /api/master-data/users:', err)
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 })
  }
}
