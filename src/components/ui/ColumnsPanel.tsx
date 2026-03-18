import { useState, useRef } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { useFlowStore } from '@/store/flow'
import type { Column, Phase } from '@/types'
import styles from './ColumnsPanel.module.css'

interface ColumnsPanelProps {
  open:      boolean
  onClose:   () => void
  projectId: string
  phase:     Phase
}

// ── Sortable column row ───────────────────────

interface ColumnRowProps {
  col:        Column
  showWip:    boolean
  onRename:   (id: string, name: string) => void
  onWip:      (id: string, wip: number | undefined) => void
  onDelete:   (id: string) => void
  isDragging?: boolean
}

function ColumnRow({ col, showWip, onRename, onWip, onDelete, isDragging }: ColumnRowProps) {
  const {
    attributes, listeners,
    setNodeRef, transform, transition,
  } = useSortable({ id: col.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const [editing,  setEditing]  = useState(false)
  const [nameVal,  setNameVal]  = useState(col.name)
  const [wipVal,   setWipVal]   = useState<string>(col.wipLimit?.toString() ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  function commitRename() {
    const trimmed = nameVal.trim()
    if (trimmed && trimmed !== col.name) onRename(col.id, trimmed)
    else setNameVal(col.name)
    setEditing(false)
  }

  function commitWip() {
    const n = parseInt(wipVal)
    onWip(col.id, isNaN(n) || n <= 0 ? undefined : n)
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.row}>
      {/* Drag handle */}
      <button
        className={styles.handle}
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="4" cy="2.5" r="1" fill="currentColor"/>
          <circle cx="8" cy="2.5" r="1" fill="currentColor"/>
          <circle cx="4" cy="6"   r="1" fill="currentColor"/>
          <circle cx="8" cy="6"   r="1" fill="currentColor"/>
          <circle cx="4" cy="9.5" r="1" fill="currentColor"/>
          <circle cx="8" cy="9.5" r="1" fill="currentColor"/>
        </svg>
      </button>

      {/* Name */}
      <div className={styles.nameCell}>
        {editing ? (
          <input
            ref={inputRef}
            className={styles.nameInput}
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setNameVal(col.name); setEditing(false) }
            }}
            autoFocus
          />
        ) : (
          <span
            className={styles.nameText}
            onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 10) }}
            title="Clique para renomear"
          >
            {col.name}
          </span>
        )}
      </div>

      {/* WIP limit */}
      {showWip && (
        <div className={styles.wipCell}>
          <input
            className={styles.wipInput}
            type="number"
            min="0"
            placeholder="—"
            value={wipVal}
            onChange={e => setWipVal(e.target.value)}
            onBlur={commitWip}
            onKeyDown={e => e.key === 'Enter' && commitWip()}
            title="WIP limit (0 = sem limite)"
          />
        </div>
      )}

      {/* Delete */}
      <button
        className={styles.deleteBtn}
        onClick={() => onDelete(col.id)}
        title="Excluir coluna"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 3.5h9M4.5 3.5V2.5h4v1M5.5 5.5v3M7.5 5.5v3M2.5 3.5l.7 6.5h6.6l.7-6.5H2.5z"
            stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── Main panel ────────────────────────────────

export function ColumnsPanel({ open, onClose, projectId, phase }: ColumnsPanelProps) {
  const columns      = useFlowStore(s =>
    s.columns
      .filter(c => c.projectId === projectId && c.phase === phase)
      .sort((a, b) => a.order - b.order)
  )
  const addColumn    = useFlowStore(s => s.addColumn)
  const updateColumn = useFlowStore(s => s.updateColumn)
  const deleteColumn = useFlowStore(s => s.deleteColumn)
  const reorderColumns = useFlowStore(s => s.reorderColumns)

  const [newName,    setNewName]    = useState('')
  const [newWip,     setNewWip]     = useState('')
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const showWip = phase === 'delivery'
  const title   = phase === 'discovery' ? 'Colunas — Discovery' : 'Colunas — Delivery'

  // ── DnD ──────────────────────────────────────

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const ids    = columns.map(c => c.id)
    const oldIdx = ids.indexOf(active.id as string)
    const newIdx = ids.indexOf(over.id   as string)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(ids, oldIdx, newIdx)
    await reorderColumns(projectId, phase, reordered)
  }

  // ── Create ────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name || submitting) return
    setSubmitting(true)
    const wip = parseInt(newWip)
    await addColumn(projectId, phase, name, isNaN(wip) || wip <= 0 ? undefined : wip)
    setNewName('')
    setNewWip('')
    setSubmitting(false)
  }

  // ── Update ────────────────────────────────────

  async function handleRename(id: string, name: string) {
    await updateColumn(id, { name })
  }

  async function handleWip(id: string, wipLimit: number | undefined) {
    await updateColumn(id, { wipLimit })
  }

  // ── Delete ────────────────────────────────────

  async function handleDelete(id: string) {
    const col = columns.find(c => c.id === id)
    if (!col) return
    if (!confirm(`Excluir a coluna "${col.name}"? Os cards dentro dela também serão excluídos.`)) return
    await deleteColumn(id)
  }

  const activeCol = columns.find(c => c.id === activeId)

  return (
    <SlidePanel open={open} onClose={onClose} title={title} width={440}>
      <div className={styles.root}>

        {/* Header info */}
        <p className={styles.hint}>
          Arraste para reordenar. Clique no nome para renomear.
          {showWip && ' O campo WIP limita cards simultâneos na coluna (0 = sem limite).'}
        </p>

        {/* Column headers */}
        {columns.length > 0 && (
          <div className={styles.tableHead}>
            <span />
            <span>Nome</span>
            {showWip && <span className={styles.wipHeadLabel}>WIP</span>}
            <span />
          </div>
        )}

        {/* Sortable list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={columns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.list}>
              {columns.length === 0 && (
                <p className={styles.empty}>Nenhuma coluna ainda. Crie a primeira abaixo.</p>
              )}
              {columns.map(col => (
                <ColumnRow
                  key={col.id}
                  col={col}
                  showWip={showWip}
                  onRename={handleRename}
                  onWip={handleWip}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeCol && (
              <div className={styles.dragOverlay}>
                <span className={styles.nameText}>{activeCol.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Create form */}
        <div className={styles.createSection}>
          <p className={styles.createLabel}>Nova coluna</p>
          <form className={styles.createForm} onSubmit={handleCreate}>
            <input
              className={styles.createInput}
              placeholder="Nome da coluna…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
            {showWip && (
              <input
                className={styles.wipCreate}
                type="number"
                min="0"
                placeholder="WIP"
                value={newWip}
                onChange={e => setNewWip(e.target.value)}
                title="WIP limit"
              />
            )}
            <button
              type="submit"
              className={styles.createBtn}
              disabled={submitting || !newName.trim()}
            >
              {submitting ? '…' : '+ Criar'}
            </button>
          </form>
        </div>

      </div>
    </SlidePanel>
  )
}
