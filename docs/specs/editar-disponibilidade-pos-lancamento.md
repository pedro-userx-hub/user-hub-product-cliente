# Spec — Editar disponibilidade (pós-lançamento do estudo)

**Status:** Implemented (MVP UI) · **Autor:** Pedro · **Data:** 16/09/2026 · **Origem:** discovery + telas exploratórias · **Visão:** Cliente (pesquisador)

> **Relação com os outros specs da série:**
> - A **geração de slots** (`duração + intervalo`) e a lógica de override vêm do *Spec — Disponibilidade do estudo (fluxo de criação)* e do *Spec — Conexão de agenda*.
> - A **drawer de edição é a mesma da criação** — este spec descreve o que muda quando ela é aberta depois do lançamento (existem sessões agendadas e elas são protegidas).
> - Os **guard-rails de conflito** (sessão agendada nunca cai; colisão vira alerta resolvido na agenda do pesquisador) foram definidos no início da discovery e são detalhados aqui.

---

## Implementação (código)

| Story | Superfície |
|-------|------------|
| #1 Ver calendário pós-lançamento | `StudyAvailabilityView` — disponíveis, sessões, indisponível, conflitos |
| #2 Editar na mesma drawer | `AvailabilityGridDrawer` `mode="edit"` |
| #3 Adicionar/remover livre | pintura date-specific + erase filtrado |
| #4 Proteger sessões | `bookedSessions` + `filterErasableCells` + blocos protegidos |
| #5 Conflitos | destaque na grade + `AlertCard` FYI + “Abrir na minha agenda” |
| #6 Salvar com resumo | `ConfirmDialog` de diff + `updateStudyAvailability` |

**Nota:** faixas de disponibilidade passam a ser **por data** (`StudyScheduleSlot.date`). Pintura não propaga para outras semanas; “Repetir” copia só para os dias escolhidos na semana visível.

---

## Stories #1–#6

Ver corpo completo no pedido de produto (ACs, edge cases, catálogo de mensagens). Copy PT-BR está em `apps/cliente/src/lib/messages.ts` (`estudosAvailabilityEdit*`, `estudosAvailabilityProtected*`, `estudosAvailabilityConflict*`, `estudosAvailabilitySave*`).
