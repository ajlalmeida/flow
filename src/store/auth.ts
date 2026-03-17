// ─────────────────────────────────────────────
// Flow — Auth Store
// ─────────────────────────────────────────────
import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/database.types'

interface AuthState {
  session:  Session | null
  user:     User    | null
  profile:  Profile | null
  loading:  boolean

  init:          () => Promise<void>
  signInEmail:   (email: string, password: string) => Promise<string | null>
  signUpEmail:   (email: string, password: string, name: string) => Promise<string | null>
  signInGoogle:  () => Promise<void>
  signOut:       () => Promise<void>
  updateProfile: (patch: Partial<Pick<Profile, 'name' | 'avatar_url'>>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user:    null,
  profile: null,
  loading: true,

  async init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await fetchProfile(session.user.id)
      set({ session, user: session.user, profile, loading: false })
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        set({ session, user: session.user, profile })
      } else {
        set({ session: null, user: null, profile: null })
      }
    })
  },

  async signInEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },

  async signUpEmail(email, password, name) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${window.location.origin}/flow/`,
    },
  })
  return error?.message ?? null
},

  async signInGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/flow/`,
    },
  })
},

  async signOut() {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },

  async updateProfile(patch) {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', user.id)
      .select()
      .single()
    if (data) set({ profile: data as unknown as Profile })
  },
}))

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ? (data as unknown as Profile) : null
}
