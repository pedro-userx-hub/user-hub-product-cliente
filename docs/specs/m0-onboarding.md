> Fatia do spec `Perfis e Permissões (Workspace) · v1`. As regras transversais (matriz de permissões, regras globais, catálogo de mensagens) estão em `.cursor/rules/governanca.mdc` e valem para TODA implementação.

## Módulo 0 — Onboarding

### Story 0.1: Primeiro acesso do Dono

**Prioridade:** P1 · **Dependências:** — (workspace e Dono já criados pelo CX)

#### User Story
> **Como** Dono do Workspace recém-criado,
> quero **nomear meu time inicial e convidar as primeiras pessoas no meu primeiro acesso**,
> para **começar a usar a plataforma sem depender do CX para configurar nada**.

#### Contexto
Hoje o CX cria o workspace e adiciona cada usuário manualmente. A estratégia registrada no board é: CX cria workspace + Dono; todo o resto migra para a camada do cliente. Este é o momento de maior risco de resistência — o fluxo precisa ser completável em menos de 1 minuto e 100% pulável.

#### Fluxo

**Entry points:** link de primeiro acesso recebido por e-mail (enviado na criação do workspace pelo CX).

**Happy path:**
1. Dono clica no link do e-mail e autentica (fluxo de senha existente).
2. Sistema exibe passo único de boas-vindas: campo "Nome do seu primeiro time" (pré-preenchido com "Time 1") + bloco opcional "Convide sua equipe" (e-mails, função, já vinculados ao time inicial).
3. Dono ajusta o nome, adiciona 3 e-mails como Editor e confirma.
4. Sistema cria o time, dispara os convites e redireciona para **Estudos** no contexto do time criado, com toast "Time criado e 3 convites enviados".

**Caminhos alternativos e de erro:**
- **Dono clica "Pular":** time inicial criado como "Time 1", sem convites; Dono cai em Estudos (vazio). Tudo pode ser feito depois pela Gestão do Workspace.
- **E-mail inválido no bloco de convite:** validação inline por chip de e-mail; e-mails válidos não são bloqueados pelos inválidos.
- **Link de primeiro acesso expirado:** tela informando expiração + CTA "Reenviar link" (dispara novo e-mail).

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Boas-vindas (passo único) | Campo nome pré-preenchido + convites opcionais | Botão confirma em spinner, campos bloqueados | n/a (sempre há default) | Erro inline por campo; erro global mantém dados preenchidos | Redirect para Estudos + toast |

#### Critérios de Aceite

**AC1: onboarding completável em um passo**
```
Given sou Dono em primeiro acesso ao workspace
When confirmo o passo de boas-vindas com nome de time válido
Then o time é criado com o nome informado
  And sou redirecionado para Estudos no contexto desse time
```

**AC2: onboarding é pulável sem perda**
```
Given estou no passo de boas-vindas
When clico em "Pular"
Then o time inicial é criado como "Time 1"
  And nenhum convite é enviado
  And consigo executar as mesmas ações depois via Gestão do Workspace
```

**AC3: convites disparados no onboarding carregam time e função**
```
Given preenchi 3 e-mails com função Editor no passo de boas-vindas
When confirmo
Then 3 convites são criados com status Pendente, função Editor e vínculo ao time inicial
  And cada e-mail recebe a mensagem de convite
```

**AC4: nome de time validado**
```
Given estou no passo de boas-vindas
When digito um nome com menos de 2 ou mais de 100 caracteres
Then vejo erro inline e o botão de confirmação permanece desabilitado
```

#### Edge Cases
- [ ] **Dono abandona a tela sem confirmar nem pular (fecha o browser):** no próximo login, o passo de boas-vindas reaparece; nada foi criado ainda.
- [ ] **Dono convida o próprio e-mail:** chip rejeitado inline ("Você já está no workspace").
- [ ] **Nome de time com emoji/caracteres especiais:** aceito (contam para o limite de caracteres).
- [ ] **Duplo clique em confirmar:** requisição idempotente — 1 time, 1 lote de convites.

#### Out of Scope
- Tour de produto/walkthrough (fora deste épico).
- Criação do workspace e do Dono (nível interno — resolvido).

---
