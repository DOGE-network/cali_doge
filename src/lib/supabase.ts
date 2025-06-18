import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE

if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseAnonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (!supabaseServiceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_SERVICE_ROLE')

if (process.env.NODE_ENV === 'development') {
  console.log('[Supabase] URL:', supabaseUrl)
  console.log('[Supabase] Using anon key for public client')
  console.log('[Supabase] Using service role key for server client')
}

// Client for client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Client for server-side operations with elevated privileges
export const getServiceSupabase = () => {
  return createClient<Database>(supabaseUrl, supabaseServiceKey!)
} 