-- Fase 5: em qual fluxo de atendimento (whatsapp_flows) cada lead está atualmente,
-- para o quadro "Fluxos em Andamento" (separado do Pipeline de status).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS current_flow_trigger text;

-- Fase 6: credenciais da Evolution API (URL, chave e nome da instância) para o ERP poder
-- consultar status de conexão e buscar o QR code diretamente, sem precisar abrir o Manager.
ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS evolution_api_url text;
ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS evolution_api_key text;
ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS evolution_instance_name text DEFAULT 'imppel';
