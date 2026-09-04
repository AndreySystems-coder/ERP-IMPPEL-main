-- Envio automático de WhatsApp ao entrar em um status (Orçamentos e, agora, Obras).
ALTER TABLE job_statuses ADD COLUMN IF NOT EXISTS auto_send_whatsapp boolean NOT NULL DEFAULT false;

-- Obras não tinham tabela própria de status (eram strings fixas no código). Cria a tabela e
-- semeia com os 5 status atuais, para a tela de administração não começar vazia.
CREATE TABLE IF NOT EXISTS work_order_statuses (
  id serial PRIMARY KEY,
  name text NOT NULL,
  message text NOT NULL DEFAULT '',
  color text,
  sort_order integer DEFAULT 0,
  auto_send_whatsapp boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);

INSERT INTO work_order_statuses (name, sort_order)
SELECT * FROM (VALUES
  ('Planejada', 0),
  ('Agendada', 1),
  ('Em Andamento', 2),
  ('Concluída', 3),
  ('Recusado', 4)
) AS seed(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM work_order_statuses);
