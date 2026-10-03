# notas-api

Esqueleto de um projeto Node.js com TypeScript (ESM), usando [zod](https://zod.dev) para validação de dados e [tsx](https://tsx.is) para executar TypeScript diretamente.

## Requisitos

- Node.js 20 ou superior
- npm

## Instalação

```bash
git clone <url-do-repositorio>
cd notas-api
npm install
```

## Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Executa `src/index.ts` com `tsx` |
| `npm run cli` | Executa `src/cli.ts` com `tsx` |
| `npm test` | Roda os testes (`src/**/*.test.ts`) com o test runner nativo do Node |
| `npm run typecheck` | Verifica os tipos com `tsc --noEmit` |

## Estrutura

```
notas-api/
├── src/            # código-fonte (ainda vazio)
├── package.json    # "type": "module" (ESM)
├── tsconfig.json   # configuração do TypeScript
└── .gitignore      # node_modules, .env, .env.*, dist
```

## TypeScript

Configuração principal em `tsconfig.json`: `target` ES2022, `module` e `moduleResolution` NodeNext, `strict` ativado, `rootDir` `src` e `outDir` `dist`.

Por usar NodeNext com ESM, imports relativos devem incluir a extensão, por exemplo `import { x } from "./x.js"`.

## Variáveis de ambiente

Arquivos `.env` e `.env.*` são ignorados pelo git. Não versione segredos.

## Observações

- A pasta `src/` ainda não tem arquivos. Até existir ao menos um `.ts`, `npm run typecheck` falha com `TS18003: No inputs were found`.
- Os scripts esperam `src/index.ts`, `src/cli.ts` e arquivos de teste no formato `*.test.ts`.
