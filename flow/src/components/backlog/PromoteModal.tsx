import { useState } from 'react'
import type { Card, Column } from '@/types'
import styles from './PromoteModal.module.css'

interface PromoteModalProps {
  card: Card | null
  deliveryColumns: Column[]
  onConfirm: (cardId: string, targetColumnId: string) => void
  onClose: () => void
}

export function PromoteModal({ card, deliveryColumns, onConfirm, onClose }: PromoteModalProps) {
  const [targetId, setTargetId] = useState(deliveryColumns[0]?.id ?? '')

  if (!card) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>Promover para Delivery</h3>
        <p className={styles.subtitle}>
          O card <strong>"{card.title}"</strong> será movido para a fase Delivery.
        </p>

        <label className={styles.label}>Coluna de destino</label>
        <select
          className={styles.select}
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
        >
          {deliveryColumns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button
            className={styles.btnConfirm}
            onClick={() => { onConfirm(card.id, targetId); onClose() }}
            disabled={!targetId}
          >
            Promover →
          </button>
        </div>
      </div>
    </div>
  )
}
