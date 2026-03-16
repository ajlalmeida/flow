import { useState, useMemo } from 'react'
import { useFlowStore, useProjectRFCs, useRecentLogs } from '@/store'
import type { RFC, RFCStatus, RFCType } from '@/types'
import { RFCCard }        from './RFCCard'
import { RFCDetailPanel } from './RFCDetailPanel'
import { RFCEditPanel }   from './RFCEditPanel'
import styles from './GmudView.module.css'

interface GmudViewProps {
  projectId: string
}

const ALL_STATUSES: RFCStatus[] = ['Planejada', 'Aprovada', 'Executando', 'Concluída', 'Falhou']
const ALL_TYPES:   RFCType[]    = ['Normal', 'Padrão', 'Emergencial']

const STATUS_COLOR: Record<RFCStatus, string> = {
  Planejada:  'gray',
  Aprovada:   'blue',
  Executando: 'amber',
  Concluída:  'green',
  Falhou:     'red',
}

export function GmudView({ projectId }: GmudViewProps) {
  const rfcs       = useProjectRFCs(projectId)
  const cards      = useFlowStore(s => s.cards.filter(c => c.projectId === projectId))
  const logs       = useRecentLogs(200)
  const setStatus  = useFlowStore(s => s.setRFCStatus)
  const updateRFC  = useFlowStore(s => s.updateRFC)
  const deleteRFC  = useFlowStore(s => s.deleteRFC)

  const cardMap = useMemo(
    () => Object.fromEntries(cards.map(c => [c.id, c])),
    [cards]
  )

  // ── Filters ──────────────────────────────────
  const [activeStatuses, setActiveStatuses] = useState<RFCStatus[]>([])
  const [activeTypes,    setActiveTypes]    = useState<RFCType[]>([])
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')

  function toggleStatus(s: RFCStatus) {
    setActiveStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleType(t: RFCType) {
    setActiveTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const filtered = useMemo(() => {
    let result = rfcs
    if (activeStatuses.length > 0)
      result = result.filter(r => activeStatuses.includes(r.status))
    if (activeTypes.length > 0)
      result = result.filter(r => activeTypes.includes(r.type))
    if (dateFrom)
      result = result.filter(r => r.scheduledAt >= dateFrom)
    if (dateTo)
      result = result.filter(r => r.scheduledAt <= dateTo + 'T23:59:59')
    return result
  }, [rfcs, activeStatuses, activeTypes, dateFrom, dateTo])

  const hasFilters = activeStatuses.length > 0 || activeTypes.length > 0 || dateFrom || dateTo

  function clearFilters() {
    setActiveStatuses([])
    setActiveTypes([])
    setDateFrom('')
    setDateTo('')
  }

  // ── Group by status ───────────────────────────
  const grouped = useMemo(() => {
    const map: Record<RFCStatus, RFC[]> = {
      Planejada: [], Aprovada: [], Executando: [], Concluída: [], Falhou: [],
    }
    filtered.forEach(r => map[r.status].push(r))
    return map
  }, [filtered])

  // Apenas status com cards (ou ativos no filtro)
  const visibleStatuses = ALL_STATUSES.filter(
    s => grouped[s].length > 0 || activeStatuses.includes(s)
  )

  // ── Detail panel ──────────────────────────────
  const [detailRFC,   setDetailRFC]   = useState<RFC | null>(null)
  const [detailOpen,  setDetailOpen]  = useState(false)

  function openDetail(rfc: RFC) { setDetailRFC(rfc); setDetailOpen(true) }

  // ── Edit panel ────────────────────────────────
  const [editRFC,  setEditRFC]  = useState<RFC | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  function openEdit(rfc: RFC) {
    setDetailOpen(false)
    setEditRFC(rfc)
    setEditOpen(true)
  }

  function handleEditSave(id: string, patch: Partial<RFC>) {
    updateRFC(id, patch)
  }

  // ── Delete ────────────────────────────────────
  function handleDelete(id: string) {
    if (confirm('Excluir esta RFC?')) {
      deleteRFC(id)
      if (detailRFC?.id === id) setDetailOpen(false)
    }
  }

  return (
    <div className={styles.root}>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>

        {/* Status pills */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              className={`${styles.filterPill} ${activeStatuses.includes(s) ? styles[`pill_${STATUS_COLOR[s]}`] : ''}`}
              onClick={() => toggleStatus(s)}
            >{s}</button>
          ))}
        </div>

        {/* Type pills */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Tipo</span>
          {ALL_TYPES.map(t => (
            <button
              key={t}
              className={`${styles.filterPill} ${activeTypes.includes(t) ? styles.pillActive : ''}`}
              onClick={() => toggleType(t)}
            >{t}</button>
          ))}
        </div>

        {/* Date range */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Período</span>
          <input
            type="date"
            className={styles.dateInput}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="Data inicial"
          />
          <span className={styles.dateSep}>→</span>
          <input
            type="date"
            className={styles.dateInput}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="Data final"
          />
        </div>

        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters}>
            Limpar filtros ×
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        <span>{filtered.length} RFC{filtered.length !== 1 ? 's' : ''}</span>
        {hasFilters && <span className={styles.statsFiltered}>filtrado</span>}
        <div className={styles.statsRight}>
          {ALL_STATUSES.map(s => rfcs.filter(r => r.status === s).length > 0 && (
            <span key={s} className={`${styles.statsPill} ${styles[`statsPill_${STATUS_COLOR[s]}`]}`}>
              {s}: {rfcs.filter(r => r.status === s).length}
            </span>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      {rfcs.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhuma RFC encontrada neste projeto.</p>
          <p className={styles.emptyHint}>
            RFCs são criadas a partir de cards na coluna Done do Board.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhuma RFC corresponde aos filtros.</p>
          <button className={styles.clearBtn} onClick={clearFilters}>Limpar filtros</button>
        </div>
      ) : (
        <div className={styles.content}>
          {visibleStatuses.map(status => (
            grouped[status].length > 0 && (
              <section key={status} className={styles.group}>
                <div className={styles.groupHeader}>
                  <div className={`${styles.groupDot} ${styles[`dot_${STATUS_COLOR[status]}`]}`} />
                  <span className={styles.groupName}>{status}</span>
                  <span className={styles.groupCount}>{grouped[status].length}</span>
                </div>
                <div className={styles.grid}>
                  {grouped[status].map(rfc => (
                    <RFCCard
                      key={rfc.id}
                      rfc={rfc}
                      sourceCard={cardMap[rfc.cardId]}
                      onOpen={openDetail}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )
          ))}
        </div>
      )}

      {/* ── Detail panel ── */}
      <RFCDetailPanel
        rfc={detailRFC}
        sourceCard={detailRFC ? cardMap[detailRFC.cardId] : undefined}
        logs={logs}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onStatus={setStatus}
        onEdit={openEdit}
      />

      {/* ── Edit panel ── */}
      <RFCEditPanel
        rfc={editRFC}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
      />
    </div>
  )
}
