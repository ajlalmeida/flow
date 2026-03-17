import { useState, useEffect } from 'react'
import { useOrgStore, useTeamProjects } from '@/store/org'
import type { Team, Project } from '@/lib/database.types'
import { useAuthStore } from '@/store/auth'
import { SlidePanel } from '@/components/ui/SlidePanel'
import type { TeamRole, ProjectRole, TeamMember, ProjectMember, Invite } from '@/lib/database.types'
import styles from './SettingsPanel.module.css'

type Tab = 'teams' | 'projects' | 'members' | 'invites' | 'profile'

interface SettingsPanelProps {
  open:    boolean
  onClose: () => void
}

const TEAM_ROLES:    TeamRole[]    = ['admin', 'member']
const PROJECT_ROLES: ProjectRole[] = ['admin', 'member', 'viewer']

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('teams')

  const {
    teams, projects, teamMembers, projectMembers,
    activeTeamId, activeProjectId,
    createTeam, updateTeam, deleteTeam,
    createProject, updateProject, deleteProject,
    loadTeamMembers, updateTeamMember, removeTeamMember,
    loadProjectMembers, updateProjectMember, removeProjectMember,
    sendInvite, revokeInvite, listInvites,
    setActiveTeam, setActiveProject,
  } = useOrgStore()

  const activeTeam    = useActiveTeam()
  const activeProject = useActiveProject()
  const teamProjects  = useTeamProjects(activeTeamId ?? '')
  const profile       = useAuthStore(s => s.profile)
  const updateProfile = useAuthStore(s => s.updateProfile)

  const [invites, setInvites] = useState<Invite[]>([])

  useEffect(() => {
    if (!open) return
    if (activeTeamId)    loadTeamMembers(activeTeamId)
    if (activeProjectId) loadProjectMembers(activeProjectId)
  }, [open, activeTeamId, activeProjectId])

  useEffect(() => {
    if (tab !== 'invites') return
    const load = async () => {
      const data = await listInvites(activeTeamId ?? undefined, activeProjectId ?? undefined)
      setInvites(data)
    }
    load()
  }, [tab, activeTeamId, activeProjectId])

  return (
    <SlidePanel open={open} onClose={onClose} title="Configurações" width={520}>
      <div className={styles.root}>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(['teams', 'projects', 'members', 'invites', 'profile'] as Tab[]).map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {{ teams: 'Times', projects: 'Projetos', members: 'Membros', invites: 'Convites', profile: 'Perfil' }[t]}
            </button>
          ))}
        </div>

        <div className={styles.content}>

          {/* ── TIMES ── */}
          {tab === 'teams' && (
            <TeamsTab
              teams={teams}
              activeTeamId={activeTeamId}
              onSelect={setActiveTeam}
              onCreate={createTeam}
              onUpdate={updateTeam}
              onDelete={deleteTeam}
            />
          )}

          {/* ── PROJETOS ── */}
          {tab === 'projects' && (
            <ProjectsTab
              projects={teamProjects}
              activeProjectId={activeProjectId}
              activeTeamId={activeTeamId}
              onSelect={setActiveProject}
              onCreate={createProject}
              onUpdate={updateProject}
              onDelete={deleteProject}
            />
          )}

          {/* ── MEMBROS ── */}
          {tab === 'members' && (
            <MembersTab
              teamMembers={teamMembers}
              projectMembers={projectMembers}
              activeTeam={activeTeam?.name}
              activeProject={activeProject?.name}
              onUpdateTeamMember={(uid, role) => activeTeamId && updateTeamMember(activeTeamId, uid, role)}
              onRemoveTeamMember={(uid) => activeTeamId && removeTeamMember(activeTeamId, uid)}
              onUpdateProjectMember={(uid, role) => activeProjectId && updateProjectMember(activeProjectId, uid, role)}
              onRemoveProjectMember={(uid) => activeProjectId && removeProjectMember(activeProjectId, uid)}
            />
          )}

          {/* ── CONVITES ── */}
          {tab === 'invites' && (
            <InvitesTab
              invites={invites}
              activeTeamId={activeTeamId}
              activeProjectId={activeProjectId}
              onSend={sendInvite}
              onRevoke={async (id) => { await revokeInvite(id); setInvites(i => i.filter(x => x.id !== id)) }}
            />
          )}

          {/* ── PERFIL ── */}
          {tab === 'profile' && (
            <ProfileTab profile={profile} onUpdate={updateProfile} />
          )}
        </div>
      </div>
    </SlidePanel>
  )
}

// ── Sub-components ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TeamsTab({ teams, activeTeamId, onSelect, onCreate, onUpdate, onDelete }: any) {
  const [newName,  setNewName]  = useState('')
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await onCreate(newName.trim())
    setNewName('')
  }

  return (
    <div className={styles.section}>
      <form className={styles.inlineForm} onSubmit={handleCreate}>
        <input className={styles.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do novo time…" />
        <button className={styles.btnPrimary} type="submit">Criar</button>
      </form>
      <ul className={styles.list}>
        {teams.map((t: any) => (
          <li key={t.id} className={`${styles.listItem} ${t.id === activeTeamId ? styles.listItemActive : ''}`}>
            {editId === t.id ? (
              <div className={styles.inlineEdit}>
                <input className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                <button className={styles.btnPrimary} onClick={async () => { await onUpdate(t.id, { name: editName }); setEditId(null) }}>Salvar</button>
                <button className={styles.btnGhost} onClick={() => setEditId(null)}>×</button>
              </div>
            ) : (
              <>
                <button className={styles.listName} onClick={() => onSelect(t.id)}>{t.name}</button>
                <div className={styles.listActions}>
                  <button className={styles.iconBtn} onClick={() => { setEditId(t.id); setEditName(t.name) }} title="Renomear">✏</button>
                  <button className={styles.iconBtnDanger} onClick={() => confirm(`Excluir "${t.name}"?`) && onDelete(t.id)} title="Excluir">🗑</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectsTab({ projects, activeProjectId, activeTeamId, onSelect, onCreate, onUpdate, onDelete }: any) {
  const [newName,  setNewName]  = useState('')
  const [newDesc,  setNewDesc]  = useState('')
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !activeTeamId) return
    await onCreate(activeTeamId, newName.trim(), newDesc.trim())
    setNewName(''); setNewDesc('')
  }

  return (
    <div className={styles.section}>
      <form className={styles.stackForm} onSubmit={handleCreate}>
        <input className={styles.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do projeto…" required />
        <input className={styles.input} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição (opcional)" />
        <button className={styles.btnPrimary} type="submit">Criar projeto</button>
      </form>
      <ul className={styles.list}>
        {projects.map((p: any) => (
          <li key={p.id} className={`${styles.listItem} ${p.id === activeProjectId ? styles.listItemActive : ''}`}>
            {editId === p.id ? (
              <div className={styles.inlineEdit}>
                <input className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                <button className={styles.btnPrimary} onClick={async () => { await onUpdate(p.id, { name: editName }); setEditId(null) }}>Salvar</button>
                <button className={styles.btnGhost} onClick={() => setEditId(null)}>×</button>
              </div>
            ) : (
              <>
                <button className={styles.listName} onClick={() => onSelect(p.id)}>
                  {p.name}
                  {p.description && <span className={styles.listSub}>{p.description}</span>}
                </button>
                <div className={styles.listActions}>
                  <button className={styles.iconBtn} onClick={() => { setEditId(p.id); setEditName(p.name) }}>✏</button>
                  <button className={styles.iconBtnDanger} onClick={() => confirm(`Excluir "${p.name}"?`) && onDelete(p.id)}>🗑</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface MembersTabProps {
  teamMembers:           TeamMember[]
  projectMembers:        ProjectMember[]
  activeTeam?:           string
  activeProject?:        string
  onUpdateTeamMember:    (uid: string, role: TeamRole) => void
  onRemoveTeamMember:    (uid: string) => void
  onUpdateProjectMember: (uid: string, role: ProjectRole) => void
  onRemoveProjectMember: (uid: string) => void
}

function MembersTab({
  teamMembers, projectMembers,
  activeTeam, activeProject,
  onUpdateTeamMember, onRemoveTeamMember,
  onUpdateProjectMember, onRemoveProjectMember,
}: MembersTabProps) {
  return (
    <div className={styles.section}>
      {activeTeam && (
        <>
          <p className={styles.groupLabel}>Time: {activeTeam}</p>
          <MemberList
            members={teamMembers}
            roles={TEAM_ROLES}
            onUpdate={(uid, role) => onUpdateTeamMember(uid, role as TeamRole)}
            onRemove={onRemoveTeamMember}
          />
        </>
      )}
      {activeProject && (
        <>
          <p className={styles.groupLabel} style={{ marginTop: 20 }}>Projeto: {activeProject}</p>
          <MemberList
            members={projectMembers}
            roles={PROJECT_ROLES}
            onUpdate={(uid, role) => onUpdateProjectMember(uid, role as ProjectRole)}
            onRemove={onRemoveProjectMember}
          />
        </>
      )}
    </div>
  )
}

interface MemberListProps {
  members:  (TeamMember | ProjectMember)[]
  roles:    string[]
  onUpdate: (uid: string, role: string) => void
  onRemove: (uid: string) => void
}

function MemberList({ members, roles, onUpdate, onRemove }: MemberListProps) {
  if (members.length === 0) return <p className={styles.empty}>Nenhum membro.</p>
  return (
    <ul className={styles.memberList}>
      {members.map((m: TeamMember & ProjectMember) => (
        <li key={m.id} className={styles.memberItem}>
          <div className={styles.memberInfo}>
            <div className={styles.avatar}>{(m.profile?.name ?? '?')[0].toUpperCase()}</div>
            <div>
              <p className={styles.memberName}>{m.profile?.name ?? '—'}</p>
              <p className={styles.memberEmail}>{m.profile?.id ?? ''}</p>
            </div>
          </div>
          <div className={styles.memberActions}>
            <select
              className={styles.roleSelect}
              value={m.role}
              onChange={e => onUpdate(m.user_id, e.target.value)}
            >
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className={styles.iconBtnDanger} onClick={() => onRemove(m.user_id)} title="Remover">×</button>
          </div>
        </li>
      ))}
    </ul>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InvitesTab({ invites, activeTeamId, activeProjectId, onSend, onRevoke }: any) {
  const [email,  setEmail]  = useState('')
  const [role,   setRole]   = useState('member')
  const [target, setTarget] = useState<'team' | 'project'>('team')
  const [sent,   setSent]   = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const error = await onSend({
      email,
      role,
      teamId:    target === 'team'    ? activeTeamId    : undefined,
      projectId: target === 'project' ? activeProjectId : undefined,
    })
    if (error) { setErr(error); return }
    setSent(true); setEmail(''); setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className={styles.section}>
      <form className={styles.stackForm} onSubmit={handleSend}>
        <div className={styles.fieldRow}>
          <select className={styles.roleSelect} value={target} onChange={e => setTarget(e.target.value as any)}>
            <option value="team">Time</option>
            <option value="project">Projeto</option>
          </select>
          <select className={styles.roleSelect} value={role} onChange={e => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
        {err && <p className={styles.errorMsg}>{err}</p>}
        {sent && <p className={styles.successMsg}>Convite enviado!</p>}
        <button className={styles.btnPrimary} type="submit">Enviar convite</button>
      </form>

      {invites.length > 0 && (
        <>
          <p className={styles.groupLabel}>Convites pendentes</p>
          <ul className={styles.list}>
            {invites.map((inv: Invite) => (
              <li key={inv.id} className={styles.listItem}>
                <span className={styles.listName}>{inv.email} <span className={styles.listSub}>({inv.role})</span></span>
                <button className={styles.iconBtnDanger} onClick={() => onRevoke(inv.id)} title="Revogar">×</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProfileTab({ profile, onUpdate }: any) {
  const [name, setName] = useState(profile?.name ?? '')
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await onUpdate({ name })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.section}>
      <form className={styles.stackForm} onSubmit={handleSave}>
        <div className={styles.field}>
          <label className={styles.label}>Nome</label>
          <input className={styles.input} value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>E-mail</label>
          <input className={styles.input} value={profile?.id ?? ''} disabled />
        </div>
        {saved && <p className={styles.successMsg}>Perfil atualizado!</p>}
        <button className={styles.btnPrimary} type="submit">Salvar</button>
      </form>
    </div>
  )
}
