import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, Column } from '@/types'
import { KanbanCard } from './KanbanCard'
import styles from './KanbanColumn.module.css'

interface KanbanColumnProps {
  column:   Column
  cards:    Card[]
  onEdit:   (card: Card) => void
  onDelete: (id: string) => void
  onAdd:    (columnId: string) => void
  onGenRFC: (card: Card) => void
  isDone:   boolean
}

export function KanbanColumn({
  column, cards, onEdit, onDelete, onAdd, onGenRFC, isDone,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const atWip  = column.wipLimit != null && cards.length >= column.wipLimit
  const overWip = column.wipLimit != null && cards.length > column.wipLimit

  return (
    <div className={styles.column}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.name}>{column.name}</span>
          <span className={`${styles.count} ${overWip ? styles.countOver : atWip ? styles.countAt : ''}`}>
            {cards.length}{column.wipLimit != null ? `/${column.wipLimit}` : ''}
          </span>
          {isDone && <span className={styles.donePill}>✓ Done</span>}
        </div>
        <button
          className={styles.addBtn}
          onClick={() => onAdd(column.id)}
          title="Adicionar card"
        >+</button>
      </div>

      {/* WIP warning */}
      {overWip && (
        <div className={styles.wipWarning}>
          Limite WIP excedido ({cards.length}/{column.wipLimit})
        </div>
      )}

      {/* Cards */}
      <SortableContext
        items={cards.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`${styles.cardList} ${isOver ? styles.isOver : ''}`}
        >
          {cards.length === 0 && (
            <div className={styles.emptySlot}>
              Arraste cards aqui
            </div>
          )}
          {cards.map(card => (
            <KanbanCard
              key={card.id}
              card={card}
              onEdit={onEdit}
              onDelete={onDelete}
              onGenRFC={onGenRFC}
              isDoneColumn={isDone}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
