-- Security Hardening: Enforce Naz Context at Database Level
-- Pattern: System Config Table (Option A - Professional)

-- 1. Create Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
    key text PRIMARY KEY,
    value uuid NOT NULL
);

-- 2. Seed Naz Company ID (Run once)
-- Using the verified Naz ID: ddff33e5-1585-48ed-8689-fe4b8e77a63f
INSERT INTO system_config (key, value)
VALUES ('NAZ_COMPANY_ID', 'ddff33e5-1585-48ed-8689-fe4b8e77a63f')
ON CONFLICT (key) DO UPDATE
SET value = 'ddff33e5-1585-48ed-8689-fe4b8e77a63f';

-- 3. Enforcement Function
CREATE OR REPLACE FUNCTION enforce_naz_company()
RETURNS TRIGGER AS $$
DECLARE
    naz_id uuid;
BEGIN
    SELECT value INTO naz_id
    FROM system_config
    WHERE key = 'NAZ_COMPANY_ID';

    IF naz_id IS NULL THEN
        -- Fail hard: better to break than to pollute data checks
        RAISE EXCEPTION 'NAZ_COMPANY_ID not configured in system_config';
    END IF;

    -- Force the Company ID to Naz
    NEW.company_id := naz_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enforce_naz_company IS
'Forces all writes to use NAZ company_id to prevent cross-company leakage';

-- 4. Apply Triggers to Critical Tables
-- Timelogs (High Integrity)
DROP TRIGGER IF EXISTS trg_enforce_naz_timelogs ON timelogs;
CREATE TRIGGER trg_enforce_naz_timelogs
BEFORE INSERT OR UPDATE ON timelogs
FOR EACH ROW EXECUTE FUNCTION enforce_naz_company();

-- Requests (Vacations, Disabilities, etc.)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'requests') THEN
        DROP TRIGGER IF EXISTS trg_enforce_naz_requests ON requests;
        CREATE TRIGGER trg_enforce_naz_requests
        BEFORE INSERT OR UPDATE ON requests
        FOR EACH ROW EXECUTE FUNCTION enforce_naz_company();
    END IF;
END $$;

-- Employees (Prevent accidental cross-company creation)
DROP TRIGGER IF EXISTS trg_enforce_naz_employees ON employees;
CREATE TRIGGER trg_enforce_naz_employees
BEFORE INSERT OR UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION enforce_naz_company();
