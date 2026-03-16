import type { RFC, Card, ActivityLog, RFCStatus } from '@/types'
import { fmtDate } from '@/utils'
import { SlidePanel } from '@/components/ui/SlidePanel'
import styles from './RFCDetailPanel.module.css'

interface RFCDetailPanelProps {
  rfc:        RFC | null
  sourceCard: Card | undefined
  logs:       ActivityLog[]
  open:       boolean
  onClose:    () => void
  onStatus:   (id: string, status: RFCStatus) => void
  onEdit:     (rfc: RFC) => void
}

// Status workflow: quais transições são permitidas a partir de cada status
const TRANSITIONS: Record<RFCStatus, RFCStatus[]> = {
  Planejada:  ['Aprovada'],
  Aprovada:   ['Executando', 'Planejada'],
  Executando: ['Concluída', 'Falhou'],
  Concluída:  [],
  Falhou:     ['Planejada'],
}

const STATUS_COLOR: Record<RFCStatus, string> = {
  Planejada:  'gray',
  Aprovada:   'blue',
  Executando: 'amber',
  Concluída:  'green',
  Falhou:     'red',
}

const TYPE_ICON: Record<string, string> = {
  Normal:      '📋',
  Padrão:      '🔁',
  Emergencial: '⚡',
}

// Todos os status em ordem para o stepper
const STATUS_FLOW: RFCStatus[] = ['Planejada', 'Aprovada', 'Executando', 'Concluída']

function statusIndex(s: RFCStatus): number {
  if (s === 'Falhou') return -1
  return STATUS_FLOW.indexOf(s)
}

export function RFCDetailPanel({
  rfc, sourceCard, logs, open, onClose, onStatus, onEdit,
}: RFCDetailPanelProps) {
  if (!rfc) return null

  const transitions = TRANSITIONS[rfc.status] ?? []
  const rfcLogs     = logs.filter(l => l.entityId === rfc.id)
  const isFailed    = rfc.status === 'Falhou'
  const currentIdx  = statusIndex(rfc.status)

  return (
    <SlidePanel open={open} onClose={onClose} title="Detalhes da RFC" width={500}>
      <div className={styles.root}>

        {/* ── Status stepper ── */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Workflow</p>
          {isFailed ? (
            <div className={styles.failedBanner}>
              <span>⚠️</span>
              <span>Esta RFC falhou na execução.</span>
              <button
                className={styles.retryBtn}
                onClick={() => onStatus(rfc.id, 'Planejada')}
              >Reabrir →</button>
            </div>
          ) : (
            <div className={styles.stepper}>
              {STATUS_FLOW.map((s, i) => {
                const done    = i < currentIdx
                const current = i === currentIdx
                return (
                  <div key={s} className={styles.stepperItem}>
                    <div className={`${styles.stepDot}
                      ${done    ? styles.stepDone    : ''}
                      ${current ? styles.stepCurrent : ''}
                    `}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />
                    )}
                    <span className={`${styles.stepLabel} ${current ? styles.stepLabelCurrent : ''}`}>
                      {s}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Transition buttons */}
          {transitions.length > 0 && (
            <div className={styles.transitionBtns}>
              {transitions.map(t => (
                <button
                  key={t}
                  className={`${styles.transitionBtn} ${styles[`btn_${STATUS_COLOR[t]}`]}`}
                  onClick={() => onStatus(rfc.id, t)}
                >
                  → {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Meta ── */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Informações</p>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Título</span>
              <span className={styles.metaVal}>{rfc.title}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Tipo</span>
              <span className={styles.metaVal}>{TYPE_ICON[rfc.type]} {rfc.type}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Status</span>
              <span className={`badge badge-${rfc.status}`}>{rfc.status}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Agendada</span>
              <span className={styles.metaVal}>{fmtDate(rfc.scheduledAt)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Criada em</span>
              <span className={styles.metaVal}>{fmtDate(rfc.createdAt)}</span>
            </div>
            {sourceCard && (
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Card</span>
                <span className={styles.metaVal}>{sourceCard.title}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Descrição ── */}
        {rfc.description && (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Descrição da mudança</p>
            <p className={styles.textBlock}>{rfc.description}</p>
          </div>
        )}

        {/* ── Rollback ── */}
        {rfc.rollbackPlan && (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Plano de rollback</p>
            <div className={styles.rollbackBlock}>
              <span className={styles.rollbackIcon}>↩</span>
              <p className={styles.textBlock}>{rfc.rollbackPlan}</p>
            </div>
          </div>
        )}

        {/* ── Histórico ── */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Histórico de atividades</p>
          {rfcLogs.length === 0 ? (
            <p className={styles.emptyLogs}>Nenhuma atividade registrada.</p>
          ) : (
            <ul className={styles.logList}>
              {rfcLogs.map(log => (
                <li key={log.id} className={styles.logItem}>
                  <div className={styles.logDot} />
                  <div className={styles.logContent}>
                    <span className={styles.logAction}>{log.action}</span>
                    <span className={styles.logTime}>{fmtDate(log.timestamp)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Edit button ── */}
        <div className={styles.footer}>
          <button className={styles.editBtn} onClick={() => onEdit(rfc)}>
            Editar RFC
          </button>
        </div>

      </div>
    </SlidePanel>
  )
}
