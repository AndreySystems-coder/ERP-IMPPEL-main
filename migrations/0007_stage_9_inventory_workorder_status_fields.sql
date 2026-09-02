-- Política de retorno explícita do item de estoque (retornavel | consumivel | null = usa a adivinhação por nome)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS return_policy text;

-- Motivo de recusa quando uma Ordem de Serviço recebe o status "Recusado"
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS refusal_reason text;

-- Cor customizável por status de orçamento (null usa o mapa padrão do código)
ALTER TABLE job_statuses ADD COLUMN IF NOT EXISTS color text;
