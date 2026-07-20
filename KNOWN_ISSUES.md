# Known Issues - ERP IMPPEL

Este arquivo registra riscos, problemas conhecidos, limitacoes e pendencias que precisam ser consideradas antes de cada sprint.

## Regras de manutencao

- Registrar causa raiz quando conhecida.
- Registrar impacto operacional.
- Registrar workaround, se existir.
- Registrar arquivos envolvidos, quando identificados.
- Remover ou atualizar itens quando forem corrigidos, refletindo a correcao no CHANGELOG.md.

## Problemas conhecidos atuais

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
- Impacto: registros cujo produto ou responsavel nao exista no ERP atual sao ignorados no merge e retornam em `unresolved` para revisao.
- Arquivos envolvidos: `server/pdf-restore.ts`, `server/routes.ts`.
- Workaround: restaurar ou cadastrar previamente catalogo, estoque e usuarios antes de aplicar PDF de Controle de Materiais.
- Status: comportamento seguro implementado; mapeamento manual pode ser evoluido em sprint futura.

### KI-007 - Total do cabecalho do PDF de materiais tem granularidade diferente dos blocos operacionais

- Severidade: Melhoria.
- Causa raiz: o relatorio PDF de Controle de Materiais informa `Total de registros` em uma granularidade diferente dos blocos operacionais importaveis.
- Impacto: a validacao de seguranca nao deve comparar cegamente o total do cabecalho com retiradas/entradas/consumos, pois isso pode bloquear uma previa correta.
- Arquivos envolvidos: `server/pdf-restore.ts`.
- Status: mitigado; o parser registra a diferenca em aviso e usa blocos operacionais identificaveis para decidir confianca.
