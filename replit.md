# Imppel ERP — replit.md

## Overview

Imppel ERP is a full-featured web-based ERP (Enterprise Resource Planning) system built for a Brazilian waterproofing and construction services company called **Imppel**. The system centralizes the entire business operation: CRM leads, client management, job quoting (Orçamentos), work orders, scheduling, inventory, financial transactions, and an intelligent scoring/margin engine.

The platform is designed with a dark-mode SaaS aesthetic and is intended to eventually evolve into a multi-tenant SaaS product for construction service companies.

**Core modules:**
- **Dashboard** — KPI metrics and revenue charts
- **CRM & Leads** — sales pipeline management
- **Clients** — full CRUD with WhatsApp integration
- **Orçamentos (Jobs)** — quotes with dynamic multi-service table (each row: service, area, unit price, auto-total), real-time cost/margin analysis inline, priority scoring, PDF generation with multi-service layout, and backward-compatible single-service support
- **Work Orders** — execution tracking
- **Calendar** — weekly/daily scheduling view
- **Payments** — payment tracking
- **Catalog** — product/service sales catalog
- **Price Calculator** — standalone calculator using the scoring and margin engines
- **Inventory** — stock management with low-stock alerts
- **Financials** — cash flow / transaction history
- **Priority Rules** — configurable AI-like job scoring criteria
- **Costs & Margins (CostConfig)** — configurable labor, transport, and margin thresholds
- **Registro de Obra** — field documentation forms with Antes/Durante/Depois stages, photo upload, and technician instructions
- **Usuários** — admin-only user management with two tabs: (1) Users list: create/delete/change role/password/jobTitle/cargo; (2) Cargos e Permissões: full CRUD for custom roles with granular permission toggles per group
- **Settings** — global system configuration
- **Mobile views** — dedicated mobile-optimized pages for field technicians
- **Contratos e Documentos** — generate, store, and track service contracts; auto-generate contract text; upload signed documents
- **Garantias** — warranty certificate management, active warranties with countdown, warranty incident tracking
- **Relatórios Gerenciais** — DRE mensal, obras por período, taxa de conversão, visão geral financeira
- **Equipe e Produtividade** — production logs per technician (hours worked, m², service type), productivity summary per technician
- **Pós-Venda e NPS** — NPS survey management, maintenance reminders at 12 and 24 months with WhatsApp shortcut links
- **Etapa 3 — Padronização Operacional** fully closed:
  - Auto stock deduction: POST /api/obra-consumo-logs now auto-creates inventory SAÍDA movement when inventoryId is set
  - PATCH /api/work-orders/:id route added for partial updates from RegistroObra
  - POST /api/work-orders/:id/finalizar route: marks OS as Concluída + auto-creates 12-month warranty
  - Technical checklist (8 items) in WorkOrders detail "Obra" tab — must be complete before finalizing
  - "Finalizar Obra" button: validates checklist + all services finished → calls /finalizar → auto-generates PDF + shows WhatsApp warranty link
  - checklistDone column added to work_orders table

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Monorepo Layout

```
/
├── client/          # React frontend (Vite)
├── server/          # Express backend (Node.js)
├── shared/          # Shared TypeScript types, schema, routes, business logic
├── script/          # Build scripts
├── migrations/      # Drizzle ORM migrations
```

The `shared/` folder is the key architectural decision — it holds:
- `schema.ts` — Drizzle/PostgreSQL table definitions and Zod insert schemas
- `routes.ts` — Typed API route definitions consumed by both frontend and backend
- `scoringEngine.ts` — Job priority scoring algorithm (service type, size, distance, return)
- `marginEngine.ts` — Cost calculation and margin evaluation logic

This eliminates duplication and keeps types synchronized across the stack.

### Frontend

- **React 18** with **TypeScript**, using **Wouter** for client-side routing (lightweight alternative to React Router)
- **Vite** as the bundler and dev server
- **TanStack React Query** for data fetching, caching, and mutations — all API calls go through typed hooks in `client/src/hooks/`
- **Tailwind CSS** with **shadcn/ui** (New York style, neutral base) for the component system
- **Framer Motion** for animations and page transitions
- **Recharts** for dashboard charts
- **date-fns** for date formatting
- Custom base components (`Button`, `Card`, `Input`, `Modal`) live alongside shadcn/ui components
- Authentication is checked via `/api/auth/me` using HTTP-only cookie sessions; the `ProtectedRoute` component redirects unauthenticated users to `/login`
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend

- **Express 5** (Node.js) with TypeScript, run via `tsx` in development
- Single entry: `server/index.ts` → `server/routes.ts` → `server/storage.ts`
- `server/storage.ts` implements an `IStorage` interface, making it possible to swap database implementations
- All business logic (scoring, margin) lives in `shared/` and is imported by both server and client
- Session management uses `express-session` with `connect-pg-simple` for PostgreSQL-backed sessions
- In development, Vite middleware is embedded in the Express server (`server/vite.ts`)
- In production, the frontend is compiled to `dist/public/` and served as static files

### Database

- **PostgreSQL** via `drizzle-orm/node-postgres` (pg Pool)
- **Drizzle ORM** with schema defined in `shared/schema.ts`
- Tables: `users`, `clients`, `services`, `leads`, `jobs`, `workOrders`, `inventory`, `payments`, `products`, `jobTracking`, `priorityRules`, `transactions`, `settings`, `costConfig`
- Migrations managed via `drizzle-kit` (`db:push` script)
- `DATABASE_URL` environment variable is required

### Key Business Logic (Shared Engines)

**Scoring Engine (`shared/scoringEngine.ts`)**  
Calculates a priority score for each job based on:
- Service type (manta asfáltica = highest points)
- Size in m²
- Distance in km
- Estimated financial return level

Outputs: score, priority (ALTA/MÉDIA/BAIXA), recommendation (ACEITAR/ORGANIZAR/RECUSAR)

**Margin Engine (`shared/marginEngine.ts`)**  
Calculates:
- Total cost = materials + labor + transport + extras
- Suggested price based on configurable margins
- Margin evaluation (IDEAL/ACEITÁVEL/CRÍTICA/PROIBIDA)
- Discount validation against minimum margin thresholds

Both engines use configurable parameters stored in the `priorityRules` and `costConfig` database tables, editable through the UI.

### Authentication

- Session-based authentication using `express-session`
- Users stored in the `users` table with `username`, bcrypt-hashed `password`, and `role` (`admin` or `employee`)
- A default admin user can be seeded on startup; configure `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` in environment variables before production/Replit deploy
- Frontend checks auth state via `/api/auth/me`

### Build & Deployment

- `npm run dev` — runs Express + Vite middleware together via `tsx`
- `npm run build` — Vite builds the frontend, then esbuild bundles the server to `dist/index.cjs`
- `npm run start` — runs the production bundle

---

## External Dependencies

| Dependency | Purpose |
|---|---|
| **PostgreSQL** | Primary database (required via `DATABASE_URL` env var) |
| **drizzle-orm / drizzle-kit** | ORM and migration tooling |
| **express-session + connect-pg-simple** | Server-side session management stored in PostgreSQL |
| **TanStack React Query** | Client-side data fetching and caching |
| **Radix UI primitives** | Accessible headless UI components (used by shadcn/ui) |
| **shadcn/ui** | Pre-built component library on top of Radix UI |
| **Tailwind CSS** | Utility-first CSS framework |
| **Framer Motion** | Animation library |
| **Recharts** | Chart components for dashboard |
| **Wouter** | Lightweight React router |
| **date-fns** | Date formatting and manipulation |
| **Zod** | Runtime schema validation (shared between frontend and backend) |
| **Google Fonts** | DM Sans and Outfit typefaces loaded via CDN in `index.html` |
| **Replit Vite plugins** | `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` — active only in Replit dev environment |
| **openai / @google/generative-ai** | Listed in build allowlist — AI integration hooks exist but may not be fully implemented |
| **stripe** | Listed in build allowlist — payment processing hooks may exist but may not be fully implemented |
| **nodemailer** | Listed in build allowlist — email sending capability |
| **multer** | File upload handling |
| **xlsx** | Excel export capability |
| **nanoid / uuid** | ID generation |

### Environment Variables Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string — must be provisioned before running |
| `NODE_ENV` | `development` or `production` |
