import { useMemo } from 'react'
import { useFlowStore } from '@/store/flow'
import { computeDashboard } from './metrics'
import styles from './DashboardView.module.css'

interface DashboardViewProps {
  projectId: string
}

export function DashboardView({ projectId }: DashboardViewProps) {
  const cards   = useFlowStore(s => s.cards.filter(c => c.projectId === projectId))
  const columns = useFlowStore(s => s.columns.filter(c => c.projectId === projectId))
  const rfcs    = useFlowStore(s => s.rfcs.filter(r => r.projectId === projectId))

  const data = useMemo(
    () => computeDashboard(cards, columns, rfcs),
    [cards, columns, rfcs],
  )

  const { phase, wip, rfcs: rfcMetrics, leadTime } = data

  // ── Totais para barra fase ──
  const phaseTotal = phase.discoveryTotal + phase.deliveryTotal
  const discPct    = phaseTotal ? Math.round((phase.discoveryTotal / phaseTotal) * 100) : 0
  const delivPct   = phaseTotal ? 100 - discPct : 0

  // ── RFC donut ──
  const rfcTotal   = rfcMetrics.reduce((a, b) => a + b.count, 0)

  return (
    <div className={styles.root}>
      <div className={styles.grid}>

        {/* ── 1. Cards por fase ── */}
        <div className={`${styles.card} ${styles.cardWide}`}>
          <p className={styles.cardLabel}>Cards por fase</p>

          <div className={styles.phaseNumbers}>
            <div className={styles.phaseStat}>
              <span className={styles.phaseNum}>{phase.discoveryTotal}</span>
              <span className={styles.phaseName}>Discovery</span>
            </div>
            <div className={styles.phaseDivider} />
            <div className={styles.phaseStat}>
              <span className={styles.phaseNum}>{phase.inProgressTotal}</span>
              <span className={styles.phaseName}>Em progresso</span>
            </div>
            <div className={styles.phaseDivider} />
            <div className={styles.phaseStat}>
              <span className={`${styles.phaseNum} ${styles.phaseNumDone}`}>{phase.doneTotal}</span>
              <span className={styles.phaseName}>Concluídos</span>
            </div>
          </div>

          {/* Progress bar */}
          {phaseTotal > 0 && (
            <div className={styles.phaseBar}>
              <div
                className={styles.phaseBarDisc}
                style={{ width: `${discPct}%` }}
                title={`Discovery: ${phase.discoveryTotal}`}
              />
              <div
                className={styles.phaseBarDeliv}
                style={{ width: `${delivPct}%` }}
                title={`Delivery: ${phase.deliveryTotal}`}
              />
            </div>
          )}
          <div className={styles.phaseLegend}>
            <span><span className={styles.dotDisc} />Discovery ({discPct}%)</span>
            <span><span className={styles.dotDeliv} />Delivery ({delivPct}%)</span>
          </div>
        </div>

        {/* ── 2. Lead time ── */}
        <div className={styles.card}>
          <p className={styles.cardLabel}>Lead time médio</p>
          {leadTime.sampleSize === 0 ? (
            <p className={styles.emptyMetric}>Nenhum card concluído ainda.</p>
          ) : (
            <>
              <div className={styles.bigNum}>
                {leadTime.avgDays}
                <span className={styles.bigNumUnit}>dias</span>
              </div>
              <div className={styles.leadStats}>
                <div className={styles.leadStat}>
                  <span className={styles.leadKey}>Mín.</span>
                  <span className={styles.leadVal}>{leadTime.minDays}d</span>
                </div>
                <div className={styles.leadStat}>
                  <span className={styles.leadKey}>Máx.</span>
                  <span className={styles.leadVal}>{leadTime.maxDays}d</span>
                </div>
                <div className={styles.leadStat}>
                  <span className={styles.leadKey}>Amostra</span>
                  <span className={styles.leadVal}>{leadTime.sampleSize}</span>
                </div>
              </div>
              <p className={styles.leadHint}>
                Calculado sobre cards na coluna Done
              </p>
            </>
          )}
        </div>

        {/* ── 3. RFCs por status ── */}
        <div className={styles.card}>
          <p className={styles.cardLabel}>RFCs por status</p>
          {rfcMetrics.length === 0 ? (
            <p className={styles.emptyMetric}>Nenhuma RFC neste projeto.</p>
          ) : (
            <div className={styles.rfcList}>
              {rfcMetrics.map(m => (
                <div key={m.status} className={styles.rfcRow}>
                  <div className={styles.rfcDot} style={{ background: m.color }} />
                  <span className={styles.rfcStatus}>{m.status}</span>
                  <div className={styles.rfcBarWrap}>
                    <div
                      className={styles.rfcBar}
                      style={{
                        width: `${Math.round((m.count / rfcTotal) * 100)}%`,
                        background: m.color,
                      }}
                    />
                  </div>
                  <span className={styles.rfcCount}>{m.count}</span>
                </div>
              ))}
              <p className={styles.rfcTotal}>{rfcTotal} total</p>
            </div>
          )}
        </div>

        {/* ── 4. WIP por coluna ── */}
        <div className={`${styles.card} ${styles.cardFull}`}>
          <p className={styles.cardLabel}>WIP por coluna — Delivery</p>
          {wip.length === 0 ? (
            <p className={styles.emptyMetric}>Nenhuma coluna de Delivery configurada.</p>
          ) : (
            <div className={styles.wipGrid}>
              {wip.map(col => {
                const pct  = col.limit ? Math.min(100, Math.round((col.count / col.limit) * 100)) : 0
                const over = col.over
                const at   = col.limit !== null && col.count === col.limit
                return (
                  <div key={col.id} className={`${styles.wipCol} ${over ? styles.wipColOver : ''}`}>
                    <div className={styles.wipColHeader}>
                      <span className={styles.wipColName}>{col.name}</span>
                      <span className={`${styles.wipBadge} ${over ? styles.wipBadgeOver : at ? styles.wipBadgeAt : ''}`}>
                        {col.count}{col.limit !== null ? `/${col.limit}` : ''}
                      </span>
                    </div>
                    {col.limit !== null && (
                      <>
                        <div className={styles.wipBarTrack}>
                          <div
                            className={`${styles.wipBarFill} ${over ? styles.wipBarOver : at ? styles.wipBarAt : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className={styles.wipPct}>{pct}% do limite</p>
                      </>
                    )}
                    {col.limit === null && (
                      <p className={styles.wipNoLimit}>Sem limite WIP</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
