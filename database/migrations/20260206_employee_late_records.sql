-- =============================================
-- Migration: Create employee_late_records table
-- Date: 2026-02-06
-- Description: Almacena registros automáticos de tardanzas generados
--              desde el módulo de Peluquería y otros orígenes
-- =============================================

-- Create table for late records
CREATE TABLE IF NOT EXISTS public.employee_late_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ========== CAMPOS PRINCIPALES ==========
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    timelog_date DATE NOT NULL,
    
    -- ========== DATOS DE HORARIO ==========
    scheduled_entry_time TIME NOT NULL,           -- Hora programada de entrada
    actual_entry_time TIME NOT NULL,              -- Hora real de entrada marcada
    minutes_late INTEGER NOT NULL,                -- Minutos de tardanza calculados
    tolerance_minutes INTEGER DEFAULT 0,          -- Minutos de tolerancia aplicados
    
    -- ========== DATOS DEL EMPLEADO (snapshot) ==========
    employee_name TEXT NOT NULL,                  -- Nombre completo (denormalizado)
    position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
    position_name TEXT,                           -- Cargo en el momento del registro
    
    -- ========== DATOS DE UBICACIÓN ==========
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    branch_name TEXT,                             -- Sucursal donde marcó entrada
    
    -- ========== METADATOS DEL REGISTRO ==========
    source_module TEXT NOT NULL DEFAULT 'peluqueria',
                                  -- Origen: 'peluqueria', 'manual', 'kiosk', etc.
    source_timelog_id UUID REFERENCES public.timelogs(id) ON DELETE SET NULL,
                                  -- Referencia al timelog original
    
    -- ========== ESTADO Y GESTIÓN ==========
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'justified', 'compensated', 'discarded')),
                                  -- active: tardanza válida
                                  -- justified: se justificó posteriormente
                                  -- compensated: se compensó con tiempo extra
                                  -- discarded: descartada por error/admin
    
    justified_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    justified_at TIMESTAMPTZ,
    justification_reason TEXT,
    
    -- ========== MULTI-TENANT ==========
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- ========== TIMESTAMPS ==========
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- ========== CONSTRAINTS ==========
    -- Un registro por empleado por fecha (evita duplicados)
    CONSTRAINT uq_employee_late_record_date UNIQUE (employee_id, timelog_date),
    
    -- Validación: minutos de tardanza debe ser positivo
    CONSTRAINT chk_minutes_late_positive CHECK (minutes_late > 0),
    
    -- Validación: hora real debe ser posterior a la programada
    CONSTRAINT chk_actual_after_scheduled CHECK (actual_entry_time > scheduled_entry_time)
);

-- ========== ÍNDICES ==========
CREATE INDEX IF NOT EXISTS idx_late_records_date 
    ON public.employee_late_records(timelog_date);

CREATE INDEX IF NOT EXISTS idx_late_records_employee 
    ON public.employee_late_records(employee_id);

CREATE INDEX IF NOT EXISTS idx_late_records_branch 
    ON public.employee_late_records(branch_id);

CREATE INDEX IF NOT EXISTS idx_late_records_company 
    ON public.employee_late_records(company_id);

CREATE INDEX IF NOT EXISTS idx_late_records_status 
    ON public.employee_late_records(status);

-- Índice compuesto para consultas frecuentes por fecha + sucursal
CREATE INDEX IF NOT EXISTS idx_late_records_date_branch 
    ON public.employee_late_records(timelog_date, branch_id);

-- ========== ROW LEVEL SECURITY ==========
ALTER TABLE public.employee_late_records ENABLE ROW LEVEL SECURITY;

-- Política de lectura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employee_late_records' 
        AND policyname = 'late_records_read'
    ) THEN
        CREATE POLICY late_records_read 
            ON public.employee_late_records 
            FOR SELECT 
            USING (true);
    END IF;
END $$;

-- Política de inserción
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employee_late_records' 
        AND policyname = 'late_records_insert'
    ) THEN
        CREATE POLICY late_records_insert 
            ON public.employee_late_records 
            FOR INSERT 
            WITH CHECK (true);
    END IF;
END $$;

-- Política de actualización
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employee_late_records' 
        AND policyname = 'late_records_update'
    ) THEN
        CREATE POLICY late_records_update 
            ON public.employee_late_records 
            FOR UPDATE 
            USING (true);
    END IF;
END $$;

-- ========== TRIGGER PARA updated_at ==========
CREATE OR REPLACE FUNCTION update_late_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_late_records_updated_at 
    ON public.employee_late_records;

CREATE TRIGGER trg_late_records_updated_at
    BEFORE UPDATE ON public.employee_late_records
    FOR EACH ROW
    EXECUTE FUNCTION update_late_records_updated_at();

-- ========== COMENTARIOS ==========
COMMENT ON TABLE public.employee_late_records IS 
    'Registros automáticos de tardanzas generados desde el módulo de Peluquería y otros orígenes';

COMMENT ON COLUMN public.employee_late_records.minutes_late IS 
    'Minutos calculados de tardanza (después de aplicar tolerancia)';

COMMENT ON COLUMN public.employee_late_records.source_module IS 
    'Identifica el origen: peluqueria, manual, kiosk, api, etc.';

COMMENT ON COLUMN public.employee_late_records.status IS 
    'Estado del registro: active (válido), justified (justificado), compensated (compensado), discarded (descartado)';
