# Tarefas: Gerenciamento de tarefas

## Decisões consideradas

- Persistir em arquivo JSON dentro de `data/`, na raiz do projeto.
- Usar `PATCH /tasks/:id` com corpo `{ "status": "done" }` para concluir.
- Usar os subcomandos `create --title`, `list --filter`, `complete <id>` e `remove <id>`.
- Aparar espaços periféricos do título antes de armazená-lo.
- Proteger escritas concorrentes entre processos com lock.

## Lista de tarefas

- [x] 1. **Definir modelo, validações e erros de domínio**
  - **Objetivo:** Criar os tipos de tarefa, schemas Zod para título, estado, filtro e identificador, além dos erros de domínio necessários.
  - **Arquivos:** `src/domain/task.ts`, `src/domain/task-errors.ts` e testes de domínio em `src/domain/*.test.ts`.
  - **Pronto quando:** Testes verificam ID, título aparado e não vazio, estado inicial `open`, filtros aceitos (`all`, `open`, `done`) e rejeição de valores inválidos; `npm test` e `npm run typecheck` passam.
  - **Dependências:** Nenhuma.

- [x] 2. **Implementar store JSON persistente com lock**
  - **Objetivo:** Definir a interface do store e implementar leitura/gravação em `data/tasks.json`, com caminho injetável, inicialização do arquivo, validação dos dados lidos, escrita atômica e lock entre processos para operações de escrita.
  - **Arquivos:** `src/store/task-store.ts`, `src/store/json-task-store.ts` e testes em `src/store/*.test.ts`.
  - **Pronto quando:** Testes isolados em diretório temporário verificam persistência após recriar o store, arquivo/diretório ausente, JSON corrompido e falhas de IO sem sucesso falso; teste com processos concorrentes confirma que gravações não perdem atualizações. A falha ao obter lock deve ser explícita, com liberação garantida ao terminar a operação.
  - **Dependências:** 1.

- [x] 3. **Implementar regras de negócio de tarefas**
  - **Objetivo:** Criar o serviço para criação, listagem filtrada, conclusão idempotente e remoção apenas de tarefas abertas, usando o store e os erros de domínio.
  - **Arquivos:** `src/service/task-service.ts` e testes em `src/service/*.test.ts`.
  - **Pronto quando:** Testes cobrem criação com ID único e estado aberto, filtros e filtro padrão, conclusão e repetição, IDs inexistentes e recusa de remoção de tarefa concluída sem removê-la; não há dependência de HTTP no serviço.
  - **Dependências:** 1, 2.

- [x] 4. **Implementar API HTTP para tarefas**
  - **Objetivo:** Criar servidor `node:http` e expor os contratos HTTP, validando entradas com Zod e traduzindo erros de domínio em respostas explícitas.
  - **Arquivos:** `src/http/server.ts` e testes em `src/http/*.test.ts`.
  - **Pronto quando:** Testes HTTP cobrem `POST /tasks`, `GET /tasks` com e sem filtros, `PATCH /tasks/:id` com `{ "status": "done" }`, `DELETE /tasks/:id`, status de sucesso/erro, validação e casos idempotentes; IDs inexistentes retornam não encontrado e remoção de concluída é recusada.
  - **Dependências:** 3.

- [x] 5. **Implementar comandos da CLI**
  - **Objetivo:** Implementar `create --title <texto>`, `list [--filter all|open|done]`, `complete <id>` e `remove <id>`, validando argumentos antes de chamar o serviço.
  - **Arquivos:** módulo de CLI testável em `src/cli.ts` e testes em `src/cli.test.ts`.
  - **Pronto quando:** Testes cobrem argumentos e filtros válidos/inválidos, saída das operações, erros de domínio e códigos de saída de sucesso/falha; nenhuma regra de negócio é duplicada na CLI.
  - **Dependências:** 3.

- [x] 6. **Compor as interfaces e verificar compartilhamento**
  - **Objetivo:** Ligar servidor e CLI ao mesmo caminho de armazenamento padrão e verificar compartilhamento, persistência após reinicialização e operação entre interfaces.
  - **Arquivos:** `src/index.ts`, composição compartilhada se necessária, integrações em `src/**/*.test.ts` e ajustes na composição de `src/cli.ts`.
  - **Pronto quando:** Testes de integração criam ou alteram tarefas por uma interface e consultam pela outra; reconstruir as composições com o mesmo arquivo preserva tarefas e estados; API e CLI usam o caminho `data/tasks.json` da raiz do projeto.
  - **Dependências:** 4, 5.

- [x] 7. **Documentar uso e validar a entrega**
  - **Objetivo:** Documentar os comandos e a persistência local, ignorar os dados runtime no Git e rodar as verificações do projeto.
  - **Arquivos:** `README.md`, `.gitignore`.
  - **Pronto quando:** README descreve as operações HTTP/CLI e `data/tasks.json`; `/data/` está ignorado; `npm test` e `npm run typecheck` passam.
  - **Dependências:** 6.
