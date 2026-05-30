-- Migration: Add tipo and hora columns to evento

ALTER TABLE evento ADD COLUMN IF NOT EXISTS tipo VARCHAR(50);
ALTER TABLE evento ADD COLUMN IF NOT EXISTS hora VARCHAR(5);
ALTER TABLE evento ADD COLUMN IF NOT EXISTS imagens TEXT;
