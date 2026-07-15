> Fatia do spec `Perfis e Permissões (Workspace) · v1`. As regras transversais (matriz de permissões, regras globais, catálogo de mensagens) estão em `.cursor/rules/governanca.mdc` e valem para TODA implementação.

## Módulo 4 — Convites (ciclo de vida)

### Story 4.1: Aceite do convite

**Prioridade:** P1 · **Dependências:** 3.2

#### User Story
> **Como** pessoa convidada,
> quero **aceitar o convite e entrar direto no time certo com a função certa**,
> para **começar a usar sem configurar nada**.

#### Contexto
O aceite fecha o ciclo do valor da feature. Estados do convite: **Pendente → Ativo** (aceito) / **Expirado** (7 dias) / **Excluído** (revogado). O e-mail de convite informa workspace, quem convidou, função e time(s).

#### Fluxo

**Entry points:** CTA no e-mail de convite.

**Happy path:**
1. Convidada clica no link do e-mail.
2. Tela de aceite: nome do workspace, função e time(s); campos de criação de conta (nome, sobrenome, senha) — ou login, se já tiver conta na plataforma sem workspace.
3. Conclui → status do convite vira Ativo; entra autenticada em Estudos no contexto do time do convite.

**Caminhos alternativos e de erro:**
- **Convite Expirado:** tela informativa "Convite expirado — peça um novo a quem te convidou" (sem expor dados do workspace).
- **Convite Excluído (revogado):** tela "Este convite não está mais disponível".
- **Convite já aceito (clique repetido no link):** redireciona para login.
- **Convidada já pertence a outro workspace:** bloqueio com mensagem e orientação de contato com suporte (restrição vigente — OQ1).

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Aceite do convite | Contexto do convite + formulário | Botão em spinner | n/a | Expirado/revogado: telas informativas dedicadas | Autenticada no time de destino |

#### Critérios de Aceite

**AC1: aceite entrega o contexto prometido**
```
Given recebi convite como Observador no time "Descoberta"
When concluo o aceite
Then meu status vira Ativo com função Observador
  And caio em Estudos no contexto de "Descoberta"
  And não vejo o bloco de créditos
```

**AC2: convite expirado não entra**
```
Given meu convite expirou há 1 dia
When clico no link do e-mail
Then vejo a tela de convite expirado
  And nenhuma conta é criada
```

**AC3: link é de uso único**
```
Given já aceitei meu convite
When clico no link novamente
Then sou levada ao login (nenhum novo vínculo é criado)
```

#### Edge Cases
- [ ] **Função/time do convite editados (3.3) antes do aceite:** aceite aplica o estado mais recente do convite.
- [ ] **Time do convite excluído/inativado antes do aceite:** aceite entra no workspace em estado "sem time" com orientação — e alerta é exibido a quem geriu o time no momento da ação (2.5/2.6).
- [ ] **Convite aberto em outro dispositivo/browser:** funciona — o vínculo é do token, não da sessão.

#### Out of Scope
- SSO (non-goal v1).

---

### Story 4.2: Reenviar e revogar convite; expiração

**Prioridade:** P1 · **Dependências:** 3.2

#### User Story
> **Como** Dono ou Administrador,
> quero **reenviar ou revogar convites pendentes**,
> para **destravar convites perdidos e cortar acessos enviados por engano**.

#### Contexto
Ações no three-dot de membros Pendentes (lista 3.1). Reenvio gera novo link e invalida o anterior. Revogação move o convite para Excluído. Expiração é automática (7 dias) — expirado pode ser reenviado. **Qualquer Dono ou Administrador com escopo sobre o time do convite pode gerir o convite, independente de quem convidou** (nada de convite órfão).

#### Fluxo

**Entry points:** three-dot do membro Pendente > "Reenviar convite" / "Revogar convite".

**Happy path (reenviar):**
1. Admin aciona Reenviar em um pendente.
2. Novo e-mail disparado; link anterior invalidado; prazo de expiração reiniciado.
3. Toast de confirmação; status permanece Pendente.

**Caminhos alternativos e de erro:**
- **Revogar:** confirmação leve → status Excluído; some da lista default (visível no filtro de status).
- **Convite Expirado:** three-dot oferece "Reenviar" (reativa o ciclo) e "Excluir".

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Lista (linha pendente) | Badge Pendente + ações no three-dot | Spinner na ação | n/a | Toast de erro + retry | Toast; badge/status atualizado |

#### Critérios de Aceite

**AC1: reenvio invalida o link anterior**
```
Given um convite Pendente enviado há 3 dias
When aciono Reenviar
Then um novo e-mail é enviado e o prazo reinicia
  And o link antigo passa a exibir a tela de convite inválido
```

**AC2: revogação corta o aceite**
```
Given um convite Pendente
When o revogo
Then o status vira Excluído
  And o link do e-mail passa a exibir "convite não está mais disponível"
```

**AC3: gestão independe do convidante**
```
Given um convite Pendente criado por um Editor que foi removido do workspace
When um Administrador do time abre o three-dot desse pendente
Then as ações Reenviar e Revogar estão disponíveis
```

#### Edge Cases
- [ ] **Reenviar no exato momento em que a convidada aceita pelo link antigo:** aceite em andamento vence; reenvio retorna "convite já aceito".
- [ ] **Expiração durante a sessão de aceite (formulário aberto):** validação no submit; tela de expirado.

#### Out of Scope
- Notificação automática de expiração para quem convidou (fora da v1).

---
