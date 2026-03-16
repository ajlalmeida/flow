// ─────────────────────────────────────────────
// Flow — Types
// v1.0.0 — 2026-03-16 (BRT)
// ─────────────────────────────────────────────

export type Phase = 'discovery' | 'delivery'

export type MoSCoW = 'M' | 'S' | 'C' | 'W'

export type RFCType = 'Normal' | 'Emergencial' | 'Padrão'

export type RFCStatus =
  | 'Planejada'
  | 'Aprovada'
  | 'Executando'
  | 'Concluída'
  | 'Falhou'

export type ActivityEntityType = 'card' | 'rfc'

// ── Project ──────────────────────────────────

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string // ISO
}

// ── Column ───────────────────────────────────

export interface Column {
  id: string
  projectId: string
  phase: Phase
  name: string
  order: number
  wipLimit?: number
  /** Se true, mover card aqui aciona prompt de transição para Delivery */
  isDiscoveryExit?: boolean
}

// ── Card ─────────────────────────────────────

export interface Card {
  id: string
  projectId: string
  columnId: string
  phase: Phase
  title: string
  description: string
  moscow: MoSCoW
  risk: 1 | 2 | 3 | 4 | 5
  value: 1 | 2 | 3 | 4 | 5
  order: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

// ── RFC ──────────────────────────────────────

export interface RFC {
  id: string
  cardId: string
  projectId: string
  title: string
  type: RFCType
  status: RFCStatus
  description: string
  rollbackPlan: string
  scheduledAt: string
  createdAt: string
  updatedAt: string
}

// ── ActivityLog ──────────────────────────────

export interface ActivityLog {
  id: string
  entityId: string
  entityType: ActivityEntityType
  action: string
  payload?: Record<string, unknown>
  timestamp: string
}

// ── Store shape ──────────────────────────────

export interface FlowState {
  projects: Project[]
  columns: Column[]
  cards: Card[]
  rfcs: RFC[]
  logs: ActivityLog[]
  activeProjectId: string | null
}
