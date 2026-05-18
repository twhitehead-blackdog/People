-- ============================================================
-- IT System Tables - Supabase Migration
-- Project: fsrptlzaqjkcutoiivjr
-- Generated from blackdog-it source code analysis
-- Execute in: https://supabase.com/dashboard/project/fsrptlzaqjkcutoiivjr/sql/new
-- ============================================================

-- 1. NVR Devices (CCTV recorders)
CREATE TABLE IF NOT EXISTS public.it_nvr_devices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip            text NOT NULL,
  port          integer NOT NULL DEFAULT 80,
  model         text,
  serial        text,
  name          text NOT NULL,
  location      text,
  username      text NOT NULL DEFAULT 'admin',
  password_enc  text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Camera status (populated by cron/ISAPI polling)
CREATE TABLE IF NOT EXISTS public.it_camera_status (
  id            bigserial PRIMARY KEY,
  nvr_id        uuid NOT NULL REFERENCES public.it_nvr_devices(id) ON DELETE CASCADE,
  channel_id    text NOT NULL,
  online        boolean NOT NULL DEFAULT false,
  disk_free_gb  numeric(10,2),
  disk_total_gb numeric(10,2),
  checked_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_camera_status_nvr_checked
  ON public.it_camera_status(nvr_id, checked_at DESC);

-- 3. IT Devices inventory
CREATE TABLE IF NOT EXISTS public.it_devices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type     text NOT NULL,
  brand           text,
  model           text,
  serial          text,
  mac             text,
  ip              text,
  location        text,
  employee_id     uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'active',
  purchase_date   date,
  warranty_until  date,
  cost            numeric(10,2),
  vendor          text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. Software licenses
CREATE TABLE IF NOT EXISTS public.it_software_licenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  software      text NOT NULL,
  version       text,
  vendor        text,
  license_type  text NOT NULL,
  expiry_date   date,
  total_seats   integer,
  used_seats    integer DEFAULT 0,
  annual_cost   numeric(10,2),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 5. Support tickets
CREATE TABLE IF NOT EXISTS public.it_tickets (
  id            bigserial PRIMARY KEY,
  title         text NOT NULL,
  description   text,
  requester_id  uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assignee_id   uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'open',
  priority      text NOT NULL DEFAULT 'medium',
  category      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 6. Ticket comments
CREATE TABLE IF NOT EXISTS public.it_ticket_comments (
  id          bigserial PRIMARY KEY,
  ticket_id   bigint NOT NULL REFERENCES public.it_tickets(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  content     text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 7. Mobile lines
CREATE TABLE IF NOT EXISTS public.it_mobile_lines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number        text NOT NULL,
  carrier       text,
  plan          text,
  monthly_cost  numeric(10,2),
  start_date    date,
  end_date      date,
  employee_id   uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'active',
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS: Enable and allow service_role full access
-- ============================================================
ALTER TABLE public.it_nvr_devices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_camera_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_software_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_ticket_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_mobile_lines     ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do everything (app uses service_role key)
CREATE POLICY "service_role_all" ON public.it_nvr_devices       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.it_camera_status     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.it_devices           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.it_software_licenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.it_tickets           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.it_ticket_comments   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.it_mobile_lines      FOR ALL USING (true) WITH CHECK (true);

-- NOTE: NVR seed data (14 records) and credentials are NOT in this migration.
-- They live only in the live Supabase project for security. Use Supabase
-- dashboard or vault to manage NVR credentials.
