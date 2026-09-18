# Spec — Conexão de agenda (Google Agenda / Outlook) na definição de disponibilidade

**Status:** Draft (refinado) · **Autor:** Pedro · **Data:** 16/09/2026 · **Visão:** Cliente (pesquisador)

> Substitui as stories #5/#6 do spec de disponibilidade no fluxo de criação. Implementação mock na drawer do Step 2.

---

## 1. Contexto & Recorte

### Problema
Ao definir disponibilidade, o pesquisador não vê a própria agenda e pode marcar horários já ocupados. A agenda deve **informar** (mostrar “indisponível”), sem **decidir** (override consciente permitido). Nesta versão: conexão e eventos **simulados**.

### Objetivo
Fluxo simples: **Integrar** → escolher provedor → permissões → grade reflete eventos da conta. Depois de integrado, o botão vira **“Integrado: Google Agenda”** (ou Outlook).

### Non-goals
- OAuth / sync reais; gravação real na agenda (escrita só configura intenção); multi-conta simultânea nesta versão (uma integração ativa).

### Premissas
- Uma conta integrada por vez (Google **ou** Outlook).
- Leitura e escrita independentes.
- Override permitido com confirmação.
- Eventos mock **sem título** (privacidade): só horário ocupado/livre.
- Timezone: eventos simulados já no fuso do estudo.

---

## 2. Story Map (MVP)

| # | Story | P |
|---|-------|:-:|
| 1 | Botão Integrar → escolher Google ou Outlook (conexão simulada) | P1 |
| 2 | Permissões: agendas da conta + leitura/escrita + privacidade | P1 |
| 3 | Botão passa a “Integrado: {Provedor}”; reabrir gerencia | P1 |
| 4 | Eventos mock da conta como “Indisponível” na grade | P1 |
| 5 | Override com confirmação + marca “Sobreposto” | P1 |
| 6 | Slots gerados subtraindo ocupado (exceto override) | P1 |
| 7 | Desconectar | P2 |

---

## 3. Fluxo de UX (refinado)

```
[Integrar]
    → Modal passo 1: escolher Google Agenda | Outlook Calendar
    → Conectando… (simulado)
    → Modal passo 2: agendas da conta (checkbox) + Leitura + Escrita + privacidade
    → Aplicar
[Integrado: Google Agenda]  ← botão na drawer
    → Reabre no passo 2 (gerenciar / desconectar)
```

### Copy do botão
| Estado | Rótulo |
|--------|--------|
| Sem integração | `Integrar` |
| Google conectado | `Integrado: Google Agenda` |
| Outlook conectado | `Integrado: Outlook Calendar` |

### Catálogo (PT-BR)
| Contexto | Copy |
|----------|------|
| Privacidade | Usamos apenas seus horários livres/ocupados. O nome e os detalhes dos seus eventos nunca são lidos, exibidos ou armazenados. |
| Leitura | Bloquear automaticamente horários em que eu estiver ocupado. |
| Escrita | Criar a sessão na minha agenda quando alguém agendar. |
| Override | Esse horário tem um compromisso na sua agenda. Marcar disponibilidade mesmo assim? |
| Sem agenda selecionada | Selecione uma agenda para bloquear seus horários ocupados. |

---

## 4. Eventos simulados

Após integrar e ativar **leitura** com ao menos uma agenda marcada, a grade mostra blocos **Indisponível** (hachura cinza, sem título) gerados a partir de padrões realistas daquela conta (ex.: sync de chapter terça 9h–10h, review quinta 14h–15h30, standup diário, etc.). União de várias agendas selecionadas = união dos ocupados.

---

## 5. Grade / semanas (regra transversal)

A navegação **Semana** respeita a janela **Início–Término** do estudo:
- O chip do período mostra a **semana visível** (`DD/MM/AAAA a DD/MM/AAAA`), não a janela inteira do estudo.
- Setas habilitadas enquanto a semana (seg–dom) **intersecta** a janela (ex.: início 16/09 e fim 08/10 → navega até a semana que contém 08/10).

---

## 6. Critérios de aceite (resumo)

**AC1** — Sem integração: botão `Integrar`; clique abre escolha de provedor.  
**AC2** — Após escolher provedor e aplicar permissões: botão `Integrado: Google Agenda` (ou Outlook).  
**AC3** — Com leitura + agenda: grade mostra indisponíveis mock da conta, sem título de evento.  
**AC4** — Pintar sobre indisponível pede confirmação; confirmar marca Sobreposto e gera slot.  
**AC5** — Semanas: com início=hoje e fim=08/10, é possível avançar semana a semana até cobrir 08/10; o rótulo reflete a semana atual.

---

## 7. Arquivos

- `apps/cliente/src/lib/availabilityCalendar.ts`
- `apps/cliente/src/features/estudos/CalendarConnectionModal.tsx`
- `apps/cliente/src/features/estudos/AvailabilityGridDrawer.tsx`
- `apps/cliente/src/lib/availabilityGrid.ts` (`weekIntersectsStudyWindow`)
