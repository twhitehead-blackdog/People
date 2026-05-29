-- ============================================================
-- Tickets multi-departamento + Sugerencias
-- 2026-05-22
--
-- 1. Rename `it_tickets` → `tickets`, add `department` column
-- 2. Rename `it_ticket_comments` → `ticket_comments`
-- 3. Create `suggestions` table for ideas/improvements (with votes)
-- ============================================================

-- ── 1. Rename it_tickets → tickets + department column ────────
ALTER TABLE IF EXISTS public.it_tickets RENAME TO tickets;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'it';

-- Constraints siguen llamándose it_tickets_*. Renombrar para consistencia
-- (PostgREST usa estos nombres para embeds: ticket?select=*,requester:employees!tickets_requester_id_fkey(...))
ALTER TABLE public.tickets
  RENAME CONSTRAINT it_tickets_pkey TO tickets_pkey;
ALTER TABLE public.tickets
  RENAME CONSTRAINT it_tickets_requester_id_fkey TO tickets_requester_id_fkey;
ALTER TABLE public.tickets
  RENAME CONSTRAINT it_tickets_assignee_id_fkey TO tickets_assignee_id_fkey;

-- Validación: solo departamentos conocidos
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_department_check
  CHECK (department IN ('it', 'operations', 'accounting', 'hr'));

CREATE INDEX IF NOT EXISTS idx_tickets_department
  ON public.tickets(department, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_company_dept
  ON public.tickets(company_id, department, status);

-- Si la tabla tenía branch_id/company_id agregados después, asegúrate:
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS branch_id  uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- ── 2. Rename it_ticket_comments → ticket_comments ─────────────
ALTER TABLE IF EXISTS public.it_ticket_comments RENAME TO ticket_comments;

ALTER TABLE public.ticket_comments
  RENAME CONSTRAINT it_ticket_comments_pkey TO ticket_comments_pkey;
ALTER TABLE public.ticket_comments
  RENAME CONSTRAINT it_ticket_comments_ticket_id_fkey TO ticket_comments_ticket_id_fkey;
ALTER TABLE public.ticket_comments
  RENAME CONSTRAINT it_ticket_comments_author_id_fkey TO ticket_comments_author_id_fkey;

-- Drop existing service_role policies on renamed tables and recreate
DROP POLICY IF EXISTS "service_role_all" ON public.tickets;
DROP POLICY IF EXISTS "service_role_all" ON public.ticket_comments;

CREATE POLICY "service_role_all" ON public.tickets         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.ticket_comments FOR ALL USING (true) WITH CHECK (true);

-- ── 3. Suggestions (ideas / mejoras con votos) ─────────────────
CREATE TABLE IF NOT EXISTS public.suggestions (
  id            bigserial PRIMARY KEY,
  title         text NOT NULL,
  description   text,
  department    text NOT NULL DEFAULT 'operations'
                  CHECK (department IN ('it', 'operations', 'accounting', 'hr', 'general')),
  category      text,
  status        text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'under_review', 'planned', 'in_progress', 'implemented', 'rejected', 'duplicate')),
  impact        text CHECK (impact IN ('low', 'medium', 'high')),
  is_anonymous  boolean NOT NULL DEFAULT false,
  author_id     uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  branch_id     uuid REFERENCES public.branches(id)  ON DELETE SET NULL,
  company_id    uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  reviewer_id   uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  admin_response text,
  responded_at  timestamptz,
  vote_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_dept_status
  ON public.suggestions(department, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suggestions_company
  ON public.suggestions(company_id, status);

CREATE INDEX IF NOT EXISTS idx_suggestions_votes
  ON public.suggestions(vote_count DESC);

-- Votos (1 voto por empleado por sugerencia)
CREATE TABLE IF NOT EXISTS public.suggestion_votes (
  suggestion_id bigint NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  employee_id   uuid   NOT NULL REFERENCES public.employees(id)   ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (suggestion_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_suggestion_votes_employee
  ON public.suggestion_votes(employee_id);

-- Comentarios de sugerencias (similar a ticket_comments)
CREATE TABLE IF NOT EXISTS public.suggestion_comments (
  id            bigserial PRIMARY KEY,
  suggestion_id bigint NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  author_id     uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  content       text NOT NULL,
  is_internal   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_comments_sug
  ON public.suggestion_comments(suggestion_id, created_at);

-- Trigger: mantener vote_count sincronizado
CREATE OR REPLACE FUNCTION public.suggestion_votes_recount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.suggestions
       SET vote_count = vote_count + 1,
           updated_at = now()
     WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.suggestions
       SET vote_count = GREATEST(vote_count - 1, 0),
           updated_at = now()
     WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_suggestion_votes_recount ON public.suggestion_votes;
CREATE TRIGGER trg_suggestion_votes_recount
AFTER INSERT OR DELETE ON public.suggestion_votes
FOR EACH ROW EXECUTE FUNCTION public.suggestion_votes_recount();

-- RLS
ALTER TABLE public.suggestions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_votes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_comments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.suggestions         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.suggestion_votes    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.suggestion_comments FOR ALL USING (true) WITH CHECK (true);
