// ─────────────────────────────────────────────
// Flow — Store (Zustand + persist)
// v1.0.0 — 2026-03-16 (BRT)
// ─────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  FlowState,
  Project,
  Column,
  Card,
  RFC,
  ActivityLog,
  Phase,
  MoSCoW,
  RFCType,
  RFCStatus,
} from '../types'
import { uid, now } from '../utils'
import { seedState } from './seed'

// ── Action types ─────────────────────────────

interface FlowActions {
  // Project
  addProject: (name: string, description?: string) => string
  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'description'>>) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string) => void

  // Column
  addColumn: (projectId: string, phase: Phase, name: string, wipLimit?: number) => string
  updateColumn: (id: string, patch: Partial<Pick<Column, 'name' | 'wipLimit' | 'isDiscoveryExit'>>) => void
  reorderColumns: (projectId: string, phase: Phase, orderedIds: string[]) => void
  deleteColumn: (id: string) => void

  // Card
  addCard: (
    projectId: string,
    columnId: string,
    phase: Phase,
    title: string,
    opts?: Partial<Pick<Card, 'description' | 'moscow' | 'risk' | 'value' | 'tags'>>
  ) => string
  updateCard: (id: string, patch: Partial<Omit<Card, 'id' | 'projectId' | 'createdAt'>>) => void
  moveCard: (id: string, targetColumnId: string, targetOrder: number) => void
  promoteToDelivery: (cardId: string, targetColumnId: string) => void
  deleteCard: (id: string) => void
  reorderCards: (columnId: string, orderedIds: string[]) => void

  // RFC
  addRFC: (
    cardId: string,
    projectId: string,
    title: string,
    type: RFCType,
    scheduledAt: string,
    opts?: Partial<Pick<RFC, 'description' | 'rollbackPlan'>>
  ) => string
  updateRFC: (id: string, patch: Partial<Omit<RFC, 'id' | 'cardId' | 'projectId' | 'createdAt'>>) => void
  setRFCStatus: (id: string, status: RFCStatus) => void
  deleteRFC: (id: string) => void

  // Misc
  exportData: () => string
  importData: (json: string) => void
  resetToSeed: () => void

   // Internal
  _log: (entityId: string, entityType: 'card' | 'rfc', action: string) => void
}

// ── Store ────────────────────────────────────

export const useFlowStore = create<FlowState & FlowActions>()(
  persist(
    (set, get) => ({
      // ── Initial state ──
      ...seedState,

      // ── Project actions ──

      addProject(name, description = '') {
        const id = uid()
        set(s => ({
          projects: [...s.projects, { id, name, description, createdAt: now() }],
        }))
        return id
      },

      updateProject(id, patch) {
        set(s => ({
          projects: s.projects.map(p => (p.id === id ? { ...p, ...patch } : p)),
        }))
      },

      deleteProject(id) {
        set(s => ({
          projects: s.projects.filter(p => p.id !== id),
          columns: s.columns.filter(c => c.projectId !== id),
          cards: s.cards.filter(c => c.projectId !== id),
          rfcs: s.rfcs.filter(r => r.projectId !== id),
          activeProjectId: s.activeProjectId === id
            ? (s.projects.find(p => p.id !== id)?.id ?? null)
            : s.activeProjectId,
        }))
      },

      setActiveProject(id) {
        set({ activeProjectId: id })
      },

      // ── Column actions ──

      addColumn(projectId, phase, name, wipLimit) {
        const id = uid()
        const order = get().columns.filter(
          c => c.projectId === projectId && c.phase === phase
        ).length
        set(s => ({
          columns: [...s.columns, { id, projectId, phase, name, order, wipLimit }],
        }))
        return id
      },

      updateColumn(id, patch) {
        set(s => ({
          columns: s.columns.map(c => (c.id === id ? { ...c, ...patch } : c)),
        }))
      },

      reorderColumns(projectId, phase, orderedIds) {
        set(s => ({
          columns: s.columns.map(c => {
            if (c.projectId !== projectId || c.phase !== phase) return c
            const idx = orderedIds.indexOf(c.id)
            return idx === -1 ? c : { ...c, order: idx }
          }),
        }))
      },

      deleteColumn(id) {
        set(s => ({
          columns: s.columns.filter(c => c.id !== id),
          cards: s.cards.filter(c => c.columnId !== id),
        }))
      },

      // ── Card actions ──

      addCard(projectId, columnId, phase, title, opts = {}) {
        const id = uid()
        const order = get().cards.filter(c => c.columnId === columnId).length
        const card: Card = {
          id,
          projectId,
          columnId,
          phase,
          title,
          description: opts.description ?? '',
          moscow: opts.moscow ?? 'S',
          risk: opts.risk ?? 3,
          value: opts.value ?? 3,
          order,
          tags: opts.tags ?? [],
          createdAt: now(),
          updatedAt: now(),
        }
        set(s => ({ cards: [...s.cards, card] }))
        get()._log(id, 'card', `Card "${title}" criado`)
        return id
      },

      updateCard(id, patch) {
        set(s => ({
          cards: s.cards.map(c =>
            c.id === id ? { ...c, ...patch, updatedAt: now() } : c
          ),
        }))
        get()._log(id, 'card', 'Card atualizado')
      },

      moveCard(id, targetColumnId, targetOrder) {
        const targetCol = get().columns.find(c => c.id === targetColumnId)
        if (!targetCol) return
        set(s => ({
          cards: s.cards.map(c =>
            c.id === id
              ? { ...c, columnId: targetColumnId, order: targetOrder, updatedAt: now() }
              : c
          ),
        }))
        get()._log(id, 'card', `Card movido para "${targetCol.name}"`)
      },

      promoteToDelivery(cardId, targetColumnId) {
        set(s => ({
          cards: s.cards.map(c =>
            c.id === cardId
              ? { ...c, phase: 'delivery', columnId: targetColumnId, updatedAt: now() }
              : c
          ),
        }))
        get()._log(cardId, 'card', 'Card promovido para Delivery')
      },

      deleteCard(id) {
        set(s => ({
          cards: s.cards.filter(c => c.id !== id),
          rfcs: s.rfcs.filter(r => r.cardId !== id),
        }))
      },

      reorderCards(columnId, orderedIds) {
        set(s => ({
          cards: s.cards.map(c => {
            if (c.columnId !== columnId) return c
            const idx = orderedIds.indexOf(c.id)
            return idx === -1 ? c : { ...c, order: idx }
          }),
        }))
      },

      // ── RFC actions ──

      addRFC(cardId, projectId, title, type, scheduledAt, opts = {}) {
        const id = uid()
        const rfc: RFC = {
          id,
          cardId,
          projectId,
          title,
          type,
          status: 'Planejada',
          description: opts.description ?? '',
          rollbackPlan: opts.rollbackPlan ?? '',
          scheduledAt,
          createdAt: now(),
          updatedAt: now(),
        }
        set(s => ({ rfcs: [...s.rfcs, rfc] }))
        get()._log(id, 'rfc', `RFC "${title}" criada`)
        return id
      },

      updateRFC(id, patch) {
        set(s => ({
          rfcs: s.rfcs.map(r =>
            r.id === id ? { ...r, ...patch, updatedAt: now() } : r
          ),
        }))
        get()._log(id, 'rfc', 'RFC atualizada')
      },

      setRFCStatus(id, status) {
        set(s => ({
          rfcs: s.rfcs.map(r =>
            r.id === id ? { ...r, status, updatedAt: now() } : r
          ),
        }))
        get()._log(id, 'rfc', `RFC → ${status}`)
      },

      deleteRFC(id) {
        set(s => ({ rfcs: s.rfcs.filter(r => r.id !== id) }))
      },

      // ── Import / Export ──

      exportData() {
        const { projects, columns, cards, rfcs, logs, activeProjectId } = get()
        return JSON.stringify({ projects, columns, cards, rfcs, logs, activeProjectId }, null, 2)
      },

      importData(json) {
        try {
          const data = JSON.parse(json) as Partial<FlowState>
          set({
            projects: data.projects ?? [],
            columns: data.columns ?? [],
            cards: data.cards ?? [],
            rfcs: data.rfcs ?? [],
            logs: data.logs ?? [],
            activeProjectId: data.activeProjectId ?? null,
          })
        } catch {
          console.error('[Flow] importData: JSON inválido')
        }
      },

      resetToSeed() {
        set(seedState)
      },

      // ── Internal log helper (not exposed on type) ──
      _log(entityId: string, entityType: 'card' | 'rfc', action: string) {
        const entry: ActivityLog = {
          id: uid(),
          entityId,
          entityType,
          action,
          timestamp: now(),
        }
        set(s => ({ logs: [entry, ...s.logs].slice(0, 500) }))
      },
    } as FlowState & FlowActions & { _log: (entityId: string, entityType: 'card' | 'rfc', action: string) => void }),
    {
      name: 'flow-storage',
      version: 1,
    }
  )
)

// ── Selectors ────────────────────────────────

export const useActiveProject = () =>
  useFlowStore(s => s.projects.find(p => p.id === s.activeProjectId) ?? null)

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
