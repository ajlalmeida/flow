// ─────────────────────────────────────────────
// Flow — Teams & Projects Store (Supabase)
// ─────────────────────────────────────────────
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
  Team, TeamMember, Project, ProjectMember,
  Invite, TeamRole, ProjectRole,
} from '@/lib/database.types'

interface OrgState {
  teams:          Team[]
  teamMembers:    TeamMember[]
  projects:       Project[]
  projectMembers: ProjectMember[]
  activeTeamId:   string | null
  activeProjectId: string | null
  loading:        boolean
  error:          string | null
}

interface OrgActions {
  // Bootstrap
  loadUserData: () => Promise<void>
  setActiveTeam:    (id: string) => void
  setActiveProject: (id: string) => void

  // Teams
  createTeam:  (name: string) => Promise<Team | null>
  updateTeam:  (id: string, patch: Partial<Pick<Team, 'name'>>) => Promise<void>
  deleteTeam:  (id: string) => Promise<void>

  // Team members
  loadTeamMembers:   (teamId: string) => Promise<void>
  updateTeamMember:  (teamId: string, userId: string, role: TeamRole) => Promise<void>
  removeTeamMember:  (teamId: string, userId: string) => Promise<void>

  // Projects
  createProject: (teamId: string, name: string, description?: string) => Promise<Project | null>
  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'description'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // Project members
  loadProjectMembers:  (projectId: string) => Promise<void>
  updateProjectMember: (projectId: string, userId: string, role: ProjectRole) => Promise<void>
  removeProjectMember: (projectId: string, userId: string) => Promise<void>

  // Invites
  sendInvite:   (params: SendInviteParams) => Promise<string | null>
  acceptInvite: (token: string) => Promise<string | null>
  listInvites:  (teamId?: string, projectId?: string) => Promise<Invite[]>
  revokeInvite: (id: string) => Promise<void>
}

interface SendInviteParams {
  email:      string
  role:       string
  teamId?:    string
  projectId?: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).slice(2, 6)
}

export const useOrgStore = create<OrgState & OrgActions>((set, get) => ({
  teams:           [],
  teamMembers:     [],
  projects:        [],
  projectMembers:  [],
  activeTeamId:    null,
  activeProjectId: null,
  loading:         false,
  error:           null,

  // ── Bootstrap ──────────────────────────────

  async loadUserData() {
    set({ loading: true, error: null })
    try {
      // Times do usuário via team_members
      const { data: memberships, error: e1 } = await supabase
        .from('team_members')
        .select('team_id')
      if (e1) throw e1

      const teamIds = (memberships ?? []).map(m => m.team_id)

      if (teamIds.length === 0) {
        set({ teams: [], projects: [], loading: false })
        return
      }

      const { data: teams, error: e2 } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds)
        .order('created_at')
      if (e2) throw e2

      // Projetos de todos os times do usuário
      const { data: projMemberships } = await supabase
        .from('project_members')
        .select('project_id')

      const projectIds = (projMemberships ?? []).map(m => m.project_id)

      let projects: Project[] = []
      if (projectIds.length > 0) {
        const { data, error: e3 } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
          .order('created_at')
        if (e3) throw e3
        projects = (data ?? []) as Project[]
      }

      const firstTeam    = teams?.[0]?.id ?? null
      const firstProject = projects?.[0]?.id ?? null

      set({
        teams:           (teams ?? []) as Team[],
        projects,
        activeTeamId:    firstTeam,
        activeProjectId: firstProject,
        loading:         false,
      })
    } catch (err: unknown) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  setActiveTeam(id) {
    set({ activeTeamId: id })
    // Filtra projetos do time selecionado automaticamente
    const projects = get().projects.filter(p => p.team_id === id)
    set({ activeProjectId: projects[0]?.id ?? null })
  },

  setActiveProject(id) { set({ activeProjectId: id }) },

  // ── Teams ──────────────────────────────────

  async createTeam(name) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('teams')
      .insert({ name, slug: slugify(name), created_by: user.id })
      .select()
      .single()
    if (error || !data) return null
    const team = data as Team
    set(s => ({ teams: [...s.teams, team], activeTeamId: team.id }))
    return team
  },

  async updateTeam(id, patch) {
    const { data } = await supabase
      .from('teams')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) set(s => ({ teams: s.teams.map(t => t.id === id ? data as Team : t) }))
  },

  async deleteTeam(id) {
    await supabase.from('teams').delete().eq('id', id)
    set(s => ({
      teams:    s.teams.filter(t => t.id !== id),
      projects: s.projects.filter(p => p.team_id !== id),
      activeTeamId: s.activeTeamId === id ? (s.teams.find(t => t.id !== id)?.id ?? null) : s.activeTeamId,
    }))
  },

  // ── Team members ───────────────────────────

  async loadTeamMembers(teamId) {
    const { data } = await supabase
      .from('team_members')
      .select('*, profile:profiles(*)')
      .eq('team_id', teamId)
    if (data) set({ teamMembers: data as TeamMember[] })
  },

  async updateTeamMember(teamId, userId, role) {
    await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
    set(s => ({
      teamMembers: s.teamMembers.map(m =>
        m.team_id === teamId && m.user_id === userId ? { ...m, role } : m
      ),
    }))
  },

  async removeTeamMember(teamId, userId) {
    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
    set(s => ({
      teamMembers: s.teamMembers.filter(
        m => !(m.team_id === teamId && m.user_id === userId)
      ),
    }))
  },

  // ── Projects ───────────────────────────────

  async createProject(teamId, name, description = '') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('projects')
      .insert({ team_id: teamId, name, description, created_by: user.id })
      .select()
      .single()
    if (error || !data) return null
    const project = data as Project
    set(s => ({ projects: [...s.projects, project], activeProjectId: project.id }))
    return project
  },

  async updateProject(id, patch) {
    const { data } = await supabase
      .from('projects')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) set(s => ({
      projects: s.projects.map(p => p.id === id ? data as Project : p),
    }))
  },

  async deleteProject(id) {
    await supabase.from('projects').delete().eq('id', id)
    set(s => ({
      projects: s.projects.filter(p => p.id !== id),
      activeProjectId: s.activeProjectId === id
        ? (s.projects.find(p => p.id !== id)?.id ?? null)
        : s.activeProjectId,
    }))
  },

  // ── Project members ────────────────────────

  async loadProjectMembers(projectId) {
    const { data } = await supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', projectId)
    if (data) set({ projectMembers: data as ProjectMember[] })
  },

  async updateProjectMember(projectId, userId, role) {
    await supabase
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', userId)
    set(s => ({
      projectMembers: s.projectMembers.map(m =>
        m.project_id === projectId && m.user_id === userId ? { ...m, role } : m
      ),
    }))
  },

  async removeProjectMember(projectId, userId) {
    await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)
    set(s => ({
      projectMembers: s.projectMembers.filter(
        m => !(m.project_id === projectId && m.user_id === userId)
      ),
    }))
  },

  // ── Invites ────────────────────────────────

  async sendInvite({ email, role, teamId, projectId }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Não autenticado'

    const { data, error } = await supabase
      .from('invites')
      .insert({
        email,
        role,
        team_id:    teamId    ?? null,
        project_id: projectId ?? null,
        invited_by: user.id,
      })
      .select()
      .single()

    if (error) return error.message

    // Em produção: envie e-mail com link de convite
    // O token está em data.token — construa a URL:
    // https://<seu-domínio>/invite?token=<token>
    console.info('[Flow] Convite criado. Token:', (data as Invite).token)
    return null
  },

  async acceptInvite(token) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Não autenticado'

    // Busca convite válido
    const { data: invite, error: e1 } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (e1 || !invite) return 'Convite inválido ou expirado'

    const inv = invite as Invite

    // Adiciona ao time ou projeto
    if (inv.team_id) {
      await supabase.from('team_members').insert({
        team_id: inv.team_id,
        user_id: user.id,
        role: inv.role as TeamRole,
      })
    } else if (inv.project_id) {
      await supabase.from('project_members').insert({
        project_id: inv.project_id,
        user_id: user.id,
        role: inv.role as ProjectRole,
      })
    }

    // Marca convite como aceito
    await supabase
      .from('invites')
      .update({ status: 'accepted' })
      .eq('id', inv.id)

    // Recarrega dados
    await get().loadUserData()
    return null
  },

  async listInvites(teamId, projectId) {
    let query = supabase.from('invites').select('*').eq('status', 'pending')
    if (teamId)    query = query.eq('team_id', teamId)
    if (projectId) query = query.eq('project_id', projectId)
    const { data } = await query
    return (data ?? []) as Invite[]
  },

  async revokeInvite(id) {
    await supabase.from('invites').update({ status: 'declined' }).eq('id', id)
  },
}))

// ── Selectors ──────────────────────────────────────────────

export const useActiveTeam = () =>
  useOrgStore(s => s.teams.find(t => t.id === s.activeTeamId) ?? null)

export const useActiveProject = () =>
  useOrgStore(s => s.projects.find(p => p.id === s.activeProjectId) ?? null)

export const useTeamProjects = (teamId: string) =>
  useOrgStore(s => s.projects.filter(p => p.team_id === teamId))
