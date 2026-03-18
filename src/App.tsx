// ─────────────────────────────────────────────
// Flow — App Shell v2.2
// ─────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useAuthStore }  from '@/store/auth'
import { useOrgStore, useTeamProjects } from '@/store/org'
import { useFlowStore }  from '@/store/flow'
import { AuthPage }      from '@/components/auth/AuthPage'
import { BacklogView }   from '@/components/backlog/BacklogView'
import { BoardView }     from '@/components/board/BoardView'
import { GmudView }      from '@/components/gmud/GmudView'
import { SettingsPanel }      from '@/components/settings/SettingsPanel'
import { DashboardView }      from '@/components/dashboard/DashboardView'
import { ExportImportPanel }  from '@/components/ui/ExportImportPanel'
import type { Team, Project } from '@/lib/database.types'
import styles from './App.module.css'

type Tab = 'backlog' | 'board' | 'gmud' | 'dashboard'

export function App() {
  const { session, loading: authLoading, init, signOut } = useAuthStore()

  const {
    loadUserData,
    teams,
    projects,
    activeTeamId,
    activeProjectId,
    setActiveTeam,
    setActiveProject,
    loading: orgLoading,
  } = useOrgStore()

  const teamProjects  = useTeamProjects(activeTeamId ?? '')
  const loadProject   = useFlowStore(s => s.loadProject)
  const flowLoading   = useFlowStore(s => s.loading)

  // Objetos derivados — lookup pelo ID ativo
  const activeTeam    = teams.find((t: Team)    => t.id === activeTeamId)    ?? null
  const activeProject = projects.find((p: Project) => p.id === activeProjectId) ?? null

  const [tab,          setTab]          = useState<Tab>('backlog')
  const [settingsOpen,      setSettingsOpen]      = useState(false)
  const [exportImportOpen, setExportImportOpen] = useState(false)

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (session) loadUserData()
  }, [session?.user?.id])

  useEffect(() => {
    if (activeProjectId) loadProject(activeProjectId)
  }, [activeProjectId])

  if (authLoading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', color:'var(--text-muted)', fontSize:'.9rem' }}>
        Carregando…
      </div>
    )
  }

  if (!session) return <AuthPage />

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo}>Flow</span>

          {teams.length > 0 && (
            <select
              className={styles.projectSelect}
              value={activeTeamId ?? ''}
              onChange={e => setActiveTeam(e.target.value)}
              title="Time ativo"
            >
              {teams.map((t: Team) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {teamProjects.length > 0 && (
            <select
              className={styles.projectSelect}
              value={activeProjectId ?? ''}
              onChange={e => setActiveProject(e.target.value)}
              title="Projeto ativo"
            >
              {teamProjects.map((p: Project) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <nav className={styles.tabs}>
          {(['backlog', 'board', 'gmud', 'dashboard'] as Tab[]).map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'backlog' ? 'Backlog' : t === 'board' ? 'Board' : t === 'gmud' ? 'GMud' : 'Dashboard'}
            </button>
          ))}
        </nav>

        <div className={styles.topbarRight}>
          <button className={styles.iconTopBtn} onClick={() => setExportImportOpen(true)} title="Export / Import" disabled={!activeProject}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v9M4.5 7l3 3 3-3M2 11v2a1 1 0 001 1h9a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className={styles.iconTopBtn} onClick={() => setSettingsOpen(true)} title="Configurações">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M13.3 8a5.3 5.3 0 00-.1-.9l1.4-1.1-1.3-2.3-1.7.7A5.3 5.3 0 009.1 3.6L8.7 2h-1.4l-.4 1.6A5.3 5.3 0 004.4 4.4l-1.7-.7L1.4 6l1.4 1.1c-.1.3-.1.6-.1.9s0 .6.1.9L1.4 10l1.3 2.3 1.7-.7c.5.4 1 .7 1.5.9l.4 1.5h1.4l.4-1.5c.6-.2 1.1-.5 1.5-.9l1.7.7 1.3-2.3-1.4-1.1c.1-.3.1-.6.1-.9z" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </button>
          <button className={styles.signOutBtn} onClick={signOut}>Sair</button>
        </div>
      </header>

      <main className={styles.main}>
        {orgLoading || flowLoading ? (
          <div className={styles.empty}><p>Carregando…</p></div>
        ) : !activeProject ? (
          <div className={styles.empty}>
            <p>Nenhum projeto selecionado.</p>
            <button
              style={{ marginTop:12, fontSize:'.85rem', color:'var(--brand-500)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-sans)', fontWeight:600 }}
              onClick={() => setSettingsOpen(true)}
            >
              + Criar time e projeto nas configurações
            </button>
          </div>
        ) : (
          <>
            {tab === 'backlog' && <BacklogView projectId={activeProject.id} />}
            {tab === 'board'   && <BoardView   projectId={activeProject.id} />}
            {tab === 'gmud'      && <GmudView      projectId={activeProject.id} />}
            {tab === 'dashboard' && <DashboardView projectId={activeProject.id} />}
          </>
        )}
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {activeProject && (
        <ExportImportPanel
          open={exportImportOpen}
          onClose={() => setExportImportOpen(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
        />
      )}
    </div>
  )
}
