-- Add created_at column to user_data table to track account age

alter table public.user_data 
add column created_at timestamptz not null default now();

-- Update existing rows to have created_at = updated_at for existing users
update public.user_data 
set created_at = updated_at 
where created_at is null;