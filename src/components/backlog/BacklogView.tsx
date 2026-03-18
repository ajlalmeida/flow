import { useState, useMemo } from 'react'
import { useFlowStore, useProjectColumns } from '@/store'
import type { Card } from '@/types'
import { SlidePanel }   from '@/components/ui/SlidePanel'
import { priorityScore } from '@/utils'
import { BacklogCard }  from './BacklogCard'
import { CardForm, type CardFormData } from './CardForm'
import { PromoteModal }  from './PromoteModal'
import { ColumnsPanel }  from '@/components/ui/ColumnsPanel'
import styles from './BacklogView.module.css'

interface BacklogViewProps {
  projectId: string
}

export function BacklogView({ projectId }: BacklogViewProps) {
  const cards           = useFlowStore(s => s.cards.filter(c => c.projectId === projectId && c.phase === 'discovery'))
  const addCard         = useFlowStore(s => s.addCard)
  const updateCard      = useFlowStore(s => s.updateCard)
  const deleteCard      = useFlowStore(s => s.deleteCard)
  const promoteToDelivery = useFlowStore(s => s.promoteToDelivery)

  const discoveryColumns = useProjectColumns(projectId, 'discovery')
  const deliveryColumns  = useProjectColumns(projectId, 'delivery')

  const colMap = useMemo(
    () => Object.fromEntries(discoveryColumns.map(c => [c.id, c.name])),
    [discoveryColumns]
  )

  // ── Filters ──
  const [search,     setSearch]     = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])

  type SortKey = 'manual' | 'score_desc' | 'score_asc' | 'moscow' | 'risk_desc' | 'value_desc'
  const [sortKey, setSortKey] = useState<SortKey>('manual')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    cards.forEach(c => c.tags.forEach(t => set.add(t)))
    return [...set].sort()
  }, [cards])

  const MOSCOW_ORDER: Record<string, number> = { M: 0, S: 1, C: 2, W: 3 }

  const filtered = useMemo(() => {
    let result = [...cards]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      )
    }
    if (activeTags.length > 0) {
      result = result.filter(c => activeTags.every(t => c.tags.includes(t)))
    }
    switch (sortKey) {
      case 'score_desc':  result.sort((a, b) => priorityScore(b.value, b.risk) - priorityScore(a.value, a.risk)); break
      case 'score_asc':   result.sort((a, b) => priorityScore(a.value, a.risk) - priorityScore(b.value, b.risk)); break
      case 'moscow':      result.sort((a, b) => (MOSCOW_ORDER[a.moscow] ?? 9) - (MOSCOW_ORDER[b.moscow] ?? 9)); break
      case 'risk_desc':   result.sort((a, b) => b.risk  - a.risk);  break
      case 'value_desc':  result.sort((a, b) => b.value - a.value); break
      default: result.sort((a, b) => a.order - b.order); break // manual
    }
    return result
  }, [cards, search, activeTags, sortKey])

  function toggleTag(t: string) {
    setActiveTags(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  // ── Slide Panel (create / edit) ──
  const [panelOpen,   setPanelOpen]   = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [defaultCol,  setDefaultCol]  = useState<string>('')

  function openCreate(columnId: string) {
    setEditingCard(null)
    setDefaultCol(columnId)
    setPanelOpen(true)
  }

  function openEdit(card: Card) {
    setEditingCard(card)
    setPanelOpen(true)
  }

  function handleSave(data: CardFormData) {
    if (editingCard) {
      updateCard(editingCard.id, data)
    } else {
      const colId = defaultCol || discoveryColumns[0]?.id
      if (!colId) return
      addCard(projectId, colId, 'discovery', data.title, data)
    }
    setPanelOpen(false)
  }

  // ── Promote ──
  const [promotingCard, setPromotingCard] = useState<Card | null>(null)

  function handlePromote(cardId: string, targetColId: string) {
    promoteToDelivery(cardId, targetColId)
  }

  // ── Columns panel ──
  const [colsPanelOpen, setColsPanelOpen] = useState(false)

  // ── Delete ──
  function handleDelete(id: string) {
    if (confirm('Excluir este card?')) deleteCard(id)
  }

  const isEmpty = discoveryColumns.length === 0

  return (
    <div className={styles.root}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search */}
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              className={styles.search}
              placeholder="Buscar cards…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.clearBtn} onClick={() => setSearch('')}>×</button>
            )}
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className={styles.tagFilters}>
              {allTags.map(t => (
                <button
                  key={t}
                  className={`${styles.tagBtn} ${activeTags.includes(t) ? styles.tagBtnActive : ''}`}
                  onClick={() => toggleTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:'8px' }}>
          <button
            className={styles.addBtn}
            style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)' }}
            onClick={() => setColsPanelOpen(true)}
            title="Gerenciar colunas"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{marginRight:4,verticalAlign:'middle'}}>
              <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M11.7 7a4.8 4.8 0 00-.1-.8l1.2-.9-1.1-2-1.5.6a4.5 4.5 0 00-1.4-.8L8.6 2H5.4l-.3 1.1a4.5 4.5 0 00-1.4.8l-1.5-.6-1.1 2 1.2.9A4.8 4.8 0 002.3 7c0 .3 0 .5.1.8l-1.2.9 1.1 2 1.5-.6c.4.3.9.6 1.4.8L5.4 12h3.2l.3-1.1c.5-.2 1-.5 1.4-.8l1.5.6 1.1-2-1.2-.9c.1-.3.1-.5.1-.8z" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Colunas
          </button>
          <button className={styles.addBtn} onClick={() => openCreate(discoveryColumns[0]?.id ?? '')}>
            + Novo card
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className={styles.stats}>
        <span>{filtered.length} card{filtered.length !== 1 ? 's' : ''}</span>
        {activeTags.length > 0 && (
          <button className={styles.clearTags} onClick={() => setActiveTags([])}>
            Limpar filtros ×
          </button>
        )}
        <div className={styles.sortGroup}>
          <span className={styles.sortLabel}>Ordenar</span>
          <select
            className={styles.sortSelect}
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
          >
            <option value="manual">Manual (criação)</option>
            <option value="score_desc">↓ Score (Risk + Value)</option>
            <option value="score_asc">↑ Score (Risk + Value)</option>
            <option value="moscow">MoSCoW (M→W)</option>
            <option value="risk_desc">↓ Risco</option>
            <option value="value_desc">↓ Valor</option>
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {isEmpty ? (
        <div className={styles.empty}>
          <p>Nenhuma coluna de Discovery encontrada.</p>
          <p className={styles.emptyHint}>Crie colunas para começar a organizar o backlog.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhum card encontrado.</p>
          {(search || activeTags.length > 0) && (
            <p className={styles.emptyHint}>Tente ajustar os filtros.</p>
          )}
        </div>
      ) : (
        <div className={styles.columnSection}>
          {discoveryColumns.map(col => {
            const colCards = filtered.filter(c => c.columnId === col.id)
            if (colCards.length === 0 && (search || activeTags.length > 0)) return null
            return (
              <section key={col.id} className={styles.swimlane}>
                <div className={styles.swimlaneHeader}>
                  <span className={styles.swimlaneName}>{col.name}</span>
                  <span className={styles.swimlaneCount}>{colCards.length}</span>
                  <button
                    className={styles.swimlaneAdd}
                    onClick={() => openCreate(col.id)}
                    title={`Adicionar card em ${col.name}`}
                  >+</button>
                </div>
                <div className={styles.grid}>
                  {colCards.map(card => (
                    <BacklogCard
                      key={card.id}
                      card={card}
                      columnName={colMap[card.columnId] ?? ''}
                      onEdit={openEdit}
                      onPromote={c => setPromotingCard(c)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* ── Slide Panel ── */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingCard ? 'Editar card' : 'Novo card'}
      >
        <CardForm
          initial={editingCard ?? undefined}
          onSave={handleSave}
          onCancel={() => setPanelOpen(false)}
          submitLabel={editingCard ? 'Salvar alterações' : 'Criar card'}
        />
      </SlidePanel>

      {/* ── Columns Panel ── */}
      <ColumnsPanel
        open={colsPanelOpen}
        onClose={() => setColsPanelOpen(false)}
        projectId={projectId}
        phase="discovery"
      />

      {/* ── Promote Modal ── */}
      <PromoteModal
        card={promotingCard}
        deliveryColumns={deliveryColumns}
        onConfirm={handlePromote}
        onClose={() => setPromotingCard(null)}
      />
    </div>
  )
}
