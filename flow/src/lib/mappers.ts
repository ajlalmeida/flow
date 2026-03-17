// ─────────────────────────────────────────────
// Flow — DB row → App type mappers
// ─────────────────────────────────────────────
import type { Column, Card, RFC, ActivityLog } from '@/types'

// ── Raw DB row shapes ─────────────────────────

export interface DBColumn {
  id: string
  project_id: string
  phase: 'discovery' | 'delivery'
  name: string
  order: number
  wip_limit: number | null
  is_discovery_exit: boolean
  created_at: string
}

export interface DBCard {
  id: string
  project_id: string
  column_id: string
  phase: 'discovery' | 'delivery'
  title: string
  description: string
  moscow: 'M' | 'S' | 'C' | 'W'
  risk: number
  value: number
  order: number
  tags: string[]
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface DBRFC {
  id: string
  project_id: string
  card_id: string
  title: string
  type: 'Normal' | 'Padrão' | 'Emergencial'
  status: 'Planejada' | 'Aprovada' | 'Executando' | 'Concluída' | 'Falhou'
  description: string
  rollback_plan: string
  responsible: string | null
  scheduled_at: string
  window_start: string | null
  window_end: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface DBActivityLog {
  id: string
  project_id: string
  entity_id: string
  entity_type: string
  action: string
  payload: Record<string, unknown> | null
  actor_id: string | null
  created_at: string
}

// ── Mappers ───────────────────────────────────

export function mapColumn(r: DBColumn): Column {
  return {
    id:               r.id,
    projectId:        r.project_id,
    phase:            r.phase,
    name:             r.name,
    order:            r.order,
    wipLimit:         r.wip_limit ?? undefined,
    isDiscoveryExit:  r.is_discovery_exit,
  }
}

export function mapCard(r: DBCard): Card {
  return {
    id:          r.id,
    projectId:   r.project_id,
    columnId:    r.column_id,
    phase:       r.phase,
    title:       r.title,
    description: r.description,
    moscow:      r.moscow,
    risk:        r.risk as 1 | 2 | 3 | 4 | 5,
    value:       r.value as 1 | 2 | 3 | 4 | 5,
    order:       r.order,
    tags:        r.tags ?? [],
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
  }
}

export function mapRFC(r: DBRFC): RFC {
  return {
    id:           r.id,
    cardId:       r.card_id,
    projectId:    r.project_id,
    title:        r.title,
    type:         r.type,
    status:       r.status,
    description:  r.description,
    rollbackPlan: r.rollback_plan,
    scheduledAt:  r.scheduled_at,
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
  }
}

export function mapLog(r: DBActivityLog): ActivityLog {
  return {
    id:         r.id,
    entityId:   r.entity_id,
    entityType: r.entity_type as 'card' | 'rfc',
    action:     r.action,
    payload:    r.payload ?? undefined,
    timestamp:  r.created_at,
  }
}
