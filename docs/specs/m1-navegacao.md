> Fatia do spec `Perfis e Permissões (Workspace) · v1`. As regras transversais (matriz de permissões, regras globais, catálogo de mensagens) estão em `.cursor/rules/governanca.mdc` e valem para TODA implementação.

## Módulo 1 — Navegação & Contexto de Time

### Story 1.1: Seletor de time no menu lateral

**Prioridade:** P1 · **Dependências:** 0.1

#### User Story
> **Como** membro de um ou mais times,
> quero **ver em qual time estou e trocar de contexto pelo menu lateral**,
> para **navegar entre estudos e créditos de cada time sem me perder**.

#### Contexto
A arquitetura definida é: o menu lateral carrega o **contexto do time atual** — Estudos, Financeiro e Time operam nesse escopo. O seletor no topo do menu mostra o time corrente; ao clicar, lista os demais times do usuário e (conforme permissão) atalhos de "Criar time" e "Inserir pessoas".

#### Fluxo

**Entry points:** menu lateral, presente em toda a aplicação autenticada.

**Happy path:**
1. Usuário clica no seletor de time no topo do menu lateral.
2. Sistema lista os times aos quais o usuário pertence, com o atual marcado.
3. Usuário clica em outro time.
4. Sistema troca o contexto: Estudos, créditos do topo e item "Time" passam a refletir o time selecionado; a seleção persiste entre sessões.

**Caminhos alternativos e de erro:**
- **Usuário pertence a 1 único time:** seletor exibe o nome sem dropdown de troca (mas mantém atalhos permitidos).
- **Usuário com permissão de criar time (Dono/Administrador):** dropdown exibe ação "+ Criar time" (abre o modal da Story 2.1).
- **Ação "Inserir pessoas" (todas as funções, na sua faixa de convite):** abre o modal da Story 3.2 com o time atual pré-selecionado.
- **Time atual foi inativado/excluído enquanto o usuário navegava:** ao próximo request, contexto cai para o primeiro time ativo do usuário + toast informativo.

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Dropdown do seletor | Lista de times do usuário, atual marcado, ações por permissão | Skeleton de 3 linhas | Usuário sem time ativo: mensagem + orientação de contatar administrador | Falha ao listar: retry inline | Troca de contexto instantânea |

#### Critérios de Aceite

**AC1: troca de contexto consistente**
```
Given pertenço aos times A e B e estou no contexto de A
When seleciono o time B no seletor
Then a lista de Estudos, os créditos do topo e o item Time passam a refletir B
  And ao recarregar a página o contexto continua em B
```

**AC2: ações do dropdown respeitam a função**
```
Given sou Observador
When abro o seletor de time
Then não vejo a ação "Criar time"
  And vejo "Inserir pessoas" (com convite limitado à função Observador)
```

**AC3: membro de um único time**
```
Given pertenço a apenas um time
When olho o seletor
Then vejo o nome do time sem controle de troca
```

#### Edge Cases
- [ ] **Usuário removido do time atual por um admin durante a sessão:** próximo request derruba o contexto para outro time do usuário + toast "Você não faz mais parte do time X".
- [ ] **Usuário em dezenas de times:** dropdown com busca a partir de 8 times; lista com scroll.
- [ ] **Nomes de time longos:** truncar com ellipsis + tooltip com nome completo.

#### Out of Scope
- Criar time e convidar em si (Stories 2.1 e 3.2 — aqui são só entry points).

---

### Story 1.2: Créditos do time no topo de Estudos

**Prioridade:** P1 · **Dependências:** 1.1

#### User Story
> **Como** Dono, Administrador ou Editor,
> quero **ver os créditos do time em que estou no topo da lista de Estudos**,
> para **saber quanto o time tem disponível antes de criar ou lançar um estudo**.

#### Contexto
Primeira materialização da regra de perspectivas financeiras: a informação de créditos aparece no contexto do time, read-only, sem nenhuma ação de gestão. Observador não vê nada de créditos — a regra vale aqui e em qualquer superfície futura.

#### Fluxo

**Entry points:** tela de Estudos (default após login).

**Happy path:**
1. Usuário acessa Estudos no contexto do time A.
2. Sistema exibe no topo: créditos disponíveis do time A, segmentados em B2B e B2C.
3. Usuário troca para o time B → valores atualizam para B.

**Caminhos alternativos e de erro:**
- **Usuário é Observador:** o bloco de créditos não é renderizado (sem placeholder, sem "sem permissão" — simplesmente não existe para ele).
- **Falha ao carregar créditos:** bloco exibe estado de erro discreto com retry, sem bloquear a lista de Estudos.

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Bloco de créditos (topo de Estudos) | Saldo B2B e B2C do time atual | Skeleton nos valores | Time sem créditos: exibe 0 (não esconde) | Estado de erro discreto + retry, lista de estudos não bloqueia | Valores atualizados a cada troca de time |

#### Critérios de Aceite

**AC1: escopo por time**
```
Given pertenço aos times A (100 créditos B2C) e B (40 créditos B2C)
When troco o contexto de A para B
Then o bloco do topo passa a exibir os saldos de B
```

**AC2: observador não vê créditos**
```
Given sou Observador no time A
When acesso Estudos
Then o bloco de créditos não é exibido em nenhuma resolução
```

**AC3: zero é informação**
```
Given meu time tem 0 créditos B2B e 0 B2C
When acesso Estudos
Then vejo os saldos zerados (o bloco não é ocultado)
```

#### Edge Cases
- [ ] **Saldos grandes (≥ 100.000):** formatação com separador de milhar pt-BR.
- [ ] **Falha só em um dos saldos (B2B ok, B2C erro):** exibir o que carregou; erro pontual no que falhou.

#### Out of Scope
- Qualquer ação sobre créditos (alocar, pedir, transferir) — non-goal da v1.
- Balanço do workspace (Story 5.1).

---

### Story 1.3: Entrada "Gestão do Workspace" no menu

**Prioridade:** P1 · **Dependências:** —

#### User Story
> **Como** Dono ou Administrador,
> quero **acessar a área de Gestão do Workspace pelo final do menu lateral**,
> para **gerenciar times, membros e (no caso do Dono) o balanço em um lugar só**.

#### Contexto
O menu lateral tem duas zonas: contexto do time (Estudos, Financeiro, Time) e, ao final, a entrada de **Gestão do Workspace** com as opções **Times**, **Membros** e **Balanço**. A visibilidade é por função: Dono vê tudo; Administrador vê Times e Membros (escopo dos seus times); Editor e Observador não veem a entrada.

#### Fluxo

**Entry points:** menu lateral (zona inferior).

**Happy path:**
1. Dono clica em "Gestão do Workspace".
2. Menu expande/navega para a área com abas ou subitens: Times · Membros · Balanço.
3. Dono navega entre as seções sem perder o contexto de time da zona superior.

**Caminhos alternativos e de erro:**
- **Administrador:** vê Times e Membros; Balanço não é renderizado.
- **Editor/Observador:** a entrada "Gestão do Workspace" não existe no menu. Acesso direto por URL → tela de sem-permissão com CTA de voltar para Estudos.

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Menu (zona de gestão) | Subitens conforme função | n/a | n/a | n/a | Navegação para a seção |
| Tela sem-permissão | — | — | — | "Você não tem acesso a esta área" + CTA Estudos | — |

#### Critérios de Aceite

**AC1: visibilidade por função**
```
Given sou Editor
When olho o menu lateral
Then não existe a entrada "Gestão do Workspace"
```

**AC2: acesso direto bloqueado no backend**
```
Given sou Observador
When acesso a URL de /gestao/membros diretamente
Then recebo a tela de sem-permissão
  And nenhum dado de membros é retornado pela API
```

**AC3: escopo do Administrador**
```
Given sou Administrador
When abro Gestão do Workspace
Then vejo Times e Membros
  And não vejo Balanço
```

#### Edge Cases
- [ ] **Função do usuário rebaixada durante a sessão (Admin → Editor):** próximo request à área de gestão retorna sem-permissão; menu atualiza no próximo carregamento.

#### Out of Scope
- Conteúdo das seções (Stories 2.x, 3.x, 5.x).

---

### Story 1.4: Tela Financeiro do time (consumo, read-only)

**Prioridade:** P1 · **Dependências:** 1.1

#### User Story
> **Como** Dono, Administrador ou Editor,
> quero **ver a lista de consumo de créditos do time em que estou**,
> para **entender para onde os créditos do time estão indo, sem precisar pedir relatório**.

#### Contexto
Item "Financeiro" do menu lateral, no contexto do time atual. Estritamente read-only — materializa a regra das perspectivas: Dono/Administrador/Editor veem o consumo do próprio time; Observador não tem o item no menu. Nenhuma ação de alocar, transferir ou solicitar.

#### Fluxo

**Entry points:** item "Financeiro" no menu lateral (contexto do time).

**Happy path:**
1. Usuário acessa Financeiro no contexto do time A.
2. Topo: totalizador de créditos B2B e B2C do time + quantidade de recargas, consumo total e quantidade de estudos do time.
3. Abaixo: tabela de movimentações com colunas **Item · Créditos · Carteira (B2B/B2C) · Saldo após · Workspace · Data**.
4. Trocar de time no seletor atualiza topo e tabela.

**Caminhos alternativos e de erro:**
- **Observador:** item "Financeiro" não existe no menu; URL direta → sem-permissão (padrão 1.3).
- **Time sem movimentação:** empty state com totalizadores zerados.

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Financeiro do time | Totalizadores + tabela cronológica | Skeleton em cards e linhas | "As movimentações de créditos do time aparecerão aqui." | Erro + retry | Atualiza a cada troca de time |

#### Critérios de Aceite

**AC1: escopo e colunas**
```
Given sou Editor no time A
When acesso Financeiro
Then vejo apenas movimentações do time A
  And cada linha exibe Item, Créditos, Carteira, Saldo após, Workspace e Data
```

**AC2: leitura pura**
```
Given estou na tela Financeiro
When examino qualquer linha ou totalizador
Then nenhuma ação de gestão (alocar, transferir, solicitar) é oferecida
```

**AC3: observador sem acesso**
```
Given sou Observador
When olho o menu lateral
Then o item Financeiro não existe
  And o acesso por URL direta retorna sem-permissão
```

#### Edge Cases
- [ ] **Histórico longo:** paginação + filtro por período e por carteira (B2B/B2C).
- [ ] **Consumo e recarga no mesmo dia:** ordenar por timestamp completo, não por data.
- [ ] **Saldo após inconsistente com o topo (cache):** mesma fonte de dados para totalizador e tabela.

#### Out of Scope
- Balanço do workspace (5.1) e histórico de alocações do workspace (5.2).

---

### Story 1.5: Tela Time (membros do time no contexto)

**Prioridade:** P1 · **Dependências:** 1.1

#### User Story
> **Como** membro de um time,
> quero **ver as pessoas do time em que estou**,
> para **saber quem trabalha comigo e trazer gente nova sem sair do contexto**.

#### Contexto
Item "Time" do menu lateral, no contexto do time atual. Lista as pessoas do time com **nome, e-mail, função (permissão) e por quem foi convidado**, com three-dot de ações (conforme faixa do usuário) e CTA "Convidar membro" (abre a Story 3.2 com o time pré-selecionado). Visível para Editor, Administrador e Dono; Observador não tem o item.

#### Fluxo

**Entry points:** item "Time" no menu lateral (contexto do time).

**Happy path:**
1. Usuário acessa Time no contexto do time A.
2. Sistema lista membros: nome, e-mail, função, convidado por, three-dot.
3. Usuário aciona "Convidar membro" → modal da Story 3.2 com time A pré-selecionado.

**Caminhos alternativos e de erro:**
- **Three-dot por faixa:** Dono/Administrador veem ações de gestão (editar, remover do time, inativar — Stories 2.4/3.3/3.4); Editor vê apenas visualização (sem ações de gestão).
- **Exibe também a quantidade de membros do time** no cabeçalho da tela.

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Time (contexto) | Contagem + lista de membros | Skeleton de linhas | Time só com o usuário: CTA "Convidar membro" em destaque | Erro + retry | Ações refletem sem reload |

#### Critérios de Aceite

**AC1: conteúdo da linha**
```
Given pertenço ao time A com 5 membros
When acesso o item Time
Then vejo os 5 membros com nome, e-mail, função e por quem foram convidados
  And o cabeçalho exibe a contagem de membros
```

**AC2: three-dot respeita a faixa**
```
Given sou Editor
When abro o three-dot de um membro na tela Time
Then não vejo ações de gestão (editar função, remover, inativar)
```

**AC3: convite pré-contextualizado**
```
Given estou na tela Time do time A
When aciono "Convidar membro"
Then o modal de convite abre com o time A pré-selecionado
```

#### Edge Cases
- [ ] **Convidante do membro foi removido do workspace:** coluna "convidado por" preserva o nome histórico (dado do log interno).
- [ ] **Membro em múltiplos times:** a tela mostra apenas o vínculo com o time atual (sem listar os demais — isso é da Gestão, Story 3.1).

#### Out of Scope
- Gestão completa de membros do workspace (Story 3.1).

---
