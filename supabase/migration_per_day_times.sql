alter table settings
  add column if not exists opening_times jsonb not null default '{}',
  add column if not exists closing_times jsonb not null default '{}';
