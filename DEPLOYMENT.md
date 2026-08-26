# Deployment - ERP IMPPEL

Este documento descreve como preparar, publicar e validar o ERP IMPPEL em producao.

## Estado atual da arquitetura

O ERP IMPPEL e uma aplicacao full stack com:

- Frontend React 18 + Vite.
- Backend Express 5 + Node.js.
- Banco PostgreSQL via `pg` e `drizzle-orm/node-postgres`.
- Sessoes com `express-session` e `connect-pg-simple` quando `DATABASE_URL` esta configurada.
- Build unico gerado por `npm run build`.

O build atual gera:

- `dist/public`: arquivos estaticos do frontend.
- `dist/index.cjs`: bundle de producao do servidor Express.

O start de producao atual e:

```bash
npm start
```

que executa:

```bash
node dist/index.cjs
```

## Comandos obrigatorios antes de deploy

```bash
npm install
npx tsc --noEmit --incremental false
npm run build
npm run test
```

Se `npm run test` nao puder ser executado por bloqueio externo do ambiente, registrar o bloqueio no relatorio da sprint e nao considerar a validacao completa.

## Variaveis de ambiente obrigatorias

Nunca commitar valores reais de variaveis.

Obrigatorias em producao:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SESSION_SECRET=uma-chave-longa-e-segura
DEFAULT_ADMIN_USERNAME=Admin
DEFAULT_ADMIN_PASSWORD=senha-inicial-segura
PORT=5000
```

Observacoes:

- `DATABASE_URL` define o banco PostgreSQL usado pelo ERP.
- `SESSION_SECRET` e obrigatorio em `NODE_ENV=production`; o servidor falha propositalmente se estiver ausente.
- `DEFAULT_ADMIN_USERNAME` deve ser `Admin` para o administrador padrao.
- `DEFAULT_ADMIN_PASSWORD` deve ser definido antes da primeira inicializacao do ambiente.
- `PORT` deve respeitar a porta fornecida pelo provedor quando existir. O codigo usa `process.env.PORT || "5000"`.

## Banco de dados

Provider esperado: PostgreSQL.

Antes de qualquer deploy com banco real:

1. Confirmar se o banco e Desenvolvimento ou Producao.
2. Fazer backup antes de operacoes de sincronizacao.
3. Confirmar que `DATABASE_URL` aponta para o banco correto.
4. Executar `npm run db:push` somente quando o ambiente correto estiver confirmado.
5. Validar login, sessoes, estoque, movimentacoes, backup e permissoes.

Nunca usar `db:push` em producao sem confirmacao explicita do banco alvo.

## Replit

No Replit, usar Secrets para:

- `DATABASE_URL`
- `SESSION_SECRET`
- `DEFAULT_ADMIN_USERNAME`
- `DEFAULT_ADMIN_PASSWORD`
- `PORT`, se necessario

Fluxo recomendado:

```bash
npm install
npm run db:push
npm run build
npm start
```

Para desenvolvimento assistido no Replit, `npm run dev` continua valido.

## Vercel

### Arquitetura implementada

O ERP roda na Vercel como **duas partes separadas**, definidas em `vercel.json`:

- **Frontend estatico**: `dist/public` (gerado pelo `npm run build`, mesmo build de sempre) e servido diretamente pela Vercel, sem passar pelo backend.
- **API serverless**: `api/index.ts` e o entrypoint que a Vercel reconhece automaticamente. Ele importa `createApp()` de `server/index.ts` (a mesma configuracao de sempre — sessao, rotas, etc.) e delega a requisicao para o Express, sem chamar `.listen()`.

`vercel.json` faz o roteamento: `/api/*` vai para a funcao serverless; qualquer outra rota cai no `index.html` do build estatico (necessario para o roteamento client-side do React).

`server/index.ts` usa `process.env.VERCEL` (definida automaticamente pela propria Vercel em toda funcao) para decidir o que pular:
- no Replit/local, `httpServer.listen(...)` continua rodando normalmente;
- na Vercel, esse `.listen()` e o `serveStatic(app)` (que le arquivos do disco relativo a `__dirname`) sao pulados — o frontend ja e servido fora da funcao.

Isso resolveu dois problemas reais encontrados durante a migracao, que quebrariam em serverless:
1. O token de confirmacao de "Limpar Dados Operacionais" (`server/routes.ts`) era guardado num `Map` em memoria — nao sobrevive entre invocacoes serverless. Agora persiste na tabela `settings` (via `storage.updateSetting`), com expiracao de 15 minutos e consumo de uso unico, igual ao comportamento anterior.
2. O `Pool` do Postgres (`server/db.ts`) nao tinha limite de conexoes — cada instancia serverless fria abriria seu proprio pool. Agora usa `max: 3`.

### Configuracao recomendada no projeto Vercel

No painel da Vercel:

- Install Command: `npm install` (padrao, detectado automaticamente).
- Build Command e Output Directory: ja vem de `vercel.json` (`npm run build` / `dist/public`) — nao precisa repetir no painel.
- `DATABASE_URL` deve ser a **connection string com pooling** (PgBouncer/Neon "pooled") do provedor, nao a direta — cada instancia serverless abre sua propria conexao.

### Variaveis obrigatorias no Vercel

Configurar Environment Variables para Production e Preview conforme a politica do projeto:

- `DATABASE_URL` (connection string **pooled**)
- `SESSION_SECRET`
- `DEFAULT_ADMIN_USERNAME`
- `DEFAULT_ADMIN_PASSWORD`

`PORT` nao se aplica a funcoes serverless (a Vercel gerencia isso).

Nao colocar valores reais neste documento.

### Validacao pos-deploy

Depois do deploy, validar pela URL publicada:

- Tela de login carrega.
- Login Admin funciona.
- Logout funciona.
- `/api/auth/me` responde corretamente.
- Dashboard carrega dados ou estado vazio sem erro.
- Produtos, Servicos, Clientes, Estoque, Ferramentas e Movimentacoes abrem.
- Backup abre sem erro.
- Sessoes persistem via cookie HTTP-only.
- Erros de API retornam JSON.

## Administrador padrao

O ERP deve aceitar:

- Usuario: `Admin`
- Senha inicial via `DEFAULT_ADMIN_PASSWORD`

A senha informada para producao deve ser configurada como variavel de ambiente e nunca commitada.

No startup, o backend executa bootstrap idempotente:

- se Admin nao existir, cria usando bcrypt;
- se Admin ja existir, nao duplica;
- se existir `admin` legado, normaliza para `Admin`;
- senha bcrypt existente e preservada;
- se o primeiro Admin precisar ser criado e `DEFAULT_ADMIN_PASSWORD` estiver ausente, o servidor falha com erro claro.

Para checklist operacional completo, usar tambem `DEPLOYMENT_CHECKLIST.md`.

Se o Admin ja existir no banco, o sistema nao deve duplicar usuario.

## Checklist final de producao

- [ ] Git local sincronizado com `origin/main`.
- [ ] `npm install` executado.
- [ ] TypeScript passou.
- [ ] Build passou.
- [ ] Testes passaram.
- [ ] Banco correto identificado.
- [ ] Backup do banco realizado antes de qualquer operacao de dados.
- [ ] Variaveis de ambiente configuradas no provedor.
- [ ] Deploy publicado.
- [ ] Login validado na URL publicada.
- [ ] APIs validadas na URL publicada.
- [ ] Sessoes validadas.
- [ ] Relatorio final registrado.
