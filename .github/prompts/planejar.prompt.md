---
mode: agent
description: Gera o plano técnico (como) a partir de uma spec existente.
---

# /planejar

Gere o **plano técnico** da feature indicada pelo texto após o comando, que deve ser o número da feature ou o caminho para sua especificação.

## Preparação

- Leia `specs/constitution.md` e a `spec.md` da feature antes de redigir o plano. Se qualquer arquivo não existir ou não puder ser lido, informe o bloqueio e pergunte como proceder; não presuma seu conteúdo.
- Se o argumento for um número, localize em `specs/` a especificação correspondente ao padrão `<NNN>-*-spec.md`. Se não houver exatamente uma correspondência, pergunte ao usuário qual arquivo usar.
- Se o argumento for um caminho, use o arquivo indicado como especificação. Não escolha outra feature por inferência.
- Determine o número e o slug da feature pelo nome da spec (`<NNN>-<slug>-spec.md`). Se o nome não seguir esse padrão, pergunte ao usuário como nomear o plano.
- Examine os arquivos relevantes do projeto para alinhar o plano à arquitetura, aos padrões e aos contratos existentes. Não leia `.env`.
- Se a spec estiver ambígua ou incompleta em um ponto que altere materialmente a solução, pergunte ao usuário antes de finalizar o plano. Não invente requisitos nem registre suposições como fatos.

## Regras

- Crie o plano na mesma pasta da spec, usando o padrão `<NNN>-<slug>-plan.md` (por exemplo, `001-gerenciamento-de-tarefas-plan.md`), mantendo o número e o slug da spec.
- Não implemente nada: não altere código, testes, configuração ou a spec. A única saída a criar é o arquivo `<NNN>-<slug>-plan.md`.
- Respeite a constituição e mantenha o fluxo de dependências `http/cli --> service --> store`; o domínio não faz IO.
- Descreva somente as camadas e os componentes pertinentes à feature. Diferencie arquivos a criar de arquivos existentes a alterar e indique seus papéis.
- Mantenha decisões técnicas rastreáveis aos requisitos da spec. Quando houver alternativas com impacto relevante, explique trade-offs e deixe a decisão humana claramente pendente; não escolha silenciosamente.
- Não deixe questões bloqueantes sem resposta no plano. Registre riscos, dependências e pontos não bloqueantes que exijam validação humana.

## Estrutura obrigatória do plano

1. **Referências e escopo** — caminho da spec, resumo do objetivo e limites definidos pela spec.
2. **Arquitetura** — sequência de camadas e arquivos a criar ou alterar, com responsabilidade de cada um. Use apenas as camadas necessárias, mantendo o fluxo `http/cli --> service --> store` e indicando componentes de domínio quando aplicável.
3. **Modelos de dados e validação** — tipos e schemas Zod necessários, seus campos/regras e onde a validação ocorre. Não duplique validação fora das fronteiras externas sem justificativa.
4. **Contratos** — rotas HTTP e/ou comandos de CLI pertinentes, com entradas, validação, saídas e tradução de erros de domínio. Se uma interface não fizer parte da feature, registre-a como não aplicável.
5. **Decisões e trade-offs** — decisões propostas com justificativa, alternativas consideradas e impactos. Identifique explicitamente o que depende de decisão humana.
6. **Estratégia de testes** — casos de teste com `node:test`, cobrindo requisitos e critérios de aceite; indique a camada e os cenários relevantes, inclusive validação e erros.
7. **Riscos e pontos para revisão humana** — riscos, dependências, incertezas não bloqueantes e perguntas que precisam de validação antes da fase seguinte.

O plano deve ser concreto o suficiente para orientar a etapa de tarefas, mas não deve decompor o trabalho em tarefas nem antecipar implementação em código.
