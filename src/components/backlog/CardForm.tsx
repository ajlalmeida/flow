import { useState, useEffect } from 'react'
import type { Card, MoSCoW } from '@/types'
import { moscowLabel } from '@/utils'
import styles from './CardForm.module.css'

interface CardFormProps {
  initial?: Partial<Card>
  onSave: (data: CardFormData) => void
  onCancel: () => void
  submitLabel?: string
}

export interface CardFormData {
  title: string
  description: string
  moscow: MoSCoW
  risk: 1 | 2 | 3 | 4 | 5
  value: 1 | 2 | 3 | 4 | 5
  tags: string[]
}

const MOSCOW_OPTIONS: MoSCoW[] = ['M', 'S', 'C', 'W']

function clamp(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, n)) as 1 | 2 | 3 | 4 | 5
}

export function CardForm({ initial, onSave, onCancel, submitLabel = 'Salvar' }: CardFormProps) {
  const [title,       setTitle]       = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [moscow,      setMoscow]      = useState<MoSCoW>(initial?.moscow ?? 'S')
  const [risk,        setRisk]        = useState<number>(initial?.risk ?? 3)
  const [value,       setValue]       = useState<number>(initial?.value ?? 3)
  const [tagInput,    setTagInput]    = useState('')
  const [tags,        setTags]        = useState<string[]>(initial?.tags ?? [])

  useEffect(() => {
    if (initial) {
      setTitle(initial.title ?? '')
      setDescription(initial.description ?? '')
      setMoscow(initial.moscow ?? 'S')
      setRisk(initial.risk ?? 3)
      setValue(initial.value ?? 3)
      setTags(initial.tags ?? [])
    }
  }, [initial?.id]) // re-sync when card changes

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(t: string) {
    setTags(prev => prev.filter(x => x !== t))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), description, moscow, risk: clamp(risk), value: clamp(value), tags })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Title */}
      <div className={styles.field}>
        <label className={styles.label}>Título <span className={styles.req}>*</span></label>
        <input
          className={styles.input}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Descreva o item de backlog…"
          autoFocus
          required
        />
      </div>

      {/* Description */}
      <div className={styles.field}>
        <label className={styles.label}>Descrição</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Contexto, critérios de aceite, links…"
          rows={4}
        />
      </div>

      {/* MoSCoW */}
      <div className={styles.field}>
        <label className={styles.label}>MoSCoW</label>
        <div className={styles.moscowGroup}>
          {MOSCOW_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              className={`${styles.moscowBtn} ${moscow === opt ? styles.moscowActive : ''} badge-${opt}`}
              onClick={() => setMoscow(opt)}
            >
              <strong>{opt}</strong>
              <span>{moscowLabel[opt]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Risk & Value */}
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Risco <span className={styles.val}>{risk}</span></label>
          <input
            type="range" min="1" max="5" step="1"
            value={risk}
            onChange={e => setRisk(Number(e.target.value))}
            className={styles.range}
            style={{ '--pct': `${((risk - 1) / 4) * 100}%`, '--color': 'var(--c-red)' } as React.CSSProperties}
          />
          <div className={styles.rangeLabels}><span>Baixo</span><span>Alto</span></div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Valor <span className={styles.val}>{value}</span></label>
          <input
            type="range" min="1" max="5" step="1"
            value={value}
            onChange={e => setValue(Number(e.target.value))}
            className={styles.range}
            style={{ '--pct': `${((value - 1) / 4) * 100}%`, '--color': 'var(--c-green)' } as React.CSSProperties}
          />
          <div className={styles.rangeLabels}><span>Baixo</span><span>Alto</span></div>
        </div>
      </div>

      {/* Tags */}
      <div className={styles.field}>
        <label className={styles.label}>Tags</label>
        <div className={styles.tagInput}>
          {tags.map(t => (
            <span key={t} className={styles.tag}>
              {t}
              <button type="button" onClick={() => removeTag(t)} className={styles.tagRemove}>×</button>
            </span>
          ))}
          <input
            className={styles.tagInner}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder={tags.length === 0 ? 'Digite e pressione Enter…' : ''}
          />
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button type="button" className={styles.btnCancel} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={styles.btnSave}>{submitLabel}</button>
      </div>
    </form>
  )
}
