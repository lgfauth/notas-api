---
mode: agent
description: Implementa uma tarefa pendente por vez, com testes e revisão.
---

# /implementar

Implemente tarefas pendentes de `tasks.md` para a feature indicada pelo texto após o comando, que deve ser o número da feature ou o caminho para seus artefatos.

## Preparação

- Se o argumento for um número, localize em `specs/` a especificação correspondente ao padrão `<NNN>-*-spec.md`. Se não houver exatamente uma correspondência, pergunte ao usuário qual feature usar.
- Se o argumento for um caminho, use-o para localizar os artefatos da feature. Não escolha outra feature por inferência.
- Leia `spec.md`, `plan.md`, `tasks.md` e `specs/constitution.md` antes de implementar. Se algum arquivo não existir ou não puder ser lido, informe o bloqueio e pergunte como proceder.
- Leia e siga as instruções de código aplicáveis aos arquivos que a tarefa selecionada irá alterar. Examine também o código e os testes relevantes para preservar os padrões e o comportamento existente. Não leia `.env`.
- Se houver conflito entre a spec, o plano, as tarefas, as instruções do repositório ou a constituição, ou se a spec parecer incorreta, não improvise: pare, explique o problema e solicite revisão humana.

## Execução

Implemente **uma única tarefa por chamada**:

1. Escolha a primeira tarefa ainda pendente (`- [ ]`) cujas dependências estejam concluídas (`- [x]`). Respeite a ordem das tarefas e não comece uma tarefa com dependências pendentes.
2. Implemente somente o escopo dessa tarefa, seguindo o `plan.md`, a constituição, as instruções aplicáveis e os padrões existentes.
3. Escreva ou atualize os testes necessários para validar o comportamento da tarefa. Preserve a separação de camadas e valide entradas externas com Zod conforme os padrões do projeto.
4. Execute `npm run test` e `npm run typecheck`. Investigue falhas relacionadas à tarefa; não desative testes ou verificações de tipos, não reduza sua cobertura e não use contornos para fazê-las passar.
5. Marque a tarefa como concluída (`- [x]`) somente depois que os dois comandos terminarem com sucesso e o critério de conclusão da tarefa estiver satisfeito. Não marque nenhuma outra tarefa.
6. Ao concluir essa fatia coesa, pare e solicite revisão humana antes de iniciar outra tarefa.

Se nenhuma tarefa estiver pronta, não implemente nada: informe quais tarefas estão pendentes ou bloqueadas pelas dependências. Se testes ou typecheck falharem, não marque a tarefa como concluída; reporte claramente o resultado e pare para revisão quando a falha indicar problema de requisito, plano ou código preexistente fora do escopo.

Não altere a spec, o plano ou as dependências das tarefas para contornar problemas de implementação. Não faça commits.
