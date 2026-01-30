-- Create payment_vouchers table
create table if not exists payment_vouchers (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  is_used boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  used_at timestamptz
);

-- Add policy for authenticated users (operators/admins)
alter table payment_vouchers enable row level security;

create policy "Enable read access for authenticated users"
on payment_vouchers for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on payment_vouchers for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Enable update access for authenticated users"
on payment_vouchers for update
to authenticated
using (true);
