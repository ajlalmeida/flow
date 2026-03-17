// ─────────────────────────────────────────────
// Flow — Supabase client
// ─────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error(
    '[Flow] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas.\n' +
    'Crie um arquivo .env.local com essas variáveis.'
  )
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
