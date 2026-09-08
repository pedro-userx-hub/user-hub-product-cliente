# Handoff — Loading pós-login (SSO / senha)

Pacote **autocontido** da transição após autenticação bem-sucedida (Okta ou senha), antes de entrar em Estudos.

## Conteúdo deste zip / pasta

| Arquivo | Responsabilidade |
|---|---|
| `LoginEnterTransition.tsx` | UI React (título + barra + passos) |
| `LoginEnterTransition.module.css` | Estilos + **todas** as animações |
| `runLoginEnterSequence.ts` | Timing, copy dos passos, orquestração async |
| `LOGIN_ENTER_HANDOFF.md` | Este documento |

## Pré-requisito de CSS

O `.module.css` usa tokens do design system (`--space-*`, `--color-*`, `--radius-*`, `--font-*`, etc.). No app UserX eles vêm de `@userx/ui`. Se portar para outro projeto, mapeie esses tokens ou substitua pelos valores do DS.

## Comportamento

1. Auth ok → mostrar `LoginEnterTransition`.
2. Título: **Autenticando…** (`LOGIN_ENTER_TITLE`).
3. Passos um a um (fade-in):
   - Reunindo seus estudos…
   - Buscando os melhores participantes…
   - Preparando tudo para você começar…
   - Acessando a sua área de trabalho…
4. Ativo = pulso; concluído = check.
5. Após o último passo + `afterLastMs` → navegar (Estudos / home).

## Timing

```ts
firstStepMs: 420
stepMs:     900
afterLastMs: 550
```

## Uso mínimo

```tsx
import { useState } from "react";
import { LoginEnterTransition } from "./LoginEnterTransition";
import {
  LOGIN_ENTER_STEPS,
  LOGIN_ENTER_TITLE,
  runLoginEnterSequence,
} from "./runLoginEnterSequence";

const [completedCount, setCompletedCount] = useState(0);
let cancelled = false;

const result = await runLoginEnterSequence({
  isCancelled: () => cancelled,
  onStep: setCompletedCount,
});
if (result === "completed") {
  // navigate("/estudos")
}

<LoginEnterTransition
  title={LOGIN_ENTER_TITLE}
  steps={LOGIN_ENTER_STEPS}
  completedCount={completedCount}
/>
```

## Animações

- Bloco: `enter-in` (~420ms)
- Passo novo: `fade-up` (~420ms)
- Spinner: `pulse` (loop)
- Barra: transition de `width` (~640ms)

## Aceite

- [ ] Título **Autenticando…** acima da barra
- [ ] 4 passos na ordem, um a um
- [ ] Check no concluído, pulso no atual
- [ ] Redirect só depois do último + `afterLastMs`
- [ ] Cancelar/reset no meio não navega
