-- Migración: Añadir created_by a groomer_branch_assignments
-- Fecha: 2026-04-24
-- Descripción: Rastrea qué empleado creó cada asignación para limitar
-- la eliminación solo a sus propias asignaciones (y dar view-only a gerentes).

ALTER TABLE public.groomer_branch_assignments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groomer_branch_assignments_created_by
  ON public.groomer_branch_assignments(created_by);

COMMENT ON COLUMN public.groomer_branch_assignments.created_by
  IS 'Empleado que creó la asignación; solo ese empleado (o admin) puede eliminarla.';
