# Flow

> Gerenciador de backlog e mudanças com pipeline Discovery → Delivery → GMud.

![Deploy](https://github.com/<SEU_USUARIO>/flow/actions/workflows/deploy.yml/badge.svg)

## ✨ Funcionalidades

- **Backlog** — grid de cards por coluna Discovery, filtros por tag e busca por título
- **Board** — Kanban com drag-and-drop, WIP limit, botão de RFC na coluna Done
- **GMud** — gerenciamento de RFCs vinculadas a cards, workflow de status completo
- **MoSCoW** — priorização Must / Should / Could / Won't
- **Risk & Value** — score visual por pontos (1–5)
- **Múltiplos projetos** — seletor no topo
- **Persistência local** — localStorage via Zustand persist
- **Dark mode** — automático via `prefers-color-scheme`

## 🚀 Setup local

```bash
git clone https://github.com/<SEU_USUARIO>/flow.git
cd flow
npm install
npm run dev
```

Acesse: http://localhost:5173

## 🏗️ Build

```bash
npm run build
npm run preview
```

## 📦 Stack

| Camada      | Tecnologia                |
|-------------|---------------------------|
| UI          | React 18 + TypeScript     |
| Build       | Vite 5                    |
| Estado      | Zustand 4 + persist       |
| Drag & Drop | @dnd-kit/core + sortable  |
| Deploy      | GitHub Pages (Actions CI) |

## 🗂️ Estrutura

```
src/
├── types/        # Interfaces TypeScript
├── store/        # Zustand store + seed
├── utils/        # Helpers
└── components/
    ├── ui/       # Badge, SlidePanel, RiskValue
    ├── backlog/  # BacklogView, CardForm, PromoteModal
    └── board/    # BoardView, KanbanColumn, KanbanCard, RFCForm
```

## 📄 Licença

MIT
