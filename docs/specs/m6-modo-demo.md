> Fatia do spec `Perfis e Permissões (Workspace) · v1`. As regras transversais (matriz de permissões, regras globais, catálogo de mensagens) estão em `.cursor/rules/governanca.mdc` e valem para TODA implementação.

## Módulo 6 — Modo Demo de Permissões

### Story 6.1: Modo demo (protótipo navegável de permissões)

**Prioridade:** P1 · **Dependências:** 1.1–1.5, 5.1

#### User Story
> **Como** designer/PM apresentando a feature (e como cliente avaliando),
> quero **alternar entre as quatro funções e ver as opções da interface aparecerem/desaparecerem**,
> para **entender na prática o que cada função enxerga, sem precisar de contas reais**.

#### Contexto
Artefato navegável com dados **mockados** — serve para validação interna, apresentação a stakeholders e material de rollout assíncrono (a dor da empresa W: clientes difíceis de agendar). Não é tela de produção: nenhuma ação grava dados.

#### Requisitos

**Seletor de função (persona):** controle visível que alterna entre as quatro funções. Cada função é encarnada por uma **persona mockada com contexto próprio** (times diferentes), para facilitar a visualização:

| Persona (mock) | Função | Times (mock) |
|---|---|---|
| Pedro | Dono do Workspace | todos |
| Ícaro | Administrador | Descoberta, Produto |
| Maria | Editor | Descoberta, Concorrentes |
| Renata | Observador | Descoberta |

**Matriz de visibilidade do demo (o que cada função vê):**

| Superfície | Dono | Administrador | Editor | Observador |
|---|:---:|:---:|:---:|:---:|
| Estudos | ✓ | ✓ | ✓ | ✓ |
| Créditos B2B/B2C no topo de Estudos | ✓ | ✓ | ✓ | — |
| Financeiro (consumo do time) | ✓ | ✓ | ✓ | — |
| Time (membros + contagem) | ✓ | ✓ | ✓ | — |
| Gestão do Workspace → Times, Membros | ✓ | ✓ | — | — |
| Gestão do Workspace → Balanço | ✓ | — | — | — |

**Troca de time:** personas com múltiplos times trocam de contexto pelo seletor do menu (times mockados); Estudos, Financeiro e Time refletem o time selecionado.

**Comportamento de transição:** ao trocar de função, itens de menu e blocos de tela **desaparecem/aparecem** conforme a matriz — a transição deve ser perceptível (não um reload seco), pois o contraste entre funções é o próprio conteúdo da demonstração.

#### Critérios de Aceite

**AC1: alternância de função reflete a matriz**
```
Given estou no modo demo como Dono
When alterno para Observador (Renata)
Then o menu passa a exibir somente Estudos
  And o bloco de créditos do topo desaparece
  And a entrada Gestão do Workspace desaparece
```

**AC2: personas carregam contexto de times**
```
Given estou como Maria (Editor)
When abro o seletor de time
Then vejo Descoberta e Concorrentes (mock)
  And ao trocar, Estudos e Financeiro refletem o time selecionado
```

**AC3: demo é inerte**
```
Given estou em qualquer tela do modo demo
When aciono qualquer ação (three-dot, convidar, criar)
Then nenhum dado real é criado ou alterado
```

#### Edge Cases
- [ ] **Função atual não tem acesso à tela aberta (ex.: estava em Financeiro e virou Observador):** demo redireciona para Estudos.
- [ ] **Persona de um único time (Renata):** seletor exibe o nome sem controle de troca (consistente com 1.1).

#### Out of Scope
- Persistência de estado, integração com dados reais, modo demo dentro do produto em produção (avaliar futuramente como ferramenta de onboarding/vendas).

---
