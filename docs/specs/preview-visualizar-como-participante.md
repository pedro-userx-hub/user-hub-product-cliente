# Spec — Preview "Visualizar como participante"

**Status:** Implemented (MVP) · **Autor:** Pedro · **Data:** 16/09/2026 · **Visão:** Cliente (pesquisador)

Preview sob demanda da jornada do participante na criação do estudo (Step 2). Confirmação é **simulada** — não cria reserva.

## Stories MVP (#1–#4)

| # | Story | Status |
|---|-------|--------|
| 1 | Abrir preview (drawer + resumo Step 2) + alerta de origem | ✓ |
| 2 | Calendário + horários do dia (= slots gerados) | ✓ |
| 3 | Selecionar e confirmar (simulado) | ✓ |
| 4 | Agradecimento + infos do estudo + nota de preview | ✓ |

## Entry points

1. **Seção de disponibilidade (Step 2)** — botão clear com ícone de olho, habilitado quando há slots gerados.
2. **Drawer de disponibilidade** — mesmo botão no footer (drawer aninhada).

Sem slots: botão desabilitado + hint *"Defina a disponibilidade para pré-visualizar como o participante."*

## Fluxo

Calendário mensal (dias com slots destacados) → lista de horários do dia → Confirmar → tela de agradecimento (nome, data/horário, duração, formato se houver) + nota de que nada foi agendado.

## Arquivos

- `apps/cliente/src/features/estudos/ParticipantPreviewDrawer.tsx`
- `AvailabilitySummaryBlock.tsx` / `AvailabilityGridDrawer.tsx` (entry points)
- `apps/cliente/src/lib/messages.ts` (`estudosPreview*`)
