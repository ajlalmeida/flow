// ─────────────────────────────────────────────
// Flow — Store v2 (Supabase)
// Mesma interface pública do store local.
// Backlog, Board e GMud não precisam mudar.
// ─────────────────────────────────────────────
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { mapColumn, mapCard, mapRFC, mapLog } from '@/lib/mappers'
import type {
  Column, Card, RFC, ActivityLog,
  Phase, MoSCoW, RFCType, RFCStatus,
} from '@/types'

// ── State ─────────────────────────────────────

interface FlowState {
  columns:         Column[]
  cards:           Card[]
  rfcs:            RFC[]
  logs:            ActivityLog[]
  activeProjectId: string | null
  loading:         boolean
  error:           string | null
}

// ── Actions ───────────────────────────────────

interface FlowActions {
  // Bootstrap
  loadProject: (projectId: string) => Promise<void>
  setActiveProject: (id: string) => void

  // Column
  addColumn:      (projectId: string, phase: Phase, name: string, wipLimit?: number) => Promise<string>
  updateColumn:   (id: string, patch: Partial<Pick<Column, 'name' | 'wipLimit' | 'isDiscoveryExit'>>) => Promise<void>
  reorderColumns: (projectId: string, phase: Phase, orderedIds: string[]) => Promise<void>
  deleteColumn:   (id: string) => Promise<void>

  // Card
  addCard: (
    projectId: string,
    columnId: string,
    phase: Phase,
    title: string,
    opts?: Partial<Pick<Card, 'description' | 'moscow' | 'risk' | 'value' | 'tags'>>
  ) => Promise<string>
  updateCard:        (id: string, patch: Partial<Omit<Card, 'id' | 'projectId' | 'createdAt'>>) => Promise<void>
  moveCard:          (id: string, targetColumnId: string, targetOrder: number) => Promise<void>
  promoteToDelivery: (cardId: string, targetColumnId: string) => Promise<void>
  deleteCard:        (id: string) => Promise<void>
  reorderCards:      (columnId: string, orderedIds: string[]) => Promise<void>

  // RFC
  addRFC: (
    cardId: string,
    projectId: string,
    title: string,
    type: RFCType,
    scheduledAt: string,
    opts?: Partial<Pick<RFC, 'description' | 'rollbackPlan'>>
  ) => Promise<string>
  updateRFC:   (id: string, patch: Partial<Omit<RFC, 'id' | 'cardId' | 'projectId' | 'createdAt'>>) => Promise<void>
  setRFCStatus:(id: string, status: RFCStatus) => Promise<void>
  deleteRFC:   (id: string) => Promise<void>
}

// ── Store ─────────────────────────────────────

export const useFlowStore = create<FlowState & FlowActions>()((set, get) => ({
  columns:         [],
  cards:           [],
  rfcs:            [],
  logs:            [],
  activeProjectId: null,
  loading:         false,
  error:           null,

  // ── Bootstrap ──────────────────────────────

  setActiveProject(id) {
    set({ activeProjectId: id })
    get().loadProject(id)
  },

  async loadProject(projectId) {
    set({ loading: true, error: null })
    try {
      const [colRes, cardRes, rfcRes, logRes] = await Promise.all([
        supabase.from('columns').select('*').eq('project_id', projectId).order('order'),
        supabase.from('cards').select('*').eq('project_id', projectId).order('order'),
        supabase.from('rfcs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('activity_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(200),
      ])

      if (colRes.error)  throw colRes.error
      if (cardRes.error) throw cardRes.error
      if (rfcRes.error)  throw rfcRes.error

      set({
        columns:  (colRes.data  ?? []).map(mapColumn),
        cards:    (cardRes.data ?? []).map(mapCard),
        rfcs:     (rfcRes.data  ?? []).map(mapRFC),
        logs:     (logRes.data  ?? []).map(mapLog),
        activeProjectId: projectId,
        loading: false,
      })
    } catch (err: unknown) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  // ── Columns ────────────────────────────────

  async addColumn(projectId, phase, name, wipLimit) {
    const order = get().columns.filter(c => c.projectId === projectId && c.phase === phase).length
    const { data, error } = await supabase
      .from('columns')
      .insert({ project_id: projectId, phase, name, order, wip_limit: wipLimit ?? null } as Record<string,unknown>)
      .select()
      .single()
    if (error || !data) throw error
    const col = mapColumn(data as any)
    set(s => ({ columns: [...s.columns, col] }))
    return col.id
  },

  async updateColumn(id, patch) {
    const dbPatch: Record<string, unknown> = {}
    if (patch.name             !== undefined) dbPatch.name               = patch.name
    if (patch.wipLimit         !== undefined) dbPatch.wip_limit          = patch.wipLimit ?? null
    if (patch.isDiscoveryExit  !== undefined) dbPatch.is_discovery_exit  = patch.isDiscoveryExit

    const { data, error } = await supabase
      .from('columns').update(dbPatch as Record<string,unknown>).eq('id', id).select().single()
    if (error || !data) throw error
    const col = mapColumn(data as any)
    set(s => ({ columns: s.columns.map(c => c.id === id ? col : c) }))
  },

  async reorderColumns(projectId, phase, orderedIds) {
    // Optimistic update
    set(s => ({
      columns: s.columns.map(c => {
        if (c.projectId !== projectId || c.phase !== phase) return c
        const idx = orderedIds.indexOf(c.id)
        return idx === -1 ? c : { ...c, order: idx }
      }),
    }))
    // Persist each updated order
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('columns').update({ order: idx } as Record<string,unknown>).eq('id', id)
      )
    )
  },

  async deleteColumn(id) {
    await supabase.from('columns').delete().eq('id', id)
    set(s => ({
      columns: s.columns.filter(c => c.id !== id),
      cards:   s.cards.filter(c => c.columnId !== id),
    }))
  },

  // ── Cards ──────────────────────────────────

  async addCard(projectId, columnId, phase, title, opts = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const order = get().cards.filter(c => c.columnId === columnId).length
    const { data, error } = await supabase
      .from('cards')
      .insert({
        project_id:  projectId,
        column_id:   columnId,
        phase,
        title,
        description: opts.description ?? '',
        moscow:      opts.moscow      ?? 'S',
        risk:        opts.risk        ?? 3,
        value:       opts.value       ?? 3,
        order,
        tags:        opts.tags        ?? [],
        created_by:  user.id,
      } as Record<string,unknown>)
      .select()
      .single()
    if (error || !data) throw error
    const card = mapCard(data as any)
    set(s => ({ cards: [...s.cards, card] }))
    await _log(get().activeProjectId!, card.id, 'card', `Card "${title}" criado`, user.id)
    return card.id
  },

  async updateCard(id, patch) {
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.title       !== undefined) dbPatch.title       = patch.title
    if (patch.description !== undefined) dbPatch.description = patch.description
    if (patch.moscow      !== undefined) dbPatch.moscow      = patch.moscow
    if (patch.risk        !== undefined) dbPatch.risk        = patch.risk
    if (patch.value       !== undefined) dbPatch.value       = patch.value
    if (patch.tags        !== undefined) dbPatch.tags        = patch.tags
    if (patch.columnId    !== undefined) dbPatch.column_id   = patch.columnId
    if (patch.phase       !== undefined) dbPatch.phase       = patch.phase
    if (patch.order       !== undefined) dbPatch.order       = patch.order

    const { data, error } = await supabase
      .from('cards').update(dbPatch as Record<string,unknown>).eq('id', id).select().single()
    if (error || !data) throw error
    const card = mapCard(data as any)
    set(s => ({ cards: s.cards.map(c => c.id === id ? card : c) }))
    const { data: { user } } = await supabase.auth.getUser()
    await _log(get().activeProjectId!, id, 'card', 'Card atualizado', user?.id)
  },

  async moveCard(id, targetColumnId, targetOrder) {
    // Optimistic
    set(s => ({
      cards: s.cards.map(c =>
        c.id === id ? { ...c, columnId: targetColumnId, order: targetOrder, updatedAt: new Date().toISOString() } : c
      ),
    }))
    await supabase
      .from('cards')
      .update({ column_id: targetColumnId, order: targetOrder, updated_at: new Date().toISOString() } as Record<string,unknown>)
      .eq('id', id)
  },

  async promoteToDelivery(cardId, targetColumnId) {
    const { data, error } = await supabase
      .from('cards')
      .update({ phase: 'delivery', column_id: targetColumnId, updated_at: new Date().toISOString() } as Record<string,unknown>)
      .eq('id', cardId)
      .select()
      .single()
    if (error || !data) throw error
    const card = mapCard(data as any)
    set(s => ({ cards: s.cards.map(c => c.id === cardId ? card : c) }))
    const { data: { user } } = await supabase.auth.getUser()
    await _log(get().activeProjectId!, cardId, 'card', 'Card promovido para Delivery', user?.id)
  },

  async deleteCard(id) {
    await supabase.from('cards').delete().eq('id', id)
    set(s => ({
      cards: s.cards.filter(c => c.id !== id),
      rfcs:  s.rfcs.filter(r => r.cardId !== id),
    }))
  },

  async reorderCards(columnId, orderedIds) {
    // Optimistic
    set(s => ({
      cards: s.cards.map(c => {
        if (c.columnId !== columnId) return c
        const idx = orderedIds.indexOf(c.id)
        return idx === -1 ? c : { ...c, order: idx }
      }),
    }))
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('cards').update({ order: idx } as Record<string,unknown>).eq('id', id)
      )
    )
  },

  // ── RFCs ───────────────────────────────────

  async addRFC(cardId, projectId, title, type, scheduledAt, opts = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('rfcs')
      .insert({
        card_id:      cardId,
        project_id:   projectId,
        title,
        type,
        status:       'Planejada',
        description:  opts.description  ?? '',
        rollback_plan: opts.rollbackPlan ?? '',
        scheduled_at: scheduledAt,
        created_by:   user.id,
      } as Record<string,unknown>)
      .select()
      .single()
    if (error || !data) throw error
    const rfc = mapRFC(data as any)
    set(s => ({ rfcs: [rfc, ...s.rfcs] }))
    await _log(projectId, rfc.id, 'rfc', `RFC "${title}" criada`, user.id)
    return rfc.id
  },

  async updateRFC(id, patch) {
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.title        !== undefined) dbPatch.title         = patch.title
    if (patch.type         !== undefined) dbPatch.type          = patch.type
    if (patch.status       !== undefined) dbPatch.status        = patch.status
    if (patch.description  !== undefined) dbPatch.description   = patch.description
    if (patch.rollbackPlan !== undefined) dbPatch.rollback_plan = patch.rollbackPlan
    if (patch.scheduledAt  !== undefined) dbPatch.scheduled_at  = patch.scheduledAt

    const { data, error } = await supabase
      .from('rfcs').update(dbPatch as Record<string,unknown>).eq('id', id).select().single()
    if (error || !data) throw error
    const rfc = mapRFC(data as any)
    set(s => ({ rfcs: s.rfcs.map(r => r.id === id ? rfc : r) }))
    const { data: { user } } = await supabase.auth.getUser()
    await _log(rfc.projectId, id, 'rfc', 'RFC atualizada', user?.id)
  },

  async setRFCStatus(id, status) {
    const { data, error } = await supabase
      .from('rfcs')
      .update({ status, updated_at: new Date().toISOString() } as Record<string,unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error || !data) throw error
    const rfc = mapRFC(data as any)
    set(s => ({ rfcs: s.rfcs.map(r => r.id === id ? rfc : r) }))
    const { data: { user } } = await supabase.auth.getUser()
    await _log(rfc.projectId, id, 'rfc', `RFC → ${status}`, user?.id)
    // Atualiza log no estado local
    const newLog = {
      id: crypto.randomUUID(),
      entityId: id,
      entityType: 'rfc' as const,
      action: `RFC → ${status}`,
      timestamp: new Date().toISOString(),
    }
    set(s => ({ logs: [newLog, ...s.logs] }))
  },

  async deleteRFC(id) {
    await supabase.from('rfcs').delete().eq('id', id)
    set(s => ({ rfcs: s.rfcs.filter(r => r.id !== id) }))
  },
}))

// ── Internal log helper ───────────────────────

async function _log(
  projectId: string,
  entityId: string,
  entityType: 'card' | 'rfc',
  action: string,
  actorId?: string,
) {
  if (!projectId) return
  const { data } = await supabase
    .from('activity_logs')
    .insert({ project_id: projectId, entity_id: entityId, entity_type: entityType, action, actor_id: actorId ?? null } as Record<string,unknown>)
    .select()
    .single()
  if (!data) return
  const log = mapLog(data as any)
  useFlowStore.setState(s => ({ logs: [log, ...s.logs].slice(0, 200) }))
}

// ── Selectors (mesma API que antes) ──────────

export const useActiveProject = () =>
  useFlowStore(s => s.activeProjectId)

export const useProjectColumns = (projectId: string, phase: Phase) =>
  useFlowStore(s =>
    s.columns
      .filter(c => c.projectId === projectId && c.phase === phase)
      .sort((a, b) => a.order - b.order)
  )

export const useColumnCards = (columnId: string) =>
  useFlowStore(s =>
    s.cards
      .filter(c => c.columnId === columnId)
      .sort((a, b) => a.order - b.order)
  )

export const useProjectRFCs = (projectId: string) =>
  useFlowStore(s =>
    s.rfcs
      .filter(r => r.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  )

export const useCardRFCs = (cardId: string) =>
  useFlowStore(s => s.rfcs.filter(r => r.cardId === cardId))

export const useRecentLogs = (limit = 50) =>
  useFlowStore(s => s.logs.slice(0, limit))
