-- =============================================
-- FIX: Agregar políticas RLS para service_role
-- El service_role key bypasea autenticación pero necesita políticas explícitas
-- Fecha: 2026-01-23
-- =============================================

-- performance_rules: Acceso total para service_role
DROP POLICY IF EXISTS "Service role full access rules" ON performance_rules;
CREATE POLICY "Service role full access rules" ON performance_rules 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- audit_forms: Acceso total para service_role
DROP POLICY IF EXISTS "Service role full access forms" ON audit_forms;
CREATE POLICY "Service role full access forms" ON audit_forms 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- audit_sections: Acceso total para service_role
DROP POLICY IF EXISTS "Service role full access sections" ON audit_sections;
CREATE POLICY "Service role full access sections" ON audit_sections 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- audit_questions: Acceso total para service_role
DROP POLICY IF EXISTS "Service role full access questions" ON audit_questions;
CREATE POLICY "Service role full access questions" ON audit_questions 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- audit_evaluations: Acceso total para service_role
DROP POLICY IF EXISTS "Service role full access evaluations" ON audit_evaluations;
CREATE POLICY "Service role full access evaluations" ON audit_evaluations 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- audit_answers: Acceso total para service_role
DROP POLICY IF EXISTS "Service role full access answers" ON audit_answers;
CREATE POLICY "Service role full access answers" ON audit_answers 
  FOR ALL TO service_role USING (true) WITH CHECK (true);
