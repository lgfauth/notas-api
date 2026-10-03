# Constitution - Notas API

Princípios não-negociáveis que toda spec, plano, tarefa e código seguem.
1. Camadas explícitas. Dependências fluem http/cli --> service --> store. Domínio não faz IO.
2. Validação na fronteira. Toda entrada externa é validada com zod antes de virar dmínio.
3. Erros são de domínio. Falhas previsíveis viram classes de erro, traduzidas em status/saida na borda.
4. Teste é parte da tarefa. nenhuma lógica nova entra sem testes. typecheck e teste sempre tem que estarem verdes.
5. Segurança por padrão. Sem segredos no repo. Ações destrutivas passam por guardrails (deny list + pre-commit), nao pela confiança no modelo.
6. Speck antes do código. Mudanças relevantes passam por spec --> plan --> task --> implement, com revisão humana entre as fases.
7. Pequeno e reversível. Cada tarefa cabe em um commit.

## Stack obrigatório

Node 24, Typescript ESM strict, zod, node:test via tsx, node:http
