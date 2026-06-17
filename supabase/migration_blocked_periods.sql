create table if not exists blocked_periods (
  id uuid primary key default gen_random_uuid(),
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz default now()
);

alter table blocked_periods enable row level security;
create policy "Blocked periods readable by all" on blocked_periods for select using (true);
create policy "Blocked periods manageable by authenticated" on blocked_periods for all using (auth.role() = 'authenticated');

alter table bookings add column if not exists reminder_sent boolean default false;
