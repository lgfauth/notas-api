---
mode: agent
description: Cria a especificação (o quê e por quê) de uma feature, sem código.
---

# /especificar

Escreva uma especificação da feature descrita na solicitação atual. A especificação deve definir **o que** o sistema deve fazer e **por que**, sem definir como implementar.

## Regras

- Leia `specs/constitution.md` antes de redigir e respeite todos os seus princípios. Se o arquivo não existir ou não puder ser lido, informe o bloqueio e pergunte como proceder; não presuma o conteúdo.
- Não escreva código, pseudocódigo, plano, tarefas ou decisões de implementação. Descreva necessidades e resultados observáveis pelo usuário.
- Identifique a próxima numeração livre verificando os arquivos existentes em `specs/`. Use três dígitos, começando em `001`, e o formato `specs/<NNN>-<slug>-spec.md`, por exemplo `specs/001-criar-notas-spec.md`.
- O slug deve resumir a feature, em minúsculas e com palavras separadas por hífens.
- Se a descrição estiver ambígua, incompleta ou permitir interpretações materialmente diferentes, faça perguntas objetivas antes de criar ou finalizar a especificação. Não invente requisitos nem registre suposições como fatos. Depois das respostas, confirme que as questões foram resolvidas e então escreva o arquivo.
- Mantenha os requisitos verificáveis, sem impor escolhas técnicas ou de arquitetura.

## Estrutura obrigatória da especificação

1. **Contexto e problema** — descreva a situação atual, a necessidade e o problema a resolver.
2. **Histórias de usuário** — use uma ou mais histórias no formato: “Com <papel>, quero <objetivo>, para <benefício>.”
3. **Requisitos funcionais** — numere sequencialmente como `RF-1`, `RF-2` etc.; cada requisito deve expressar um comportamento ou capacidade necessária.
4. **Critérios de aceite** — descreva condições observáveis e verificáveis no formato EARS: “Quando <evento>, o sistema deve <resposta>.” Inclua os casos relevantes para validar os requisitos.
5. **Fora de escopo** — liste explicitamente o que não será tratado por esta feature, sem introduzir decisões de implementação.
6. **Questões em aberto** — liste questões ainda sem resposta. Se houver alguma que impeça uma especificação inequívoca, pergunte ao usuário antes de finalizar; não deixe questões bloqueantes em aberto no arquivo final.
