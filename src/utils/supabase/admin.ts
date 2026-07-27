import { createClient } from '@supabase/supabase-js'

// This client uses the Service Role Key to bypass RLS and perform admin operations.
// WARNING: NEVER expose this client to the browser. Only use it in Server Actions or API routes.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
