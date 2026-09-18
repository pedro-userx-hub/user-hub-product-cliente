# Spec as-built — Tabela de participantes (CX)

**Status:** Implementado (código atual)  
**Escopo:** Tela operacional de participantes pós-screening  
**Autor:** Pedro  
**Atualizado:** 16/09/2026  
**Rota de teste:** `/estudos/s-pesquisa-novo-fluxo?tab=participantes&sub=todos`  
**Origem:** Teste de usabilidade + ajustes incrementais (stories 1–6)

---

## 1. Contexto & recorte

### Problema
No teste de usabilidade, o CX travava em colar dados em massa, limpar vs excluir coluna, redimensionar e descobrir ações (três-pontinhos vs intuição de clicar na coluna).

### Usuário
CX (Customer Experience) operando a tela de participantes de um estudo, depois das respostas ao screening.

### Objetivo
Permitir editar e organizar a tabela sem ajuda e sem erro: colar/limpar em massa, redimensionar com affordance clara, ações descobríveis no clique direito, feedback via toasts com Desfazer.

### Non-goals
- Redesign completo da tela
- Fluxo de criação de estudo / screening
- Preview live “ver como o cliente vê” (Story 7 — não implementada)
- Colunas de termo de consentimento/gravação
- Mobile
- Backend real (hoje: mock em `sessionStorage`)

### Premissas
- Web desktop
- Componentes de tabela, menu, toast e ContextMenu em `packages/ui`
- Um papel operacional CX com edição; sem view-only nesta versão

---

## 2. Story map

| # | Story | Prioridade | Status |
|---|-------|:----------:|:------:|
| 1 | Editar célula por duplo clique e colar/preencher em massa | P1 | Feito |
| 2 | Limpar dados de coluna custom com confirmação | P1 | Feito |
| 3 | Redimensionar coluna com affordance na divisória | P1 | Feito |
| 4 | Abrir ações da coluna pelo clique direito | P1 | Feito |
| 5 | Criar coluna também pelo menu Colunas (+) | P1 | Feito |
| 6 | Feedback via toasts (com Desfazer) | P1 | Feito |
| 7 | Preview da visão do cliente em tempo real | P2 | **Não feito** |

---

## 3. Comportamentos implementados

### 3.1 Seleção de células e colunas

- Aplica-se apenas a **colunas custom** (`c:…`), na visão operacional.
- **Clique simples** na célula → seleciona (não entra em edição).
- **Arraste** entre células → seleção retangular (só colunas custom visíveis).
- **Clique / arraste no cabeçalho** custom → seleciona a coluna inteira.
- **Duplo clique** com várias células selecionadas → **desfaz a seleção**.
- **Duplo clique** em célula única → limpa destaque e **abre edição**.
- **Esc** → limpa seleção de células e coluna.

### 3.2 Edição de célula

- Tipos suportados no modelo: texto / id (`Input`), número, data (`DateField`), seleção (`Select`).
- **Enter** ou blur → commit; **Esc** → cancela.
- Validação inline (número, data, opção inválida).
- Coluna travada ou read-only: só exibe valor (ou `—`); não edita.
- Commit de célula única **não** gera toast com Desfazer.

### 3.3 Colar em massa

| Entrada | Comportamento |
|---------|----------------|
| Ctrl+V com células selecionadas | Distribui um valor por célula |
| Ctrl+V com coluna selecionada | Cola de cima para baixo na coluna |
| Botão **Colar** (empty state ou menu da coluna) | Lê o clipboard; se falhar → toast informativo |
| Cola multilinha **dentro** do editor | Sai da edição e cola em massa a partir daquela linha |

**Regras:**

- Um valor por linha; usa só a primeira coluna do Excel (tab).
- Conteúdo multi-coluna → rejeitado (nada é aplicado).
- Mais linhas que participantes → aplica o possível + toast parcial.
- Menos linhas que a seleção → aplica na ordem; restante inalterado.
- Um valor + N células selecionadas → replica o mesmo valor.
- Tipos incompatíveis → modal “Aplicar só os compatíveis”.
- Células já preenchidas → modal “Substituir valores existentes?”.

### 3.4 Limpar / apagar / excluir

| Ação | Onde | Confirmação | Efeito |
|------|------|-------------|--------|
| **Limpar dados** | Menu da coluna custom | Explicitamente: apaga valores e **mantém a coluna** | Esvazia valores; toast + Desfazer |
| **Apagar** (Delete / Backspace) | Seleção de células | “Apagar valores?” | Esvazia a seleção; toast + Desfazer |
| **Excluir coluna** | Menu da coluna custom | Remove a coluna inteira | Sem Desfazer |

- Coluna vazia: **Limpar dados** desabilitado + tooltip “Nada para limpar.”

### 3.5 Menu da coluna (⋮ e clique direito)

- Paridade total entre menu ⋮ e clique direito.
- Clique direito funciona no **cabeçalho** e na **célula** da coluna.
- Teclado: **Shift+F10** / tecla de menu no cabeçalho focado.
- Enquanto o menu de contexto está aberto, a **coluna inteira** fica em cinza clarinho (sem borda colorida), como referência visual.

**Ações em todas as colunas (sistema, screener, custom):**

1. Mover para a esquerda / direita  
2. Adicionar coluna à esquerda / à direita (se pode gerenciar colunas)  
3. Fixar / Desafixar  
4. Ocultar  
5. Sublinhar  
6. Destacar (submenu de cores + remover destaque)

**Ações só em coluna custom:**

7. Colar  
8. Limpar dados  
9. Editar coluna  
10. Excluir coluna  

### 3.6 Redimensionar

- Divisória no cabeçalho: hover com affordance + cursor `col-resize`; hit area ampliada.
- Arraste: largura entre **96px** e **480px**.
- Duplo clique na divisória → autofit ao conteúdo.
- Preferência de largura local do grid (sem API compartilhada nesta versão).

### 3.7 Toolbar · Colunas · Nova coluna

- **Colunas:** lista de visibilidade + Restaurar padrões / Aplicar.
- No header do dropdown: título **Colunas** à esquerda; ícone **+** à direita com tooltip **“Nova coluna”** (sem botão com texto).
- Outros pontos de criação: **+** no fim da tabela; “Adicionar à esquerda/direita” no menu da coluna.
- Popover de criação/edição atual: campo **Nome** (tipo sempre texto nesta UI).
- Empty state da coluna custom vazia (1ª linha): texto de ajuda + botão Colar.

### 3.8 Toasts e Desfazer

- Sucesso: auto-dismiss (~5s; ~8s se houver Desfazer).
- Erro: persiste até dismiss.
- Empilha até 3 toasts.
- **Desfazer** restaura o snapshot das células da última ação de massa (colar / limpar).
- Não há Ctrl+Z nem histórico multi-nível.

### 3.9 Visão do cliente (parcial)

- Botão abre drawer de configuração (visibilidade, ordem, reveal de dados pessoais).
- Toast de configuração salva.
- **Não há** preview em tempo real da tabela como o cliente vê (Story 7).

---

## 4. Atalhos de teclado

| Atalho | Efeito |
|--------|--------|
| Ctrl+V | Colar em massa (seleção ou coluna) |
| Delete / Backspace | Apagar células selecionadas (com modal) |
| Esc | Limpa seleção / fecha menus / cancela edição |
| Shift+F10 | Menu de contexto no cabeçalho |
| Enter | Commit da edição / submit criar coluna |
| Duplo clique | Desfaz seleção (multi) ou edita (única) |
| Botão direito | Menu da coluna + highlight cinza da coluna |

---

## 5. Catálogo de mensagens (PT-BR)

| Contexto | Tipo | Copy |
|----------|------|------|
| Empty coluna custom | Empty state | Selecione as células e cole (Ctrl+V). Duplo clique desfaz a seleção. |
| Clipboard bloqueado / dica | Toast info | Selecione as células e cole com Ctrl+V — um valor por linha. |
| Tooltip célula / edição | Tooltip | Selecione as células e cole — um valor por linha. Duplo clique desfaz a seleção. |
| Colar sucesso | Toast | {N} valores colados na coluna {Nome}. |
| Colar parcial | Toast | {N} valores colados · {M} linhas ignoradas por excederem os participantes da tabela. |
| Colar inválido | Toast erro | Não foi possível colar. Cole um valor por linha e tente de novo. |
| Colar em coluna de sistema | Toast erro | Esta coluna não pode ser editada. Só é possível colar em colunas customizáveis. |
| Limpar dados (modal) | Modal | Título: Limpar dados da coluna {Nome}? · Corpo: Isso apaga todos os valores desta coluna, mas mantém a coluna na tabela. Não remove a coluna. · Ações: Limpar dados / Cancelar |
| Limpar dados (sucesso) | Toast | Dados da coluna {Nome} apagados. + Desfazer |
| Limpar dados (erro) | Toast erro | Não foi possível limpar os dados. Nada foi alterado — tente de novo. |
| Limpar dados (vazio) | Tooltip | Nada para limpar. |
| Apagar seleção | Modal | Apagar valores? / Isso vai apagar os valores de N célula(s). Continuar? |
| Excluir coluna | Modal | Excluir esta coluna? / Os valores preenchidos serão removidos. As demais colunas não mudam. |
| Nova coluna (+) | Tooltip | Nova coluna |
| Nome duplicado | Aviso | Já existe uma coluna com esse nome. Escolha outro. |
| Nome obrigatório | Erro | Dê um nome à coluna para continuar. |
| Visão do cliente salva | Toast | Configuração salva · O cliente passa a ver os participantes com os campos e a ordem que você definiu. |
| Redimensionar | Aria | Arraste para redimensionar · duplo clique para ajustar |

---

## 6. Matriz de permissões

| Ator | Acesso |
|------|--------|
| CX com acesso ao estudo | Todas as ações de edição da tabela |
| Cliente final | Não acessa esta tela (consome visão somente-leitura em outro fluxo) |
| CX view-only | **Não implementado** |

Enforcement real de permissão depende do backend; o front atual assume edição liberada (`canManageColumns` default true).

---

## 7. Edge cases cobertos

- [x] Paste multi-coluna rejeitado sem corromper dados  
- [x] Linhas excedentes → parcial + toast  
- [x] Valor único em seleção múltipla → replica  
- [x] Tipos incompatíveis → modal de aplicar só compatíveis  
- [x] Sobrescrita de células preenchidas → confirmação  
- [x] Limpar × Excluir claramente separados  
- [x] Limpar desabilitado se coluna vazia  
- [x] Duplo clique não dispara ação destrutiva  
- [x] Texto longo truncado com tooltip no hover  
- [x] Largura mínima/máxima no resize  
- [x] Highlight da coluna no menu de contexto  
- [ ] Concorrência multi-CX (last-write-wins / abort) — não há sync real  
- [ ] Progresso para colagens >500 linhas — não implementado  
- [ ] Bloqueio rígido de nome duplicado no submit — aviso sem hard-block completo  

---

## 8. Fora do escopo / gaps conscientes

- Story 7: preview realtime da visão do cliente  
- View-only CX  
- Seletor de tipo de coluna na UI de criação (modelo suporta; UI cria sempre texto)  
- Persistência real via API  
- Undo multi-nível / Ctrl+Z / undo de criar ou excluir coluna  
- Mobile  

---

## 9. Superfície de código

| Arquivo | Papel |
|---------|--------|
| `apps/cliente/src/features/estudos/ParticipantsAnswersGrid.tsx` | Grid, seleção, menus, resize, context menu |
| `apps/cliente/src/features/estudos/ParticipantCustomCell.tsx` | Célula: display, edição, empty, paste |
| `apps/cliente/src/features/estudos/StudyParticipantsPanel.tsx` | Estado, modais, undo, persistência |
| `apps/cliente/src/features/estudos/ParticipantColumnCreator.tsx` | Criar/editar coluna (nome) |
| `apps/cliente/src/features/estudos/ParticipantColumnPanel.tsx` | Reordenar + Colunas (+ Nova coluna) |
| `apps/cliente/src/features/estudos/ParticipantClientVisionDrawer.tsx` | Config visão do cliente |
| `apps/cliente/src/lib/participantCustomTable.ts` | Modelo, paste, coerce, mock CRUD |
| `apps/cliente/src/lib/messages.ts` | Copy PT-BR |
| `packages/ui/src/Toast.tsx` | Toasts + Desfazer + stack |
| `packages/ui/src/Menu.tsx` | Menu ⋮ + `ContextMenu` |

---

## 10. Definition of Done (as-built)

- [x] Stories P1 #1–#6 com comportamentos acima  
- [x] Copy do catálogo alinhada na UI  
- [x] Clique direito com highlight de coluna  
- [x] Colunas: + “Nova coluna” sem botão textual  
- [ ] Story #7 (P2)  
- [ ] Persistência e permissões no backend  
