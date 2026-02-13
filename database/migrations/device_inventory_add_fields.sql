-- Add cost, last_maintenance_date, and branch_id to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_maintenance_date DATE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

CREATE INDEX IF NOT EXISTS idx_devices_branch_id ON devices(branch_id);
