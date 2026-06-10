-- Settings table (single row for business config)
create table settings (
  id integer primary key default 1,
  business_name text default 'Denmead Tool and Garden Hire Ltd',
  address text default '1 Inhams Lane, Denmead, PO7 6LX',
  phone text default '07889765153',
  email text default 'denmeadtoolhire@gmail.com',
  opening_time text default '08:00',
  closing_time text default '18:00',
  min_notice_hours integer default 1,
  open_days integer[] default '{1,2,3,4,5,6}', -- 0=Sun, 1=Mon... 6=Sat
  confirmation_email_subject text default 'Your booking confirmation - Denmead Tool Hire',
  confirmation_email_body text default 'Thank you for your booking! We look forward to seeing you.',
  admin_password_hash text
);

-- Insert default settings row
insert into settings (id) values (1) on conflict do nothing;

-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer default 0
);

insert into categories (name, sort_order) values
  ('Garden', 1),
  ('DIY', 2),
  ('Home Tools', 3);

-- Tools
create table tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references categories(id),
  image_url text,
  quantity integer default 1,
  price_4hr decimal(10,2) not null default 0,
  price_1day decimal(10,2) not null default 0,
  is_available boolean default true,
  created_at timestamptz default now()
);

-- Insert placeholder tools
insert into tools (name, description, category_id, quantity, price_4hr, price_1day)
select 'Lawnmower', 'Petrol lawnmower, suitable for medium to large lawns', id, 1, 15.00, 25.00 from categories where name = 'Garden';
insert into tools (name, description, category_id, quantity, price_4hr, price_1day)
select 'Hedge Trimmer', 'Electric hedge trimmer', id, 1, 10.00, 18.00 from categories where name = 'Garden';
insert into tools (name, description, category_id, quantity, price_4hr, price_1day)
select 'Rotavator', 'Petrol rotavator for breaking up soil', id, 1, 20.00, 35.00 from categories where name = 'Garden';
insert into tools (name, description, category_id, quantity, price_4hr, price_1day)
select 'SDS Drill', 'Heavy duty SDS drill with bits', id, 2, 12.00, 20.00 from categories where name = 'DIY';
insert into tools (name, description, category_id, quantity, price_4hr, price_1day)
select 'Pressure Washer', 'High pressure washer', id, 1, 15.00, 25.00 from categories where name = 'Home Tools';
insert into tools (name, description, category_id, quantity, price_4hr, price_1day)
select 'Carpet Cleaner', 'Professional carpet cleaning machine', id, 1, 20.00, 35.00 from categories where name = 'Home Tools';

-- Bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references tools(id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  hire_type text not null check (hire_type in ('4hr', '1day')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'confirmed' check (status in ('confirmed', 'cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- Index for fast availability checking
create index bookings_tool_time_idx on bookings(tool_id, start_time, end_time, status);

-- Function to check availability (returns available unit count for a tool at a given time)
create or replace function check_availability(
  p_tool_id uuid,
  p_start timestamptz,
  p_end timestamptz
) returns integer as $$
declare
  v_quantity integer;
  v_booked integer;
begin
  select quantity into v_quantity from tools where id = p_tool_id and is_available = true;
  if v_quantity is null then return 0; end if;

  select count(*) into v_booked
  from bookings
  where tool_id = p_tool_id
    and status = 'confirmed'
    and start_time < p_end
    and end_time > p_start;

  return greatest(0, v_quantity - v_booked);
end;
$$ language plpgsql;
