// ─────────────────────────────────────────────
// Flow — Seed data (desenvolvimento)
// v1.0.0 — 2026-03-16 (BRT)
// ─────────────────────────────────────────────

import type { FlowState } from '../types'
import { uid } from '../utils'

const p1 = uid()

const discoveryColumns = [
  { id: uid(), projectId: p1, phase: 'discovery' as const, name: 'Ideias',          order: 0 },
  { id: uid(), projectId: p1, phase: 'discovery' as const, name: 'Refinando',       order: 1 },
  { id: uid(), projectId: p1, phase: 'discovery' as const, name: 'Pronto p/ Dev',   order: 2, isDiscoveryExit: true },
]

const deliveryColumns = [
  { id: uid(), projectId: p1, phase: 'delivery' as const, name: 'To Do',       order: 0 },
  { id: uid(), projectId: p1, phase: 'delivery' as const, name: 'In Progress', order: 1, wipLimit: 3 },
  { id: uid(), projectId: p1, phase: 'delivery' as const, name: 'Review',      order: 2 },
  { id: uid(), projectId: p1, phase: 'delivery' as const, name: 'Done',        order: 3 },
]

const allColumns = [...discoveryColumns, ...deliveryColumns]

const c1 = uid(), c2 = uid(), c3 = uid(), c4 = uid()
const rfc1 = uid()

export const seedState: FlowState = {
  activeProjectId: p1,

  projects: [
    {
      id: p1,
      name: 'Flow MVP',
      description: 'Projeto de desenvolvimento do próprio Flow.',
      createdAt: new Date().toISOString(),
    },
  ],

  columns: allColumns,

  cards: [
    {
      id: c1,
      projectId: p1,
      columnId: discoveryColumns[0].id,
      phase: 'discovery',
      title: 'Dark mode',
      description: 'Suporte a tema escuro em toda a aplicação.',
      moscow: 'S',
      risk: 2,
      value: 4,
      order: 0,
      tags: ['ux', 'tema'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: c2,
      projectId: p1,
      columnId: discoveryColumns[1].id,
      phase: 'discovery',
      title: 'Filtros avançados',
      description: 'Filtrar cards por MoSCoW, risco, valor e tags.',
      moscow: 'M',
      risk: 1,
      value: 5,
      order: 0,
      tags: ['busca'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: c3,
      projectId: p1,
      columnId: deliveryColumns[0].id,
      phase: 'delivery',
      title: 'Board Kanban',
      description: 'Drag-and-drop entre colunas de Delivery.',
      moscow: 'M',
      risk: 3,
      value: 5,
      order: 0,
      tags: ['core'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: c4,
      projectId: p1,
      columnId: deliveryColumns[3].id,
      phase: 'delivery',
      title: 'Modelo de dados',
      description: 'Definição das entidades e store Zustand.',
      moscow: 'M',
      risk: 2,
      value: 5,
      order: 0,
      tags: ['core', 'arquitetura'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],

  rfcs: [
    {
      id: rfc1,
      cardId: c4,
      projectId: p1,
      title: 'Deploy modelo de dados v1',
      type: 'Normal',
      status: 'Concluída',
      description: 'Publicação das definições de tipos e store base em produção.',
      rollbackPlan: 'Reverter para schema anterior via git revert.',
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],

  logs: [
    {
      id: uid(),
      entityId: c4,
      entityType: 'card',
      action: 'Card movido para Done',
      timestamp: new Date().toISOString(),
    },
    {
      id: uid(),
      entityId: rfc1,
      entityType: 'rfc',
      action: 'RFC marcada como Concluída',
      timestamp: new Date().toISOString(),
    },
  ],
}
