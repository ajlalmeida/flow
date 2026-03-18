// ─────────────────────────────────────────────
// Flow — Export / Import Service
// Exporta e importa dados de um projeto via JSON
// ─────────────────────────────────────────────
import { supabase } from '@/lib/supabase'
import { mapColumn, mapCard, mapRFC } from '@/lib/mappers'
import type { Column, Card, RFC } from '@/types'

// ── Formato do arquivo de backup ─────────────

export interface FlowBackup {
  version:    number
  exportedAt: string
  project: {
    id:          string
    name:        string
    description: string
  }
  columns: SerializedColumn[]
  cards:   SerializedCard[]
  rfcs:    SerializedRFC[]
}

interface SerializedColumn {
  id:               string
  phase:            string
  name:             string
  order:            number
  wipLimit?:        number
  isDiscoveryExit?: boolean
}

interface SerializedCard {
  id:          string
  columnId:    string
  phase:       string
  title:       string
  description: string
  moscow:      string
  risk:        number
  value:       number
  order:       number
  tags:        string[]
  createdAt:   string
}

interface SerializedRFC {
  id:           string
  cardId:       string
  title:        string
  type:         string
  status:       string
  description:  string
  rollbackPlan: string
  scheduledAt:  string
  createdAt:    string
}

// ── Export ────────────────────────────────────

export async function exportProject(projectId: string): Promise<FlowBackup> {
  const [projRes, colRes, cardRes, rfcRes] = await Promise.all([
    supabase.from('projects').select('id, name, description').eq('id', projectId).single(),
    supabase.from('columns').select('*').eq('project_id', projectId).order('order'),
    supabase.from('cards').select('*').eq('project_id', projectId).order('order'),
    supabase.from('rfcs').select('*').eq('project_id', projectId).order('created_at'),
  ])

  if (projRes.error) throw new Error(`Erro ao exportar projeto: ${projRes.error.message}`)

  const proj    = projRes.data as { id: string; name: string; description: string }
  const columns = ((colRes.data  ?? []) as any[]).map(mapColumn)
  const cards   = ((cardRes.data ?? []) as any[]).map(mapCard)
  const rfcs    = ((rfcRes.data  ?? []) as any[]).map(mapRFC)

  return {
    version:    1,
    exportedAt: new Date().toISOString(),
    project: {
      id:          proj.id,
      name:        proj.name,
      description: proj.description ?? '',
    },
    columns: columns.map(serializeColumn),
    cards:   cards.map(serializeCard),
    rfcs:    rfcs.map(serializeRFC),
  }
}

export function downloadBackup(backup: FlowBackup): void {
  const json     = JSON.stringify(backup, null, 2)
  const blob     = new Blob([json], { type: 'application/json' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  const filename = `flow-${backup.project.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
  a.href         = url
  a.download     = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Import ────────────────────────────────────

export interface ImportResult {
  columnsImported: number
  cardsImported:   number
  rfcsImported:    number
  errors:          string[]
}

export async function importProject(
  backup: FlowBackup,
  targetProjectId: string,
  mode: 'merge' | 'replace',
): Promise<ImportResult> {
  const result: ImportResult = { columnsImported: 0, cardsImported: 0, rfcsImported: 0, errors: [] }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Valida formato
  if (!backup.version || !backup.project || !Array.isArray(backup.columns)) {
    throw new Error('Arquivo de backup inválido ou incompatível.')
  }

  // ── Replace mode: limpa dados existentes ──
  if (mode === 'replace') {
    await supabase.from('rfcs').delete().eq('project_id', targetProjectId)
    await supabase.from('cards').delete().eq('project_id', targetProjectId)
    await supabase.from('columns').delete().eq('project_id', targetProjectId)
  }

  // ── Importa colunas ──
  // Mapeia IDs antigos → novos para manter FK de cards
  const colIdMap: Record<string, string> = {}

  for (const col of backup.columns) {
    const { data, error } = await supabase
      .from('columns')
      .insert({
        project_id:        targetProjectId,
        phase:             col.phase,
        name:              col.name,
        order:             col.order,
        wip_limit:         col.wipLimit ?? null,
        is_discovery_exit: col.isDiscoveryExit ?? false,
      } as Record<string, unknown>)
      .select('id')
      .single()

    if (error || !data) {
      result.errors.push(`Coluna "${col.name}": ${error?.message ?? 'erro desconhecido'}`)
      continue
    }
    colIdMap[col.id] = (data as { id: string }).id
    result.columnsImported++
  }

  // ── Importa cards ──
  const cardIdMap: Record<string, string> = {}

  for (const card of backup.cards) {
    const targetColId = colIdMap[card.columnId]
    if (!targetColId) {
      result.errors.push(`Card "${card.title}": coluna de destino não encontrada`)
      continue
    }

    const { data, error } = await supabase
      .from('cards')
      .insert({
        project_id:  targetProjectId,
        column_id:   targetColId,
        phase:       card.phase,
        title:       card.title,
        description: card.description,
        moscow:      card.moscow,
        risk:        card.risk,
        value:       card.value,
        order:       card.order,
        tags:        card.tags,
        created_by:  user.id,
      } as Record<string, unknown>)
      .select('id')
      .single()

    if (error || !data) {
      result.errors.push(`Card "${card.title}": ${error?.message ?? 'erro desconhecido'}`)
      continue
    }
    cardIdMap[card.id] = (data as { id: string }).id
    result.cardsImported++
  }

  // ── Importa RFCs ──
  for (const rfc of backup.rfcs) {
    const targetCardId = cardIdMap[rfc.cardId]
    if (!targetCardId) {
      result.errors.push(`RFC "${rfc.title}": card de origem não encontrado`)
      continue
    }

    const { error } = await supabase
      .from('rfcs')
      .insert({
        project_id:   targetProjectId,
        card_id:      targetCardId,
        title:        rfc.title,
        type:         rfc.type,
        status:       rfc.status,
        description:  rfc.description,
        rollback_plan: rfc.rollbackPlan,
        scheduled_at: rfc.scheduledAt,
        created_by:   user.id,
      } as Record<string, unknown>)
      .select('id')
      .single()

    if (error) {
      result.errors.push(`RFC "${rfc.title}": ${error.message}`)
      continue
    }
    result.rfcsImported++
  }

  return result
}

export function parseBackupFile(json: string): FlowBackup {
  const data = JSON.parse(json)
  if (!data.version || !data.project || !Array.isArray(data.columns)) {
    throw new Error('Arquivo inválido: estrutura de backup não reconhecida.')
  }
  return data as FlowBackup
}

// ── Serializers ───────────────────────────────

function serializeColumn(c: Column): SerializedColumn {
  return {
    id:               c.id,
    phase:            c.phase,
    name:             c.name,
    order:            c.order,
    wipLimit:         c.wipLimit,
    isDiscoveryExit:  c.isDiscoveryExit,
  }
}

function serializeCard(c: Card): SerializedCard {
  return {
    id:          c.id,
    columnId:    c.columnId,
    phase:       c.phase,
    title:       c.title,
    description: c.description,
    moscow:      c.moscow,
    risk:        c.risk,
    value:       c.value,
    order:       c.order,
    tags:        c.tags,
    createdAt:   c.createdAt,
  }
}

function serializeRFC(r: RFC): SerializedRFC {
  return {
    id:           r.id,
    cardId:       r.cardId,
    title:        r.title,
    type:         r.type,
    status:       r.status,
    description:  r.description,
    rollbackPlan: r.rollbackPlan,
    scheduledAt:  r.scheduledAt,
    createdAt:    r.createdAt,
  }
}
