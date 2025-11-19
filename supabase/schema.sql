-- People - Supabase Schema (PostgreSQL)
-- Ejecuta este archivo en tu proyecto de Supabase.
-- Incluye tablas base de RR.HH., asistencia y planilla.

-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- BRANCHES / DEPARTMENTS / POSITIONS
create table if not exists public.branches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.positions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamptz not null default now()
);

-- EMPLOYEES
create table if not exists public.employees (
  id uuid primary key default uuid_generate_v4(),
  code text unique,
  first_name text not null,
  last_name text not null,
  email text unique,
  gender text check (gender in ('M','F')),
  birth_date date,
  hire_date date not null default current_date,
  termination_date date,
  branch_id uuid references public.branches(id) on delete set null,
  position_id uuid references public.positions(id) on delete set null,
  contract_type text check (contract_type in ('fixed','temporary')) default 'fixed',
  salary numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists employees_branch_idx on public.employees(branch_id);
create index if not exists employees_position_idx on public.employees(position_id);

-- ATTENDANCE LOGS (reloj/clock)
create table if not exists public.attendance_logs (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  scheduled_in time,
  scheduled_out time,
  clock_in timestamptz,
  clock_out timestamptz,
  status text check (status in ('present','absent','late','on_leave')),
  minutes_late int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists attendance_logs_emp_date_idx
  on public.attendance_logs(employee_id, work_date);

-- DAILY LATES (view)
create or replace view public.v_lates_daily as
select
  work_date,
  count(*) filter (where minutes_late > 0 or status = 'late') as total_lates,
  sum(minutes_late) as total_minutes_late
from public.attendance_logs
group by work_date
order by work_date;

-- ABSENTEEISM (view)
create or replace view public.v_absenteeism_monthly as
select
  date_trunc('month', work_date)::date as month,
  count(*) filter (where status = 'absent') as total_absences
from public.attendance_logs
group by 1
order by 1;

-- PAYROLL
create table if not exists public.payrolls (
  id uuid primary key default uuid_generate_v4(),
  period_start date not null,
  period_end date not null,
  status text check (status in ('draft','approved','paid')) default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_items (
  id uuid primary key default uuid_generate_v4(),
  payroll_id uuid not null references public.payrolls(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  base_salary numeric(12,2) not null default 0,
  overtime_amount numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  net_pay numeric(12,2) not null default 0
);

create index if not exists payroll_items_emp_idx on public.payroll_items(employee_id);

-- EVENTS (cumpleaños/efemérides)
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  event_date date not null,
  type text check (type in ('birthday','anniversary','holiday','other')) default 'other',
  employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- BRANCH HEADCOUNT (view)
create or replace view public.v_headcount_by_branch as
select
  b.id as branch_id,
  b.name as branch_name,
  count(*) filter (where e.is_active) as active_employees
from public.branches b
left join public.employees e on e.branch_id = b.id
group by 1,2
order by 2;

-- TURNOVER (monthly) - bajas por mes
create or replace view public.v_turnover_monthly as
select
  date_trunc('month', termination_date)::date as month,
  count(*) as leavers
from public.employees
where termination_date is not null
group by 1
order by 1;

-- Row Level Security (opcional rápido)
alter table public.employees enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.payrolls enable row level security;
alter table public.payroll_items enable row level security;
alter table public.events enable row level security;

-- Policies simples (lectura pública, escritura por servicio)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'employees' and policyname = 'employees_read') then
    create policy employees_read on public.employees for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'attendance_logs' and policyname = 'attendance_logs_read') then
    create policy attendance_logs_read on public.attendance_logs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'payrolls' and policyname = 'payrolls_read') then
    create policy payrolls_read on public.payrolls for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'payroll_items' and policyname = 'payroll_items_read') then
    create policy payroll_items_read on public.payroll_items for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'events_read') then
    create policy events_read on public.events for select using (true);
  end if;
end $$;

-- FIN


