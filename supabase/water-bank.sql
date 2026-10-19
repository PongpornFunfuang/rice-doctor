-- RICE DOCTOR Community Water Bank MVP
-- Run after schema.sql in Supabase SQL Editor. No real communities or water sources are seeded.
-- Never place a service_role/secret key in browser code.

-- Authorization helpers are not part of the Data API exposed public schema.
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;

create table if not exists public.water_communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 140),
  region text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- Staff grants are provisioned by a trusted project administrator in the SQL editor.
-- Farmers are regular authenticated users and do not need an elevated membership row.
create table if not exists public.water_community_staff (
  community_id uuid not null references public.water_communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('committee','admin')),
  created_at timestamptz not null default now(),
  primary key (community_id,user_id)
);

create table if not exists public.water_sources (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.water_communities(id) on delete restrict,
  name text not null check (length(btrim(name)) between 2 and 120),
  source_type text not null check (source_type in ('recharge_well','irrigation_well')),
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  location_note text,
  available_volume_m3 numeric(12,1) not null default 0 check (available_volume_m3 >= 0),
  note text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,community_id),
  check (source_type <> 'recharge_well' or available_volume_m3=0),
  check (location_note is null or length(location_note)<=240),
  check (note is null or length(note)<=500)
);

create table if not exists public.water_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.water_communities(id) on delete restrict,
  user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  plot_label text check (plot_label is null or length(plot_label)<=120),
  requested_volume_m3 numeric(12,1) not null check (requested_volume_m3 > 0 and requested_volume_m3 <= 1000000),
  preferred_start date not null,
  preferred_end date not null,
  note text check (note is null or length(note)<=1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','scheduled','partially_delivered','completed')),
  approved_volume_m3 numeric(12,1) check (approved_volume_m3 is null or approved_volume_m3 > 0),
  review_note text check (review_note is null or length(review_note)<=600),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (preferred_end >= preferred_start)
);

create table if not exists public.water_allocations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.water_requests(id) on delete restrict,
  community_id uuid not null references public.water_communities(id) on delete restrict,
  source_id uuid not null,
  allocated_volume_m3 numeric(12,1) not null check (allocated_volume_m3 > 0),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start),
  foreign key (source_id,community_id) references public.water_sources(id,community_id) on delete restrict
);

create table if not exists public.water_deliveries (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.water_allocations(id) on delete restrict,
  delivered_volume_m3 numeric(12,1) not null check (delivered_volume_m3 > 0),
  note text check (note is null or length(note)<=500),
  recorded_by uuid not null references auth.users(id),
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.water_preserve_source_creator()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by then raise exception 'Source creator is immutable'; end if;
  return new;
end $$;
drop trigger if exists water_sources_preserve_creator on public.water_sources;
create trigger water_sources_preserve_creator before update on public.water_sources for each row execute function public.water_preserve_source_creator();
revoke all on function public.water_preserve_source_creator() from public,anon;

create index if not exists water_sources_community_idx on public.water_sources(community_id,status,source_type);
create index if not exists water_requests_owner_idx on public.water_requests(user_id,created_at desc);
create index if not exists water_requests_community_status_idx on public.water_requests(community_id,status,created_at desc);
create index if not exists water_allocations_request_idx on public.water_allocations(request_id,scheduled_start);
create index if not exists water_deliveries_allocation_idx on public.water_deliveries(allocation_id,delivered_at desc);

create or replace function private.water_is_real_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u where u.id = (select auth.uid()) and u.is_anonymous is false and u.email_confirmed_at is not null)
$$;

create or replace function private.water_is_manager(p_community_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.water_community_staff s where s.community_id=p_community_id and s.user_id=(select auth.uid()) and s.role in ('committee','admin'))
$$;

alter table public.water_communities enable row level security;
alter table public.water_community_staff enable row level security;
alter table public.water_sources enable row level security;
alter table public.water_requests enable row level security;
alter table public.water_allocations enable row level security;
alter table public.water_deliveries enable row level security;

revoke all on public.water_communities,public.water_community_staff,public.water_sources,public.water_requests,public.water_allocations,public.water_deliveries from anon;
grant select on public.water_communities,public.water_community_staff,public.water_sources,public.water_requests,public.water_allocations,public.water_deliveries to authenticated;
grant insert,update on public.water_sources to authenticated;
grant insert on public.water_requests to authenticated;
revoke all on function private.water_is_real_user() from public,anon;
revoke all on function private.water_is_manager(uuid) from public,anon;
grant execute on function private.water_is_real_user() to authenticated;
grant execute on function private.water_is_manager(uuid) to authenticated;

drop policy if exists "Authenticated users see active water communities" on public.water_communities;
create policy "Authenticated users see active water communities" on public.water_communities for select to authenticated using (status='active' and private.water_is_real_user());
drop policy if exists "Staff can see own staff grant" on public.water_community_staff;
create policy "Staff can see own staff grant" on public.water_community_staff for select to authenticated using (private.water_is_real_user() and user_id=(select auth.uid()));

drop policy if exists "Authenticated users see water sources" on public.water_sources;
create policy "Authenticated users see water sources" on public.water_sources for select to authenticated using (private.water_is_real_user() and exists (select 1 from public.water_communities c where c.id=community_id and c.status='active'));
drop policy if exists "Managers register water sources" on public.water_sources;
create policy "Managers register water sources" on public.water_sources for insert to authenticated with check (private.water_is_real_user() and created_by=(select auth.uid()) and private.water_is_manager(community_id));
drop policy if exists "Managers update water sources" on public.water_sources;
create policy "Managers update water sources" on public.water_sources for update to authenticated using (private.water_is_real_user() and private.water_is_manager(community_id)) with check (private.water_is_real_user() and private.water_is_manager(community_id));

drop policy if exists "Farmers and managers read scoped requests" on public.water_requests;
create policy "Farmers and managers read scoped requests" on public.water_requests for select to authenticated using (private.water_is_real_user() and (user_id=(select auth.uid()) or private.water_is_manager(community_id)));
drop policy if exists "Farmers submit own pending requests" on public.water_requests;
create policy "Farmers submit own pending requests" on public.water_requests for insert to authenticated with check (private.water_is_real_user() and user_id=(select auth.uid()) and status='pending' and approved_volume_m3 is null and reviewed_by is null and exists(select 1 from public.water_communities c where c.id=community_id and c.status='active'));

drop policy if exists "Farmers and managers read scoped allocations" on public.water_allocations;
create policy "Farmers and managers read scoped allocations" on public.water_allocations for select to authenticated using (private.water_is_real_user() and exists(select 1 from public.water_requests r where r.id=request_id and (r.user_id=(select auth.uid()) or private.water_is_manager(r.community_id))));
drop policy if exists "Farmers and managers read scoped deliveries" on public.water_deliveries;
create policy "Farmers and managers read scoped deliveries" on public.water_deliveries for select to authenticated using (private.water_is_real_user() and exists(select 1 from public.water_allocations a join public.water_requests r on r.id=a.request_id where a.id=allocation_id and (r.user_id=(select auth.uid()) or private.water_is_manager(r.community_id))));

create or replace function public.water_review_request(p_request_id uuid,p_decision text,p_approved_volume_m3 numeric default null,p_note text default null)
returns public.water_requests language plpgsql security definer set search_path = '' as $$
declare r public.water_requests;
begin
  if not private.water_is_real_user() then raise exception 'A verified non-anonymous account is required'; end if;
  select * into r from public.water_requests where id=p_request_id for update;
  if not found or not private.water_is_manager(r.community_id) then raise exception 'Request not found or committee access required'; end if;
  if r.status <> 'pending' then raise exception 'Only pending requests can be reviewed'; end if;
  if p_decision is null or p_decision not in ('approve','reject') then raise exception 'Invalid decision'; end if;
  if p_decision='approve' then
    if coalesce(p_approved_volume_m3,r.requested_volume_m3) <= 0 or coalesce(p_approved_volume_m3,r.requested_volume_m3) > r.requested_volume_m3 then raise exception 'Approved volume must be positive and no greater than requested'; end if;
    update public.water_requests set status='approved',approved_volume_m3=coalesce(p_approved_volume_m3,r.requested_volume_m3),review_note=nullif(btrim(p_note),''),reviewed_by=(select auth.uid()),reviewed_at=now() where id=p_request_id returning * into r;
  else
    update public.water_requests set status='rejected',review_note=nullif(btrim(p_note),''),reviewed_by=(select auth.uid()),reviewed_at=now() where id=p_request_id returning * into r;
  end if;
  return r;
end $$;

create or replace function public.water_schedule_allocation(p_request_id uuid,p_source_id uuid,p_volume_m3 numeric,p_start timestamptz,p_end timestamptz)
returns public.water_allocations language plpgsql security definer set search_path = '' as $$
declare r public.water_requests; s public.water_sources; total numeric; a public.water_allocations;
begin
  if not private.water_is_real_user() then raise exception 'A verified non-anonymous account is required'; end if;
  select * into r from public.water_requests where id=p_request_id for update;
  if not found or not private.water_is_manager(r.community_id) then raise exception 'Request not found or committee access required'; end if;
  if r.status not in ('approved','scheduled','partially_delivered') then raise exception 'Request is not ready for allocation'; end if;
  if p_volume_m3 is null or p_volume_m3 <= 0 or p_start is null or p_end is null or p_end <= p_start then raise exception 'Invalid allocation details'; end if;
  select * into s from public.water_sources where id=p_source_id and community_id=r.community_id for update;
  if not found or s.source_type <> 'irrigation_well' or s.status <> 'active' then raise exception 'Select an active irrigation well in this community'; end if;
  select coalesce(sum(allocated_volume_m3),0) into total from public.water_allocations where request_id=r.id;
  if total+p_volume_m3 > r.approved_volume_m3 then raise exception 'Allocation exceeds approved request volume'; end if;
  if p_volume_m3 > s.available_volume_m3 then raise exception 'Allocation exceeds source volume marked available'; end if;
  update public.water_sources set available_volume_m3=available_volume_m3-p_volume_m3,updated_at=now() where id=s.id;
  insert into public.water_allocations(request_id,community_id,source_id,allocated_volume_m3,scheduled_start,scheduled_end,created_by)
  values(r.id,r.community_id,s.id,p_volume_m3,p_start,p_end,(select auth.uid())) returning * into a;
  update public.water_requests set status='scheduled' where id=r.id;
  return a;
end $$;

create or replace function public.water_record_delivery(p_allocation_id uuid,p_volume_m3 numeric,p_note text default null)
returns public.water_deliveries language plpgsql security definer set search_path = '' as $$
declare a public.water_allocations; r public.water_requests; already numeric; allocation_delivered numeric; d public.water_deliveries;
begin
  if not private.water_is_real_user() then raise exception 'A verified non-anonymous account is required'; end if;
  select * into a from public.water_allocations where id=p_allocation_id for update;
  if not found then raise exception 'Allocation not found'; end if;
  select * into r from public.water_requests where id=a.request_id for update;
  if not private.water_is_manager(r.community_id) then raise exception 'Committee access required'; end if;
  if p_volume_m3 is null or p_volume_m3 <= 0 then raise exception 'Delivered volume must be positive'; end if;
  select coalesce(sum(delivered_volume_m3),0) into allocation_delivered from public.water_deliveries where allocation_id=a.id;
  if allocation_delivered+p_volume_m3 > a.allocated_volume_m3 then raise exception 'Delivered volume exceeds this allocation'; end if;
  insert into public.water_deliveries(allocation_id,delivered_volume_m3,note,recorded_by) values(a.id,p_volume_m3,nullif(btrim(p_note),''),(select auth.uid())) returning * into d;
  select coalesce(sum(delivered_volume_m3),0) into already from public.water_deliveries x join public.water_allocations y on y.id=x.allocation_id where y.request_id=r.id;
  update public.water_allocations set status=case when allocation_delivered+p_volume_m3 >= a.allocated_volume_m3 then 'completed' else 'in_progress' end where id=a.id;
  update public.water_requests set status=case when already >= approved_volume_m3 then 'completed' else 'partially_delivered' end where id=r.id;
  return d;
end $$;

revoke all on function public.water_review_request(uuid,text,numeric,text) from public,anon;
revoke all on function public.water_schedule_allocation(uuid,uuid,numeric,timestamptz,timestamptz) from public,anon;
revoke all on function public.water_record_delivery(uuid,numeric,text) from public,anon;
grant execute on function public.water_review_request(uuid,text,numeric,text) to authenticated;
grant execute on function public.water_schedule_allocation(uuid,uuid,numeric,timestamptz,timestamptz) to authenticated;
grant execute on function public.water_record_delivery(uuid,numeric,text) to authenticated;

-- Example provisioning commands (run manually after creating a community and using the real account UUID):
-- insert into public.water_communities(name,region) values ('ชื่อชุมชนที่ยืนยันแล้ว','ตำบล/อำเภอ');
-- insert into public.water_community_staff(community_id,user_id,role) values ('<community-uuid>','<auth-user-uuid>','admin');
-- Never use example/fictitious water-source records as operational data.

