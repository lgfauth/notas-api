# Plano técnico: Gerenciamento de tarefas

## 1. Referências e escopo

- Especificação: [`001-gerenciamento-de-tarefas-spec.md`](./001-gerenciamento-de-tarefas-spec.md).
- Objetivo: criar, listar, concluir e remover tarefas pela API HTTP e pela CLI, compartilhando uma coleção persistida entre interfaces e reinícios.
- Persistência definida pelo usuário: arquivo JSON dentro de `data/`, na raiz do projeto.
- Inclui títulos não vazios, estado aberto/concluído, filtros `all`, `open` e `done`, erros para identificadores inexistentes e proteção contra remoção de tarefas concluídas.
- Fora de escopo: edição de título, atributos adicionais, usuários, recuperação de tarefas removidas e exclusão de tarefas concluídas.

## 2. Arquitetura

O projeto ainda não tem arquivos TypeScript em `src/`; os componentes de runtime e seus testes serão novos. O fluxo será `http/cli --> service --> store`, sem IO no domínio.

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/domain/task.ts` | Criar | Definir os tipos de tarefa e schemas Zod do título, estado, filtro e identificador, sem dependência de IO. |
| `src/domain/task-errors.ts` | Criar | Definir erros previsíveis de domínio, como tarefa inexistente e tentativa de remover tarefa concluída. |
| `src/store/task-store.ts` | Criar | Definir a interface de persistência usada pelo serviço, independente do formato de armazenamento. |
| `src/store/json-task-store.ts` | Criar | Implementar o store com leitura e gravação em `data/tasks.json`; receber caminho configurável para isolamento nos testes; criar `data/` e o arquivo quando ausentes. |
| `src/service/task-service.ts` | Criar | Implementar regras de criação, listagem, conclusão idempotente e remoção condicionada ao estado; depender somente do domínio e da interface do store. Preferir funções puras quando possível e nunca importar HTTP. |
| `src/http/server.ts` | Criar | Criar o servidor com `node:http`, validar entradas HTTP na fronteira, chamar o serviço e traduzir erros de domínio para respostas HTTP. |
| `src/cli.ts` | Criar | Validar comandos e argumentos da CLI na fronteira, chamar o serviço e apresentar resultados e erros. |
| `src/index.ts` | Criar | Compor o store JSON, o serviço e o servidor HTTP usando o mesmo caminho de dados da CLI. |
| `src/**/*.test.ts` | Criar | Adicionar testes `node:test`/`tsx` para domínio, serviço, store, HTTP e CLI. |
| `.gitignore` | Alterar | Ignorar `/data/` para não versionar dados persistidos localmente. |
| `README.md` | Alterar | Documentar comandos, operações disponíveis e localização do arquivo de dados, substituindo a descrição atual de `src/` como vazio após a implementação. |

O caminho efetivo deve apontar para `data/tasks.json` na raiz do projeto e ser compartilhado entre API e CLI, não depender de caches por processo, e permitir injeção de caminho temporário nos testes. O store deve reler os dados persistidos a cada operação para que a API e a CLI observem alterações uma da outra. Gravações devem evitar JSON parcial, por exemplo usando arquivo temporário no mesmo diretório e substituição do arquivo principal.

## 3. Modelos de dados e validação

- `Task`: identificador estável e único, título e estado (`open` ou `done`). A criação define estado inicial `open`.
- O identificador pode ser gerado por `crypto.randomUUID()` do Node. Identificadores vindos de HTTP ou CLI devem ser validados como entrada externa.
- Schema de título: string que não fica vazia após desconsiderar espaços em branco. Proposta para revisão: aparar espaços periféricos e persistir o valor aparado; a spec não define se espaços externos devem ser preservados.
- Schema de filtro: enumeração `all`, `open` e `done`. Filtro omitido equivale a `all`; outros valores explícitos são inválidos.
- HTTP valida corpos, parâmetros e query strings com Zod antes de chamar o serviço. A CLI valida comandos e argumentos com Zod antes de chamar o serviço.
- Domínio e serviço mantêm invariantes de negócio, mas não duplicam validação sintática das fronteiras externas sem justificativa.
- Ao ler o JSON, o store valida sua estrutura e propaga erros de leitura, gravação ou corrupção; não deve substituir conteúdo inválido silenciosamente por uma coleção vazia.

## 4. Contratos

Os caminhos e formatos abaixo são propostas, pois a spec define comportamentos observáveis, mas não fixa a sintaxe HTTP ou da CLI.

### API HTTP — proposta REST

- `POST /tasks`: recebe `{ "title": string }`, valida o título e retorna a tarefa criada com status `201`.
- `GET /tasks?filter=all|open|done`: filtro opcional, padrão `all`; retorna uma lista. Filtro inválido resulta em `400`.
- `POST /tasks/:id/complete`: conclui uma tarefa aberta; chamada repetida mantém a tarefa concluída e retorna a tarefa. ID inexistente resulta em `404`.
- `DELETE /tasks/:id`: remove uma tarefa aberta. ID inexistente resulta em `404`; tarefa concluída resulta em `409`, sem removê-la.
- Entrada inválida resulta em `400`, com erro JSON explícito. Respostas de sucesso também usam JSON.

Alternativa para conclusão: `PATCH /tasks/:id`, que é mais genérica, mas exige definir corpo e semântica de atualização. A rota explícita de conclusão mapeia diretamente à operação requerida. Confirmar os caminhos, status e formatos durante revisão humana antes da fase de tarefas.

### CLI — proposta

- `create --title <texto>` cria e exibe a tarefa.
- `list [--filter all|open|done]` lista tarefas; filtro ausente equivale a `all`.
- `complete <id>` conclui ou mantém concluída a tarefa e exibe o resultado.
- `remove <id>` remove tarefa aberta.
- Argumentos/filtros inválidos e erros de domínio devem ser reportados explicitamente, com código de saída diferente de zero; sucesso termina com código zero.

A sintaxe dos comandos e o formato de apresentação da CLI não são definidos pela spec e devem ser confirmados durante a revisão humana.

## 5. Decisões e trade-offs

| Tema | Proposta | Alternativas e impacto |
|---|---|---|
| Persistência | JSON em `data/tasks.json`, conforme decisão do usuário; preservar uma interface de store para permitir substituição futura. | Banco de dados oferece transações e consultas mais robustas, mas adiciona dependência e operação além do escopo inicial. |
| Visibilidade entre interfaces | Ler o arquivo nas operações em vez de manter cache em memória por processo. | Cache reduz IO, mas pode deixar servidor e CLI com visões divergentes. |
| Escritas | Usar substituição atômica via arquivo temporário no mesmo diretório. | Gravação direta é mais simples, mas uma interrupção pode corromper o JSON. |
| Dados locais | Ignorar `/data/` no Git. | Versionar o arquivo pode expor dados do usuário e causar conflitos entre ambientes. |
| Contrato HTTP | Usar rotas REST explícitas propostas na seção anterior. | Rotas e status afetam clientes; não há contrato anterior no esqueleto. A proposta precisa de revisão humana. |
| CLI | Usar subcomandos `create`, `list`, `complete` e `remove`. | Outras sintaxes são possíveis; esses comandos correspondem diretamente às operações da spec. |
| Normalização do título | Aparar espaços periféricos antes de persistir. | Preservar o texto literal mantém a entrada original, mas também preserva espaços acidentais; confirmar na revisão humana. |

## 6. Estratégia de testes

Usar `node:test` com `tsx`, cobrindo os requisitos e critérios de aceite:

- **Domínio:** título válido; título ausente/vazio/só com espaços rejeitado; filtros válidos aceitos e filtro desconhecido rejeitado.
- **Serviço:** criação com ID único e estado aberto; listagem geral e filtrada; conclusão altera o estado; conclusão repetida é idempotente; IDs inexistentes falham com erro de domínio; remoção de tarefa aberta funciona; remoção de concluída falha sem removê-la.
- **Store JSON:** criar pasta/arquivo ausentes; persistir e recarregar tarefas; propagar erro de leitura/gravação e corrupção sem sucesso falso; usar caminho temporário isolado nos testes.
- **HTTP:** validar criação válida/inválida, filtros e filtro inválido, conclusão e repetição, remoção permitida/proibida, IDs inexistentes, status HTTP e formatos de resposta.
- **CLI:** cobrir subcomandos, argumentos e filtros válidos/inválidos, mensagens e códigos de saída, incluindo erros de domínio.
- **Integração:** criar/alterar por uma interface e consultar pela outra; reconstruir a aplicação com o mesmo arquivo e verificar persistência após reinício.
- Executar `npm test` e `npm run typecheck` após a implementação.

## 7. Riscos e pontos para revisão humana

- Confirmar rotas, status e formatos HTTP propostos; o esqueleto ainda não possui contrato nem servidor implementado.
- Confirmar a sintaxe dos subcomandos e apresentação da CLI.
- Confirmar se títulos devem ser normalizados com `trim` ou preservar espaços periféricos.
- JSON não oferece transações entre processos. Releitura por operação e substituição atômica evitam cache obsoleto e gravação parcial, mas operações de escrita simultâneas entre CLI e servidor podem perder atualização. A spec não define concorrência; revisar se o escopo inicial pode aceitar essa limitação ou se deve exigir lock entre processos.
- Tratar corrupção do JSON e falta de permissão de escrita com erro explícito, sem sobrescrever dados existentes.
- A memória do projeto descreve um store in-memory, mas RF-9 e a decisão do usuário exigem persistência; o adaptador JSON deve ser a implementação usada nas composições da API e CLI.
