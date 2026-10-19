-- RICE DOCTOR: private, per-browser history using Supabase Auth anonymous users.
-- Run this in Supabase Dashboard > SQL Editor. Never use a secret/service_role key in the browser.

create table if not exists public.rice_doctor_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  title text not null,
  description text not null,
  symptoms text[] not null default '{}',
  growth_stage text not null,
  guidance text[] not null default '{}',
  model_class text,
  model_confidence real check (model_confidence is null or model_confidence between 0 and 1)
);

create index if not exists rice_doctor_records_user_created_idx
  on public.rice_doctor_records (user_id, created_at desc);

alter table public.rice_doctor_records enable row level security;

revoke all on public.rice_doctor_records from anon;
grant select, insert, delete on public.rice_doctor_records to authenticated;

drop policy if exists "Users read only their own rice records" on public.rice_doctor_records;
create policy "Users read only their own rice records"
  on public.rice_doctor_records for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users add only their own rice records" on public.rice_doctor_records;
create policy "Users add only their own rice records"
  on public.rice_doctor_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete only their own rice records" on public.rice_doctor_records;
create policy "Users delete only their own rice records"
  on public.rice_doctor_records for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Intentionally no image field and no public/anon policies.
