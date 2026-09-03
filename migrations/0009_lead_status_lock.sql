-- Trava o status do lead depois que ele for alterado manualmente (arrastar no Pipeline ou editar),
-- para que a reconciliacao automatica (baseada em orcamento/obra vinculados) pare de sobrescrever
-- um status escolhido pelo usuario.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_locked boolean NOT NULL DEFAULT false;
