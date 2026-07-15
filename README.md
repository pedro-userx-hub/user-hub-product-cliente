# User Hub — Product Cliente

Monorepo do produto **User Hub Cliente**. As partes do produto vivem em `apps/` e
o código compartilhado em `packages/`. A documentação do design system fica em
`design-system/`.

## Estrutura

```
user-hub-product-cliente/
├─ apps/
│  └─ cliente/           # @userx/cliente — superfície autenticada (Story 1.1+)
├─ packages/
│  └─ ui/                # @userx/ui — componentes + tokens (incremental)
├─ design-system/        # fonte de verdade de design (tokens, specs, guidelines)
├─ docs/specs/           # especificações por módulo
├─ package.json          # workspaces (npm)
└─ README.md
```

## Design System

- **Docs:** [`design-system/`](design-system/) — fonte de verdade (Figma / specs).
- **Código:** [`packages/ui`](packages/ui) (`@userx/ui`) — implementação incremental;
  apps importam de `@userx/ui` (e `@userx/ui/tokens.css` / `global.css`).

Só entram no pacote componentes com consumidor (story em curso).

## Como rodar

Requer Node 18+. Na raiz do monorepo:

```bash
npm install
npm run dev                 # sobe @userx/cliente (Vite, :5173)
npm run typecheck
```

Workspace direta:

```bash
npm run dev --workspace @userx/cliente
```
