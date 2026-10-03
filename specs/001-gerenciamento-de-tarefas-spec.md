# Especificação: Gerenciamento de tarefas

## 1. Contexto e problema

O sistema ainda não oferece gerenciamento de tarefas. Usuários precisam registrar tarefas com um título, consultar o que está pendente ou concluído, marcar tarefas como concluídas e remover tarefas. Essas operações devem estar disponíveis tanto pela API HTTP quanto pela CLI, com uma coleção compartilhada e preservada entre reinícios, para que uma tarefa criada por uma interface possa ser consultada e gerenciada pela outra.

## 2. Histórias de usuário

- Como usuário, quero criar uma tarefa com um título, para registrar algo que preciso fazer.
- Como usuário, quero listar todas as tarefas ou filtrar por tarefas abertas ou concluídas, para acompanhar meu trabalho.
- Como usuário, quero concluir uma tarefa aberta, para registrar que ela foi realizada.
- Como usuário, quero remover uma tarefa aberta, para manter a lista atualizada.
- Como usuário da API ou da CLI, quero acessar a mesma coleção de tarefas, para continuar o gerenciamento pela interface que me for conveniente.

## 3. Requisitos funcionais

- **RF-1:** O sistema deve permitir criar uma tarefa informando seu título pela API HTTP e pela CLI.
- **RF-2:** Cada tarefa deve ter um identificador único e estável, um título e um estado que permita distingui-la como aberta ou concluída.
- **RF-3:** Uma tarefa recém-criada deve estar aberta.
- **RF-4:** O sistema deve permitir listar tarefas pela API HTTP e pela CLI, aceitando os filtros `all`, `open` e `done`. Se nenhum filtro for informado, deve listar todas.
- **RF-5:** O sistema deve permitir concluir uma tarefa aberta pela API HTTP e pela CLI, localizando-a pelo identificador.
- **RF-6:** Concluir uma tarefa já concluída deve ser aceito sem alterar seu estado.
- **RF-7:** O sistema deve permitir remover tarefas abertas pela API HTTP e pela CLI, localizando-as pelo identificador.
- **RF-8:** O sistema não deve permitir remover uma tarefa concluída.
- **RF-9:** As tarefas e alterações feitas pela API HTTP ou pela CLI devem estar disponíveis pela outra interface e permanecer disponíveis após o encerramento e reinício do processo.
- **RF-10:** O sistema deve informar falha quando uma operação de conclusão ou remoção se referir a um identificador inexistente.
- **RF-11:** O sistema deve rejeitar a criação sem título ou com título vazio após desconsiderar espaços em branco.

## 4. Critérios de aceite

- Quando o usuário criar uma tarefa com título válido pela API HTTP ou pela CLI, o sistema deve retornar ou exibir a tarefa criada com identificador único, título e estado aberto.
- Quando o usuário tentar criar uma tarefa sem título ou com título composto apenas por espaços em branco, o sistema deve rejeitar a operação e informar que o título é inválido.
- Quando o usuário listar tarefas sem informar filtro, o sistema deve apresentar todas as tarefas existentes.
- Quando o usuário listar tarefas com filtro `all`, o sistema deve apresentar tarefas abertas e concluídas.
- Quando o usuário listar tarefas com filtro `open`, o sistema deve apresentar somente tarefas abertas.
- Quando o usuário listar tarefas com filtro `done`, o sistema deve apresentar somente tarefas concluídas.
- Quando o usuário listar tarefas com um filtro diferente de `all`, `open` ou `done`, o sistema deve rejeitar o filtro e informar que ele é inválido.
- Quando o usuário concluir uma tarefa aberta pelo seu identificador, o sistema deve mudar seu estado para concluída e refletir esse estado nas listagens.
- Quando o usuário concluir novamente uma tarefa já concluída, o sistema deve aceitar a operação e manter a tarefa concluída.
- Quando o usuário tentar concluir uma tarefa com identificador inexistente, o sistema deve informar que a tarefa não foi encontrada.
- Quando o usuário remover uma tarefa aberta pelo seu identificador, o sistema deve removê-la e ela não deve aparecer em listagens posteriores.
- Quando o usuário tentar remover uma tarefa concluída, o sistema deve recusar a operação, informar que tarefas concluídas não podem ser removidas e manter a tarefa disponível.
- Quando uma tarefa for criada ou alterada por uma das interfaces, o sistema deve apresentar os mesmos dados ao consultá-la pela outra interface.
- Quando o processo for encerrado e iniciado novamente, o sistema deve manter as tarefas e seus estados anteriores.
- Quando o usuário tentar remover uma tarefa com identificador inexistente, o sistema deve informar que a tarefa não foi encontrada.

## 5. Fora de escopo

- Editar o título de uma tarefa existente.
- Adicionar descrição, prioridade, prazo, categorias ou outros atributos à tarefa.
- Gerenciar usuários ou separar tarefas por usuário.
- Recuperar tarefas removidas.
- Excluir tarefas concluídas.

## 6. Questões em aberto

- Nenhuma.
