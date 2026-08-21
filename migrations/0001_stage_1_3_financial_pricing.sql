ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS pricing_snapshot text;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS competence_date timestamp,
  ADD COLUMN IF NOT EXISTS due_date timestamp,
  ADD COLUMN IF NOT EXISTS paid_at timestamp,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'realized',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS job_id integer,
  ADD COLUMN IF NOT EXISTS work_order_id integer,
  ADD COLUMN IF NOT EXISTS installment text,
  ADD COLUMN IF NOT EXISTS recurrence text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS responsible_user_id integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

ALTER TABLE cost_config
  ADD COLUMN IF NOT EXISTS monthly_fixed_costs real NOT NULL DEFAULT 35382.71,
  ADD COLUMN IF NOT EXISTS pro_labore real NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS average_monthly_revenue real NOT NULL DEFAULT 333000,
  ADD COLUMN IF NOT EXISTS total_debt real NOT NULL DEFAULT 878451.77,
  ADD COLUMN IF NOT EXISTS hidden_cost_percent real NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS tax_percent real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rounding_mode text NOT NULL DEFAULT 'centavos',
  ADD COLUMN IF NOT EXISTS effective_date timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS change_history text DEFAULT '[]';
