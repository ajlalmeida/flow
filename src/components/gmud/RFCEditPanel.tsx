import { useState, useEffect } from 'react'
import type { RFC, RFCType } from '@/types'
import { SlidePanel } from '@/components/ui/SlidePanel'
import styles from './RFCEditPanel.module.css'

interface RFCEditPanelProps {
  rfc:     RFC | null
  open:    boolean
  onClose: () => void
  onSave:  (id: string, patch: Partial<RFC>) => void
}

const RFC_TYPES: RFCType[] = ['Normal', 'Padrão', 'Emergencial']

export function RFCEditPanel({ rfc, open, onClose, onSave }: RFCEditPanelProps) {
  const [title,        setTitle]        = useState('')
  const [type,         setType]         = useState<RFCType>('Normal')
  const [description,  setDescription]  = useState('')
  const [rollbackPlan, setRollbackPlan] = useState('')
  const [scheduledAt,  setScheduledAt]  = useState('')

  useEffect(() => {
    if (rfc) {
      setTitle(rfc.title)
      setType(rfc.type)
      setDescription(rfc.description)
      setRollbackPlan(rfc.rollbackPlan)
      setScheduledAt(rfc.scheduledAt.slice(0, 10))
    }
  }, [rfc?.id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rfc || !title.trim()) return
    onSave(rfc.id, { title: title.trim(), type, description, rollbackPlan, scheduledAt })
    onClose()
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="Editar RFC" width={480}>
      <form className={styles.form} onSubmit={handleSubmit}>

        <div className={styles.field}>
          <label className={styles.label}>Título <span className={styles.req}>*</span></label>
          <input
            className={styles.input}
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Tipo</label>
          <div className={styles.typeGroup}>
            {RFC_TYPES.map(t => (
              <button
                key={t}
                type="button"
                className={`${styles.typeBtn} ${type === t ? styles.typeBtnActive : ''}`}
                onClick={() => setType(t)}
              >{t}</button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Data programada</label>
          <input
            type="date"
            className={styles.input}
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Descrição</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Plano de rollback</label>
          <textarea
            className={styles.textarea}
            value={rollbackPlan}
            onChange={e => setRollbackPlan(e.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.btnSave}>Salvar alterações</button>
        </div>
      </form>
    </SlidePanel>
  )
}
