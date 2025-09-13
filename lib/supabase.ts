import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jkzaolzsmhiisvhhvlgh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // ❌ remove this for React Native
    // detectSessionInUrl: true,
  },
})
