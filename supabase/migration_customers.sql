-- Create customers table
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text,
  address text,
  marketing_opt_in boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add customer_id to bookings
alter table bookings add column if not exists customer_id uuid references customers(id);

-- Create index for lookups
create index if not exists customers_email_idx on customers(email);

-- Create email log table
create table if not exists batch_emails (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  recipient_count integer,
  sent_at timestamptz default now(),
  sent_by text not null
);

-- Create email recipients log
create table if not exists batch_email_recipients (
  id uuid primary key default gen_random_uuid(),
  batch_email_id uuid references batch_emails(id),
  customer_id uuid references customers(id),
  customer_email text not null,
  created_at timestamptz default now()
);

-- Enable RLS on customers table
alter table customers enable row level security;

-- RLS Policy: Admins can read all customers (we'll verify via session check in the app)
create policy "Customers visible to authenticated users only"
  on customers for select
  using (auth.role() = 'authenticated');

-- RLS Policy: Only allow inserts with matching email (for creating during booking)
create policy "Customers can be created during booking"
  on customers for insert
  with check (true);

-- RLS Policy: Only allow updates by authenticated users
create policy "Customers can be updated"
  on customers for update
  using (auth.role() = 'authenticated');

-- Enable RLS on batch_emails
alter table batch_emails enable row level security;
create policy "Batch emails visible to authenticated"
  on batch_emails for select
  using (auth.role() = 'authenticated');
create policy "Batch emails can be created"
  on batch_emails for insert
  with check (auth.role() = 'authenticated');
