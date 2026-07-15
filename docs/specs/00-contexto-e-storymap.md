# Spec — Perfis e Permissões (Workspace) · v1

**Status:** Draft · **Autor:** Pedro · **Data:** 15/07/2026 · **Origem:** Discovery (board UserX - Workspace, páginas Estrutura e Fluxos) + benchmarking + briefing · **Visão:** Cliente (externa)

> **Nota de escopo deste documento:** por decisão do autor, este spec **não inclui a camada de métricas & eventos** (será adicionada em iteração futura). As stories estão organizadas **por módulo** para consumo direto em ferramenta de código (Cursor).

---

## 1. Contexto & Recorte

### Problema
Hoje todos os usuários de um workspace têm acesso idêntico a todas as funcionalidades e informações. Não existem times, funções ou permissões — o que gera login compartilhado (Stone, Serasa, Carrefour, Banco Inter), workspaces duplicados simulando times (Stone pesquisa / Stone produto), baixa rastreabilidade e bloqueio de adoção em clientes enterprise. O time de CX ainda provisiona usuários manualmente, um a um.

### Usuário
Quatro funções no nível cliente:

| Função | Quem é | Resumo do papel |
|---|---|---|
| **Dono do Workspace** | Definido pelo CX no onboarding. Sempre ≥ 1 ativo. | Gerencia dados do workspace, times e membros. Único com visão do Balanço do Workspace. No futuro, gerenciará carteira e distribuição de créditos. |
| **Administrador** | Head, Lead, Líder de time | Gerencia times e membros **dos times aos quais pertence**. Acompanha consumo de créditos do próprio time (read-only). |
| **Editor** | UX Researchers, Product Designers | Cria e executa estudos dentro do(s) seu(s) time(s). Vê consumo de créditos do próprio time (read-only). Convida Editores e Observadores. |
| **Observador** | Stakeholders | Visualiza estudos e resultados dos times aos quais pertence. **Zero visibilidade de carteira ou créditos.** |

### Objetivo
Dar autonomia de governança ao cliente (criar times, convidar membros, atribuir funções) com **entrada sem resistência**, eliminando o provisionamento manual do CX e o login compartilhado. Meta qualitativa: o Dono consegue montar seu workspace (time inicial + primeiros convites) sozinho, no primeiro acesso, sem contato com CX. *(Métricas quantitativas: fora deste spec — ver nota de escopo.)*

### Fluxo macro
1. CX cria workspace + Dono (nível interno — resolvido, fora deste spec).
2. Dono acessa via link → primeiro acesso: nomeia o time inicial e convida as primeiras pessoas.
3. Convidados recebem e-mail → aceitam → entram no workspace já vinculados a time(s) e com função definida.
4. Uso contínuo: menu lateral com contexto de time (Estudos com créditos no topo, troca de time) e, ao final, **Gestão do Workspace** (Times · Membros · Balanço) para quem tem permissão.

### Non-goals (v1)
- Distribuição/alocação de créditos pelo cliente ("alocar X ao time Y") e solicitação de créditos.
- Flow de aprovação de estudos.
- Gestão financeira pelo cliente (alocar, transferir, solicitar) — a superfície financeira da v1 é estritamente **read-only**: consumo do time (Story 1.4) e Balanço do workspace (M5), com visibilidade regida pela matriz da seção 4.
- Funções customizadas (RBAC é fixo: 4 funções).
- Tela/UI de auditoria — o registro existe **apenas como log interno de sistema**.
- Funções diferentes por time para o mesmo membro (função é global no workspace).
- Convite por domínio de e-mail, bulk import (CSV), SSO/SAML/SCIM.
- Todo o nível interno (gestão de workspaces pelo CX).

### Premissas
- **Função global:** cada membro tem exatamente 1 função, válida em todos os times em que estiver. Multi-função por time foi descartada nesta versão por complexidade.
- **Multi-time:** um membro pode pertencer a 1 ou mais times.
- **Time inicial:** todo workspace nasce com 1 time, nomeado pelo Dono no primeiro acesso. Enquanto não renomeado, chama-se "Time 1". Não pode ser excluído enquanto for o único.
- **Convite multi-e-mail:** o campo de convite aceita múltiplos e-mails (separados por vírgula ou quebra de linha) na mesma função/time — custo baixo, alto impacto na dor de "adicionar um por um".
- **Expiração de convite:** 7 dias corridos (decidido).
- **Plataforma:** web desktop como principal; responsivo não coberto por este spec.
- **Log interno:** toda ação de gestão (convidar, editar função, remover, ativar/inativar, criar/editar/excluir time) grava `ator, ação, alvo, timestamp` em log de sistema, sem superfície de UI.

### Restrições
- Regra de faixa de convite: **membros convidam apenas na mesma função ou abaixo**. Ninguém convida Dono.
- Sempre deve existir ao menos 1 Dono ativo no workspace.
- Simplicidade como requisito de adoção: nenhum fluxo de gestão pode exigir mais de 1 modal/tela para completar a ação principal.

---

## 2. Story Map

| # | Story | Módulo | Prioridade | Dependências | Fase |
|---|-------|--------|:----------:|:------------:|:----:|
| 0.1 | Primeiro acesso do Dono (time inicial + primeiros convites) | M0 Onboarding | P1 | — | MVP |
| 1.1 | Seletor de time no menu lateral | M1 Navegação | P1 | 0.1 | MVP |
| 1.2 | Créditos do time no topo de Estudos | M1 Navegação | P1 | 1.1 | MVP |
| 1.3 | Entrada "Gestão do Workspace" no menu | M1 Navegação | P1 | — | MVP |
| 1.4 | Tela Financeiro do time (consumo, read-only) | M1 Navegação | P1 | 1.1 | MVP |
| 1.5 | Tela Time (membros do time no contexto) | M1 Navegação | P1 | 1.1 | MVP |
| 2.1 | Criar time | M2 Times | P1 | 1.3 | MVP |
| 2.2 | Listar times (membros, créditos, status, CRUD) | M2 Times | P1 | 1.3 | MVP |
| 2.3 | Editar time (renomear) | M2 Times | P1 | 2.2 | MVP |
| 2.4 | Adicionar/remover membro do workspace em um time | M2 Times | P1 | 2.2, 3.1 | MVP |
| 2.5 | Ativar/Inativar time | M2 Times | P2 | 2.2 | Fase 2 |
| 2.6 | Excluir time (com destino de membros e estudos) | M2 Times | P2 | 2.2 | Fase 2 |
| 3.1 | Listar membros (times, função, status) | M3 Membros | P1 | 1.3 | MVP |
| 3.2 | Convidar membro (e-mails + função + times) | M3 Membros | P1 | 3.1 | MVP |
| 3.3 | Editar membro (função e times) | M3 Membros | P1 | 3.1 | MVP |
| 3.4 | Inativar/reativar e remover membro | M3 Membros | P1 | 3.1 | MVP |
| 4.1 | Aceite do convite (lado do convidado) | M4 Convites | P1 | 3.2 | MVP |
| 4.2 | Reenviar e revogar convite pendente; expiração | M4 Convites | P1 | 3.2 | MVP |
| 5.1 | Balanço do Workspace (saldos B2B/B2C, read-only) | M5 Balanço | P1 | 1.3 | MVP |
| 5.2 | Histórico de recargas e alocações (read-only) | M5 Balanço | P2 | 5.1 | Fase 2 |
| 6.1 | Modo demo de permissões (protótipo navegável) | M6 Demo | P1 | 1.1–1.5, 5.1 | MVP |

**Corte de MVP:** stories 0.1, 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1, 6.1.
**Racional do sequenciamento:** o valor da feature só existe quando o ciclo *convidar → aceitar → operar por time* fecha; por isso Membros/Convites e a navegação por time são MVP. Inativação e exclusão de time (2.5, 2.6) são operações raras de manutenção que dependem de decisões de ciclo de vida de estudos — ficam na Fase 2 sem bloquear o lançamento. O histórico do Balanço (5.2) depende de dados de alocação que hoje só existem do lado interno.

> Stories **P2** estão em formato resumido (user story + ACs principais + edge cases), conforme convenção do template para épicos com mais de 6 stories.

---

## 4. Diretrizes de interface

Referência de composição das telas para o handoff (fonte: definição do autor). Estrutura global: **Sidebar → Header → Resumo → Ações → Conteúdo**, conforme guidelines do design system UserX.

### Navegação (menu lateral)
- **Topo:** logo; em seguida, **área do time atual** — nome do time em destaque + select para troca quando o usuário pertence a outros times (Story 1.1).
- **Itens do menu (contexto do time):** Estudos (default/início) · Financeiro · Time.
- **Final do menu:** ícone de perfil do usuário + item **Gestão Workspace**. Ao clicar, abre-se um **sub-menu com botão de voltar no topo** e as opções: **Balanço do workspace · Times · Membros** (visibilidade por função conforme matriz).

### Tela de Estudos (início — primeira opção do menu)
- **Topo:** créditos **B2B e B2C** do time atual (oculto para Observador).
- **Conteúdo:** tabela de estudos com colunas **Nome do estudo · Solicitante (quem solicitou) · Status** (Em setup · Em andamento · Finalizado).
- **Fora do escopo desta v1:** criar estudo e abrir/visualizar o detalhe do estudo — a tabela é somente consulta.

### Tela de Financeiro (contexto do time)
- **Topo (totalizadores):** créditos B2B e B2C do time · quantidade de recargas · consumo total · quantidade de estudos do time.
- **Conteúdo:** tabela de movimentações com colunas **Item · Créditos · Carteira · Saldo após · Workspace · Data** (Story 1.4).

### Tela de Time (contexto do time)
- **Cabeçalho:** nome do time + quantidade de membros.
- **Conteúdo:** lista de pessoas com **Nome · E-mail · Permissão (função) · Convidado por · three-dot de ações** (por faixa).
- **Ação primária:** **Convidar membro** (abre modal da Story 3.2 com o time pré-selecionado).

### Gestão do Workspace (sub-menu)
- **Times:** lista com membros de cada time (nome + e-mail), quantidade de créditos por time, status ativo/inativo, three-dot com CRUD, ação de adicionar membro do workspace ao time e CTA de criar time (Stories 2.1–2.6).
- **Membros:** tabela com todos os membros — times, permissões e status (Ativo · Pendente · Inativo) — e ação de adicionar membro definindo permissão e times (Stories 3.1–3.4).
- **Balanço do workspace (só Dono):** créditos B2B e B2C alocados ao workspace + histórico de alocações aos times e recargas do workspace — sem qualquer ação de pedir/alocar (Stories 5.1–5.2).

---
