import { useState } from 'react'
import type { Card, RFCType } from '@/types'
import styles from './RFCForm.module.css'

export interface RFCFormData {
  title: string
  type: RFCType
  description: string
  rollbackPlan: string
  scheduledAt: string
}

interface RFCFormProps {
  sourceCard: Card
  onSave:   (data: RFCFormData) => void
  onCancel: () => void
}

const RFC_TYPES: RFCType[] = ['Normal', 'Padrão', 'Emergencial']

const TYPE_HINT: Record<RFCType, string> = {
  Normal:      'Mudança planejada com janela de aprovação normal.',
  Padrão:      'Mudança recorrente e pré-aprovada.',
  Emergencial: 'Mudança urgente fora da janela normal.',
}

export function RFCForm({ sourceCard, onSave, onCancel }: RFCFormProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [title,        setTitle]        = useState(`Deploy: ${sourceCard.title}`)
  const [type,         setType]         = useState<RFCType>('Normal')
  const [description,  setDescription]  = useState(sourceCard.description)
  const [rollbackPlan, setRollbackPlan] = useState('')
  const [scheduledAt,  setScheduledAt]  = useState(today)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), type, description, rollbackPlan, scheduledAt })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      {/* Source card reference */}
      <div className={styles.sourceCard}>
        <span className={styles.sourceLabel}>Card de origem</span>
        <span className={styles.sourceTitle}>{sourceCard.title}</span>
      </div>

      {/* Title */}
      <div className={styles.field}>
        <label className={styles.label}>Título da RFC <span className={styles.req}>*</span></label>
        <input
          className={styles.input}
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          required
        />
      </div>

      {/* Type */}
      <div className={styles.field}>
        <label className={styles.label}>Tipo de mudança</label>
        <div className={styles.typeGroup}>
          {RFC_TYPES.map(t => (
            <button
              key={t}
              type="button"
              className={`${styles.typeBtn} ${type === t ? styles.typeBtnActive : ''}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <p className={styles.typeHint}>{TYPE_HINT[type]}</p>
      </div>

      {/* Scheduled date */}
      <div className={styles.field}>
        <label className={styles.label}>Data programada</label>
        <input
          type="date"
          className={styles.input}
          value={scheduledAt}
          onChange={e => setScheduledAt(e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div className={styles.field}>
        <label className={styles.label}>Descrição da mudança</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="O que será alterado, impacto esperado, sistemas afetados…"
          rows={4}
        />
      </div>

      {/* Rollback */}
      <div className={styles.field}>
        <label className={styles.label}>Plano de rollback</label>
        <textarea
          className={styles.textarea}
          value={rollbackPlan}
          onChange={e => setRollbackPlan(e.target.value)}
          placeholder="Como reverter em caso de falha…"
          rows={3}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnCancel} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={styles.btnSave}>Criar RFC</button>
      </div>
    </form>
  )
}
