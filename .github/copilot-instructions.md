# Memória do projeto

## Stack
- Node 24 LTS; TypeScript ESM em modo strict.
- Zod valida dados nas fronteiras HTTP e CLI.
- Testes com `node:test` via `tsx`; sem framework HTTP: `node:http` é intencional.

## Comandos
- `npm run dev` — API em `localhost:3000`.
- `npm run cli` — CLI.
- `npm test` — testes.
- `npm run typecheck` — verificação de tipos.

## Estrutura
- `src/domain`: tipos e schemas Zod; sem IO.
- `src/store`: persistência in-memory atrás de interface.
- `src/service`: regras de negócio.
- `src/http`: API HTTP.
- `src/cli.ts`: CLI.
- `specs/`: especificações spec-driven.

## Convenções
- Camadas não pulam: `http`/`cli` → `service` → `store`.
- Valide com Zod toda entrada externa.
- Erros de domínio são classes, traduzidas na borda HTTP/CLI.
- Lógica nova nasce com testes; `typecheck` e `test` devem permanecer verdes.
- Nunca commitar segredos. Não ler `.env`.

## Fluxo de trabalho
- `/especificar` → `/planejar` → `/tarefas` → `/implementar`.
- Exija revisão humana entre as fases; mantenha os artefatos em `specs/`.
