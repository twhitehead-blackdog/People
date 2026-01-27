-- Migration: Add schedule_configurations table
-- Description: Create table for dynamic schedule configuration rules
-- Date: 2026-01-26

-- Create schedule_configurations table
CREATE TABLE IF NOT EXISTS schedule_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    -- Availability toggles
    is_active BOOLEAN NOT NULL DEFAULT true,
    allow_for_managers BOOLEAN NOT NULL DEFAULT true,
    allow_for_submanagers BOOLEAN NOT NULL DEFAULT true,

    -- Position restrictions (empty array = all positions allowed)
    allowed_position_ids UUID[] DEFAULT '{}',

    -- Daily usage limit (0 = no limit)
    daily_usage_limit INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one config per schedule per company
    -- company_id can be NULL for global configs
    UNIQUE(schedule_id, company_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schedule_configurations_schedule_id
    ON schedule_configurations(schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedule_configurations_company_id
    ON schedule_configurations(company_id);

CREATE INDEX IF NOT EXISTS idx_schedule_configurations_is_active
    ON schedule_configurations(is_active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_configurations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_schedule_configurations_timestamp ON schedule_configurations;
CREATE TRIGGER trigger_update_schedule_configurations_timestamp
    BEFORE UPDATE ON schedule_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_configurations_timestamp();

-- Enable RLS
ALTER TABLE schedule_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow read access to authenticated users for configs in their company or global configs
DROP POLICY IF EXISTS "schedule_configurations_select_policy" ON schedule_configurations;
CREATE POLICY "schedule_configurations_select_policy"
    ON schedule_configurations
    FOR SELECT
    TO authenticated
    USING (
        company_id IS NULL
        OR company_id IN (
            SELECT c.id FROM companies c
            WHERE c.id = company_id
        )
    );

-- Allow insert/update/delete for authenticated users (admins only in practice)
DROP POLICY IF EXISTS "schedule_configurations_insert_policy" ON schedule_configurations;
CREATE POLICY "schedule_configurations_insert_policy"
    ON schedule_configurations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "schedule_configurations_update_policy" ON schedule_configurations;
CREATE POLICY "schedule_configurations_update_policy"
    ON schedule_configurations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "schedule_configurations_delete_policy" ON schedule_configurations;
CREATE POLICY "schedule_configurations_delete_policy"
    ON schedule_configurations
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions
GRANT ALL ON schedule_configurations TO authenticated;
GRANT ALL ON schedule_configurations TO service_role;

-- Comment on table
COMMENT ON TABLE schedule_configurations IS 'Dynamic configuration rules for schedules (availability by role, position restrictions, usage limits)';
COMMENT ON COLUMN schedule_configurations.is_active IS 'Whether this schedule is active and available for assignment';
COMMENT ON COLUMN schedule_configurations.allow_for_managers IS 'Whether managers can be assigned this schedule';
COMMENT ON COLUMN schedule_configurations.allow_for_submanagers IS 'Whether submanagers can be assigned this schedule';
COMMENT ON COLUMN schedule_configurations.allowed_position_ids IS 'Array of position IDs that can use this schedule. Empty = all positions allowed';
COMMENT ON COLUMN schedule_configurations.daily_usage_limit IS 'Maximum employees that can use this schedule per day. 0 = no limit';
