-- Baixa automática de estoque ao criar a OS + ajuste automático na conclusão.
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS materials_deducted boolean NOT NULL DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS materials_adjusted boolean NOT NULL DEFAULT false;
