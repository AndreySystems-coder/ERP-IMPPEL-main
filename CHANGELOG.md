# Changelog - ERP IMPPEL

Todas as alteracoes relevantes do ERP devem ser registradas neste arquivo.
Usar entradas cronologicas, com impacto funcional, arquivos principais e validacoes executadas.

## [2026-07-21] - Importacao PDF de Controle de Materiais pelo fluxo do Registro Rapido

### Corrigido

- Preview do PDF de Controle de Materiais passou a usar os mesmos resolvedores de funcionario/material do Registro Rapido.
- Controle de Materiais foi adicionado ao seletor principal de importacao por PDF.
- Pendencias de funcionario e material agora aparecem em cards de preview com seletores manuais antes da confirmacao.
- Confirmacao do PDF de materiais passou a enviar as linhas resolvidas, revalidar IDs no backend e importar somente registros prontos.
- Importacao historica de materiais continua criando retiradas e movimentacoes com `applyToStock: false`, preservando saldos finais vindos do backup de Estoque.
- Segunda importacao passa a usar fingerprint semantico com unidade, responsavel, data, tipo e itens para evitar duplicidade.
- Pendencias continuam visiveis apos importar registros resolvidos, sem exigir novo upload do PDF.

### Validacao

- Testes operacionais adicionados para preview, pendencia de material, resolucao manual, importacao historica sem alterar saldo e duplicidade semantica.

## [2026-07-21] - Contrato definitivo do backup PDF de Controle de Materiais

### Corrigido

- Controle de Materiais passou a usar um contrato compartilhado em `shared/materialControlBackup.ts` para exportacao, PDF e parser.
- O exportador PDF deixou de montar linhas em formato proprio e passou a imprimir exatamente as linhas operacionais que o parser reconstrói.
- O parser de Controle de Materiais agora devolve `data.rows` e `data.days` no mesmo modelo usado pela exportacao.
- O ciclo automatizado `contrato -> linhas de PDF -> parser -> contrato` foi adicionado aos testes operacionais.
- A estrutura continua compativel com PDFs antigos, mantendo `withdrawals`, `entries` e `consumption`.

### Validacao

- `npx tsc --noEmit --incremental false` passou.
- `npm run test:operational` passou com teste de round-trip do contrato de Controle de Materiais.

## [2026-07-21] - Oficializacao do bootstrap Admin e restore seguro de materiais

### Corrigido

- Bootstrap do Admin foi extraido para servico oficial e idempotente, executado no startup antes de liberar as rotas.
- Banco novo passa a criar `Admin` automaticamente quando `DEFAULT_ADMIN_PASSWORD` estiver configurada, usando bcrypt e sem duplicar usuario.
- Admin legado `admin` e normalizado para `Admin` sem redefinir senha bcrypt existente.
- Resolucao de itens do restore de Controle de Materiais foi centralizada em servico oficial com ID explicito, nome exato e nome normalizado.
- Fingerprint deterministico foi adicionado para registros/movimentos restaurados de Controle de Materiais.
- Movimentos historicos vindos do PDF de Controle de Materiais sao gravados sem reaplicar impacto no saldo, preservando a precedencia do saldo atual restaurado pelo PDF de Estoque.
- Responsavel historico continua sem virar usuario de login e sem gerar `userId=0`.

### Documentacao

- Adicionado `DEPLOYMENT_CHECKLIST.md` com variaveis, migrations, Admin, sessoes, importacao de backups e validacao pos-deploy.

### Validacao

- Testes automatizados foram adicionados para Admin idempotente, resolucao de inventory por nome exato/normalizado, material bloqueado, responsavel historico sem login, fingerprint deterministico e movimento historico sem alterar saldo.

## [2026-07-20] - Restore seguro de Controle de Materiais por PDF

### Corrigido

- O parser de Controle de Materiais agora exige tipo operacional valido para iniciar novo registro, evitando que linhas de continuacao com quantidade sejam tratadas como registros novos.
- Continuidade de itens quebrados na mesma pagina ou entre paginas foi reforcada para casos reais como `Luva de Raspa`, `Impertela 1,05x50`, `Aplicador de PU`, `Suporte de Rolo`, `Viabit Primer (base solvente)` e `Viapol Manta Torodin 4 mm`.
- O preview de Controle de Materiais passou a separar registros completamente aplicaveis, parcialmente aplicaveis, bloqueados e itens nao encontrados.
- A importacao parcial exige confirmacao explicita `IMPORTAR PARCIALMENTE`; o fluxo normal `IMPORTAR` nao aplica registros com itens ausentes.
- A rota de restore passou a registrar `restoredComplete`, `restoredPartial`, `unresolvedItems` e `duplicateRecords`.
- Responsavel historico `Nao trabalha para nos` nao cria conta e nao usa `userId=0`; a retirada usa um usuario de auditoria existente e preserva o nome historico no campo `username`.
- O matching operacional de materiais usa `inventory` como fonte, com nome exato e normalizacao completa segura; `products` permanece apenas como referencia comercial.

### Validacao

- PDFs reais validados em preview local: usuarios/cargos 12 usuarios e 9 cargos; produtos 45; servicos 24; estoque 96; Controle de Materiais 294 declarados, 110 blocos logicos, 78 retiradas, 5 entradas, 27 saidas/consumos e 469 itens.
- Testes operacionais adicionados para continuacao entre paginas e itens reais quebrados.
- Validacoes executadas: `npm install`, `npx tsc --noEmit --incremental false`, `npm run build`, `npm run test`, `npm run test:backup`, `npm run test:operational`, `git diff --check`.

## [2026-07-20] - Preparacao final de producao

### Corrigido

- `server/index.ts` agora configura `trust proxy` em producao para operar corretamente atras de proxy HTTPS como Replit/Vercel/VPS.
- Cookies de sessao passaram a usar `secure=true` automaticamente em `NODE_ENV=production`, mantendo ambiente local sem HTTPS funcional.
- Cookies de sessao agora declaram `sameSite=lax` e preservam `httpOnly`.
- Rotas inexistentes em `/api/*` agora retornam 404 em JSON antes do fallback HTML do frontend.
- A rotina de inicializacao do Admin deixou de redefinir senha bcrypt existente ao normalizar usuario/role; senha so e criada para Admin inexistente ou convertida quando ainda esta em texto legado.

### Validacao

- TypeScript validado com `npx tsc --noEmit --incremental false`.

## [2026-07-20] - Estabilizacao final da importacao PDF operacional

### Corrigido

- A tela de importacao por PDF agora diferencia `Controle de Materiais` de `Movimentacoes de Estoque` nos rotulos de preview, menu e permissoes.
- O preview de PDF agora valida dependencias reais do ERP antes de liberar aplicacao, principalmente usuarios, catalogo de produtos e estoque antes do Controle de Materiais.
- `canApply` passou a representar se o ERP consegue importar com seguranca, e nao apenas se o parser conseguiu ler o PDF.
- Responsaveis historicos marcados como `Nao trabalha para nos` nao geram usuarios automaticamente; ficam registrados como historico no restore de materiais.
- O parser de servicos deixou de descartar duplicidades automaticamente; possiveis duplicados sao avisados para decisao do usuario no preview.

### Interface

- Adicionada secao `Dependencias encontradas` no preview de PDFs, com contagens de encontrados/ausentes e listas copiaveis.
- Pendencias, erros e ignorados passaram a aparecer em painel expansivel por arquivo, sem ocultar registros rejeitados.

### Validacao

- TypeScript validado com `npx tsc --noEmit --incremental false`.
- PDF real de Estoque disponivel localmente validado sem importacao: 96 itens, 0 movimentacoes, 0 pendencias.
- A faixa de quantidade das movimentacoes de estoque ja estava em `540-615`, cobrindo `X~544`.

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
