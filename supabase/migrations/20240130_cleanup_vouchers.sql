-- Function to cleanup used vouchers older than 1 month
create or replace function public.cleanup_old_vouchers()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.payment_vouchers
  where is_used = true
  and used_at < (now() - interval '1 month');
end;
$$;

-- Attempt to enable pg_cron extension (might fail if not supported on the specific tier/instance)
create extension if not exists pg_cron with schema extensions;

-- Schedule the job to run daily at 3 AM (checking for vouchers older than 1 month)
-- Note: '0 3 * * *' is cron syntax for 3:00 AM daily
select cron.schedule(
  'cleanup-old-vouchers',
  '0 3 * * *',
  'select public.cleanup_old_vouchers()'
);
