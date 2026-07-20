# AI Context - ERP IMPPEL

Este arquivo resume o contexto tecnico e operacional que qualquer agente de IA deve ler antes de trabalhar no ERP IMPPEL.

## Projeto

Nome: ERP IMPPEL

Objetivo: centralizar operacoes da IMPPEL, incluindo CRM, clientes, orcamentos, ordens de servico, obras, estoque, ferramentas, controle de materiais, financeiro, garantias, pos-venda, usuarios, permissoes, backup e restauracao.

## Regras de prioridade

Antes de qualquer implementacao, ler:

1. `PROMPT_MESTRE.md`
2. `BACKLOG.md`
3. `CHANGELOG.md`
4. `KNOWN_ISSUES.md`
5. `ROADMAP.md`
6. `README.md`
7. `DEPLOYMENT.md`

Nunca ignorar o Prompt Mestre.

## Arquitetura

- Frontend: React 18, Vite, TypeScript, Wouter, TanStack Query, TailwindCSS, shadcn/ui.
- Backend: Express 5, Node.js, TypeScript.
- Banco: PostgreSQL.
- ORM: Drizzle ORM.
- Sessao: `express-session`, com `connect-pg-simple` quando `DATABASE_URL` existe.
- Build: `npm run build` gera `dist/public` e `dist/index.cjs`.
- Start: `npm start` executa `node dist/index.cjs`.

Pastas principais:

- `client/`: frontend.
- `server/`: backend, rotas, storage, backup e PDF restore.
- `shared/`: schema, tipos e regras compartilhadas.
- `script/`: scripts de build e testes.
- `docs/`: documentacao historica/auxiliar.

## Modulos criticos

- Autenticacao e sessoes.
- Usuarios e cargos.
- Permissoes por cargo.
- Estoque.
- Ferramentas e equipamentos.
- Controle de materiais.
- Movimentacoes.
- Venda de materiais.
- Financeiro.
- Orcamentos e OS.
- Backup e restauracao.

## Regras de estoque

- Nunca editar quantidade diretamente.
- Toda alteracao deve gerar movimentacao.
- `Total` representa estoque fisico.
- `Em Campo` representa ferramentas retiradas.
- Nunca calcular `Total + Em Campo` como estoque fisico.
- Devolucao em bom estado volta ao disponivel.
- Danificado, perdido e manutencao nao voltam ao disponivel.
- Se `Em Campo > Total`, exibir alerta operacional.

## Regras de dados reais

Nunca commitar:

- `.env`
- `.env.local`
- `.data`
- PDFs reais
- JSONs reais
- backups reais
- anexos reais
- uploads reais
- dados privados da IMPPEL
- credenciais

## Variaveis obrigatorias

- `DATABASE_URL`
- `SESSION_SECRET`
- `DEFAULT_ADMIN_USERNAME`
- `DEFAULT_ADMIN_PASSWORD`
- `PORT`

Valores reais devem existir apenas em `.env` local ignorado ou secrets do provedor.

## Banco de dados

Antes de qualquer operacao:

1. Identificar Desenvolvimento ou Producao.
2. Confirmar provider e `DATABASE_URL` sem expor segredo.
3. Fazer backup antes de alterar dados.
4. Nunca resetar ou sobrescrever producao sem confirmacao explicita.

## Deploy

Consultar `DEPLOYMENT.md`.

A publicacao no Vercel so e considerada valida quando:

- frontend carrega;
- backend Express responde;
- APIs respondem JSON;
- login funciona;
- sessao persiste;
- banco real esta conectado;
- modulos criticos abrem na URL publicada.

## Testes obrigatorios

Antes de commit/push quando houver alteracao:

```bash
npm install
npx tsc --noEmit --incremental false
npm run build
npm run test
```

Se `npm run test` estiver bloqueado por limitacao externa, registrar o bloqueio e nao afirmar validacao completa.

## Estado conhecido em 2026-07-16

- Documentacao oficial foi criada localmente para governanca do projeto.
- `DEPLOYMENT.md` e `AI_CONTEXT.md` foram adicionados para preparar producao.
- O projeto usa PostgreSQL por `DATABASE_URL`.
- O deploy Vercel requer validacao real de backend, banco e sessoes.
- Vercel CLI nao estava disponivel no ambiente local durante a auditoria.

## Atualizacao de contexto - 2026-07-20

- `server/pdf-restore.ts` possui parser especifico para `tipo=materiais`.
- O parser de materiais separa `withdrawals`, `entries` e `consumption`.
- Retiradas sao aplicadas em `material_withdrawals` e `material_withdrawal_items`; entradas e consumo viram movimentacoes oficiais de estoque.
- PDFs antigos de Controle de Materiais preservam datas historicas no preview e no restore.
- Produtos e responsaveis nao encontrados nao sao criados automaticamente; ficam listados como pendentes/nao resolvidos.

## Atualizacao de contexto - 2026-07-20 - Parser PDF real de materiais

- O PDF real PDF real de Controle de Materiais validado localmente possui colunas principais em `x~46`, `x~142`, `x~391`, `x~477` e `x~681`.
- A previa validada extrai 110 blocos operacionais: 78 retiradas, 5 entradas e 27 saidas/consumos, sem pendentes.
- `Total de registros: 294` no cabecalho nao deve ser tratado como total de blocos operacionais importaveis.
