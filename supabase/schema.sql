create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_date timestamptz not null default now(),
  total_photos integer not null default 0,
  total_price numeric(10, 2) not null default 0,
  status text not null check (status in ('success', 'canceled'))
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  original_url text not null,
  filtered_url text,
  template_id uuid references public.templates(id)
);

create table if not exists public.analytics (
  id bigserial primary key,
  period_type text not null check (period_type in ('daily', 'monthly')),
  period_date date not null,
  page_views integer not null default 0,
  booth_usage integer not null default 0,
  created_at timestamptz not null default now(),
  unique (period_type, period_date)
);

create index if not exists photos_session_id_idx on public.photos(session_id);
create index if not exists photos_template_id_idx on public.photos(template_id);
create index if not exists analytics_period_date_idx on public.analytics(period_date);

insert into storage.buckets (id, name, public)
values ('templates', 'templates', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

create policy "Admins can upload template overlays"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'templates'
  and exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

create policy "Admins can update template overlays"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'templates'
  and exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

create policy "Admins can delete template overlays"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'templates'
  and exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);
