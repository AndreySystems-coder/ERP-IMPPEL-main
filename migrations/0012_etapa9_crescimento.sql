-- Etapa 9 — Preparação para Crescimento: treinamento, contratação, produtividade e supervisão.
CREATE TABLE IF NOT EXISTS employee_training_programs (
  id serial PRIMARY KEY,
  name text NOT NULL,
  target_role text,
  description text,
  required_frequency_days integer,
  active boolean NOT NULL DEFAULT true,
  audit_trail text DEFAULT '[]',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_training_records (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  program_id integer NOT NULL,
  status text NOT NULL DEFAULT 'concluido',
  completed_at timestamp,
  certified_by_user_id integer,
  certified_by_username text,
  notes text,
  audit_trail text DEFAULT '[]',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hiring_profiles (
  id serial PRIMARY KEY,
  role_name text NOT NULL,
  ideal_profile text,
  requirements text,
  interview_script text,
  active boolean NOT NULL DEFAULT true,
  audit_trail text DEFAULT '[]',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hiring_candidates (
  id serial PRIMARY KEY,
  name text NOT NULL,
  role_name text,
  phone text,
  email text,
  stage text NOT NULL DEFAULT 'triagem',
  notes text,
  applied_at timestamp DEFAULT now(),
  audit_trail text DEFAULT '[]',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productivity_targets (
  id serial PRIMARY KEY,
  label text NOT NULL,
  service_type text,
  target_value real NOT NULL,
  unit text NOT NULL DEFAULT 'm²/dia',
  active boolean NOT NULL DEFAULT true,
  audit_trail text DEFAULT '[]',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supervision_checklist_templates (
  id serial PRIMARY KEY,
  name text NOT NULL,
  target_role text,
  frequency text NOT NULL DEFAULT 'diario',
  items text DEFAULT '[]',
  active boolean NOT NULL DEFAULT true,
  audit_trail text DEFAULT '[]',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supervision_checklist_runs (
  id serial PRIMARY KEY,
  template_id integer NOT NULL,
  supervisor_user_id integer,
  supervisor_username text,
  employee_user_id integer,
  work_order_id integer,
  run_date timestamp DEFAULT now(),
  responses text DEFAULT '{}',
  pending_count integer NOT NULL DEFAULT 0,
  notes text,
  audit_trail text DEFAULT '[]',
  created_at timestamp DEFAULT now()
);

-- Colunas novas em users: aplicadas SEPARADAMENTE e ANTES do deploy do código que as usa,
-- porque users é consultada em toda requisição autenticada (sessão/login) — ao contrário das
-- tabelas novas acima, que só passam a ser consultadas quando as telas novas forem abertas.
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_date text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id integer;
