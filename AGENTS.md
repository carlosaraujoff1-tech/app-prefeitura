This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

# SAP Cidadão — regras do projeto

App oficial da Prefeitura de Santo Antônio da Platina (PR). Dono técnico: Carlos (único de TI, não é programador).
**Sempre** responda em português do Brasil, simples e sem jargão; diga o que ele precisa fazer e o que você fez.
Leia `docs/DOSSIE-TECNICO.md` antes de começar qualquer tarefa.

## Regras de trabalho
1. Antes de usar qualquer recurso do Expo/EAS/React Native, leia a documentação da versão do `package.json` (SDK 58). Instale pacotes com `npx expo install`.
2. Rode `npx tsc --noEmit` e `npx expo lint` antes de dizer que terminou. Nunca edite `ios/` e `android/` (use `app.json` e config plugins).
3. Todo SQL entra em `supabase/migrations/` (nome com data) **e** é aplicado no projeto Supabase `jgmcmdkbmuhpfjbykgbg`. Teste regras com blocos que são desfeitos (exemplos em `supabase/testes/`).
4. Mudanças pequenas e testáveis. Seja honesto: se não testou, diga que não testou.
5. Nunca peça senhas/tokens/chaves no chat. Diga onde colocar (Supabase → Edge Functions → Secrets, ou expo.dev → Environment variables) e use só o NOME da variável.
6. Avise antes de mudar `eas.json`, `app.json`, nome do pacote ou `google-services.json` (muda o fingerprint: APKs de teste deixam de receber atualização). O pacote `br.gov.pr.santoantoniodaplatina.sapcidadao` é definitivo.
7. Imagens enviadas pelo painel: recorte na proporção do campo e converta para WebP antes de subir.
8. Peça confirmação antes de ação irreversível ou em produção (apagar dados, publicar na loja, cobrança).
9. Segurança é no banco (RLS + funções `security definer`). O app nunca decide quem pode o quê.
10. Prioridade do projeto: **velocidade** (cidade de ~50 mil habitantes, celulares simples, internet fraca) e **acessibilidade** (idosos: contraste, letra grande, botões ≥ 48 px).
11. O painel web (`painel/`) não pode importar módulos do app que puxem `react-native`.
