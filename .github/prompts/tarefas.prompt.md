---
mode: agent
description: Quebra o plano em tarefas pequenas, ordenáveis e testáveis.
---

# /tarefas

Gere a lista de tarefas da feature indicada pelo texto após o comando, que deve ser o número da feature ou o caminho para sua especificação.

## Preparação

- Leia `specs/constitution.md`, a `spec.md` e o `plan.md` da feature antes de redigir as tarefas. Se algum arquivo não existir ou não puder ser lido, informe o bloqueio e pergunte como proceder; não presuma seu conteúdo.
- Se o argumento for um número, localize em `specs/` a especificação correspondente ao padrão `<NNN>-*-spec.md`. Se não houver exatamente uma correspondência, pergunte ao usuário qual arquivo usar.
- Se o argumento for um caminho, use o arquivo indicado como especificação. Localize o `plan.md` na mesma pasta.
- Se a spec e o plano forem inconsistentes, estiverem incompletos ou deixarem uma decisão que altere materialmente as tarefas em aberto, pergunte ao usuário antes de criar ou finalizar a lista. Não invente requisitos nem resolva decisões humanas silenciosamente.
- Consulte os arquivos relevantes do projeto apenas para tornar os critérios de conclusão concretos e alinhados aos padrões existentes. Não leia `.env`.

## Regras

- Crie `tasks.md` na mesma pasta da spec.
- Não implemente nada: não altere código, testes, configuração, spec ou plano. A única saída a criar é `tasks.md`.
- Produza uma lista numerada de tarefas em ordem compatível com suas dependências.
- Cada tarefa deve ser pequena o suficiente para ser concluída em um único commit e conter um critério claro e verificável de conclusão, como um teste específico passando.
- Comece cada tarefa com a caixa de seleção Markdown `- [ ]`, seguida do número e de um título orientado à ação.
- Declare as dependências de cada tarefa usando os números das tarefas das quais ela realmente depende. Use “Nenhuma” quando não houver dependências; não invente dependências apenas para impor uma sequência.
- Cubra o escopo, os contratos e a estratégia de testes do plano sem expandir os requisitos da spec. Inclua validação, erros e testes pertinentes quando aplicáveis.
- Se faltar uma decisão humana necessária para definir tarefas confiáveis, não gere tarefas especulativas: pergunte ao usuário primeiro.

## Formato de cada tarefa

Use este formato para cada item:

- [ ] 1. **<ação concisa>**
  - **Objetivo:** resultado específico a alcançar.
  - **Arquivos:** arquivos ou camadas previstos, se identificáveis pelo plano.
  - **Pronto quando:** critério observável e verificável, incluindo o teste ou comando relevante quando aplicável.
  - **Dependências:** Nenhuma ou números das tarefas necessárias.

Mantenha `tasks.md` focado na execução: não repita o plano inteiro, não inclua código e não transforme decisões humanas pendentes em tarefas de implementação.
