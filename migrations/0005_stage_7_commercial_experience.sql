ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS document text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS service_interest text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS problem_description text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS approximate_area real;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgency text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to_username text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_interaction_at timestamp;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS loss_reason text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS loss_notes text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS postponed_reason text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_data text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sufficient_info boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_entered_at timestamp;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS history text DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

CREATE TABLE IF NOT EXISTS crm_pipeline_statuses (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  requires_loss_reason boolean NOT NULL DEFAULT false,
  requires_next_action boolean NOT NULL DEFAULT false,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_followups (
  id serial PRIMARY KEY,
  lead_id integer,
  job_id integer,
  status text NOT NULL DEFAULT 'pendente',
  reason text,
  message_template text,
  assigned_to_username text,
  due_date timestamp NOT NULL,
  completed_at timestamp,
  result text,
  channel text NOT NULL DEFAULT 'manual',
  external_provider text,
  external_message_id text,
  audit_trail text DEFAULT '[]',
  created_by_user_id integer,
  created_by_username text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_interactions (
  id serial PRIMARY KEY,
  lead_id integer,
  job_id integer,
  channel text NOT NULL DEFAULT 'manual',
  direction text NOT NULL DEFAULT 'outbound',
  summary text NOT NULL,
  status text,
  external_provider text,
  external_message_id text,
  occurred_at timestamp DEFAULT now(),
  created_by_user_id integer,
  created_by_username text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_content_plans (
  id serial PRIMARY KEY,
  title text NOT NULL,
  idea text,
  category text,
  channel text NOT NULL DEFAULT 'Instagram',
  objective text,
  service_name text,
  work_order_id integer,
  caption_draft text,
  cta text,
  media text,
  status text NOT NULL DEFAULT 'ideia',
  assigned_to_username text,
  planned_at timestamp,
  published_at timestamp,
  published_url text,
  result_notes text,
  ai_prompt text,
  audit_trail text DEFAULT '[]',
  created_by_user_id integer,
  created_by_username text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS help_articles (
  id serial PRIMARY KEY,
  module_key text NOT NULL,
  title text NOT NULL,
  audience text,
  role_name text,
  summary text,
  steps text DEFAULT '[]',
  common_errors text DEFAULT '[]',
  related_modules text DEFAULT '[]',
  route_path text,
  status text NOT NULL DEFAULT 'ativo',
  version integer NOT NULL DEFAULT 1,
  media text DEFAULT '[]',
  requires_acknowledgement boolean NOT NULL DEFAULT false,
  created_by_user_id integer,
  created_by_username text,
  approved_by_user_id integer,
  approved_by_username text,
  approved_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_return_policy_audits (
  id serial PRIMARY KEY,
  inventory_id integer NOT NULL,
  product_name text NOT NULL,
  previous_type text,
  new_type text,
  previous_policy text NOT NULL,
  new_policy text NOT NULL,
  reason text NOT NULL,
  impact_summary text,
  status text NOT NULL DEFAULT 'aplicado',
  created_by_user_id integer,
  created_by_username text,
  created_at timestamp DEFAULT now()
);
