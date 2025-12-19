-- ============================================
-- Agregar tipo "Compensatorio" a timeoff_types
-- ============================================

INSERT INTO timeoff_types (id, name) 
VALUES ('f2d92995-96a0-414f-b64a-9823db776745', 'Compensatorio')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Verificar que se creó correctamente
SELECT id, name FROM timeoff_types WHERE id = 'f2d92995-96a0-414f-b64a-9823db776745';

