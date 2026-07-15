# Perfis e Permissões v1 — Kit para Cursor

## Como instalar

1. Copie a pasta `.cursor/` para a **raiz** do repositório (a rule `governanca.mdc` tem `alwaysApply: true` — entra em todo prompt automaticamente).
2. Copie `docs/specs/` para o repositório. Você referencia cada fatia com `@` no chat do Cursor (ex.: `@m3-membros.md`).
3. Não cole o spec inteiro em prompt nenhum. A rule carrega as regras permanentes; a fatia carrega a tarefa da vez.

## Ordem de envio (uma story por conversa)

A ordem segue as dependências do story map. Não pule a fundação: quase tudo depende do contexto de time (1.1) e da lista de membros (3.1).

| Ordem | Story | Arquivo | Por quê nessa posição |
|:-:|---|---|---|
| 1 | 1.1 Seletor de time + estrutura do menu | `m1-navegacao.md` | Fundação de navegação: contexto de time, zonas do menu, visibilidade por função. Tudo depende dele. |
| 2 | 1.3 Entrada Gestão do Workspace (+ sub-menu com voltar) | `m1-navegacao.md` | Fecha o esqueleto de navegação e a tela de sem-permissão (padrão reutilizado por todas as telas). |
| 3 | 3.1 Listar membros | `m3-membros.md` | Primeira tela de dados; define tabela, badges de status e escopo do Admin. |
| 4 | 3.2 Convidar membro | `m3-membros.md` | Coração da feature. Chips multi-e-mail, faixa de convite, validações. |
| 5 | 4.1 Aceite do convite | `m4-convites.md` | Fecha o ciclo convidar → aceitar. Dá pra testar o fluxo de ponta a ponta a partir daqui. |
| 6 | 4.2 Reenviar/revogar/expiração | `m4-convites.md` | Completa o ciclo de vida do convite (estados Pendente/Ativo/Expirado/Excluído). |
| 7 | 3.3 Editar membro | `m3-membros.md` | Depende da lista (3.1) e consolida a regra do último Dono. |
| 8 | 3.4 Inativar/reativar/remover | `m3-membros.md` | Mesmo cluster; reaproveita confirmações e regras da 3.3. |
| 9 | 2.1 Criar time | `m2-times.md` | Agora que existem membros, times deixam de ser abstratos. |
| 10 | 2.2 Listar times | `m2-times.md` | Hub do módulo; three-dot e créditos por time (read-only). |
| 11 | 2.3 Editar time · 2.4 Adicionar/remover membro do time | `m2-times.md` | Fecham o CRUD essencial de times. Podem ir na mesma conversa — são pequenas e acopladas. |
| 12 | 0.1 Onboarding do Dono | `m0-onboarding.md` | Reusa criar time (2.1) e convidar (3.2) — por isso vem depois delas, apesar de ser "0". |
| 13 | 1.2 Créditos no topo de Estudos + tabela de Estudos | `m1-navegacao.md` | Primeira superfície financeira; regra do Observador (bloco não renderiza). |
| 14 | 1.4 Financeiro do time | `m1-navegacao.md` | Totalizadores + tabela de movimentações (read-only). |
| 15 | 1.5 Tela Time | `m1-navegacao.md` | Lista do time no contexto + CTA de convite pré-contextualizado. |
| 16 | 5.1 Balanço do Workspace | `m5-balanco.md` | Exclusivo do Dono; fecha o read-only financeiro. |
| 17 | 6.1 Modo demo | `m6-modo-demo.md` | Por último: precisa de todas as telas prontas. Camada isolada, dados mockados, nada grava. |
| — | Fase 2: 2.5, 2.6, 5.2 | `m2-times.md`, `m5-balanco.md` | Inativar/excluir time e histórico do Balanço — só depois do MVP validado. |

## Template de prompt (por story)

```
Implemente a Story {N} ({título}) de @{arquivo}.
Contexto geral do produto em @00-contexto-e-storymap.md (leia as Diretrizes de Interface).
Siga exatamente: fluxo, ACs, edge cases e matriz de estados da story.
As regras de governança do projeto (rule) prevalecem sobre qualquer atalho.
NÃO implemente as stories seguintes — apenas deixe pontos de integração (TODOs nomeados) onde elas se conectam.
Antes do código, liste em 5 linhas o plano de arquivos que vai criar/alterar.
```

## Fluxo recomendado por story (TDD leve)

1. **Testes primeiro:** "Gere os testes a partir dos ACs em Given/When/Then da Story {N} de @{arquivo}. Inclua os testes de permissão contra a API (regra 4 da rule), não só de render."
2. Revise os testes (é sua chance de pegar interpretação errada barata).
3. **Depois:** "Agora implemente até os testes passarem."
4. **Auditoria de estados:** "Confira se as telas da Story {N} cobrem a matriz de estados (default, loading, vazio, erro, sem-permissão) e liste o que faltou."

## Avisos

- `99-camada-transversal.md` não é tarefa — é referência (catálogo de copy, checklist de handoff, OQ1). A rule já resume o que importa dele.
- **OQ1 (exclusividade e-mail ↔ workspace) segue aberta:** o código de convite/aceite deve tratar "e-mail em outro workspace" como validação isolada e fácil de remover — não espalhe essa regra pelo domínio.
- O plano de métricas/tracking ficou fora desta versão por decisão registrada — não deixe o Cursor "inventar" eventos de analytics.
