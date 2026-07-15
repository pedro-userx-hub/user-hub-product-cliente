> Fatia do spec `Perfis e Permissões (Workspace) · v1`. As regras transversais (matriz de permissões, regras globais, catálogo de mensagens) estão em `.cursor/rules/governanca.mdc` e valem para TODA implementação.

## Módulo 5 — Balanço do Workspace

### Story 5.1: Ver saldos do workspace (read-only)

**Prioridade:** P1 · **Dependências:** 1.3

#### User Story
> **Como** Dono do Workspace,
> quero **ver os créditos B2B e B2C alocados ao workspace**,
> para **acompanhar a carteira da organização em um lugar só**.

#### Contexto
Tela **exclusiva do Dono**, dentro de Gestão do Workspace. Estritamente read-only na v1: nenhuma ação de pedir, alocar ou transferir. É a semente do futuro painel de gestão de carteira.

#### Fluxo

**Entry points:** Gestão do Workspace > Balanço.

**Happy path:**
1. Dono acessa Balanço.
2. Sistema exibe: saldo total do workspace segmentado em B2B e B2C + soma alocada aos times vs. disponível no workspace.

**Caminhos alternativos e de erro:**
- **Administrador/Editor/Observador:** item de menu inexistente; URL direta → sem-permissão (mesma da 1.3).

#### Estados de tela

| Tela | Default | Loading | Vazio | Erro | Sucesso |
|------|---------|---------|-------|------|---------|
| Balanço | Saldos B2B/B2C + distribuição por time (read-only) | Skeleton nos cards | Workspace sem créditos: saldos zerados + orientação de contatar CX para recarga | Erro + retry | — |

#### Critérios de Aceite

**AC1: exclusividade do Dono**
```
Given sou Administrador
When acesso a URL do Balanço diretamente
Then recebo sem-permissão e nenhum dado financeiro é retornado
```

**AC2: leitura pura**
```
Given sou Dono no Balanço
When examino a tela
Then não existe nenhuma ação de alocar, transferir ou solicitar créditos
```

**AC3: consistência com os times**
```
Given os times A e B têm 100 e 50 créditos B2C
When vejo o Balanço
Then a soma alocada aos times bate com os valores exibidos na lista de Times (2.2)
```

#### Edge Cases
- [ ] **Divergência de números entre Balanço e lista de Times (cache):** ambas as superfícies leem da mesma fonte; sem cache independente por tela.

#### Out of Scope
- Histórico (Story 5.2); qualquer ação de gestão de carteira (non-goal v1).

---

### Story 5.2: Histórico de recargas e alocações — *P2, resumida*

**Prioridade:** P2 · **Dependências:** 5.1

#### User Story
> **Como** Dono do Workspace,
> quero **ver o histórico de recargas do workspace e de alocações de créditos aos times**,
> para **entender de onde vieram e para onde foram os créditos**.

#### ACs principais
```
Given sou Dono no Balanço
When abro o histórico
Then vejo uma tabela cronológica com: data, tipo (Recarga | Alocação a time), time de destino (quando alocação), tipo de crédito (B2B/B2C) e quantidade
  And nenhuma linha oferece ação (read-only)

Given o workspace nunca teve movimentação
When abro o histórico
Then vejo empty state explicando que recargas e alocações aparecerão aqui
```

#### Edge Cases
- [ ] **Histórico longo (anos):** paginação + filtro por período e por time.
- [ ] **Alocação para time posteriormente excluído:** linha preservada com nome do time + marcador "(excluído)".

---
