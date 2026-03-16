import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '@/types'
import { Badge }     from '@/components/ui/Badge'
import { RiskValue } from '@/components/ui/RiskValue'
import { moscowLabel } from '@/utils'
import styles from './KanbanCard.module.css'

interface KanbanCardProps {
  card: Card
  onEdit:   (card: Card) => void
  onDelete: (id: string) => void
  onGenRFC: (card: Card) => void
  isDoneColumn: boolean
}

export function KanbanCard({ card, onEdit, onDelete, onGenRFC, isDoneColumn }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      onClick={() => onEdit(card)}
    >
      {/* Drag handle */}
      <div
        className={styles.handle}
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        aria-label="Arrastar card"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="4" cy="3" r="1" fill="currentColor"/>
          <circle cx="8" cy="3" r="1" fill="currentColor"/>
          <circle cx="4" cy="6" r="1" fill="currentColor"/>
          <circle cx="8" cy="6" r="1" fill="currentColor"/>
          <circle cx="4" cy="9" r="1" fill="currentColor"/>
          <circle cx="8" cy="9" r="1" fill="currentColor"/>
        </svg>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <div className={styles.header}>
          <Badge variant={card.moscow}>{card.moscow}</Badge>
          <span className={styles.moscowText}>{moscowLabel[card.moscow]}</span>
        </div>

        <p className={styles.title}>{card.title}</p>

        {card.description && (
          <p className={styles.desc}>{card.description}</p>
        )}

        {card.tags.length > 0 && (
          <div className={styles.tags}>
            {card.tags.map(t => (
              <span key={t} className={styles.tag}>{t}</span>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <RiskValue risk={card.risk} value={card.value} />
          <div className={styles.actions}>
            {isDoneColumn && (
              <button
                className={styles.rfcBtn}
                title="Gerar RFC"
                onClick={e => { e.stopPropagation(); onGenRFC(card) }}
              >
                RFC +
              </button>
            )}
            <button
              className={styles.deleteBtn}
              title="Excluir"
              onClick={e => { e.stopPropagation(); onDelete(card.id) }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 3.5h9M4.5 3.5V2.5h4v1M5.5 5.5v3M7.5 5.5v3M2.5 3.5l.7 6.5h6.6l.7-6.5H2.5z"
                  stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
