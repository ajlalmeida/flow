import type { RFC, Card } from '@/types'
import { rfcStatusColor, fmtDate } from '@/utils'
import styles from './RFCCard.module.css'

interface RFCCardProps {
  rfc:        RFC
  sourceCard: Card | undefined
  onOpen:     (rfc: RFC) => void
  onDelete:   (id: string) => void
}

const TYPE_ICON: Record<string, string> = {
  Normal:      '📋',
  Padrão:      '🔁',
  Emergencial: '⚡',
}

export function RFCCard({ rfc, sourceCard, onOpen, onDelete }: RFCCardProps) {
  const color = rfcStatusColor[rfc.status] ?? 'gray'

  return (
    <div className={styles.card} onClick={() => onOpen(rfc)}>

      {/* Status stripe */}
      <div className={`${styles.stripe} ${styles[`stripe_${color}`]}`} />

      <div className={styles.body}>
        {/* Header */}
        <div className={styles.header}>
          <span className={`badge badge-${rfc.status}`}>{rfc.status}</span>
          <button
            className={styles.deleteBtn}
            title="Excluir RFC"
            onClick={e => { e.stopPropagation(); onDelete(rfc.id) }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3.5h9M4.5 3.5V2.5h4v1M5.5 5.5v3M7.5 5.5v3M2.5 3.5l.7 6.5h6.6l.7-6.5H2.5z"
                stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Title */}
        <p className={styles.title}>{rfc.title}</p>

        {/* Description */}
        {rfc.description && (
          <p className={styles.desc}>{rfc.description}</p>
        )}

        {/* Meta */}
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}>{TYPE_ICON[rfc.type]}</span>
            {rfc.type}
          </span>
          <span className={styles.metaItem}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x=".5" y="1.5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/>
              <path d="M3 .5v2M8 .5v2M.5 4h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            {fmtDate(rfc.scheduledAt)}
          </span>
        </div>

        {/* Source card */}
        {sourceCard && (
          <div className={styles.sourceCard}>
            <span className={styles.sourceLabel}>Card</span>
            <span className={styles.sourceTitle}>{sourceCard.title}</span>
          </div>
        )}
      </div>
    </div>
  )
}
