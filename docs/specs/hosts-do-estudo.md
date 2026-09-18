# Spec — Hosts do Estudo (colaboração na criação do estudo)

**Status:** Implemented (MVP UI) · **Autor:** Pedro · **Data:** 2026-09-17 · **Visão:** Cliente

## Implementação

| Story | Superfície |
|-------|------------|
| #1 Criador = principal | `ensureHostsWithPrincipal` + auto-persist no Passo 1 |
| #2 Adicionar da lista | Modal em `StudyHostsSection` + `listStudyOwnerCandidates` |
| #3 Convidar por link | Modal gera link + host `pending` (mock) |
| #4 Reatribuir principal | Select Função → Principal (radio) |
| #5 Canal do principal | Toggle + chips Slack/Teams/WhatsApp (só se logado = principal) |
| #6 Avatar stack | P2 — não implementado |

**Arquivos:** `StudyHostsSection.tsx`, `lib/studyHosts.ts`, `TeamStudy.hosts`, messages `estudosHosts*`.

Substitui a seção “Responsável e contato” no Passo 1 (`StudyStep1Form`). Mantém sync legado `ownerId` / `contactChannel` / `contactValue` a partir do principal.
