-- ============================================
-- PERFORMANCE 360 - AUDITORÍA OPERATIVA
-- Tablas para gestión de evaluaciones, formularios y reglas
-- ============================================

-- Tabla de Reglas de Rendimiento (Configurable)
CREATE TABLE IF NOT EXISTS performance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'Critico', 'Moderado', 'Aceptable'
  min_score NUMERIC(5,2) NOT NULL, -- 0, 61, 81
  max_score NUMERIC(5,2) NOT NULL, -- 60, 80, 100
  multiplier NUMERIC(3,2) NOT NULL, -- 0.3, 0.7, 1.0
  severity TEXT NOT NULL, -- 'danger', 'warn', 'success' (para UI)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Formularios de Auditoría (Cabecera)
CREATE TABLE IF NOT EXISTS audit_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- 'Evaluación en Tienda', 'Evaluación en Peluquería'
  business_unit TEXT NOT NULL, -- 'Petshop', 'Grooming', 'Clinica'
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secciones del Formulario
CREATE TABLE IF NOT EXISTS audit_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_form_id UUID NOT NULL REFERENCES audit_forms(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- 'OP', 'AC', 'GI'
  title TEXT NOT NULL, -- 'Operaciones', 'Atención al Cliente'
  weight_percentage NUMERIC(5,2) NOT NULL, -- 30.00, 20.00
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preguntas de Auditoría
CREATE TABLE IF NOT EXISTS audit_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_section_id UUID NOT NULL REFERENCES audit_sections(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- 'OP.1', 'OP.2'
  question_text TEXT NOT NULL,
  weight_relative NUMERIC(5,2) NOT NULL, -- Peso relativo dentro de la sección
  is_critical BOOLEAN DEFAULT false, -- Si falla, ¿anula la sección? (Futuro)
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evaluaciones Realizadas (Instancias)
CREATE TABLE IF NOT EXISTS audit_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  audit_form_id UUID NOT NULL REFERENCES audit_forms(id),
  form_version INTEGER NOT NULL, -- Snapshot de la versión usada
  
  audited_by UUID NOT NULL REFERENCES employees(id), -- Quién realiza la auditoría
  evaluated_employee_id UUID REFERENCES employees(id), -- Gerente/Responsable (opcional)
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
  
  -- Resultados calculados (Snapshot para evitar recálculos)
  total_score NUMERIC(5,2), -- 0-100
  performance_level TEXT, -- 'Critico', 'Moderado', 'Aceptable'
  
  observations TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Respuestas Detalladas
CREATE TABLE IF NOT EXISTS audit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_evaluation_id UUID NOT NULL REFERENCES audit_evaluations(id) ON DELETE CASCADE,
  audit_question_id UUID NOT NULL REFERENCES audit_questions(id),
  
  answer_value TEXT NOT NULL CHECK (answer_value IN ('yes', 'no', 'na')), -- Cumple, No Cumple, No Aplica
  notes TEXT,
  
  -- Snapshot de valores al momento de responder (por si cambia la pregunta luego)
  question_text_snapshot TEXT, 
  weight_relative_snapshot NUMERIC(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_forms_company ON audit_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_evaluations_company ON audit_evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_evaluations_branch ON audit_evaluations(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_evaluations_date ON audit_evaluations(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_answers_eval ON audit_answers(audit_evaluation_id);

-- RLS (Seguridad)
ALTER TABLE performance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_answers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS Básicas (Lectura pública autenticada, escritura restringida por ahora abierta a auth)
-- Ajustar según roles más adelante
CREATE POLICY "Auth users read rules" ON performance_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users read forms" ON audit_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users read sections" ON audit_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users read questions" ON audit_questions FOR SELECT TO authenticated USING (true);

-- Evaluaciones: Ver solo de su compañía (y eventualmente solo sucursal)
CREATE POLICY "Users view company evals" ON audit_evaluations FOR SELECT TO authenticated 
USING (company_id = (SELECT company_id FROM employees WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Users create evals" ON audit_evaluations FOR INSERT TO authenticated 
WITH CHECK (company_id = (SELECT company_id FROM employees WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Users update own/company evals" ON audit_evaluations FOR UPDATE TO authenticated 
USING (company_id = (SELECT company_id FROM employees WHERE id = auth.uid() LIMIT 1));

-- Respuestas
CREATE POLICY "Users view answers" ON audit_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create answers" ON audit_answers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update answers" ON audit_answers FOR UPDATE TO authenticated USING (true);


-- ============================================
-- SEED DATA (Datos Iniciales)
-- ============================================

-- 1. Reglas de Rendimiento
INSERT INTO performance_rules (name, min_score, max_score, multiplier, severity) VALUES
('Critico', 0.00, 60.99, 0.30, 'danger'),
('Moderado', 61.00, 80.99, 0.70, 'warn'),
('Aceptable', 81.00, 100.00, 1.00, 'success');

-- Función Helper para insertar formulario completo (Simplificada para SQL plano)
DO $$
DECLARE
  v_company_id UUID;
  v_form_id UUID;
  v_sec_id UUID;
BEGIN
  -- Obtener ID de compañía (Asumiendo Black Dog existe, sino usar dummy o el primero)
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  IF v_company_id IS NOT NULL THEN
  
    -- ==========================================
    -- FORMULARIO 1: PETSHOP (TIENDA)
    -- ==========================================
    INSERT INTO audit_forms (company_id, title, business_unit, version, is_active)
    VALUES (v_company_id, 'Evaluación en Tienda', 'Petshop', 1, true)
    RETURNING id INTO v_form_id;

    -- Sección OP (30%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'OP', 'Operaciones - Punto de Venta', 30.00, 1)
    RETURNING id INTO v_sec_id;
    
    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'OP.1', 'Se realiza el protocolo de cierre de punto de venta al finalizar el turno (arqueo de caja, reporte de ventas).', 0.40, 1),
    (v_sec_id, 'OP.2', 'Se valida que la venta de medicamentos con receta se realice bajo prescripción médica.', 0.30, 2),
    (v_sec_id, 'OP.3', 'Se mantiene la integridad de precios (el precio marcado en estantería coincide con el sistema).', 0.10, 3),
    (v_sec_id, 'OP.4', 'Se revisa y valida que los descuentos y promociones especiales se apliquen correctamente.', 0.10, 4),
    (v_sec_id, 'OP.5', 'Se emiten los comprobantes fiscales/facturas electrónicas correctamente.', 0.10, 5);

    -- Sección AC (20%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'AC', 'Atención a Clientes', 20.00, 2)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'AC.1', 'Se implementa y vive la experiencia de marca "BLACK DOG" (saludo, amabilidad, asesoría).', 0.40, 1),
    (v_sec_id, 'AC.2', 'El personal está capacitado para proporcionar la información técnica básica de los productos.', 0.30, 2),
    (v_sec_id, 'AC.3', 'Se registran y gestionan de forma protocolaria las quejas y sugerencias de los clientes.', 0.20, 3),
    (v_sec_id, 'AC.4', 'Se envían fotos a los clientes al final de cada servicio (si aplica).', 0.05, 4),
    (v_sec_id, 'AC.5', 'Se ofrece una despedida profesional al cliente (se agradece la visita).', 0.05, 5);

    -- Sección GI (30%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'GI', 'Gestión de Inventario', 30.00, 3)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'GI.1', 'Realizan bisemanalmente un control riguroso de la fecha de vencimiento de los productos.', 0.45, 1),
    (v_sec_id, 'GI.2', 'Sistema FEFO aplicado a medicamentos y alimentos perecederos.', 0.30, 2),
    (v_sec_id, 'GI.3', 'Se solicita la dotación de mercancía baja en stock (requisición a tiempo).', 0.15, 3),
    (v_sec_id, 'GI.4', 'Cuentan con un espacio de almacenamiento dentro de las instalaciones ordenado.', 0.10, 4);

    -- Sección SL (15%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'SL', 'Seguridad y Limpieza', 15.00, 4)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'SL.1', 'Las estanterías y exhibidores se encuentran organizadas, limpias y seguras.', 0.40, 1),
    (v_sec_id, 'SL.2', 'Los productos pesados o voluminosos están colocados en lugares seguros.', 0.30, 2),
    (v_sec_id, 'SL.3', 'Se realiza diariamente la limpieza general de las áreas comunes.', 0.30, 3);
    
    -- Sección AE (5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'AE', 'Auto-Diagnóstico', 5.00, 5)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'AE.1', 'Revisión objetiva y honesta del nivel de cumplimiento y responsabilidad.', 1.00, 1);


    -- ==========================================
    -- FORMULARIO 2: GROOMING (PELUQUERÍA)
    -- ==========================================
    INSERT INTO audit_forms (company_id, title, business_unit, version, is_active)
    VALUES (v_company_id, 'Evaluación en Peluquería', 'Grooming', 1, true)
    RETURNING id INTO v_form_id;

    -- Sección BA (45%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'BA', 'Bienestar Animal', 45.00, 1)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'BA.1', 'Se mantiene un protocolo de manejo de animales nerviosos o agresivos.', 0.35, 1),
    (v_sec_id, 'BA.2', 'Utilizan equipos de sujeción seguros y adecuados para cada talla.', 0.20, 2),
    (v_sec_id, 'BA.3', 'Nunca dejan a los animales solos en las bañeras o en las mesas.', 0.20, 3),
    (v_sec_id, 'BA.4', 'Se realiza el triage en la peluquería para conocer problemas preexistentes.', 0.15, 4),
    (v_sec_id, 'BA.5', 'Todas las jaulas mantienen su comanda y un correcto cronograma.', 0.10, 5);

    -- Sección HD (30%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'HD', 'Higiene y Desinfección', 30.00, 2)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'HD.1', 'Realizan la limpieza y desinfección de las herramientas entre cada servicio.', 0.40, 1),
    (v_sec_id, 'HD.2', 'Mantienen una limpieza diaria de bañeras, mesas y suelo.', 0.30, 2),
    (v_sec_id, 'HD.3', 'Utilizan los productos (champús, acondicionadores) de grado profesional adecuados.', 0.30, 3);

    -- Sección PC (20%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'PC', 'Personal Capacitado', 20.00, 3)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'PC.1', 'Se cuenta con el personal capacitado o con experiencia en cortes de raza.', 0.60, 1),
    (v_sec_id, 'PC.2', 'Este personal cuenta con conocimientos básicos en primeros auxilios.', 0.40, 2);

   -- Sección AE (5%) -> Reutilizar lógica o crear nueva
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'AE', 'Auto-Diagnóstico', 5.00, 4)
    RETURNING id INTO v_sec_id;
    
    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'AE.1', 'Revisión objetiva y honesta del nivel de cumplimiento y responsabilidad.', 1.00, 1);


    -- ==========================================
    -- FORMULARIO 3: CLINICA (VETERINARIA)
    -- ==========================================
    INSERT INTO audit_forms (company_id, title, business_unit, version, is_active)
    VALUES (v_company_id, 'Evaluación en Veterinaria', 'Clinica', 1, true)
    RETURNING id INTO v_form_id;

    -- Sección GF (47.5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'GF', 'Gestión Farmacológica', 47.50, 1)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'GF.1', 'Realiza el uso obligatorio de Equipo de Protección Personal (EPP).', 0.40, 1),
    (v_sec_id, 'GF.2', 'Protocolo de manejo y desecho adecuado de material punzocortante y biológico.', 0.40, 2),
    (v_sec_id, 'GF.3', 'Se mantiene un debido control y registro de medicamentos controlados.', 0.10, 3),
    (v_sec_id, 'GF.4', 'Se verifica la cadena de frío para vacunas y medicamentos refrigerados.', 0.10, 4);

    -- Sección PR (47.5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'PR', 'Procedimiento y Registro Médico', 47.50, 2)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'PR.1', 'Realiza la revisión de la historia clínica de los pacientes antes de atender.', 0.25, 1),
    (v_sec_id, 'PR.2', 'El HC incluye la identificación completa del propietario y paciente.', 0.25, 2),
    (v_sec_id, 'PR.3', 'Se realiza la verificación de los protocolos de comunicación de diagnósticos.', 0.25, 3),
    (v_sec_id, 'PR.4', 'Realiza la revisión de disponibilidad y mantenimiento de equipos médicos.', 0.10, 4),
    (v_sec_id, 'PR.5', 'Mantiene un protocolos de limpieza y esterilización del instrumental.', 0.10, 5),
    (v_sec_id, 'PR.6', 'Mantiene un protocolo de desinfección entre pacientes en la mesa de exploración.', 0.05, 6);

    -- Sección AE (5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'AE', 'Auto-Diagnóstico', 5.00, 3)
    RETURNING id INTO v_sec_id;
    
    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'AE.1', 'Revisión objetiva y honesta del nivel de cumplimiento y responsabilidad.', 1.00, 1);

  END IF;
END $$;
