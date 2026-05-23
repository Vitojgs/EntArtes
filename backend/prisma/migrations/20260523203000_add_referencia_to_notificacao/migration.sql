-- Migration: add referencia_id and referencia_tipo to notificacao
ALTER TABLE notificacao
  ADD COLUMN referencia_id INT NULL,
  ADD COLUMN referencia_tipo VARCHAR(50) NULL;
