# Handoff — Loading pós-login (SSO / senha)

Pacote autocontido da transição **após** autenticação bem-sucedida (Okta ou senha), **antes** de entrar em Estudos.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `LoginEnterTransition.tsx` + `.module.css` | UI: título, barra de progresso, passos, animações |
| `runLoginEnterSequence.ts` | Timing da sequência (ms) + orquestração async |
| `OktaSignInModal.tsx` | Modal Okta (antes desta transição) |
| `../../lib/messages.ts` | Copy (`loginEnterTitle`, `loginEnterStep*`) |
| `../../pages/LoginPage.tsx` | Integração (chama a sequência e monta o componente) |

## Comportamento

1. Auth ok (SSO callback ou senha `123` no protótipo).
2. Tela de login troca o formulário por `LoginEnterTransition`.
3. Título fixo: **Autenticando…**
4. Passos aparecem **um a um** (fade-in):
   - Reunindo seus estudos…
   - Buscando os melhores participantes…
   - Preparando tudo para você começar…
   - Acessando a sua área de trabalho…
5. Passo ativo = spinner (pulso); concluído = check verde.
6. Barra de progresso acompanha os passos.
7. Após o último passo (~550ms), navega para Estudos.

## Timing

```ts
firstStepMs: 420   // até concluir o 1º
stepMs:     900   // entre os demais
afterLastMs: 550  // após o último, antes do redirect
```

Fonte: `LOGIN_ENTER_TIMING` em `runLoginEnterSequence.ts`.

## API (uso mínimo)

```tsx
import { LoginEnterTransition } from "./LoginEnterTransition";
import {
  LOGIN_ENTER_STEPS,
  runLoginEnterSequence,
} from "./runLoginEnterSequence";

// estado
const [completedCount, setCompletedCount] = useState(0);

// ao autenticar
const result = await runLoginEnterSequence({
  isCancelled: () => cancelled,
  onStep: setCompletedCount,
});
if (result === "completed") navigate("/estudos");

// render
<LoginEnterTransition
  title="Autenticando…"
  steps={LOGIN_ENTER_STEPS}
  completedCount={completedCount}
/>
```

## Animações (CSS)

- Entrada do bloco: `enter-in` (~420ms)
- Cada passo novo: `fade-up` (~420ms)
- Spinner do ativo: `pulse` (loop)
- Barra: `width` com transition ~640ms
- Check / cores: transitions ~280ms

Tudo em `LoginEnterTransition.module.css` — copiar o módulo junto do componente.

## Fora deste pacote

- Erro pós-SSO (tela “Não foi possível autenticar”) — ainda em `LoginPage`
- Modal Okta — `OktaSignInModal`
- Barra DEV de edge cases — `src/dev/` (não é produto)

## Aceite rápido

- [ ] Título **Autenticando…** acima da barra
- [ ] 4 passos na ordem acima, um a um
- [ ] Check no concluído, pulso no atual
- [ ] Redirect só depois do último + `afterLastMs`
- [ ] Cancelar/reset no meio não navega
