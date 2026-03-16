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
        <p className={styles.emptyHint}>Use o botão abaixo para adicionar colunas ao Board.</p>
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
          {!colForm ? (
            <button className={styles.addColBtn} onClick={() => setColForm(true)}>
              + Coluna
            </button>
          ) : (
            <form className={styles.colForm} onSubmit={handleAddColumn}>
              <input
                className={styles.colInput}
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="Nome da coluna…"
                autoFocus
              />
              <button type="submit" className={styles.colSubmit}>Criar</button>
              <button type="button" className={styles.colCancel} onClick={() => setColForm(false)}>×</button>
            </form>
          )}
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
