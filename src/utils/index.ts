// ─────────────────────────────────────────────
// Flow — Utils
// v1.0.0 — 2026-03-16 (BRT)
// ─────────────────────────────────────────────

export const uid = (): string =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)

export const now = (): string => new Date().toISOString()

/** Prioridade composta: valor alto e risco alto sobem. Range 1–10. */
export const priorityScore = (value: number, risk: number): number =>
  value + risk

/** Label legível para MoSCoW */
export const moscowLabel: Record<string, string> = {
  M: 'Must have',
  S: 'Should have',
  C: 'Could have',
  W: "Won't have",
}

/** Cor semântica para MoSCoW (Tailwind class suffix) */
export const moscowColor: Record<string, string> = {
  M: 'red',
  S: 'amber',
  C: 'blue',
  W: 'gray',
}

/** Cor por status RFC */
export const rfcStatusColor: Record<string, string> = {
  Planejada: 'gray',
  Aprovada: 'blue',
  Executando: 'amber',
  Concluída: 'green',
  Falhou: 'red',
}

/** Formata ISO date para exibição pt-BR */
export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
