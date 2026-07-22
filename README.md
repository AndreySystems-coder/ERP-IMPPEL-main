# ERP IMPPEL

ERP operacional da IMPPEL Impermeabilizacao para orçamento, obras, controle de materiais, estoque, ferramentas retornaveis, usuarios, backup/restauracao e operacao diaria da equipe.

Esta base representa a versao 1.0 congelada para implantacao no Replit oficial da empresa. Apos esta release, novas evolucoes devem entrar como versoes 1.x.

## Arquitetura

- Frontend: React 18, Vite, Wouter, TailwindCSS, shadcn/ui e React Query.
- Backend: Express.js com APIs JSON.
- Banco: PostgreSQL.
- ORM/schema: Drizzle ORM em `shared/schema.ts`.
- Autenticacao: `express-session`; em ambiente com `DATABASE_URL`, sessoes persistem no PostgreSQL via `connect-pg-simple`.
- Build: `npm run build` gera frontend em `dist/public` e backend em `dist/index.cjs`.
- Inicio em producao: `npm start` executa `node dist/index.cjs`.

## Modulos principais

- Login, sessoes e bootstrap idempotente do Admin.
- Usuarios, cargos e permissoes por perfil.
- Produtos, servicos e estoque.
- Ferramentas e Equipamentos com total, disponivel, em campo, danificado, perdido e manutencao.
- Controle de Materiais com retiradas, devolucoes, fotos, assinaturas, historico e movimentacoes.
- Registro Rapido e Contagem Rapida.
- Vendas de materiais com permissao e validacao de estoque.
- Orcamentos, OS, obras, calendario, garantias, pos-venda e financeiro.
- Backup completo, exportacoes PDF e restore por PDF com preview e merge.

## Variaveis de ambiente

Crie `.env` local ou configure Secrets no provedor. Nunca envie valores reais ao GitHub.

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SESSION_SECRET=segredo-longo-e-aleatorio
DEFAULT_ADMIN_USERNAME=Admin
DEFAULT_ADMIN_PASSWORD=senha-inicial-segura
PORT=5000
NODE_ENV=production
```

Observacoes:

- `DATABASE_URL` e obrigatorio para PostgreSQL persistente.
- `SESSION_SECRET` e obrigatorio em producao.
- `DEFAULT_ADMIN_PASSWORD` deve existir antes do primeiro startup em banco vazio.
- O Admin e criado automaticamente se nao existir; se ja existir, nao e duplicado.

## Instalar e rodar localmente

```bash
npm install
npm run dev
```

A aplicacao sobe na porta `PORT` ou `5000`.

## Banco de dados

Aplicar schema no banco configurado:

```bash
npm run db:push
```

Antes de rodar, confirme se `DATABASE_URL` aponta para Desenvolvimento ou Producao. Nao rode em banco real sem backup e confirmacao.

## Build e producao

```bash
npm run build
npm start
```

## Testes

```bash
npx tsc --noEmit --incremental false
npm run build
npm run test
npm run test:backup
npm run test:operational
git diff --check
```

## Backup e restauracao

Ordem recomendada para importar PDFs em ambiente novo:

1. Usuarios e Cargos.
2. Catalogo de Produtos.
3. Catalogo de Servicos.
4. Estoque.
5. Controle de Materiais.

Sempre gere preview antes de confirmar. O restore opera em merge seguro, nao inventa usuarios, materiais ou cargos, nao cria fotos/assinaturas falsas e preserva duplicidades por fingerprints.

## Como publicar no Replit

1. Importar o repositorio GitHub oficial.
2. Criar ou conectar PostgreSQL.
3. Configurar Secrets: `DATABASE_URL`, `SESSION_SECRET`, `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD`.
4. Rodar `npm install`.
5. Confirmar banco correto.
6. Rodar `npm run db:push`.
7. Iniciar com `npm run dev` para validacao.
8. Fazer login com Admin.
9. Importar PDFs na ordem recomendada.
10. Resolver pendencias no preview.
11. Importar novamente os mesmos PDFs para confirmar ausencia de duplicidade.
12. Gerar backup completo inicial e guardar fora do GitHub.

## Atualizar o ERP

```bash
git pull --ff-only origin main
npm install
npm run build
npm run test
```

Depois reinicie o ambiente. GitHub sincroniza codigo; dados do banco nao sao sincronizados automaticamente.

## Trocar senha

Use a tela oficial de usuarios/reset de senha. Nao edite hash manualmente no banco. Para banco novo, altere `DEFAULT_ADMIN_PASSWORD` antes do primeiro startup.

## Documentacao oficial

- `PROMPT_MESTRE.md`
- `BACKLOG.md`
- `CHANGELOG.md`
- `KNOWN_ISSUES.md`
- `ROADMAP.md`
- `DEPLOY_CHECKLIST.md`
- `RELEASE_NOTES_v1.0.md`
- `DEPLOYMENT.md`
- `AI_CONTEXT.md`
