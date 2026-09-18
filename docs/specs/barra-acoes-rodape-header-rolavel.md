# Spec — Barra de ações no rodapé + header rolável

**Status:** Implemented (MVP) · **Autor:** Pedro · **Data:** 2026-09-17 · **Origem:** Brief verbal · **Visão:** Cliente · **Tipo:** Ajuste de layout

---

## Implementação

| Peça | Onde |
|------|------|
| `FooterActionBar` | `packages/ui` — barra de ações no rodapé do shell |
| Wizard (Anterior / Próximo / Lançar) | `CreateStudyPage` — header dentro da área rolável; ações no `FooterActionBar` |
| Builder (Salvar) | `QuestionnaireBuilderStep` — mesmo padrão |

### Layout

```
.page (coluna, height 100%)
  ├── .scroll (flex:1, overflow:auto)     ← header + conteúdo rolam juntos
  │     ├── header.topNav                ← não sticky
  │     └── conteúdo
  └── FooterActionBar (flex-shrink:0)    ← colada ao rodapé da viewport do shell
```

A barra é **irmã** da área rolável (não `position: fixed` sobre o conteúdo), então o conteúdo nunca fica escondido atrás dela e, com conteúdo curto, permanece no rodapé.

Open Question #1 (faixa slim): nesta versão o header some por completo ao rolar.
