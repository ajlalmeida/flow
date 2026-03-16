import type { Card } from '@/types'
import { moscowLabel } from '@/utils'
import { Badge } from '@/components/ui/Badge'
import { RiskValue } from '@/components/ui/RiskValue'
import styles from './BacklogCard.module.css'

interface BacklogCardProps {
  card: Card
  columnName: string
  onEdit: (card: Card) => void
  onPromote: (card: Card) => void
  onDelete: (id: string) => void
}

export function BacklogCard({ card, columnName, onEdit, onPromote, onDelete }: BacklogCardProps) {
  return (
    <div className={styles.card} onClick={() => onEdit(card)}>
      {/* Header row */}
      <div className={styles.header}>
        <Badge variant={card.moscow}>{card.moscow} — {moscowLabel[card.moscow]}</Badge>
        <button
          className={styles.menuBtn}
          onClick={e => { e.stopPropagation(); onDelete(card.id) }}
          title="Excluir card"
          aria-label="Excluir card"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4h10M5 4V3h4v1M6 6v4M8 6v4M3 4l.8 7h6.4L11 4H3z"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Title */}
      <p className={styles.title}>{card.title}</p>

      {/* Description */}
      {card.description && (
        <p className={styles.description}>{card.description}</p>
      )}

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className={styles.tags}>
          {card.tags.map(t => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <RiskValue risk={card.risk} value={card.value} />
        <div className={styles.footerRight}>
          <span className={styles.colLabel}>{columnName}</span>
          <button
            className={styles.promoteBtn}
            onClick={e => { e.stopPropagation(); onPromote(card) }}
            title="Promover para Delivery"
          >
            Delivery →
          </button>
        </div>
      </div>
    </div>
  )
}
