-- Add missing estadoaula entries (canceled status)
INSERT INTO estadoaula (nomeestadoaula)
SELECT 'CANCELADO'
WHERE NOT EXISTS (SELECT 1 FROM estadoaula WHERE LOWER(nomeestadoaula) = 'cancelado');

-- Add missing estado entries
INSERT INTO estado (tipoestado)
SELECT 'CANCELADO'
WHERE NOT EXISTS (SELECT 1 FROM estado WHERE LOWER(tipoestado) = 'cancelado');

INSERT INTO estado (tipoestado)
SELECT 'REALIZADA'
WHERE NOT EXISTS (SELECT 1 FROM estado WHERE LOWER(tipoestado) = 'realizada');
