-- =============================================
-- Migration: Add odoo_analytic_id to branches
-- Date: 2026-04-13
-- Description: Enables mapping between Supabase branches and Odoo
--              meta.analitica records (sales targets) for the
--              Personnel Movements module.
-- =============================================

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS odoo_analytic_id INTEGER;

COMMENT ON COLUMN public.branches.odoo_analytic_id IS
  'Odoo analytic_account_id for mapping to meta.analitica (sales targets). NULL means not mapped; the branch will show as "sin meta" in the Personnel Movements module.';

CREATE INDEX IF NOT EXISTS idx_branches_odoo_analytic_id
  ON public.branches(odoo_analytic_id)
  WHERE odoo_analytic_id IS NOT NULL;

-- Population of this column is manual / out of band.
-- Example: UPDATE branches SET odoo_analytic_id = 123 WHERE short_name = 'BD-VVC';
