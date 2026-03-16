import { useState, useMemo } from 'react'
import { useFlowStore, useProjectColumns } from '@/store'
import type { Card } from '@/types'
import { SlidePanel }   from '@/components/ui/SlidePanel'
import { BacklogCard }  from './BacklogCard'
import { CardForm, type CardFormData } from './CardForm'
import { PromoteModal } from './PromoteModal'
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

  const allTags = useMemo(() => {
    const set = new Set<string>()
    cards.forEach(c => c.tags.forEach(t => set.add(t)))
    return [...set].sort()
  }, [cards])

  const filtered = useMemo(() => {
    let result = cards
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
    return result
  }, [cards, search, activeTags])

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

        <button className={styles.addBtn} onClick={() => openCreate(discoveryColumns[0]?.id ?? '')}>
          + Novo card
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className={styles.stats}>
        <span>{filtered.length} card{filtered.length !== 1 ? 's' : ''}</span>
        {activeTags.length > 0 && (
          <button className={styles.clearTags} onClick={() => setActiveTags([])}>
            Limpar filtros ×
          </button>
        )}
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
