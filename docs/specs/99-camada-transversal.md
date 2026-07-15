> Fatia do spec `Perfis e Permissões (Workspace) · v1`. As regras transversais (matriz de permissões, regras globais, catálogo de mensagens) estão em `.cursor/rules/governanca.mdc` e valem para TODA implementação.

## 5. Camada transversal

### Matriz de permissões

| Ação | Dono | Administrador | Editor | Observador |
|------|:----:|:-------------:|:------:|:----------:|
| Ver Estudos e resultados (dos seus times) | ✓ | ✓ | ✓ | ✓ |
| Ver Financeiro do time (consumo, read-only) | ✓ | ✓ (seus times) | ✓ (seus times) | — |
| Ver tela Time (membros do contexto) | ✓ | ✓ | ✓ | — |
| Criar/editar/executar estudos | ✓ | ✓ | ✓ | — |
| Ver créditos do time (topo de Estudos, lista de Times) | ✓ | ✓ (seus times) | ✓ (seus times) | — |
| Ver Gestão do Workspace (menu) | ✓ | ✓ (Times, Membros) | — | — |
| Criar time | ✓ | ✓ | — | — |
| Editar/inativar/excluir time | ✓ (todos) | ✓ (seus times)¹ | — | — |
| Adicionar/remover membro em time | ✓ | ✓ (seus times) | — | — |
| Convidar (faixa: mesma função ou abaixo) | ✓ Adm/Ed/Obs | ✓ Adm/Ed/Obs | ✓ Ed/Obs | ✓ Obs |
| Editar função/times de membro | ✓ (todos) | ✓ (até Adm; nunca Dono) | — | — |
| Inativar/reativar/remover membro | ✓ | ✓ (até Adm; nunca Dono) | — | — |
| Reenviar/revogar convite | ✓ | ✓ (convites dos seus times) | — | — |
| Ver Balanço do Workspace | ✓ | — | — | — |
| Gerenciar carteira/alocar créditos | futuro | — | — | — |

¹ Exclusão de time é P2 (Story 2.6); decisão: Administrador pode excluir os times sob sua gestão.

**Regras transversais (valem para todas as stories):**
1. Sempre ≥ 1 Dono ativo — qualquer ação que zeraria isso é bloqueada.
2. Função é única e global por membro.
3. Convite sempre na mesma função ou abaixo; ninguém convida Dono; Observador convida apenas Observadores.
4. Toda ação de gestão grava log interno (`ator, ação, alvo, timestamp`) — sem UI na v1.
5. Permissões aplicam no próximo request (sem exigir relogin).
6. Verificações de permissão sempre no backend; o front apenas oculta superfícies.

### Catálogo de mensagens

| Contexto | Tipo | Copy sugerida (PT-BR) |
|----------|------|----------------------|
| Convite: e-mail já é membro | Erro inline | "Este e-mail já faz parte do workspace." |
| Convite: e-mail com convite pendente | Erro inline | "Já existe um convite pendente para este e-mail. Reenviar?" |
| Convite: e-mail em outro workspace | Erro inline | "Este e-mail já está vinculado a outro workspace. Fale com nosso suporte para resolver." |
| Convite: formato inválido | Erro inline | "E-mail inválido. Verifique e tente de novo." |
| Aceite: convite expirado | Tela | "Este convite expirou. Peça um novo convite a quem te convidou." |
| Aceite: convite revogado | Tela | "Este convite não está mais disponível." |
| Último Dono: qualquer ação bloqueada | Erro | "O workspace precisa de ao menos um Dono ativo. Defina outro Dono antes de continuar." |
| Auto-inativação | Erro | "Você não pode inativar a si mesmo. Peça a outro administrador." |
| Time: nome duplicado | Erro inline | "Já existe um time com esse nome." |
| Time: excluir único time | Erro | "O workspace precisa de ao menos um time." |
| Time: inativar com estudo em execução | Erro | "Este time tem estudos em execução. Conclua ou pause antes de inativar." |
| Sem permissão (URL direta) | Tela | "Você não tem acesso a esta área." + CTA "Ir para Estudos" |
| Membro sem time | Tela | "Você ainda não está em nenhum time. Peça a um administrador para te adicionar." |
| Lista de times (só o inicial) | Empty state | "Organize seu workspace criando times por frente de pesquisa." + CTA "+ Criar time" |
| Lista de membros (só o Dono) | Empty state | "Traga sua equipe para o workspace." + CTA "Convidar membros" |
| Balanço sem créditos | Empty state | "Seu workspace ainda não tem créditos. Fale com o time UserX para a primeira recarga." |
| Histórico vazio (5.2) | Empty state | "Recargas e alocações de créditos aparecerão aqui." |
| Busca sem resultado (times/membros) | Empty state | "Nenhum resultado para sua busca." |

### Plano de tracking consolidado
**Fora deste spec por decisão do autor** — será adicionado em iteração futura antes do lançamento. Registrado no checklist de handoff como pendência explícita.

### Open Questions

| # | Questão | Impacta | Dono sugerido |
|---|---------|---------|---------------|
| 1 | Exclusividade e-mail ↔ workspace: a regra "e-mail só pode pertencer a 1 workspace" é permanente ou limitação da v1? Qual o caminho para consultores/agências e empresas com múltiplos workspaces? | 3.2, 4.1 | PM + Eng |

**Decisões registradas (ex-Open Questions):**
- Observador **convida** — apenas Observadores (faixa literal aplicada).
- Transferência de Dono permanece 100% via nível interno/CX na v1.
- Expiração de convite: **7 dias corridos**.
- Administrador **pode excluir** os times sob sua gestão.
- Créditos de time excluído **retornam ao Balanço do Workspace**, com aviso explícito no fluxo de exclusão e linha de estorno no histórico.
- Limite de assentos **não se aplica** na v1.
- Financeiro do time entra como tela read-only de consumo (Story 1.4); a superfície financeira segue sem ações de gestão.

### Checklist de handoff para design

- [ ] Fluxos das stories P1 mapeados em telas (usar `figma-user-flow-planner`)
- [ ] Estados de tela da matriz desenhados (mínimo: default, vazio, erro por tela)
- [ ] Componentes novos identificados: **seletor de time (menu lateral)**, **sub-menu Gestão Workspace com botão voltar**, **bloco de créditos (topo de Estudos)**, **totalizadores do Financeiro**, **tabela de estudos com badges de status**, **tabela de movimentações**, **chips multi-e-mail com validação inline**, **tabela de membros com badges de status**, **card de time com three-dot**, **telas de aceite/expirado/revogado**, **cards de balanço B2B/B2C**, **seletor de persona do modo demo** (usar `figma-variant-matrix`)
- [ ] Copy do catálogo revisada com CX (mensagens de convite são a voz do produto no primeiro contato do convidado)
- [ ] **Plano de tracking pendente** — adicionar camada de métricas antes do lançamento (decisão registrada)
- [ ] Open Question bloqueante (**OQ1 — exclusividade e-mail ↔ workspace**) resolvida antes do hi-fi
