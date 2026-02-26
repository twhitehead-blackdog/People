-- Migración: Crear tabla groomer_branch_assignments
-- Fecha: 2026-01-10
-- Descripción: Tabla de asignaciones de sucursal para peluqueros (similar a vet_branch_assignments)

-- Tabla de asignaciones de sucursal para peluqueros
CREATE TABLE IF NOT EXISTS public.groomer_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: un empleado solo puede tener una asignación por fecha en una compañía
    CONSTRAINT groomer_branch_assignments_unique UNIQUE (company_id, employee_id, date)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_groomer_branch_assignments_employee ON public.groomer_branch_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_groomer_branch_assignments_date ON public.groomer_branch_assignments(date);
CREATE INDEX IF NOT EXISTS idx_groomer_branch_assignments_company ON public.groomer_branch_assignments(company_id);

-- RLS (Row Level Security)
ALTER TABLE public.groomer_branch_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY groomer_branch_assignments_read ON public.groomer_branch_assignments FOR SELECT USING (true);
CREATE POLICY groomer_branch_assignments_insert ON public.groomer_branch_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY groomer_branch_assignments_update ON public.groomer_branch_assignments FOR UPDATE USING (true);
CREATE POLICY groomer_branch_assignments_delete ON public.groomer_branch_assignments FOR DELETE USING (true);

-- Comentario de tabla
COMMENT ON TABLE public.groomer_branch_assignments IS 'Asignaciones de sucursal por día para peluqueros';
