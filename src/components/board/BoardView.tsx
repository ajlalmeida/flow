import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

import { useFlowStore, useProjectColumns } from '@/store'
import type { Card, Column } from '@/types'
import { SlidePanel }   from '@/components/ui/SlidePanel'
import { CardForm, type CardFormData } from '@/components/backlog/CardForm'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard }   from './KanbanCard'
import { RFCForm, type RFCFormData } from './RFCForm'
import { ColumnsPanel }              from '@/components/ui/ColumnsPanel'
import styles from './BoardView.module.css'

interface BoardViewProps {
  projectId: string
}

export function BoardView({ projectId }: BoardViewProps) {
  const allCards         = useFlowStore(s => s.cards.filter(c => c.projectId === projectId && c.phase === 'delivery'))
  const addCard          = useFlowStore(s => s.addCard)
  const updateCard       = useFlowStore(s => s.updateCard)
  const moveCard         = useFlowStore(s => s.moveCard)
  const reorderCards     = useFlowStore(s => s.reorderCards)
  const deleteCard       = useFlowStore(s => s.deleteCard)
  const addRFC           = useFlowStore(s => s.addRFC)
  const addColumn        = useFlowStore(s => s.addColumn)
  const deleteColumn     = useFlowStore(s => s.deleteColumn)

  const columns = useProjectColumns(projectId, 'delivery')

  // Last column is treated as "Done"
  const doneColumnId = columns[columns.length - 1]?.id ?? ''

  // Cards grouped by column, sorted by order
  const cardsByCol = useMemo(() => {
    const map: Record<string, Card[]> = {}
    columns.forEach(col => { map[col.id] = [] })
    allCards.forEach(card => {
      if (map[card.columnId]) map[card.columnId].push(card)
      else map[card.columnId] = [card]
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => a.order - b.order))
    return map
  }, [allCards, columns])

  // ── DnD ──────────────────────────────────────
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function findColumn(cardId: string): Column | undefined {
    const card = allCards.find(c => c.id === cardId)
    return card ? columns.find(col => col.id === card.columnId) : undefined
  }

  function onDragStart({ active }: DragStartEvent) {
    const card = allCards.find(c => c.id === active.id)
    setActiveCard(card ?? null)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return

    const fromCol = findColumn(active.id as string)
    // over.id may be a columnId or a cardId
    const toColId = columns.find(c => c.id === over.id)?.id
      ?? allCards.find(c => c.id === over.id)?.columnId

    if (!fromCol || !toColId || fromCol.id === toColId) return

    // Move to new column at end — definitive order set in onDragEnd
    const toCards    = cardsByCol[toColId] ?? []
    const targetOrder = toCards.length
    moveCard(active.id as string, toColId, targetOrder)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null)
    if (!over || active.id === over.id) return

    const card = allCards.find(c => c.id === active.id)
    if (!card) return

    // Reorder within same column
    const colCards = (cardsByCol[card.columnId] ?? []).map(c => c.id)
    const oldIdx   = colCards.indexOf(active.id as string)
    const newIdx   = colCards.indexOf(over.id as string)

    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      const reordered = arrayMove(colCards, oldIdx, newIdx)
      reorderCards(card.columnId, reordered)
    }
  }

  // ── Card slide panel (edit) ──────────────────
  const [editCard,   setEditCard]   = useState<Card | null>(null)
  const [editPanel,  setEditPanel]  = useState(false)
  const [addColId,   setAddColId]   = useState<string>('')
  const [addPanel,   setAddPanel]   = useState(false)

  const openEdit = useCallback((card: Card) => { setEditCard(card); setEditPanel(true) }, [])
  const openAdd  = useCallback((colId: string) => { setAddColId(colId); setAddPanel(true) }, [])

  function handleEditSave(data: CardFormData) {
    if (!editCard) return
    updateCard(editCard.id, data)
    setEditPanel(false)
  }

  function handleAddSave(data: CardFormData) {
    addCard(projectId, addColId, 'delivery', data.title, data)
    setAddPanel(false)
  }

  // ── Delete ──────────────────────────────────
  function handleDelete(id: string) {
    if (confirm('Excluir este card?')) deleteCard(id)
  }

  // ── RFC slide panel ──────────────────────────
  const [rfcCard,  setRfcCard]  = useState<Card | null>(null)
  const [rfcPanel, setRfcPanel] = useState(false)

  function openRFC(card: Card) { setRfcCard(card); setRfcPanel(true) }

  function handleRFCSave(data: RFCFormData) {
    if (!rfcCard) return
    addRFC(rfcCard.id, projectId, data.title, data.type, data.scheduledAt, {
      description:  data.description,
      rollbackPlan: data.rollbackPlan,
    })
    setRfcPanel(false)
  }

  // ── Columns panel ──────────────────────────
  const [colsPanelOpen, setColsPanelOpen] = useState(false)

  // ── Add column ──────────────────────────────
  const [newColName, setNewColName] = useState('')
  const [colForm,    setColForm]    = useState(false)

  function handleAddColumn(e: React.FormEvent) {
    e.preventDefault()
    if (!newColName.trim()) return
    addColumn(projectId, 'delivery', newColName.trim())
    setNewColName('')
    setColForm(false)
  }

  if (columns.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhuma coluna de Delivery configurada.</p>
        <button
          style={{ marginTop:12, fontSize:'.85rem', color:'var(--brand-500)', background:'none', border:'1px solid var(--brand-400)', borderRadius:'var(--radius-md)', padding:'6px 14px', cursor:'pointer', fontFamily:'var(--font-sans)', fontWeight:600 }}
          onClick={() => setColsPanelOpen(true)}
        >
          + Criar colunas
        </button>
        <ColumnsPanel
          open={colsPanelOpen}
          onClose={() => setColsPanelOpen(false)}
          projectId={projectId}
          phase="delivery"
        />
      </div>
    )
  }

  return (
    <div className={styles.root}>
      {/* ── Board header ── */}
      <div className={styles.toolbar}>
        <span className={styles.meta}>
          {allCards.length} card{allCards.length !== 1 ? 's' : ''} · {columns.length} colunas
        </span>
        <div className={styles.toolbarRight}>
          <button className={styles.addColBtn} onClick={() => setColsPanelOpen(true)} title="Gerenciar colunas">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{marginRight:4,verticalAlign:'middle'}}>
              <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M11.7 7a4.8 4.8 0 00-.1-.8l1.2-.9-1.1-2-1.5.6a4.5 4.5 0 00-1.4-.8L8.6 2H5.4l-.3 1.1a4.5 4.5 0 00-1.4.8l-1.5-.6-1.1 2 1.2.9A4.8 4.8 0 002.3 7c0 .3 0 .5.1.8l-1.2.9 1.1 2 1.5-.6c.4.3.9.6 1.4.8L5.4 12h3.2l.3-1.1c.5-.2 1-.5 1.4-.8l1.5.6 1.1-2-1.2-.9c.1-.3.1-.5.1-.8z" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Colunas
          </button>
        </div>
      </div>

      {/* ── Kanban board ── */}
      <div className={styles.boardScroll}>
        <div className={styles.board}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            {columns.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                cards={cardsByCol[col.id] ?? []}
                onEdit={openEdit}
                onDelete={handleDelete}
                onAdd={openAdd}
                onGenRFC={openRFC}
                isDone={col.id === doneColumnId}
              />
            ))}

            {/* Drag overlay — ghost card while dragging */}
            <DragOverlay>
              {activeCard && (
                <div style={{ pointerEvents: 'none', opacity: .85, transform: 'rotate(2deg)' }}>
                  <KanbanCard
                    card={activeCard}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onGenRFC={() => {}}
                    isDoneColumn={false}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Inline add-column button at the end */}
          <div className={styles.addColEnd}>
            <button onClick={() => setColForm(true)} className={styles.addColEndBtn}>
              + Nova coluna
            </button>
          </div>
        </div>
      </div>

      {/* ── Edit card panel ── */}
      <SlidePanel
        open={editPanel}
        onClose={() => setEditPanel(false)}
        title="Editar card"
      >
        <CardForm
          initial={editCard ?? undefined}
          onSave={handleEditSave}
          onCancel={() => setEditPanel(false)}
          submitLabel="Salvar alterações"
        />
      </SlidePanel>

      {/* ── Add card panel ── */}
      <SlidePanel
        open={addPanel}
        onClose={() => setAddPanel(false)}
        title="Novo card"
      >
        <CardForm
          onSave={handleAddSave}
          onCancel={() => setAddPanel(false)}
          submitLabel="Criar card"
        />
      </SlidePanel>

      {/* ── Columns panel ── */}
      <ColumnsPanel
        open={colsPanelOpen}
        onClose={() => setColsPanelOpen(false)}
        projectId={projectId}
        phase="delivery"
      />

      {/* ── RFC panel ── */}
      <SlidePanel
        open={rfcPanel}
        onClose={() => setRfcPanel(false)}
        title="Gerar RFC"
        width={480}
      >
        {rfcCard && (
          <RFCForm
            sourceCard={rfcCard}
            onSave={handleRFCSave}
            onCancel={() => setRfcPanel(false)}
          />
        )}
      </SlidePanel>
    </div>
  )
}
