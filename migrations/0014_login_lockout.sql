-- Bloqueio de login por tentativas: 5 erros -> bloqueio temporário de 1h; mais 5 erros
-- após o bloqueio temporário (10 no total) -> bloqueio permanente até o admin desbloquear.
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_lock_stage integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permanently_locked boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login_at timestamp;
