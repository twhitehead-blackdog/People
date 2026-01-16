-- ============================================
-- AUDIT TASKS SYSTEM
-- Tables for managing recurring audit tasks
-- ============================================

-- Main audit tasks table (task templates/definitions)
CREATE TABLE IF NOT EXISTS audit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  recurrence_type TEXT NOT NULL DEFAULT 'daily' CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom')),
  recurrence_config JSONB DEFAULT '{}',
  assignment_type TEXT NOT NULL DEFAULT 'all' CHECK (assignment_type IN ('all', 'specific', 'by_branch')),
  assigned_branch_ids UUID[] DEFAULT '{}',
  assigned_manager_ids UUID[] DEFAULT '{}',
  due_days INTEGER NOT NULL DEFAULT 1,
  reminder_days_before INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit task instances (actual task occurrences)
CREATE TABLE IF NOT EXISTS audit_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_task_id UUID NOT NULL REFERENCES audit_tasks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES employees(id),
  branch_id UUID REFERENCES branches(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'not_applicable', 'overdue')),
  scheduled_date DATE NOT NULL,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id),
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_tasks_company ON audit_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_active ON audit_tasks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_audit_tasks_category ON audit_tasks(category);

CREATE INDEX IF NOT EXISTS idx_audit_task_instances_company ON audit_task_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_assigned_to ON audit_task_instances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_status ON audit_task_instances(status);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_scheduled ON audit_task_instances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_due ON audit_task_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_branch ON audit_task_instances(branch_id);

-- Enable RLS
ALTER TABLE audit_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_task_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_tasks
CREATE POLICY "Users can view audit tasks in their company"
  ON audit_tasks FOR SELECT
  USING (true);

CREATE POLICY "Users can insert audit tasks in their company"
  ON audit_tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update audit tasks in their company"
  ON audit_tasks FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete audit tasks in their company"
  ON audit_tasks FOR DELETE
  USING (true);

-- RLS Policies for audit_task_instances
CREATE POLICY "Users can view audit task instances in their company"
  ON audit_task_instances FOR SELECT
  USING (true);

CREATE POLICY "Users can insert audit task instances"
  ON audit_task_instances FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update audit task instances"
  ON audit_task_instances FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete audit task instances"
  ON audit_task_instances FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_audit_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_tasks_updated_at
  BEFORE UPDATE ON audit_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_tasks_updated_at();

CREATE TRIGGER audit_task_instances_updated_at
  BEFORE UPDATE ON audit_task_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_tasks_updated_at();
