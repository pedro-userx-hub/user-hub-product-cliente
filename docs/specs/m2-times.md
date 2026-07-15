> Fatia do spec `Perfis e Permissões (Workspace) · v1`. As regras transversais (matriz de permissões, regras globais, catálogo de mensagens) estão em `.cursor/rules/governanca.mdc` e valem para TODA implementação.

## Módulo 2 — Times

### Story 2.1: Criar time

**Prioridade:** P1 · **Dependências:** 1.3

#### User Story
> **Como** Dono ou Administrador,
> quero **criar um time com nome e membros iniciais**,
> para **organizar as pessoas e os estudos por frente de trabalho**.

#### Contexto
Times são agrupamentos flexíveis (frentes de pesquisa, não organograma). Criar precisa caber em um modal: nome + seleção opcional de membros já existentes no workspace. Quem cria o time passa a pertencer a ele (no caso do Administrador, é o que garante seu escopo de gestão sobre o time criado).

#### Fluxo

**Entry points:** botão "+ Criar time" na seção Gestão > Times; ação "+ Criar time" no dropdown do seletor (Story 1.1).

**Happy path:**
1. Usuário clica em "+ Criar time".
2. Modal: campo Nome + multi-select "Adicionar membros" (busca entre membros ativos do workspace) — opcional.
3. Usuário nomeia, seleciona 2 membros e confirma.
4. Sistema cria o time, vincula criador + selecionados, fecha o modal e mostra o time na lista com toast de sucesso.

**Caminhos alternativos e de erro:**
- **Nome duplicado no workspace:** erro inline "Já existe um time com esse nome".
- **Nome fora de 2–100 caracteres:** erro inline, confirmação desabilitada.
- **Criar sem membros adicionais:** permitido; time nasce só com o criador.
- **Falha de rede ao confirmar:** modal permanece aberto com dados preservados + mensagem de erro com retry.

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Modal criar time | Nome vazio, multi-select vazio | Botão em spinner, campos bloqueados | Busca de membros sem resultado: "Nenhum membro encontrado" | Inline por campo; global preserva dados | Fecha modal, toast, time na lista |

#### Critérios de Aceite

**AC1: criação com membros**
```
Given sou Dono na seção Times
When crio o time "Concorrentes" adicionando 2 membros
Then o time aparece na lista com 3 membros (eu + 2)
  And os membros adicionados passam a ver "Concorrentes" no seletor de time
```

**AC2: unicidade de nome**
```
Given existe o time "Pesquisa"
When tento criar outro time chamado "Pesquisa"
Then vejo erro inline e o time não é criado
```

**AC3: administrador cria e pertence**
```
Given sou Administrador
When crio um time
Then sou automaticamente vinculado a ele
  And ele entra no meu escopo de gestão
```

#### Edge Cases
- [ ] **Nome igual diferindo só por maiúsculas ("pesquisa" vs "Pesquisa"):** tratado como duplicado (comparação case-insensitive).
- [ ] **Workspace com centenas de membros no multi-select:** busca assíncrona com paginação, sem carregar tudo.
- [ ] **Membro selecionado é inativado por outro admin antes do confirm:** criação segue; membro inativo é ignorado com aviso no toast ("1 membro não pôde ser adicionado").

#### Out of Scope
- Convidar pessoas de fora do workspace direto na criação do time (fluxo é convidar pela Story 3.2, que já vincula a times).

---

### Story 2.2: Listar times

**Prioridade:** P1 · **Dependências:** 1.3

#### User Story
> **Como** Dono ou Administrador,
> quero **ver os times do workspace com membros, créditos e status**,
> para **ter visão geral e agir a partir de um lugar só**.

#### Contexto
A lista de Times é o hub do módulo: cada time exibe nome, membros (com e-mail), quantidade de créditos, status ativo/inativo e um menu three-dot com o CRUD (editar, adicionar membro, inativar, excluir). Dono vê todos os times; Administrador vê apenas os seus.

#### Fluxo

**Entry points:** Gestão do Workspace > Times.

**Happy path:**
1. Dono acessa a seção Times.
2. Sistema lista todos os times: nome, contagem e avatares de membros, saldo de créditos (B2B/B2C), status, three-dot.
3. Dono expande um time e vê a lista de membros com nome + e-mail + função.
4. Pelo three-dot, aciona editar / adicionar membro / inativar / excluir.

**Caminhos alternativos e de erro:**
- **Administrador:** lista contém apenas times aos quais pertence.
- **Time inativo:** linha com visual de inativo + badge; three-dot oferece "Reativar".

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Lista de times | Times com membros, créditos, status, three-dot | Skeleton de linhas | Só o time inicial: destaque + CTA "+ Criar time" | Falha de carga: estado de erro + retry | Ações refletem na lista sem reload |

#### Critérios de Aceite

**AC1: conteúdo da linha**
```
Given sou Dono com 3 times no workspace
When acesso Gestão > Times
Then cada time exibe nome, membros (nome + e-mail), créditos B2B/B2C, status e menu de ações
```

**AC2: escopo do Administrador**
```
Given sou Administrador dos times A e B em um workspace com 5 times
When acesso Gestão > Times
Then vejo apenas A e B
```

**AC3: crédito é read-only**
```
Given estou na lista de times
When interajo com o valor de créditos de um time
Then nenhuma ação de edição/alocação é oferecida
```

#### Edge Cases
- [ ] **Time com dezenas de membros:** exibir os 5 primeiros avatares + "+N"; expansão com busca interna.
- [ ] **Workspace com dezenas de times:** busca por nome no topo da lista.

#### Out of Scope
- Ações do three-dot em si (Stories 2.3–2.6).

---

### Story 2.3: Editar time (renomear)

**Prioridade:** P1 · **Dependências:** 2.2

#### User Story
> **Como** Dono ou Administrador do time,
> quero **renomear um time**,
> para **manter a organização fiel às frentes de trabalho, que mudam**.

#### Fluxo

**Entry points:** three-dot da lista de times > "Editar".

**Happy path:**
1. Usuário aciona Editar → modal com o nome atual.
2. Altera o nome e confirma.
3. Lista atualiza; nome novo reflete no seletor de time de todos os membros.

**Caminhos alternativos e de erro:**
- **Nome duplicado / fora do limite:** mesma validação da criação (2.1).

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Modal editar | Nome atual preenchido | Botão em spinner | n/a | Inline por campo | Fecha, toast, lista atualizada |

#### Critérios de Aceite

**AC1: renomear propaga**
```
Given o time "Time 1" tem 4 membros
When o Dono o renomeia para "Descoberta"
Then todos os membros passam a ver "Descoberta" no seletor
  And os estudos vinculados permanecem intactos
```

**AC2: validação idêntica à criação**
```
Given existe o time "Pesquisa"
When tento renomear outro time para "Pesquisa"
Then vejo erro inline e nada é salvo
```

#### Edge Cases
- [ ] **Dois admins editando o mesmo time simultaneamente:** última escrita vence; o segundo recebe o dado atualizado ao reabrir.

#### Out of Scope
- Editar membros do time (Story 2.4) e status (2.5).

---

### Story 2.4: Adicionar/remover membro do workspace em um time

**Prioridade:** P1 · **Dependências:** 2.2, 3.1

#### User Story
> **Como** Dono ou Administrador do time,
> quero **adicionar membros já existentes no workspace a um time (e removê-los dele)**,
> para **ajustar a composição dos times sem passar por novo convite**.

#### Contexto
Distinção central do modelo: **convidar** traz gente de fora para o workspace (Story 3.2); **adicionar ao time** só vincula quem já está dentro. A função do membro não muda — é global.

#### Fluxo

**Entry points:** three-dot do time > "Adicionar membro"; botão dentro do time expandido; remoção pelo three-dot do membro dentro do time.

**Happy path (adicionar):**
1. Admin aciona "Adicionar membro" no time B.
2. Modal com busca entre membros ativos do workspace que ainda não estão em B.
3. Seleciona 2 pessoas, confirma.
4. Membros passam a ver o time B no seletor; contagem atualiza.

**Caminhos alternativos e de erro:**
- **Remover membro do time:** confirmação leve ("Fulano perderá acesso aos estudos do time B"). Se for o último time do membro, exibir alerta reforçado — membro fica sem contexto de time (ver edge case).
- **Membro pendente (convite não aceito):** não aparece na busca de adicionar — vínculo de pendentes se edita pelo convite (Story 4.2).

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Modal adicionar | Busca + lista de elegíveis | Spinner na busca | "Todos os membros já estão neste time" | Erro global com retry | Fecha, toast, contagem atualizada |
| Confirmação remover | Nome + consequência | Spinner | n/a | Erro + retry | Toast, lista atualizada |

#### Critérios de Aceite

**AC1: adicionar não altera função**
```
Given Maria é Editor e pertence ao time A
When a adiciono ao time B
Then Maria passa a acessar estudos de A e B
  And sua função continua Editor em ambos
```

**AC2: elegibilidade da busca**
```
Given o time B tem os membros X e Y
When abro "Adicionar membro" em B
Then X e Y não aparecem na busca
  And membros com status Pendente ou Inativo também não aparecem
```

**AC3: remoção preserva o membro no workspace**
```
Given João pertence aos times A e B
When o removo do time B
Then João continua ativo no workspace e no time A
  And perde acesso aos estudos de B
```

#### Edge Cases
- [ ] **Remover o membro do seu último time:** permitido com alerta reforçado; membro fica ativo no workspace mas sem time — ao logar, vê estado "sem time" orientando contatar um administrador (mesmo estado do vazio da Story 1.1).
- [ ] **Membro sendo removido está com a tela aberta no time:** próximo request derruba o contexto (edge já coberto em 1.1).
- [ ] **Estudos criados pelo membro no time do qual saiu:** permanecem no time (estudo pertence ao time, não à pessoa).

#### Out of Scope
- Remover membro do workspace (Story 3.4).

---

### Story 2.5: Ativar/Inativar time — *P2, resumida*

**Prioridade:** P2 · **Dependências:** 2.2

#### User Story
> **Como** Dono,
> quero **inativar um time sem excluí-lo**,
> para **pausar frentes encerradas preservando histórico de estudos**.

#### ACs principais
```
Given um time ativo com estudos concluídos
When o inativo
Then ele some do seletor de contexto dos membros
  And os estudos permanecem acessíveis em modo leitura para Dono/Administrador via Gestão
  And nenhum estudo novo pode ser criado nele

Given um time inativo
When o reativo
Then membros e estudos voltam ao estado anterior sem perda
```

#### Edge Cases
- [ ] **Inativar time com estudo em execução (recrutamento rodando):** bloquear com mensagem "Conclua ou pause os estudos em execução antes de inativar" — inativação nunca interrompe sessões agendadas com participantes.
- [ ] **Membro cujo único time foi inativado:** cai no estado "sem time" (mesmo da Story 2.4).

---

### Story 2.6: Excluir time — *P2, resumida*

**Prioridade:** P2 · **Dependências:** 2.2

#### User Story
> **Como** Dono,
> quero **excluir um time movendo membros e estudos para outro destino**,
> para **eliminar estruturas erradas sem perder pessoas nem histórico**.

#### ACs principais
```
Given um time com membros e estudos
When aciono Excluir
Then sou obrigado a escolher um time de destino para os estudos antes de confirmar
  And membros que pertencem SOMENTE a este time devem ser realocados para um time selecionado no próprio fluxo
  And membros que possuem outros times apenas perdem o vínculo com o time excluído
  And a modal informa explicitamente que os créditos do time retornarão ao Balanço do Workspace
  And a exclusão é registrada no log interno

Given o único time do workspace
When tento excluí-lo
Then a ação é bloqueada ("O workspace precisa de ao menos um time")
```

#### Edge Cases
- [ ] **Excluir time com estudo em execução:** mesmo bloqueio da inativação (2.5).
- [ ] **Time de destino é inativado entre a escolha e o confirm:** validação no confirm; pedir novo destino.
- [ ] **Créditos residuais do time excluído:** retornam ao Balanço do Workspace e geram linha no histórico (5.2) como estorno de alocação.

---
