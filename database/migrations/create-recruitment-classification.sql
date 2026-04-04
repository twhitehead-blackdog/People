-- ============================================
-- MÓDULO DE CLASIFICACIÓN DE RECLUTAMIENTO
-- ============================================
-- Extiende el módulo de Feria de Empleo con:
-- 1. Campos de extracción en job_applications
-- 2. Tabla de reglas configurables
-- 3. Tabla de resultados de clasificación
-- ============================================

-- ============================================
-- 1. EXTENDER job_applications
-- ============================================

-- Texto crudo extraído del PDF/Word del CV
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS resume_text TEXT;

-- Datos estructurados parseados del CV (secciones identificadas + keywords)
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS resume_parsed JSONB DEFAULT '{}'::jsonb;

-- Fuente de la aplicación (feria de empleo o correo electrónico)
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'job_fair';

COMMENT ON COLUMN job_applications.resume_text IS 'Texto crudo extraído del archivo PDF/Word del CV';
COMMENT ON COLUMN job_applications.resume_parsed IS 'Datos estructurados parseados del CV: {experiencia, educacion, habilidades, idiomas, keywords_found}';
COMMENT ON COLUMN job_applications.source IS 'Origen de la aplicación: job_fair | email';

-- ============================================
-- 2. TABLA recruitment_rules
-- Reglas configurables para clasificar candidatos
-- ============================================

CREATE TABLE IF NOT EXISTS recruitment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Descripción de la regla
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Rol que se beneficia cuando la regla hace match
  target_role VARCHAR(100) NOT NULL,  -- ej: "gerente", "subgerente", "piso_venta"

  -- Qué campo evaluar
  field_to_check VARCHAR(100) NOT NULL,
  -- Opciones:
  --   "resume_text"     → texto completo del CV (PDF extraído)
  --   "resume_parsed.habilidades" → sección específica del CV parseado
  --   "resume_parsed.experiencia" → sección de experiencia
  --   "resume_parsed.educacion"   → sección de educación
  --   "resume_parsed.keywords_found" → keywords ya extraídas
  --   "additional_info" → campo del formulario de aplicación
  --   "position_name"   → posición a la que aplicó
  --   "salary_expectation" → expectativa salarial numérica
  --   "province"        → provincia de residencia
  --   "currently_working" → si trabaja actualmente (boolean)

  -- Cómo evaluar el campo
  match_type VARCHAR(50) NOT NULL,
  -- Opciones:
  --   "contains_keyword"  → el texto contiene la keyword (case-insensitive)
  --   "contains_any"      → el texto contiene alguna de las keywords (separadas por |)
  --   "regex"             → el texto hace match con la expresión regular
  --   "equals"            → el valor es exactamente igual a match_value
  --   "min_value"         → el valor numérico es >= match_value
  --   "max_value"         → el valor numérico es <= match_value
  --   "is_true"           → el valor booleano es verdadero
  --   "is_false"          → el valor booleano es falso

  match_value TEXT NOT NULL,
  -- Para contains_keyword: la keyword exacta (ej: "veterinaria")
  -- Para contains_any: keywords separadas por | (ej: "veterinaria|clínica|mascotas")
  -- Para regex: la expresión regular (ej: "\d+\s+años?\s+de\s+experiencia")
  -- Para equals: el valor exacto (ej: "Panamá")
  -- Para min_value/max_value: número como string (ej: "1000")
  -- Para is_true/is_false: no aplica (se ignora, puede ser "")

  -- Puntos otorgados cuando la regla hace match
  score_points INTEGER NOT NULL DEFAULT 1,

  -- Control
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,  -- orden de evaluación (mayor = primero)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_rules_company ON recruitment_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_rules_role ON recruitment_rules(target_role);
CREATE INDEX IF NOT EXISTS idx_recruitment_rules_active ON recruitment_rules(is_active);

DROP TRIGGER IF EXISTS update_recruitment_rules_updated_at ON recruitment_rules;
CREATE TRIGGER update_recruitment_rules_updated_at
  BEFORE UPDATE ON recruitment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE recruitment_rules IS 'Reglas configurables para clasificar candidatos por rol según contenido de su CV y datos del formulario';

-- ============================================
-- 3. TABLA recruitment_classifications
-- Resultados de clasificación por candidato
-- ============================================

CREATE TABLE IF NOT EXISTS recruitment_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Resultado
  recommended_role VARCHAR(100),     -- rol con mayor score total
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Ejemplo: {"gerente": 15, "subgerente": 8, "piso_venta": 3}

  matched_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ejemplo: [{"rule_id": "uuid", "rule_name": "Experiencia veterinaria", "target_role": "gerente", "points": 5}]

  extraction_status VARCHAR(50) DEFAULT 'pending',
  -- "pending"   → no se ha extraído el texto del CV aún
  -- "extracted" → texto del CV extraído correctamente
  -- "failed"    → falló la extracción (PDF protegido, imagen, etc.)
  -- "no_resume" → no tiene CV adjunto

  extraction_error TEXT,  -- mensaje de error si falló

  classified_at TIMESTAMPTZ DEFAULT NOW(),
  classified_by VARCHAR(50) DEFAULT 'system',  -- "system" | "manual"

  UNIQUE(job_application_id)
);

CREATE INDEX IF NOT EXISTS idx_recruitment_class_application ON recruitment_classifications(job_application_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_class_company ON recruitment_classifications(company_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_class_role ON recruitment_classifications(recommended_role);

COMMENT ON TABLE recruitment_classifications IS 'Resultados de clasificación de candidatos por rol, generados por el motor de reglas';

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- recruitment_rules: acceso autenticado (mismas reglas que el resto del dashboard)
ALTER TABLE recruitment_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read recruitment_rules" ON recruitment_rules;
CREATE POLICY "Authenticated users can read recruitment_rules"
  ON recruitment_rules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage recruitment_rules" ON recruitment_rules;
CREATE POLICY "Authenticated users can manage recruitment_rules"
  ON recruitment_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- recruitment_classifications: acceso autenticado
ALTER TABLE recruitment_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read recruitment_classifications" ON recruitment_classifications;
CREATE POLICY "Authenticated users can read recruitment_classifications"
  ON recruitment_classifications FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage recruitment_classifications" ON recruitment_classifications;
CREATE POLICY "Authenticated users can manage recruitment_classifications"
  ON recruitment_classifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. REGLAS DE EJEMPLO (para Black Dog)
-- Ejecutar después del setup inicial
-- ============================================

-- NOTA: Reemplazar 'COMPANY_ID_AQUI' con el UUID real de la empresa
-- Se puede descomentar y ejecutar con el company_id correcto después del setup

/*
INSERT INTO recruitment_rules (company_id, name, description, target_role, field_to_check, match_type, match_value, score_points, priority) VALUES
  -- Reglas para Gerente
  ('COMPANY_ID_AQUI', 'Experiencia veterinaria', 'Menciona veterinaria, clínica o animales en el CV', 'gerente', 'resume_text', 'contains_any', 'veterinaria|clínica veterinaria|medicina veterinaria|animales|mascotas', 10, 10),
  ('COMPANY_ID_AQUI', 'Experiencia en gerencia', 'Ha sido gerente, director o líder de equipo', 'gerente', 'resume_text', 'contains_any', 'gerente|gerencia|director|liderazgo|jefe de|coordinador', 8, 9),
  ('COMPANY_ID_AQUI', 'Expectativa salarial alta (Gerente)', 'Expectativa >= $1500 sugiere perfil gerencial', 'gerente', 'salary_expectation', 'min_value', '1500', 3, 5),

  -- Reglas para Subgerente
  ('COMPANY_ID_AQUI', 'Experiencia supervisión', 'Ha supervisado equipos o procesos', 'subgerente', 'resume_text', 'contains_any', 'supervisor|supervisión|asistente de gerencia|subgerente|encargado', 8, 10),
  ('COMPANY_ID_AQUI', 'Experiencia retail intermedia', 'Perfil de retail con algo de responsabilidad', 'subgerente', 'resume_text', 'contains_any', 'ventas|retail|comercial|inventario|caja', 4, 5),

  -- Reglas para Piso de Venta
  ('COMPANY_ID_AQUI', 'Experiencia atención al cliente', 'Experiencia directa con clientes', 'piso_venta', 'resume_text', 'contains_any', 'atención al cliente|servicio al cliente|cajero|vendedor|asesor de ventas', 8, 10),
  ('COMPANY_ID_AQUI', 'Primer empleo o poca experiencia', 'Sin trabajo actual puede ser candidato piso de venta', 'piso_venta', 'currently_working', 'is_false', '', 2, 3),
  ('COMPANY_ID_AQUI', 'Peluquería canina', 'Experiencia en peluquería/grooming', 'piso_venta', 'resume_text', 'contains_any', 'peluquería|grooming|estética canina|baño y corte', 6, 8);
*/
