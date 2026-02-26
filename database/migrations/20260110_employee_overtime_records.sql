-- =============================================
-- Migration: Create employee_overtime_records table
-- Date: 2026-01-10
-- Description: Table to store overtime confirmation records
-- =============================================

-- Create enum type for overtime status (if not using check constraint)
-- Using CHECK constraint for simplicity and Supabase compatibility

CREATE TABLE IF NOT EXISTS public.employee_overtime_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    timelog_date DATE NOT NULL,
    hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    
    -- Status field
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'rejected')),
    
    -- Optional justification/comment
    reason TEXT,
    
    -- Audit fields for confirmation
    confirmed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    
    -- Multi-tenant support
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: one record per employee per date
    CONSTRAINT uq_employee_overtime_date UNIQUE (employee_id, timelog_date)
);

-- Index for efficient queries by date range
CREATE INDEX IF NOT EXISTS idx_overtime_records_date 
    ON public.employee_overtime_records(timelog_date);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_overtime_records_status 
    ON public.employee_overtime_records(status);

-- Index for filtering by company
CREATE INDEX IF NOT EXISTS idx_overtime_records_company 
    ON public.employee_overtime_records(company_id);

-- Index for employee lookups
CREATE INDEX IF NOT EXISTS idx_overtime_records_employee 
    ON public.employee_overtime_records(employee_id);

-- Enable Row Level Security
ALTER TABLE public.employee_overtime_records ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow read access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employee_overtime_records' 
        AND policyname = 'overtime_records_read'
    ) THEN
        CREATE POLICY overtime_records_read 
            ON public.employee_overtime_records 
            FOR SELECT 
            USING (true);
    END IF;
END $$;

-- RLS Policy: Allow insert for authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employee_overtime_records' 
        AND policyname = 'overtime_records_insert'
    ) THEN
        CREATE POLICY overtime_records_insert 
            ON public.employee_overtime_records 
            FOR INSERT 
            WITH CHECK (true);
    END IF;
END $$;

-- RLS Policy: Allow update for authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employee_overtime_records' 
        AND policyname = 'overtime_records_update'
    ) THEN
        CREATE POLICY overtime_records_update 
            ON public.employee_overtime_records 
            FOR UPDATE 
            USING (true);
    END IF;
END $$;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_overtime_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists to be idempotent)
DROP TRIGGER IF EXISTS trg_overtime_records_updated_at 
    ON public.employee_overtime_records;

CREATE TRIGGER trg_overtime_records_updated_at
    BEFORE UPDATE ON public.employee_overtime_records
    FOR EACH ROW
    EXECUTE FUNCTION update_overtime_records_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.employee_overtime_records IS 
    'Stores overtime confirmation records for payroll processing';
COMMENT ON COLUMN public.employee_overtime_records.status IS 
    'pending = not reviewed, confirmed = approved for payroll, rejected = denied';
COMMENT ON COLUMN public.employee_overtime_records.confirmed_by IS 
    'Employee ID of admin/HR who confirmed/rejected the overtime';
COMMENT ON COLUMN public.employee_overtime_records.confirmed_at IS 
    'Timestamp when the overtime was confirmed/rejected';
