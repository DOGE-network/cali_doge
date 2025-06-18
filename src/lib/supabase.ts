import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Client for client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Client for server-side operations with elevated privileges
export const getServiceSupabase = () => {
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
} 