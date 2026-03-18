// ─────────────────────────────────────────────
// Flow — Dashboard metrics
// Funções puras que calculam métricas a partir
// dos dados do store (sem side-effects)
// ─────────────────────────────────────────────
import type { Card, Column, RFC } from '@/types'

// ── Cards por fase ────────────────────────────

export interface PhaseMetrics {
  discoveryTotal:  number
  deliveryTotal:   number
  doneTotal:       number   // cards na última coluna Delivery
  inProgressTotal: number   // cards em Delivery não-Done
}

export function computePhaseMetrics(
  cards:   Card[],
  columns: Column[],
): PhaseMetrics {
  const deliveryCols   = columns.filter(c => c.phase === 'delivery').sort((a, b) => a.order - b.order)
  const doneColId      = deliveryCols[deliveryCols.length - 1]?.id ?? null

  const discoveryTotal  = cards.filter(c => c.phase === 'discovery').length
  const deliveryCards   = cards.filter(c => c.phase === 'delivery')
  const doneTotal       = doneColId ? deliveryCards.filter(c => c.columnId === doneColId).length : 0
  const inProgressTotal = deliveryCards.length - doneTotal

  return { discoveryTotal, deliveryTotal: deliveryCards.length, doneTotal, inProgressTotal }
}

// ── WIP por coluna ────────────────────────────

export interface WIPColumn {
  id:       string
  name:     string
  count:    number
  limit:    number | null
  pct:      number   // 0–100 (count / limit), null se sem limite
  over:     boolean
}

export function computeWIPMetrics(cards: Card[], columns: Column[]): WIPColumn[] {
  return columns
    .filter(c => c.phase === 'delivery')
    .sort((a, b) => a.order - b.order)
    .map(col => {
      const count = cards.filter(c => c.columnId === col.id).length
      const limit = col.wipLimit ?? null
      const pct   = limit ? Math.min(100, Math.round((count / limit) * 100)) : 0
      return {
        id:    col.id,
        name:  col.name,
        count,
        limit,
        pct,
        over:  limit !== null && count > limit,
      }
    })
}

// ── RFCs por status ───────────────────────────

export interface RFCStatusMetric {
  status: string
  count:  number
  color:  string
}

const RFC_STATUS_COLOR: Record<string, string> = {
  Planejada:  '#9ca3af',
  Aprovada:   '#3b82f6',
  Executando: '#f59e0b',
  Concluída:  '#22c55e',
  Falhou:     '#ef4444',
}

export function computeRFCMetrics(rfcs: RFC[]): RFCStatusMetric[] {
  const counts: Record<string, number> = {}
  rfcs.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1 })
  return Object.entries(counts)
    .map(([status, count]) => ({ status, count, color: RFC_STATUS_COLOR[status] ?? '#9ca3af' }))
    .sort((a, b) => b.count - a.count)
}

// ── Lead time médio ───────────────────────────

export interface LeadTimeMetrics {
  avgDays:    number   // média em dias
  minDays:    number
  maxDays:    number
  sampleSize: number   // quantos cards concluídos foram analisados
}

export function computeLeadTime(cards: Card[], columns: Column[]): LeadTimeMetrics {
  const deliveryCols = columns.filter(c => c.phase === 'delivery').sort((a, b) => a.order - b.order)
  const doneColId    = deliveryCols[deliveryCols.length - 1]?.id ?? null

  if (!doneColId) return { avgDays: 0, minDays: 0, maxDays: 0, sampleSize: 0 }

  const donecards = cards.filter(c => c.columnId === doneColId && c.phase === 'delivery')

  if (donecards.length === 0) return { avgDays: 0, minDays: 0, maxDays: 0, sampleSize: 0 }

  const diffs = donecards.map(c => {
    const created = new Date(c.createdAt).getTime()
    const updated = new Date(c.updatedAt).getTime()
    return Math.max(0, (updated - created) / (1000 * 60 * 60 * 24))
  })

  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
  return {
    avgDays:    Math.round(avg * 10) / 10,
    minDays:    Math.round(Math.min(...diffs) * 10) / 10,
    maxDays:    Math.round(Math.max(...diffs) * 10) / 10,
    sampleSize: donecards.length,
  }
}

// ── Sumário geral ─────────────────────────────

export interface DashboardData {
  phase:    PhaseMetrics
  wip:      WIPColumn[]
  rfcs:     RFCStatusMetric[]
  leadTime: LeadTimeMetrics
  totalCards: number
  totalRFCs:  number
}

export function computeDashboard(
  cards:   Card[],
  columns: Column[],
  rfcs:    RFC[],
): DashboardData {
  return {
    phase:      computePhaseMetrics(cards, columns),
    wip:        computeWIPMetrics(cards, columns),
    rfcs:       computeRFCMetrics(rfcs),
    leadTime:   computeLeadTime(cards, columns),
    totalCards: cards.length,
    totalRFCs:  rfcs.length,
  }
}
