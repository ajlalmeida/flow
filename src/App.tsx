// ─────────────────────────────────────────────
// Flow — App Shell
// v1.0.0 — 2026-03-16 (BRT)
// ─────────────────────────────────────────────

import { useState } from 'react'
import { useFlowStore, useActiveProject } from '@/store'
import { BacklogView } from '@/components/backlog/BacklogView'
import { BoardView }   from '@/components/board/BoardView'
import styles from './App.module.css'

type Tab = 'backlog' | 'board' | 'gmud'

export function App() {
  const [tab, setTab] = useState<Tab>('backlog')
  const projects      = useFlowStore(s => s.projects)
  const activeId      = useFlowStore(s => s.activeProjectId)
  const setActive     = useFlowStore(s => s.setActiveProject)
  const activeProject = useActiveProject()

  return (
    <div className={styles.shell}>
      {/* ── Top bar ── */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo}>Flow</span>

          {/* Project selector */}
          <select
            className={styles.projectSelect}
            value={activeId ?? ''}
            onChange={e => setActive(e.target.value)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Tab nav */}
        <nav className={styles.tabs}>
          {(['backlog', 'board', 'gmud'] as Tab[]).map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'backlog' ? 'Backlog' : t === 'board' ? 'Board' : 'GMud'}
            </button>
          ))}
        </nav>

        <div className={styles.topbarRight}>
          <span className={styles.projectName}>{activeProject?.name}</span>
        </div>
      </header>

      {/* ── Content ── */}
      <main className={styles.main}>
        {!activeProject ? (
          <div className={styles.empty}>
            <p>Nenhum projeto selecionado.</p>
          </div>
        ) : (
          <>
            {tab === 'backlog' && (
              <BacklogView projectId={activeProject.id} />
            )}
            {tab === 'board' && (
              <BoardView projectId={activeProject.id} />
            )}
            {tab === 'gmud' && (
              <div className={styles.placeholder}>
                <span>Aba GMud — em construção</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
