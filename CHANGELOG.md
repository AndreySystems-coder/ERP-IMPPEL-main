# Changelog - ERP IMPPEL

Todas as alteracoes relevantes do ERP devem ser registradas neste arquivo.
Usar entradas cronologicas, com impacto funcional, arquivos principais e validacoes executadas.

## [2026-07-20] - Ajuste cirurgico do parser PDF real de materiais

### Corrigido

- `parseMaterials()` agora detecta dinamicamente as colunas do PDF real pelos cabecalhos `Responsavel`, `Itens`, `Tipo`, `Origem/Observacao` e `Status`.
- O parser passou a suportar o layout real com responsavel em `x~46` e itens em `x~142`.
- Linhas quebradas e cabecalhos repetidos entre paginas deixaram de fragmentar registros.
- Medidas como `1,05x50` sao preservadas como parte do nome do produto, sem virar quantidade.
- A regra de confianca passou a comparar os blocos operacionais identificaveis, evitando bloquear quando o total do cabecalho representa outra granularidade do relatorio.

### Validacao

- Preview do PDF real PDF real de Controle de Materiais validado localmente extraiu 110 blocos operacionais: 78 retiradas, 5 entradas e 27 saidas/consumos, sem pendentes.
## [2026-07-20] - Importacao PDF do Controle de Materiais

### Corrigido

- Implementado parser especifico para PDFs `tipo=materiais` gerados pelo ERP.
- A previa agora separa retiradas, entradas e saidas/consumo do Controle de Materiais.
- Linhas quebradas de itens no PDF passam a ser agrupadas no mesmo registro operacional.
- Datas historicas do PDF sao preservadas como data da retirada ou movimentacao.
- Deduplicacao passou a considerar tipo, data, responsavel, itens, quantidades, observacao e hash de origem.
- A rota `/api/backup/restore/materiais` agora aceita `withdrawals`, `entries` e `consumption` e aplica cada grupo pelo fluxo correto.

### Seguranca

- Produtos sem vinculo no estoque nao sao inventados nem gravados com `inventoryId = 0`.
- Responsaveis nao encontrados ficam ignorados no restore com detalhe em `unresolved`.
- Importacao opera em merge seguro e registra origem nas observacoes das movimentacoes.

### Validacao

- Adicionados testes sinteticos para parser de materiais, multiplos itens, quebra de linha, entrada, saida/consumo, status, data historica e duplicidade.
## [2026-07-16] - Criacao da documentacao oficial

### Adicionado

- Criado `PROMPT_MESTRE.md` com as regras permanentes de governanca tecnica do ERP IMPPEL.
- Criado `BACKLOG.md` como fonte oficial de tarefas futuras e pendencias planejadas.
- Criado `CHANGELOG.md` como historico oficial de implementacoes.
- Criado `KNOWN_ISSUES.md` como registro oficial de riscos e problemas conhecidos.
- Criado `ROADMAP.md` como direcao de evolucao do ERP.

### Migrado

- Migradas as fases do plano V.L.A.E.G. de `docs/task_plan.md` para `BACKLOG.md` e `ROADMAP.md`.
- Migrado o log de inicializacao de `docs/progress.md` para este changelog.
- Migrada a informacao de ausencia de descobertas/restricoes de `docs/findings.md` para `KNOWN_ISSUES.md`.

### Preservado

- Os arquivos antigos em `docs/` foram mantidos sem remocao nesta etapa.
- Nenhuma funcionalidade do ERP foi alterada.
- Nenhum schema, dado real, API ou componente foi alterado.

### Validacao

- Projeto sincronizado com `origin/main` antes da criacao da documentacao.
- Esta sprint alterou apenas documentacao.

## [2026-05-13] - Registro historico migrado de docs/progress.md

### Registrado originalmente em docs/progress.md

- Inicializacao: estrutura de pastas e arquivos base criada com sucesso conforme Protocolo 0.
- Status: aguardando respostas da Fase 1 (Visao).

### Observacao

Este registro foi migrado como historico. Ele nao confirma estado funcional atual do ERP em producao.

## [2026-07-16] - Preparacao documental para producao e Vercel

### Adicionado

- Criado `DEPLOYMENT.md` com fluxo de producao, variaveis obrigatorias, banco, Replit, Vercel e checklist pos-deploy.
- Criado `AI_CONTEXT.md` com contexto tecnico e operacional para agentes de IA.

### Documentado

- Registrado que o ERP e full stack: React/Vite no frontend e Express/PostgreSQL no backend.
- Registrado que `npm run build` gera `dist/public` e `dist/index.cjs`.
- Registrado que `npm start` executa `node dist/index.cjs`.
- Registrado que deploy Vercel precisa validar backend Express, APIs, sessoes e banco, nao apenas frontend estatico.
- Registrado que valores reais de variaveis devem ficar apenas em secrets do provedor ou `.env` local ignorado.

### Preservado

- Nenhuma funcionalidade de negocio foi alterada.
- Nenhum schema ou dado real foi alterado.
- Nenhum arquivo antigo de `docs/` foi removido.
