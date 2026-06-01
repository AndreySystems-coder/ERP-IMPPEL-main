# ERP IMPPEL

ERP operacional da IMPPEL Impermeabilização, focado em orçamento, execução de obras, controle de materiais, estoque, CRM/WhatsApp, garantias, pós-venda e financeiro.

## Visão Geral

O sistema organiza o fluxo principal da operação:

Lead → CRM/WhatsApp → Orçamento → Ordem de Serviço → Retirada/consumo de materiais → Estoque → Finalização → Garantia/Pós-venda → Pagamento → Financeiro.

O objetivo desta versão é servir como piloto interno controlado, com foco em estabilidade, rastreabilidade e uso mobile pelos funcionários.

## Tecnologias

- Frontend: React 18, Vite, Wouter, TailwindCSS, shadcn/ui
- Backend: Express.js
- Banco de dados: PostgreSQL
- ORM: Drizzle ORM
- Autenticação: sessão Express com armazenamento em PostgreSQL quando `DATABASE_URL` está configurada

## Instalação

```bash
npm install
```

Crie um arquivo `.env` com base em `.env.example` e configure as variáveis necessárias.

## Variáveis de Ambiente

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SESSION_SECRET=change-this-to-a-long-random-secret
DEFAULT_ADMIN_USERNAME=Admin
DEFAULT_ADMIN_PASSWORD=change-this-before-production
PORT=5000
```

Observações:

- `DATABASE_URL` é obrigatório para usar PostgreSQL.
- `SESSION_SECRET` é obrigatório em produção.
- `DEFAULT_ADMIN_PASSWORD` deve ser definido antes do primeiro deploy em produção/Replit.
- O arquivo `.env` não deve ser enviado ao GitHub.

## Rodar em Desenvolvimento

```bash
npm run dev
```

A aplicação sobe na porta definida por `PORT` ou, por padrão, em `5000`.

## Build e Produção

```bash
npm run build
npm start
```

## Banco de Dados

Para aplicar o schema no banco configurado:

```bash
npm run db:push
```

Não rode esse comando sem conferir se `DATABASE_URL` aponta para o banco correto.

## Replit

O projeto já possui `.replit` configurado para Node.js 20 e PostgreSQL 16.

Checklist no Replit:

- Importar o repositório do GitHub.
- Configurar Secrets: `DATABASE_URL`, `SESSION_SECRET`, `DEFAULT_ADMIN_PASSWORD` e, opcionalmente, `DEFAULT_ADMIN_USERNAME`.
- Rodar `npm install`.
- Rodar `npm run db:push` quando o banco estiver correto.
- Testar com `npm run dev`.
- Para deploy, usar o build configurado: `npm run build` e `node ./dist/index.cjs`.

## Piloto Interno

Antes de liberar para uso diário:

- Criar usuário administrador com senha forte via `DEFAULT_ADMIN_PASSWORD`.
- Testar o fluxo completo: lead, orçamento, OS, materiais, estoque, garantia/pós-venda, pagamento e financeiro.
- Validar permissões de acesso com usuários reais.
- Conferir dados de contato dos clientes antes de acionar WhatsApp/pós-venda.
- Fazer backup do banco antes de testes com dados reais.
