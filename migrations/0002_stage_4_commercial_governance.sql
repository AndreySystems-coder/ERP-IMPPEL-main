CREATE TABLE IF NOT EXISTS "commercial_policies" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'rascunho',
  "rules" text NOT NULL DEFAULT '{}',
  "approval_levels" text NOT NULL DEFAULT '[]',
  "notes" text,
  "effective_date" timestamp DEFAULT now(),
  "created_by_user_id" integer,
  "created_by_username" text,
  "updated_by_user_id" integer,
  "updated_by_username" text,
  "audit_trail" text NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "discount_requests" (
  "id" serial PRIMARY KEY,
  "job_id" integer NOT NULL,
  "quote_version_id" integer,
  "requested_by_user_id" integer NOT NULL,
  "requested_by_username" text NOT NULL,
  "approved_by_user_id" integer,
  "approved_by_username" text,
  "status" text NOT NULL DEFAULT 'pendente',
  "original_price" real NOT NULL DEFAULT 0,
  "requested_price" real NOT NULL DEFAULT 0,
  "discount_percent" real NOT NULL DEFAULT 0,
  "discount_amount" real NOT NULL DEFAULT 0,
  "margin_before" real NOT NULL DEFAULT 0,
  "margin_after" real NOT NULL DEFAULT 0,
  "reason" text NOT NULL,
  "notes" text,
  "expires_at" timestamp,
  "decision_notes" text,
  "decided_at" timestamp,
  "audit_trail" text NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "commission_records" (
  "id" serial PRIMARY KEY,
  "job_id" integer NOT NULL,
  "payment_id" integer,
  "user_id" integer,
  "username" text,
  "policy_id" integer,
  "status" text NOT NULL DEFAULT 'prevista',
  "base_amount" real NOT NULL DEFAULT 0,
  "percent" real NOT NULL DEFAULT 0,
  "fixed_amount" real NOT NULL DEFAULT 0,
  "commission_amount" real NOT NULL DEFAULT 0,
  "released_amount" real NOT NULL DEFAULT 0,
  "paid_amount" real NOT NULL DEFAULT 0,
  "notes" text,
  "audit_trail" text NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "logistics_records" (
  "id" serial PRIMARY KEY,
  "job_id" integer,
  "work_order_id" integer,
  "distance_km" real NOT NULL DEFAULT 0,
  "trips" integer NOT NULL DEFAULT 1,
  "cost_per_km" real NOT NULL DEFAULT 0,
  "tolls" real NOT NULL DEFAULT 0,
  "parking" real NOT NULL DEFAULT 0,
  "meals" real NOT NULL DEFAULT 0,
  "lodging" real NOT NULL DEFAULT 0,
  "other_costs" real NOT NULL DEFAULT 0,
  "total_cost" real NOT NULL DEFAULT 0,
  "manual_adjustment_reason" text,
  "created_by_user_id" integer,
  "created_by_username" text,
  "audit_trail" text NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "quote_versions" (
  "id" serial PRIMARY KEY,
  "job_id" integer NOT NULL,
  "version_number" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'rascunho',
  "scope_included" text NOT NULL DEFAULT '[]',
  "scope_excluded" text NOT NULL DEFAULT '[]',
  "assumptions" text NOT NULL DEFAULT '[]',
  "pricing_snapshot" text,
  "accepted_by_client_at" timestamp,
  "created_by_user_id" integer,
  "created_by_username" text,
  "audit_trail" text NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "scope_change_requests" (
  "id" serial PRIMARY KEY,
  "job_id" integer NOT NULL,
  "work_order_id" integer,
  "quote_version_id" integer,
  "type" text NOT NULL DEFAULT 'aditivo',
  "status" text NOT NULL DEFAULT 'pendente',
  "description" text NOT NULL,
  "material_impact" text NOT NULL DEFAULT '[]',
  "schedule_impact" text,
  "financial_impact" real NOT NULL DEFAULT 0,
  "margin_after" real NOT NULL DEFAULT 0,
  "requested_by_user_id" integer,
  "requested_by_username" text,
  "approved_by_user_id" integer,
  "approved_by_username" text,
  "decision_notes" text,
  "decided_at" timestamp,
  "audit_trail" text NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

ALTER TABLE "commercial_policies" ADD COLUMN IF NOT EXISTS "audit_trail" text NOT NULL DEFAULT '[]';
ALTER TABLE "quote_versions" ADD COLUMN IF NOT EXISTS "audit_trail" text NOT NULL DEFAULT '[]';
