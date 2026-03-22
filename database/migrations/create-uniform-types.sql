-- Create uniform_types catalog table
CREATE TABLE IF NOT EXISTS uniform_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE uniform_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uniform_types_all" ON uniform_types FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_uniform_types_company ON uniform_types(company_id);

-- Seed initial types for all existing companies
INSERT INTO uniform_types (name, company_id)
SELECT t.name, c.id
FROM companies c
CROSS JOIN (
  VALUES
    ('Camiseta Polo'),
    ('Camiseta Cuello Redondo'),
    ('Pantalón'),
    ('Delantal'),
    ('Gorra'),
    ('Calzado de Trabajo'),
    ('Camisa'),
    ('Suéter')
) AS t(name);
