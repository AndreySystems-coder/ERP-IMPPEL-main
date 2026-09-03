-- Canal/direcao do log de WhatsApp (para diferenciar envio manual de envio via n8n, e saida de entrada)
ALTER TABLE whatsapp_send_logs ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'manual';
ALTER TABLE whatsapp_send_logs ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'saida';

-- Configuracao singleton da automacao via n8n (URL do webhook de saida e segredo do webhook de entrada)
CREATE TABLE IF NOT EXISTS automation_settings (
  id serial PRIMARY KEY,
  n8n_webhook_url text,
  incoming_secret text,
  whatsapp_auto_send_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp DEFAULT now()
);
