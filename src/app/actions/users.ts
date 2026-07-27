'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getUsers() {
  const adminClient = createAdminClient()
  
  // Fetch from profiles using admin client to bypass any RLS recursion issues
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users via admin client:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function createUser(formData: {
  employee_id: string
  full_name: string
  role: string
  password?: string
}) {
  try {
    const adminClient = createAdminClient()
    const email = `${formData.employee_id.toLowerCase()}@cosmediva.local`
    const password = formData.password || '123456'

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        employee_id: formData.employee_id,
        full_name: formData.full_name,
        role: formData.role
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return { success: false, error: authError.message }
    }

    const userId = authData.user.id

    // 2. Insert into profiles (bypass RLS)
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        employee_id: formData.employee_id,
        full_name: formData.full_name,
        role: formData.role
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Cleanup: if profile creation fails, we should ideally delete the auth user, but for now we just return error
      return { success: false, error: profileError.message }
    }

    revalidatePath('/master-data/users')
    return { success: true, data: authData.user }
    
  } catch (err: any) {
    console.error('Unexpected error in createUser:', err)
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' }
  }
}
