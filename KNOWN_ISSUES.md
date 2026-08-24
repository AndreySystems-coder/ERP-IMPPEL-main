# Known Issues - ERP IMPPEL

Este arquivo registra riscos, problemas conhecidos, limitacoes e pendencias que precisam ser consideradas antes de cada sprint.

## Regras de manutencao

- Registrar causa raiz quando conhecida.
- Registrar impacto operacional.
- Registrar workaround, se existir.
- Registrar arquivos envolvidos, quando identificados.
- Remover ou atualizar itens quando forem corrigidos, refletindo a correcao no CHANGELOG.md.

## Problemas conhecidos atuais

### KI-017 - Nova navegacao por funcoes precisa de homologacao operacional

- Severidade: Melhoria.
- Causa raiz: a reorganizacao foi feita com base no fluxo aprovado, mas nomes, atalhos e prioridade de grupos precisam ser confirmados por usuarios reais da IMPPEL.
- Impacto: a navegacao esta mais alinhada por papel, porem pode exigir pequenos ajustes de vocabulario apos uso diario.
- Arquivos envolvidos: `client/src/components/Layout.tsx`, `client/src/pages/SectionHub.tsx`, `client/src/pages/HowToWork.tsx`, `docs/erp_role_based_navigation.md`.
- Workaround: rotas antigas continuam preservadas e a Central Como Trabalhar orienta a sequencia recomendada.

### KI-015 - Central Como Trabalhar ainda precisa de homologacao com funcionario novo

- Severidade: Medio.
- Causa raiz: a sprint ampliou a orientacao dentro do ERP, mas o conteudo operacional definitivo depende de validacao da equipe IMPPEL.
- Impacto: o sistema esta mais autoexplicativo, porem a confirmacao de que uma pessoa nova executa a rotina sozinha exige teste real assistido.
- Arquivos envolvidos: `client/src/pages/HowToWork.tsx`, `docs/erp_usability_and_training_rework.md`.
- Workaround: usar a central como guia inicial e registrar duvidas reais no backlog de treinamento.

### KI-016 - Vercel segue com ressalvas para ERP full stack

- Severidade: Medio.
- Causa raiz: o ERP possui Express, sessoes, PostgreSQL, PDFs e anexos; Vercel exige banco persistente, cookies seguros e armazenamento externo bem configurados.
- Impacto: o Replit permanece ambiente operacional temporario recomendado ate validar infraestrutura completa fora dele.
- Arquivos envolvidos: `server/index.ts`, `server/db.ts`, `DEPLOYMENT.md`, `docs/erp_usability_and_training_rework.md`.
- Workaround: manter Replit para piloto e preparar Vercel somente com PostgreSQL persistente, secrets e validacao real de API/login.

### KI-012 - Identidade visual oficial depende de aprovacao da IMPPEL

- Severidade: Medio.
- Causa raiz: a Etapa 8 criou a estrutura tecnica, mas logo, cores, slogan, tom de voz e regras oficiais nao devem ser inventados no codigo.
- Impacto: kits e templates podem ser usados como rascunho, mas somente versoes aprovadas devem representar a marca em uso real.
- Arquivos envolvidos: `client/src/pages/VisualIdentity.tsx`, `server/routes.ts`, `shared/schema.ts`.
- Workaround: manter status `rascunho` ou `em_revisao` ate a IMPPEL aprovar a versao oficial.

### KI-013 - Processamento real de video depende de ferramenta externa

- Severidade: Melhoria.
- Causa raiz: o ambiente atual nao possui pipeline FFmpeg ou servico dedicado de processamento de video.
- Impacto: videos podem ser catalogados, validados e vinculados, mas marca d'agua/renderizacao automatica fica pendente.
- Arquivos envolvidos: `client/src/pages/VisualIdentity.tsx`, `server/routes.ts`.
- Workaround: usar registro, autorizacao e download; editar video externamente ate a integracao ser definida.

### KI-009 - Integracao Waseller depende de credenciais/API real

- Severidade: Medio.
- Causa raiz: a Etapa 7 nao recebeu token, endpoint ou contrato oficial da Waseller.
- Impacto: o ERP nao envia mensagens automaticamente por Waseller; continua usando templates e operacao manual/WhatsApp.
- Arquivos envolvidos: `client/src/pages/CommercialSystem.tsx`, `client/src/pages/CrmWhatsapp.tsx`, `server/routes.ts`.
- Workaround: usar modelos de mensagem e follow-up manual ate a integracao real ser informada.

### KI-011 - Geracao real de posts depende de provedor externo

- Severidade: Medio.
- Causa raiz: nao ha credencial de IA configurada no projeto.
- Impacto: o ERP gera rascunho estruturado em modo mock/copy, mas nao comprova geracao por IA real.
- Arquivos envolvidos: `client/src/pages/CommercialSystem.tsx`, `server/routes.ts`.
- Workaround: usar o rascunho gerado para revisao humana e copiar para ferramenta externa ate configurar provedor oficial.

### KI-010 - Conteudo real da Central Como Trabalhar ainda depende da IMPPEL

- Severidade: Medio.
- Causa raiz: procedimentos e instrucoes tecnicas reais nao devem ser inventados no codigo.
- Impacto: a central possui estrutura e guias base, mas precisa de aprovacao operacional antes de virar referencia definitiva para equipe.
- Arquivos envolvidos: `client/src/pages/HowToWork.tsx`, `shared/schema.ts`, `migrations/0005_stage_7_commercial_experience.sql`.
- Workaround: manter artigos em rascunho/ativo somente apos revisao da IMPPEL.

### Corrigidos em 2026-08-24 - Gate Etapas 1 a 6

- Rotas de leitura de Qualidade das Obras que dependiam apenas de autenticação agora exigem permissão explicita.
- Movimentações manuais de estoque com saldo insuficiente deixaram de retornar `500` e passaram a retornar `409`.
- Movimentações com quantidade zero ou negativa retornam `400`.
- Procedimentos técnicos aceitam `title` apenas como compatibilidade legada, mas persistem e exportam o contrato canônico `name`.

Esses itens permanecem rastreados no `CHANGELOG.md` e nos testes operacionais.

### KI-001 - Documentacao oficial criada somente nesta sprint

- Severidade: Medio
- Causa raiz: o projeto possuia documentos auxiliares em `docs/`, mas nao possuia `PROMPT_MESTRE.md`, `BACKLOG.md`, `CHANGELOG.md`, `KNOWN_ISSUES.md` e `ROADMAP.md` na raiz.
- Impacto: antes desta estrutura, as proximas sprints nao tinham uma fonte oficial unica para backlog, historico e riscos conhecidos.
- Arquivos envolvidos: `docs/task_plan.md`, `docs/progress.md`, `docs/findings.md`, novos arquivos oficiais na raiz.
- Status: mitigado com a criacao da estrutura oficial; precisa de manutencao continua nas proximas sprints.

### KI-002 - Conteudo legado V.L.A.E.G. e generico

- Severidade: Melhoria
- Causa raiz: os arquivos antigos `docs/task_plan.md`, `docs/progress.md` e `docs/findings.md` descrevem um protocolo generico e nao uma auditoria completa do ERP IMPPEL em producao.
- Impacto: esse conteudo nao deve ser tratado sozinho como diagnostico atual do sistema.
- Arquivos envolvidos: `docs/task_plan.md`, `docs/progress.md`, `docs/findings.md`, `docs/gemini.md`.
- Plano: reavaliar o conteudo legado durante uma auditoria completa e decidir o que permanece como referencia.

## Migrado de docs/findings.md

O arquivo antigo `docs/findings.md` registrava:

- Pesquisas e Descobertas: nenhuma descoberta registrada ainda.
- Restricoes e Limitacoes: nenhuma restricao identificada ainda.

Essa informacao foi preservada aqui como historico, mas nao substitui uma auditoria atual do ERP.

### KI-003 - Deploy Vercel ainda depende de validacao externa

- Severidade: Critico ate validacao real em producao.
- Causa raiz: durante a preparacao local, a Vercel CLI nao estava instalada/vinculada e nao havia `.vercel` no projeto local.
- Impacto: nao foi possivel publicar, validar URL final, checar variaveis do painel, banco de producao, sessoes e login no ambiente Vercel.
- Arquivos envolvidos: `DEPLOYMENT.md`, `package.json`, `script/build.ts`, `server/index.ts`, `server/static.ts`.
- Plano: vincular/autenticar Vercel, configurar variaveis obrigatorias, executar deploy e validar frontend, backend, APIs, banco, autenticacao e sessoes na URL publicada.

### KI-004 - Banco real de producao nao identificado no ambiente local

- Severidade: Critico ate confirmacao do provider e variaveis.
- Causa raiz: nao havia `.env`, `.env.local` ou secrets Vercel disponiveis no ambiente local.
- Impacto: nao foi possivel validar `DATABASE_URL`, tabelas, sessoes PostgreSQL, Admin real e integridade do banco de producao.
- Arquivos envolvidos: `.env.example`, `server/db.ts`, `drizzle.config.ts`, `DEPLOYMENT.md`.
- Plano: configurar variaveis reais em ambiente seguro, confirmar se o banco e Desenvolvimento ou Producao, fazer backup antes de qualquer operacao e validar `npm run db:push` somente com confirmacao do alvo.

### KI-005 - Bundle frontend grande

- Severidade: Melhoria.
- Causa raiz: build Vite gera chunk principal acima do limite recomendado de 500 kB.
- Impacto: possivel aumento no tempo de carregamento inicial, sem bloquear build ou producao.
- Arquivos envolvidos: `vite.config.ts`, rotas/componentes frontend, estrategia futura de code splitting.
- Plano: avaliar dynamic imports e manual chunks em sprint futura de performance.

### KI-006 - Restore PDF de materiais depende de nomes existentes no ERP

- Severidade: Melhoria.
- Causa raiz: PDFs antigos carregam nomes textuais de materiais e responsaveis; o restore seguro nao deve criar produtos ou usuarios automaticamente.
- Impacto: registros cujo produto ou responsavel nao exista no ERP atual exigem resolucao manual antes da gravacao.
- Arquivos envolvidos: `server/pdf-restore.ts`, `server/routes.ts`, `server/material-pdf-import-service.ts`, `client/src/components/CompleteBackupManager.tsx`.
- Workaround: importar previamente Usuarios/Cargos e Estoque; quando restar divergencia, usar os seletores manuais no preview de Controle de Materiais.
- Status: mitigado com preview resolvivel pelo mesmo mecanismo do Registro Rapido; ainda depende de homologacao em PostgreSQL descartavel com os PDFs reais.

### KI-007 - Total do cabecalho do PDF de materiais tem granularidade diferente dos blocos operacionais

- Severidade: Melhoria.
- Causa raiz: o relatorio PDF de Controle de Materiais informa `Total de registros` em uma granularidade diferente dos blocos operacionais importaveis.
- Impacto: a validacao de seguranca nao deve comparar cegamente o total do cabecalho com retiradas/entradas/consumos, pois isso pode bloquear uma previa correta.
- Arquivos envolvidos: `server/pdf-restore.ts`.
- Status: mitigado; o parser registra a diferenca em aviso e usa blocos operacionais identificaveis para decidir confianca.

### KI-008 - Politicas comerciais reais ainda dependem de decisao da IMPPEL

- Severidade: Medio.
- Causa raiz: a Etapa 4 criou a estrutura tecnica para alçadas, descontos, comissoes, logistica, versoes e aditivos, mas percentuais reais e responsaveis oficiais nao devem ser inventados no codigo.
- Impacto: a tela e as APIs permitem registrar e auditar politicas, mas a operacao em producao precisa de regras aprovadas pela direcao/contabilidade.
- Arquivos envolvidos: `client/src/pages/CommercialGovernance.tsx`, `server/routes.ts`, `shared/schema.ts`, `migrations/0002_stage_4_commercial_governance.sql`.
- Workaround: cadastrar politicas como rascunho e usar aprovacoes administrativas ate a homologacao comercial definitiva.
- Status: pendente de decisao operacional da IMPPEL.

### KI-008 - PDF local de Estoque difere do caso validado no Replit

- Severidade: Melhoria.
- Causa raiz: o unico arquivo `Relatorio_Estoque_14-07-2026_12-39.pdf` localizado no computador em 2026-07-20 extraiu 96 itens e 0 movimentacoes, enquanto a auditoria do Replit citava um PDF com 72 itens e 44 movimentacoes historicas.
- Impacto: nao foi possivel reproduzir localmente a contagem 72/44 com o arquivo disponivel; a faixa de leitura de quantidade ja cobre `X~544`.
- Arquivos envolvidos: `server/pdf-restore.ts`.
- Workaround: validar novamente quando o PDF exato usado no Replit estiver disponivel no ambiente local.
- Status: sem alteracao corretiva aplicada porque a causa nao foi reproduzida no arquivo local.

### KI-009 - Restore real de Controle de Materiais ainda exige PostgreSQL descartavel

- Severidade: Critico para aprovacao final da restauracao.
- Causa raiz: o ambiente local desta sessao nao possui `DATABASE_URL` de teste descartavel para executar a sequencia completa em PostgreSQL real.
- Impacto: o parser, a classificacao, o bootstrap Admin e os testes automatizados passaram, mas a aprovacao operacional final exige restaurar os cinco PDFs reais em banco PostgreSQL descartavel, repetir a importacao e comparar duplicidade/saldos.
- Arquivos envolvidos: `server/routes.ts`, `server/pdf-restore.ts`, `server/material-restore-service.ts`, `server/admin-bootstrap.ts`, `client/src/components/CompleteBackupManager.tsx`.
- Workaround: executar a validacao em Replit/dev com banco clonado ou PostgreSQL temporario, nunca em producao.
- Status: pendente de ambiente externo; release 1.0 documenta a implantacao e melhora previews/relatorios, mas a aprovacao final `CONTROLE DE MATERIAIS VALIDADO PARA RESTAURACAO` ainda depende de PostgreSQL descartavel com PDFs reais.

### KI-010 - Restore PDF ainda nao possui tabela dedicada de import jobs/fingerprints

- Severidade: Medio.
- Causa raiz: o schema atual nao possui tabela especifica para auditoria persistente de import jobs e fingerprints; a sprint atual registrou fingerprints em observacoes e reutilizou historicos existentes sem migration ampla.
- Impacto: a deduplicacao ficou mais deterministica para o fluxo atual, mas relatorios de importacao de longo prazo ainda dependem de campos textuais e historicos ja existentes.
- Arquivos envolvidos: `shared/schema.ts`, `server/routes.ts`, `server/material-restore-service.ts`, `server/material-pdf-import-service.ts`.
- Plano: criar migration segura para `import_jobs`/`import_fingerprints` em sprint dedicada com PostgreSQL descartavel, validando restore real antes de producao.

### KI-011 - Aliquota fiscal real ainda precisa ser confirmada pela IMPPEL

- Severidade: Medio.
- Causa raiz: a formula oficial agora suporta impostos no denominador, mas a aliquota real depende do regime fiscal e da decisao administrativa/contabil da IMPPEL.
- Impacto: enquanto `taxPercent` estiver 0, o ERP calcula sem imposto embutido. Isso evita inventar uma regra fiscal, mas exige configuracao antes do uso comercial definitivo.

### KI-012 - Procedimentos tecnicos reais da Etapa 5 dependem de aprovacao da IMPPEL

- Severidade: Medio.
- Causa raiz: a Etapa 5 criou a estrutura tecnica de qualidade das obras, mas tempos de cura, consumo, metodos, EPIs, criterios de aceite e treinamentos reais nao podem ser inventados no codigo.
- Impacto: a tela, APIs, bloqueios e backup estao prontos tecnicamente, mas a operacao em producao depende do preenchimento e aprovacao dos procedimentos reais.
- Arquivos envolvidos: `client/src/pages/WorkQuality.tsx`, `server/routes.ts`, `shared/schema.ts`, `migrations/0003_stage_5_work_quality.sql`.
- Workaround: cadastrar procedimentos como rascunho e manter marcador `PENDENTE DE VALIDACAO TECNICA DA IMPPEL` ate aprovacao interna.
- Status: pendente de decisao operacional da IMPPEL.
- Arquivos envolvidos: `shared/marginEngine.ts`, `shared/schema.ts`, `client/src/pages/CostConfig.tsx`.
- Workaround: configurar `Impostos (%)` em Custos e Margens assim que a aliquota for confirmada.
- Status: motor tecnico corrigido; pendencia humana/contabil.

### KI-012 - Validacao visual completa ainda depende de ambiente local com login

- Severidade: Medio.
- Causa raiz: a homologacao visual completa exige servidor local aberto, usuario valido, dados sinteticos e execucao de formulários reais.
- Impacto: problemas de UX responsiva podem restar mesmo com TypeScript/build/testes passando, principalmente em fluxos longos de formulario.
- Arquivos envolvidos: telas de Orçamentos, Financeiro, Custos e Margens, Estoque, OS, Garantias e Backup.
- Status: parcialmente mitigado em 2026-08-24 com validacao desktop e mobile 390x844 das telas principais das Etapas 4 a 6, sem erros de console e sem overflow relevante. Ainda exige piloto real com dados da IMPPEL.

### KI-014 - GitHub ainda pode depender de autenticacao local

- Severidade: Critico para continuidade em outros ambientes.
- Causa raiz: historicamente, o Git Credential Manager local falhou com `SEC_E_NO_CREDENTIALS` durante tentativas de push.
- Impacto: commits locais podem ficar preservados no computador, mas indisponiveis para Replit/GitHub ate autenticar novamente.
- Arquivos envolvidos: repositorio Git local e credenciais do GitHub.
- Workaround: autenticar o GitHub no Windows/Git Credential Manager e executar `git push origin main`; nunca usar reset para tentar resolver credencial.
- Status: validar novamente ao final deste gate.

### KI-013 - Etapa 6 depende de regras administrativas reais da IMPPEL

- Severidade: Medio.
- Causa raiz: o ERP agora possui estrutura para custodia, ocorrencias, apuracao, manutencao, kits, contagem e treinamento, mas prazos, politicas disciplinares, valores e consequencias financeiras dependem de decisao da empresa e validacao juridica/contabil.
- Impacto: o processo esta tecnicamente disponivel, mas nao deve ser considerado operacionalmente homologado sem piloto real, treinamento e regras aprovadas.
- Arquivos envolvidos: `client/src/features/materials/components/MaterialResponsibilityGovernance.tsx`, `server/routes.ts`, `shared/schema.ts`, `migrations/0004_stage_6_material_responsibility.sql`.
- Workaround: usar casos administrativos como registro de fatos, mantendo `financialStatus=sem_providencia_financeira` ate decisao humana.
- Status: pendente de homologacao operacional da IMPPEL.
