# Spec as-built — Features trabalhadas (criação + operação do estudo)

**Status:** As-built (código atual)  
**Autor:** Pedro  
**Atualizado:** 18/09/2026  
**Visão:** Cliente (pesquisador / CX)  
**Escopo:** Documentar regras e funcionamento das features abaixo, alinhadas ao que está no código.

| Feature | Superfície principal |
|---------|----------------------|
| Equipe do estudo | Passo 1 criação + header |
| Disponibilidade | Passo 2 criação |
| Edição de disponibilidade | Pós-lançamento (detalhe do estudo) |
| Integração Google / Outlook | Drawer de disponibilidade |
| Participantes (tabela CX) | Tab Participantes |
| Visão do cliente | Drawer na tab Participantes |
| Config presencial | Passo 2 — formato das sessões |

---

## 0. Princípios transversais

- UI em PT-BR; nomenclatura canônica: Workspace, Time, Membro, Função, Estudo.
- Componentes de UI em `packages/ui`; tokens via CSS variables.
- Mock no front onde a API real ainda não existe (agenda, hosts invite, tabela CX).
- Enforcement de permissão no backend (quando existir); o front só oculta superfícies.

---

## 1. Equipe do estudo (Hosts)

### 1.1 Objetivo
Substituir “Responsável e contato” por uma **equipe** colaborativa no estudo: vários membros, um responsável principal e canal de contato.

### 1.2 Modelo de dados
Cada host:

| Campo | Regra |
|-------|--------|
| `id` | Identificador local |
| `memberId` / `email` / `name` | Identidade |
| `status` | `active` \| `pending` |
| `origin` | `member` (workspace) \| `guest` (link) |
| `isPrincipal` | Exatamente **um** principal ativo |
| `contactChannel` / `contactValue` | Só relevantes no principal |

Sync legado: `ownerId`, `owners`, `contactChannel`, `contactValue` derivados do principal (`hostsToOwnerPatch`).

### 1.3 Regras invioláveis
1. Sempre ≥ 1 responsável principal **ativo**.
2. Não é possível remover o último principal (bloqueio + toast).
3. Pendente **não** pode virar principal.
4. Criador do estudo vira principal automático na 1ª carga se a lista estiver vazia.
5. Tags na lista: só **Responsável principal**, **Convidado** (link) e **Aguardando aceite**. Demais membros sem badge “Host”.

### 1.4 Superfícies

#### Seção Passo 1 — “Equipe do estudo”
- Subtítulo: equipe acompanha sessões e recebe atualizações.
- Cards com borda; à direita: tag (se houver) + menu ⋮.
- Menu **não-principal**: Tornar responsável principal · Deletar.
- Menu **principal**: só Deletar (se houver outro ativo).
- Badge principal: “Responsável principal” + `(i)` com tooltip.
- Hint se só o principal: “Adicione outras pessoas para colaborar no estudo.”
- CTA: **Adicionar membros**.
- Canal (só se o usuário logado é o principal): toggle **Definir canal de contato**; helper “Por padrão, falamos por e-mail.”; chips Slack / Teams / WhatsApp; WhatsApp exige número.

#### Header da criação
- Avatar stack à direita: principal primeiro, anel de superfície, overflow `+N`, botão `+`.
- Hover: nome (title nativo).
- `+` / Adicionar abre o mesmo drawer.

#### Drawer — “Adicionar membros”
- Topo: card horizontal **Na equipe (N)** + stack read-only (sem clique de gestão).
- Abaixo: busca + CheckCardList só de **candidatos ainda não na equipe**.
- Se todos do workspace já estão na equipe: empty state + CTA **Convidar por link** (ícone).
- Footer: Convidar por link (quando há candidatos) · Cancelar · **Adicionar (N)**.
- Convite por link: gera host `pending` + copia URL mock `/convite/host/{token}`.

### 1.5 Arquivos
`StudyHostsSection.tsx`, `StudyHostsDrawer.tsx`, `StudyHostsAvatarStack.tsx`, `lib/studyHosts.ts`, `CreateStudyPage.tsx`, `StudyStep1Form.tsx`, messages `estudosHosts*`.

### 1.6 Spec detalhado relacionado
`docs/specs/hosts-do-estudo.md` (parcialmente desatualizado vs. drawer/stack atuais — este as-built prevalece).

---

## 2. Disponibilidade (fluxo de criação — Passo 2)

### 2.1 Objetivo
Definir horários em que o estudo aceita sessões; esses horários viram slots agendáveis para participantes.

### 2.2 Pré-requisitos e antecedência
- Período das sessões (`scheduleStart` / `scheduleEnd`) preenchido.
- **Início** não pode ser fim de semana.
- **Início** exige ≥ **3 dias úteis** de folga desde a data da solicitação (hoje). Contagem: dias úteis em `(hoje, início]`.
- Com folga suficiente: sessões começam **na data escolhida** — sem buffer interno na grade.
- Com folga insuficiente: a data de início é **bloqueada** no calendário (não se aplica mais trava fixa dos 3 primeiros dias da janela).
- Duração da sessão e intervalo entre sessões definidos.
- Sem isso: CTA de disponibilidade desabilitado + hint.

### 2.3 Superfície resumida (`AvailabilitySummaryBlock` + cronograma)
- Campo: **Período das sessões** (antes “Período do estudo”).
- Helper: explica antecedência de 3 dias úteis e que, com folga, não há buffer extra.
- Timeline sob o campo: Período selecionado · Setup e recrutamento · Início das sessões · Término das sessões.
- Título disponibilidade: **Disponibilidade de horários**.
- Subtítulo: *Defina os horários disponíveis para as sessões. A equipe do estudo pode alterar ao longo do estudo.*
- Vazio: botão secondary **Definir disponibilidade** (ícone de agenda).
- Preenchido: métricas (qtd horários, duração, intervalo) + lista por dia; ações **Visualizar como participante** e **Editar disponibilidade**.

### 2.4 Drawer de definição (`AvailabilityGridDrawer`)
- Views: Semana / Mês / Dia.
- Filtro dias úteis / todos.
- Grade operacional: tipicamente **7h–19h**, slots de **30 min**.
- **Setup/recrutamento na grade:** só trava dias dentro da janela quando a folga até o início for **&lt; 3 dias úteis** (legado). Com folga ≥ 3, nenhum dia da janela é bloqueado por setup.
- Pintura de faixas **por data** (não propaga sozinha para outras semanas).
- “Repetir” / chips de dias: copia só para dias escolhidos na **semana visível**.
- Bandas legadas só por weekday → materializadas em datas ao abrir (`materializeLegacyBands`).
- Confirma → gera `StudyScheduleSlot[]` (com `date`) a partir de duração + intervalo.
- Integração de agenda (ver §4) e preview participante (ver §6.2).

### 2.5 Regras de geração de slots
- Slot = janela contínua pintada fatiada por `sessionDurationMin` + `sessionGapMin`.
- Ocupado da agenda (com leitura ativa) é subtraído, salvo override consciente (`filterSlotsByBusy`).
- Zero slots livres → warning (criação ou pós-edição).
- Navegação de semana: setas só enquanto a semana **intersecta** a janela Início–Término (`weekIntersectsStudyWindow`).

### 2.6 Arquivos
`AvailabilitySummaryBlock.tsx`, `AvailabilityGridDrawer.tsx`, `AvailabilityBlockPopover.tsx`, `lib/availabilityGrid.ts`, messages `estudosAvailability*`.

---

## 3. Edição de disponibilidade (pós-lançamento)

### 3.1 Objetivo
Ajustar disponibilidade depois do lançamento **sem quebrar sessões já agendadas**.

### 3.2 Superfície (`StudyAvailabilityView`)
Calendário semanal pós-lançamento com estados:

| Estado | Significado |
|--------|-------------|
| Disponível | Slot livre |
| Sessão agendada | Reserva existente (protegida) |
| Indisponível (agenda) | Evento da integração |
| Conflito | Sessão × compromisso na agenda do pesquisador |

Ações: Editar disponibilidade · Abrir na minha agenda (conflitos) · chips Google/Outlook.

### 3.3 Mesma drawer, modo edição
- `AvailabilityGridDrawer` com `mode="edit"`.
- Pode adicionar/remover faixas livres.
- **Sessões agendadas são protegidas**: `bookedSessions` + `filterErasableCells`; erase não remove células com reserva; UI marca “Protegida” + toast se tentar.
- Salvar → modal de resumo do diff (`diffAvailabilityEdit`: adicionados / removidos / livres / sessões) → `updateStudyAvailability` (RBAC: Dono/Admin/Editor no escopo do time; Observador forbidden).
- Demo: primeiros slots livres podem aparecer como “agendados” para simular pós-lanço.

### 3.4 Guard-rails
1. Sessão agendada nunca “cai” por edição de disponibilidade.
2. Conflito agenda × sessão = alerta FYI; resolução na agenda do pesquisador.
3. Pintura date-specific (igual criação).

### 3.5 Arquivos
`StudyAvailabilityView.tsx`, `AvailabilityGridDrawer.tsx` (`mode="edit"`), `lib/availabilityGrid.ts` (`diffAvailabilityEdit`, `filterErasableCells`), spec `editar-disponibilidade-pos-lancamento.md`.

---

## 4. Integração Google Agenda / Outlook

### 4.1 Objetivo
Mostrar ocupados da agenda do pesquisador na grade. A agenda **informa**, não **decide** — override consciente é permitido.

### 4.2 Non-goals (MVP atual)
- OAuth / sync reais (conexão **simulada**).
- Multi-conta simultânea (uma integração ativa: Google **ou** Outlook).
- Escrita real na agenda (toggle só registra intenção).

### 4.3 Fluxo
```
Integrar
  → escolher Google Agenda | Outlook Calendar
  → Conectando… (mock, falha rara simulada)
  → permissões: agendas da conta + Leitura + Escrita + aviso de privacidade
  → Aplicar
Integrado: {Provedor}
  → reabre gestão / Desconectar
```

### 4.4 Regras
| Tema | Regra |
|------|--------|
| Leitura ON + ≥1 agenda | Blocos **Indisponível** na grade (sem título de evento — `BusyBlock`) |
| União de agendas | União dos intervalos ocupados |
| Pintar sobre ocupado | Confirmação → marca **Sobreposto** e gera slot |
| Aplicar permissões | Desabilitado se leitura ON e nenhuma agenda marcada |
| Privacidade copy | Só livre/ocupado; detalhes do evento nunca lidos/exibidos |
| Conexão | Mock (~6% falha simulada) + retry; Desconectar limpa integração e **mantém** pintura |
| Semanas | Chip mostra semana visível; setas enquanto intersecta janela do estudo |

### 4.5 Entry points
- Botão **Integrar** / **Integrado: …** na toolbar da drawer de disponibilidade.
- Estado compartilhado com o resumo do Passo 2 (`CalendarIntegrationState` no bloco).

### 4.6 Arquivos
`CalendarConnectionModal.tsx`, `lib/availabilityCalendar.ts`, `AvailabilityGridDrawer.tsx`, spec `conexao-agenda-disponibilidade.md`.

---

## 5. Participantes — tabela CX (resize, colunas, paste, etc.)

### 5.1 Objetivo
Operação CX na tabela pós-screening: editar, colar em massa, redimensionar, criar/gerir colunas custom, com feedback e Desfazer.

### 5.2 Escopo de edição
- Só **colunas custom** (`c:…`) aceitam seleção / paste / limpar.
- Colunas de sistema / screener: menu parcial (mover, fixar, ocultar, destacar…), sem colar/limpar/excluir.

### 5.3 Seleção e edição
| Interação | Efeito |
|-----------|--------|
| Clique célula | Seleciona |
| Arraste | Seleção retangular (custom visíveis) |
| Clique/arraste cabeçalho custom | Seleciona coluna |
| Duplo clique multi-seleção | Limpa seleção |
| Duplo clique célula única | Abre edição |
| Enter / blur | Commit |
| Esc | Cancela edição / limpa seleção |

Tipos no modelo: texto, número, data, seleção. UI de “Nova coluna” cria **texto** nesta versão.

### 5.4 Colar em massa
- Ctrl+V em seleção ou coluna; botão Colar (empty / menu).
- Um valor por linha; 1ª coluna do Excel; multi-coluna → rejeitado.
- 1 valor + N células → replica.
- Excesso de linhas → parcial + toast.
- Incompatível → modal “só compatíveis”.
- Células preenchidas → modal “substituir?”.

### 5.5 Limpar × Apagar × Excluir
| Ação | Mantém coluna? | Desfazer? |
|------|----------------|-----------|
| Limpar dados (menu coluna) | Sim | Sim (toast) |
| Apagar seleção (Delete) | Sim | Sim |
| Excluir coluna | Não | Não |

Limpar desabilitado se coluna vazia.

### 5.6 Resize
- Divisória no cabeçalho: `col-resize`, hit area ampliada.
- Largura **96–480px**.
- Duplo clique na divisória → autofit.
- Preferência local do grid (sem API compartilhada).

### 5.7 Criar / gerir colunas
- Dropdown **Colunas**: visibilidade + Restaurar / Aplicar; **+** = Nova coluna.
- Também: `+` no fim da tabela; “Adicionar à esquerda/direita” no menu.
- Menu ⋮ ≡ clique direito (cabeçalho ou célula); Shift+F10; coluna em cinza enquanto menu aberto.

### 5.8 Toasts
- Sucesso ~5s (~8s com Desfazer); erro até dismiss; stack ≤3.
- Desfazer = snapshot da última ação de massa (colar/limpar). Sem Ctrl+Z multi-nível.

### 5.9 Arquivos
`ParticipantsAnswersGrid.tsx`, `ParticipantCustomCell.tsx`, `StudyParticipantsPanel.tsx`, `ParticipantColumnPanel.tsx`, `ParticipantColumnCreator.tsx`, `lib/participantCustomTable.ts`, spec `participantes-tabela-cx.md`.

---

## 6. Visão do cliente (+ preview participante)

Há **duas** superfícies distintas:

### 6.1 Visão do cliente (tabela CX → o que o cliente final vê)
**Onde:** tab Participantes · `ParticipantClientVisionDrawer`.

**Função:** configurar quais campos/perguntas o cliente vê, ordem e reveal de PII.

| Controle | Regra |
|----------|--------|
| Checkboxes de colunas/perguntas | Define `visibleIds` |
| Drag-and-drop | Define `questionOrder` |
| Reveal nome / e-mail / telefone | Só se `canRevealPersonal`; salva flags de PII |
| Busca | Filtra lista no drawer |
| Confirmar | Toast: configuração salva |

**Gap:** não há preview realtime da tabela “como o cliente vê” (Story 7 do spec CX).

### 6.2 Visualizar como participante (jornada de agendamento)
**Onde:** Passo 2 disponibilidade · `ParticipantPreviewDrawer` (implementado como **Modal**, apesar do nome).

**Função:** preview sob demanda da jornada do participante ao escolher horário.

| Passo | Comportamento |
|-------|----------------|
| Entry | Botão olho no resumo ou footer da drawer; disabled sem slots + hint |
| Calendário | Mês com dias que têm slots (janela do estudo) |
| Lista | Horários do dia (`listAvailableSessionSlots` + filtro de busy) |
| Confirmar | **Simulado** — não cria reserva |
| Agradecimento | Nome, data/hora, duração, formato + nota de preview |
| Reabrir | Reset para estado `pick` |

Spec: `preview-visualizar-como-participante.md`.

---

## 7. Ajuste da config do presencial

### 7.1 Objetivo
No Passo 2, definir **formato** das sessões e, se presencial/híbrido, **onde** acontece.

### 7.2 Formatos
| Formato | Campos |
|---------|--------|
| Presencial | Só bloco de local |
| Remoto | Plataforma + link |
| Híbrido | Abas presencial / remoto |

Troca de formato com dados preenchidos → confirmação; **preserva** dados do lado presencial quando aplicável; limpa só o que sobra do lado remoto (conforme implementação).

### 7.3 Local presencial (`inPersonLocationType`)
| Opção | UI |
|-------|-----|
| Espaço UserX (`userx_office`) | Alert de custo/logística |
| Espaço da empresa (`client_office`) | Lista de endereços + CRUD |
| Casa do participante (`participant_home`) | Alert de custo/logística |

### 7.4 Regras de escritório do cliente
1. Trocar tipo de local **desvincula** `addressId` (não apaga o cadastro do escritório).
2. Validação ao avançar: local obrigatório se presencial/híbrido; se `client_office`, endereço obrigatório e válido.
3. Escritório compartilhado entre estudos: aviso ao editar.
4. CEP mock / preenchimento manual cidade-estado se não achar.
5. Discard de edição suja → modal “Descartar alterações?”.

### 7.5 Validação ao avançar (`validate()`)
1. Formato obrigatório.
2. Presencial/híbrido: tipo de local obrigatório; se `client_office`, endereço obrigatório e existente na lista.
3. Remoto/híbrido: plataforma + link `http(s)` não vazio.
4. Foco no primeiro controle inválido.

### 7.6 Remoto
- Plataforma (Zoom / Meet / Teams / Other) + link (Input).

### 7.7 Arquivos
`SessionFormatSection.tsx`, `ClientOfficeList.tsx`, `ClientOfficeDrawer.tsx`, `StudyStep2Form.tsx`, `teamApi` (tipos + mock addresses), messages `estudosFormat*` / `estudosInPerson*` / `estudosOffice*`.

> Sem spec dedicado em `docs/specs/` além deste as-built (comportamento comentado no código como “spec 11/09/2026”).

---

## 8. Matriz rápida de estados

| Feature | Loading | Vazio | Erro | Sem permissão |
|---------|---------|-------|------|----------------|
| Equipe | Skeleton stack no drawer se hosts vazios | N/A (sempre ≥1 principal) | Toast add/invite | Observador não edita (front a reforçar) |
| Disponibilidade | — | CTA + hint pré-req | — | Idem |
| Edição pós-lanço | Load calendário | Sem slots livres (warn) | Save concurrency toast | Idem |
| Agenda | Conectando… | Sem integração = Integrar | Falha mock + retry | — |
| Tabela CX | Skeleton/lista | Empty coluna + Colar | Toasts | View-only não feito |
| Visão cliente | — | Lista vazia filtrada | — | Reveal PII gated |
| Presencial | Load offices | Empty + Novo endereço | Load/save office | — |

---

## 9. Fora de escopo / gaps conscientes

- OAuth real Google/Outlook e sync contínuo (conexão mock).
- Persistência real da tabela CX, offices e hosts invite (`sessionStorage` / in-memory).
- Preview realtime da visão do cliente na tabela (Story 7 do spec CX).
- CX view-only / `canManageColumns` rigoroso no front.
- Seletor de tipo na UI de nova coluna (modelo suporta number/date/select; UI cria sempre **texto**).
- Undo multi-nível / Ctrl+Z global (só Desfazer da última ação de massa).
- `hosts-do-estudo.md` desatualizado: ainda fala em modal e stack P2 — **código já tem drawer + stack**.
- Mobile.

---

## 10. Índice de specs por feature

| Feature | Spec canônico |
|---------|----------------|
| Equipe do estudo | Este doc §1 (+ `hosts-do-estudo.md`) |
| Disponibilidade criação | Este doc §2 |
| Edição pós-lançamento | `editar-disponibilidade-pos-lancamento.md` |
| Google / Outlook | `conexao-agenda-disponibilidade.md` |
| Tabela participantes | `participantes-tabela-cx.md` |
| Preview participante | `preview-visualizar-como-participante.md` |
| Visão do cliente (config) | `participantes-tabela-cx.md` §3.9 + este doc §6.1 |
| Presencial | Este doc §7 (código `SessionFormatSection`) |
