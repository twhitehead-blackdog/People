-- Fix null permission values in positions table
-- All permission flags should be explicitly false, not null
UPDATE positions SET dashboard_access = false WHERE dashboard_access IS NULL;
UPDATE positions SET admin = false WHERE admin IS NULL;
UPDATE positions SET schedule_admin = false WHERE schedule_admin IS NULL;
UPDATE positions SET schedule_approver = false WHERE schedule_approver IS NULL;
