# AGENTS.md — ERP IMPPEL

## Contexto

- **Produto:** ERP operacional interno da IMPPEL Impermeabilização — orçamento, obras, controle de materiais, estoque, ferramentas retornáveis, usuários/permissões, backup/restauração e operação diária da equipe.
- **Usuário principal:** equipe interna da IMPPEL (administrativo, técnicos de campo, gestão de obras) — não é produto voltado a clientes externos.
- **Objetivo:** substituir controle manual/planilhas pela operação diária da empresa em um único sistema, com trilha de auditoria para materiais, ferramentas e finanças.
- **Estado:** versão 1.0 congelada para implantação no Replit oficial da empresa (conforme `README.md`). Tecnicamente funcional (build, typecheck e testes automatizados passam), mas **nunca validado contra PostgreSQL real nem em produção** — ver `KNOWN_ISSUES.md` (KI-003, KI-004, KI-009, KI-016).

## Fonte da verdade

- **Código:** `https://github.com/AndreySystems-coder/ERP-IMPPEL-main.git`, branch `main`.
- **Dados:** PostgreSQL, schema Drizzle em `shared/schema.ts`. Nenhum banco de desenvolvimento/produção está acessível neste ambiente local de trabalho — qualquer comando de schema/migração precisa de confirmação explícita do ambiente alvo antes de rodar.
- **Configuração:** variáveis documentadas em `.env.example` (`DATABASE_URL`, `SESSION_SECRET`, `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD`, `PORT`, `NODE_ENV`). Nunca commitar `.env` com valores reais.
- **Documentação oficial:** `PROMPT_MESTRE.md`, `BACKLOG.md`, `CHANGELOG.md`, `KNOWN_ISSUES.md`, `ROADMAP.md`, `DEPLOYMENT.md`, `AI_CONTEXT.md`, `docs/erp_role_based_navigation.md`. `KNOWN_ISSUES.md` é a lista viva de riscos/pendências — consultar antes de assumir que algo está pronto.

## Estrutura principal

| Caminho | Responsabilidade |
| --- | --- |
| `client/src/pages/` | Telas por módulo (uma por etapa/funcionalidade: Inventory, MaterialControl, ToolsAndEquipment, Financials, CommercialGovernance, WorkQuality, CommercialSystem, VisualIdentity, BackupCenter, Usuarios, etc.) |
| `client/src/features/` | Componentes de domínio compartilhados (materials, inventory, financial, work-orders) |
| `client/src/lib/permissions.ts`, `components/ProtectedRoute.tsx` | Controle de acesso **só de UI** — não é a fonte de segurança real |
| `server/routes.ts` | Todas as rotas da API — inclui o middleware de permissão real (server-side) |
| `server/storage.ts` | Camada de acesso a dados (Drizzle) — inclui `restoreCompleteBackup` real (Postgres) e `createMemoryStorage` (usado só nos testes) |
| `server/complete-backup.ts`, `server/material-restore-service.ts`, `server/user-restore-service.ts`, `server/pdf-restore.ts` | Sistema de backup completo e restauração por PDF |
| `shared/schema.ts` | 67 tabelas Drizzle — fonte única de verdade do modelo de dados |
| `migrations/` | Migrações SQL incrementais por etapa (0001–0006) |
| `script/test-complete-backup.ts`, `script/test-operational-flows.ts` | Testes automatizados (scripts próprios com `node:assert`, não Jest/Vitest) |

## Comandos

```bash
npm install
npm run dev              # desenvolvimento (tsx server/index.ts)
npx tsc                  # typecheck (npm run check)
npm run build            # build client (Vite) + server (esbuild) em dist/
npm run test             # test:backup + test:operational
npm run db:push          # aplica schema no banco — NUNCA sem confirmar o alvo
```

## Regras que não podem ser quebradas

1. Verificar branch, `git status` e diff antes de alterar qualquer arquivo.
2. Nunca rodar `npm run db:push`, restauração de backup ou qualquer comando de schema sem confirmar explicitamente qual banco está no `DATABASE_URL` (dev/produção) e sem backup recente.
3. **Nunca usar o modo "Substituir" do restore de backup sem entender que ele faz `DELETE FROM <tabela>` sem WHERE** (`server/storage.ts:1283`) — apaga 100% das linhas atuais da tabela, não só as em conflito. Ver `[[project-erp-imppel]]` (memória) para o risco completo.
4. Nunca expor segredos (`DATABASE_URL`, `SESSION_SECRET`, senhas) em código, log ou documentação.
5. Uma fonte da verdade por dado: schema em `shared/schema.ts`, permissões reais em `server/routes.ts` (middleware + `requireAdmin`/`requireAnyPermission`), nunca no cliente.
6. Não inventar regras de negócio reais (percentuais de comissão, tempos de cura, políticas disciplinares, identidade visual oficial) — isso depende de decisão da IMPPEL, registrada em `KNOWN_ISSUES.md`. Manter como rascunho/pendente até aprovação.
7. Atualizar `README.md`/`AGENTS.md`/`KNOWN_ISSUES.md`/`CHANGELOG.md` somente quando a operação real mudar — não duplicar conteúdo entre eles.

## Arquivos e fluxos críticos

- **Autenticação:** `server/routes.ts` (rotas `api.auth.*`) + `server/index.ts` (sessão) + `server/admin-bootstrap.ts` (bootstrap idempotente do Admin). Não usa Passport apesar de estar no `package.json`.
- **Backup/restore:** `server/complete-backup.ts` + `server/storage.ts` (`restoreCompleteBackup`) — qualquer mudança aqui exige revalidar os dois modos (`merge`/`replace`) e o teste `script/test-complete-backup.ts`, sabendo que esse teste roda só em memória, nunca contra Postgres real.
- **Estoque/materiais:** `server/routes.ts` (rotas `inventory`/`material-*`) + `server/storage.ts` (`createInventoryMovement`) — mexer com cuidado na lógica de decremento/incremento de saldo.

## Validação obrigatória

- Rodar `npx tsc`, `npm run build` e `npm run test` antes de considerar qualquer mudança concluída.
- Testar o fluxo alterado manualmente quando possível (este ambiente local não tem banco Postgres disponível — declarar isso como limitação sempre que a validação depender de banco real).
- Revisar o diff antes de entregar; nunca declarar "restauração validada" ou "produção pronta" sem teste real contra Postgres, conforme já apontado em `KNOWN_ISSUES.md`.
- Seguir o checklist oficial do Framework (`FRAMEWORK/STANDARDS/CHECKLIST.md`) antes de encerrar uma sprint/entrega.

## Regras específicas de Sistema

- Validação de entrada sempre no servidor, mesmo se o cliente já validar.
- Autorização checada por rota no servidor — nunca confiar em `userId`/`role` enviado pelo cliente.
- Toda mudança de schema precisa de plano de aplicação e reversão, e de migração incremental em `migrations/`.
- Mudanças destrutivas em dados exigem backup prévio e autorização explícita do usuário.
- Logs não podem registrar senhas, tokens ou dados sensíveis.

## Critério de conclusão

Uma mudança está concluída quando: o escopo pedido foi implementado; `tsc`/`build`/`test` passaram; o fluxo alterado foi validado (ou a limitação de não ter sido testado contra banco real foi declarada); o diff foi revisado; README/AGENTS/KNOWN_ISSUES foram atualizados só se a operação mudou; limitações não verificadas foram declaradas explicitamente, nunca arredondadas para "pronto".

## O que não fazer

- Não reescrever partes funcionais só por preferência de estilo.
- Não adicionar dependências, frameworks de teste (Jest/Vitest) ou reestruturar pastas sem necessidade concreta.
- Não aplicar as Skills de site (`SKILLS PARA SITES.md`) ou o Protocolo V.L.A.E.G. a este projeto — não se aplicam a um ERP já com arquitetura definida.
- Não declarar uma etapa (das 8 do roadmap) como "concluída" apenas porque a UI/API existe — verificar se a regra de negócio real já foi aprovada pela IMPPEL (ver `KNOWN_ISSUES.md`).
