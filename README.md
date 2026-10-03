# notas-api

API HTTP e CLI para criar, listar, concluir e remover tarefas. As duas
interfaces compartilham os dados persistidos localmente em `data/tasks.json`.

## Requisitos

- Node.js 24 LTS
- npm

## Instalação

```bash
npm install
```

## API HTTP

Inicie o servidor:

```bash
npm run dev
```

O servidor escuta em `http://127.0.0.1:3000`.

| Método | Rota | Comportamento |
|--------|------|---------------|
| `POST` | `/tasks` | Cria uma tarefa. Corpo: `{"title":"Buy milk"}`. Retorna `201` e a tarefa criada. |
| `GET` | `/tasks` | Lista todas as tarefas. |
| `GET` | `/tasks?filter=open` | Filtra por `all`, `open` ou `done`; o padrão é `all`. |
| `PATCH` | `/tasks/:id` | Conclui ou mantém concluída uma tarefa. Corpo: `{"status":"done"}`. |
| `DELETE` | `/tasks/:id` | Remove uma tarefa aberta; retorna `204` sem corpo. |

Exemplo:

```bash
curl -X POST http://127.0.0.1:3000/tasks \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Buy milk\"}"

curl "http://127.0.0.1:3000/tasks?filter=open"
```

Entradas inválidas retornam `400`, IDs inexistentes retornam `404` e a tentativa
de remover uma tarefa concluída retorna `409`. As respostas de erro contêm um
objeto JSON com código e mensagem.

## CLI

Execute os subcomandos usando `npm run cli --`:

```bash
npm run cli -- create --title "Buy milk"
npm run cli -- list
npm run cli -- list --filter open
npm run cli -- complete <id>
npm run cli -- remove <id>
```

`list` aceita os filtros `all`, `open` e `done`; sem filtro, lista todas as
tarefas. Comandos inválidos e erros de domínio são enviados para `stderr` e
retornam código de saída diferente de zero. Ao executar pelo npm, a CLI também
reconhece o título se o npm remover `--title` dos argumentos repassados.

## Persistência

O arquivo `data/tasks.json` é criado automaticamente. API e CLI usam esse mesmo
caminho, que é relativo ao diretório de trabalho do projeto. As gravações são
atômicas e usam um arquivo de lock para coordenar processos concorrentes.
O diretório `/data/` é ignorado pelo Git; os dados locais não são versionados.

## Desenvolvimento

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Inicia a API HTTP |
| `npm run cli -- <comando>` | Executa a CLI |
| `npm test` | Executa os testes com `node:test` e `tsx` |
| `npm run typecheck` | Verifica os tipos TypeScript |
