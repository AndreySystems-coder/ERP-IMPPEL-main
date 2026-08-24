# Etapa 7 - Sistema Comercial e Experiencia Operacional

## Escopo concluido

- Sistema Comercial integrado ao CRM existente.
- Funil comercial configuravel por API.
- Leads ampliados com qualificacao, proxima acao, prioridade, historico e motivo de perda.
- Follow-ups comerciais manuais com auditoria.
- Sequencia de follow-up D+2/D+5/D+10 por API, com prevencao de duplicidade e horario comercial padrao.
- Planejamento simples de marketing e conteudo.
- Gerador seguro de rascunho de post em modo `mock/copy`, preparado para provedor real via variavel de ambiente.
- Central `Como Trabalhar` com guias por modulo e procedimentos aprovados.
- Graficos financeiros com Recharts sobre transacoes existentes.
- Auditoria de alteracao de politica consumivel/retornavel.
- Backup completo incluindo Sistema Comercial, Marketing, Como Trabalhar e Auditoria de Materiais.

## Arquitetura

- Schema: `shared/schema.ts`
- Migration: `migrations/0005_stage_7_commercial_experience.sql`
- Rotas: `server/routes.ts`
- Backup: `server/storage.ts`, `server/complete-backup.ts`, `client/src/lib/completeBackupArchive.ts`
- Frontend: `client/src/pages/CommercialSystem.tsx`, `client/src/pages/HowToWork.tsx`, `client/src/pages/Financials.tsx`, `client/src/pages/Inventory.tsx`

## APIs

- `GET /api/stage7/commercial-dashboard`
- `GET/POST/PATCH /api/crm-pipeline-statuses`
- `GET/POST/PATCH /api/crm-followups`
- `POST /api/crm-followups/sequence`
- `GET/POST /api/crm-interactions`
- `GET/POST/PATCH /api/marketing-content`
- `POST /api/marketing-content/generate-post`
- `GET/POST/PATCH /api/help-articles`
- `GET /api/material-return-policy-audits`

Todas usam autenticação e permissões existentes/novas.

## Permissoes

- `viewCommercialSystem`: sistema comercial, funil e follow-ups.
- `viewMarketingContent`: planejamento de marketing.
- `viewHelpCenter`: Central Como Trabalhar.

## Waseller / WhatsApp

Nao foi criada integracao falsa. O ERP permanece com fluxo assistido: mensagem sugerida, copia manual e confirmacao manual. Integracao real com Waseller depende de credenciais e contrato de API. n8n e opcional, nao obrigatorio para a Etapa 7.

## Politica de retorno

Mudanca entre consumivel e retornavel exige motivo. A alteracao fica registrada em `material_return_policy_audits`. Se houver retirada retornavel em aberto, a troca para consumivel e bloqueada.

## Pendencias operacionais

- Definir status oficiais do funil.
- Aprovar textos comerciais e roteiros reais.
- Informar credenciais/API Waseller se a integracao automatica for desejada.
- Preencher artigos reais da Central Como Trabalhar.
- Homologar em PostgreSQL real com usuarios de cada cargo.
- Definir provedor/credencial de IA se desejar geracao real de posts.
- Definir credenciais Meta/Instagram se desejar publicacao automatica futura.
