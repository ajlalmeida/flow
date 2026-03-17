// ─────────────────────────────────────────────
// Flow — Database types (gerado manualmente)
// Para regenerar: npx supabase gen types typescript
// ─────────────────────────────────────────────

export type TeamRole    = 'owner' | 'admin' | 'member'
export type ProjectRole = 'admin' | 'member' | 'viewer'
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface Profile {
  id:         string
  name:       string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id:         string
  name:       string
  slug:       string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id:        string
  team_id:   string
  user_id:   string
  role:      TeamRole
  joined_at: string
  profile?:  Profile
}

export interface Project {
  id:          string
  team_id:     string
  name:        string
  description: string
  created_by:  string
  created_at:  string
  updated_at:  string
}

export interface ProjectMember {
  id:         string
  project_id: string
  user_id:    string
  role:       ProjectRole
  joined_at:  string
  profile?:   Profile
}

export interface Invite {
  id:         string
  team_id:    string | null
  project_id: string | null
  email:      string
  role:       string
  token:      string
  status:     InviteStatus
  invited_by: string
  expires_at: string
  created_at: string
}

// Re-export tipos do domínio (já existentes, agora com assigned_to)
export type { Phase, MoSCoW, RFCType, RFCStatus } from './domain'

export interface Database {
  public: {
    Tables: {
      profiles:        { Row: Profile }
      teams:           { Row: Team }
      team_members:    { Row: TeamMember }
      projects:        { Row: Project }
      project_members: { Row: ProjectMember }
      invites:         { Row: Invite }
    }
  }
}
