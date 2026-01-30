-- Add role column to admin_users if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'role') THEN
        ALTER TABLE public.admin_users ADD COLUMN role text not null check (role in ('superadmin', 'operator')) default 'operator';
    END IF;
END $$;
