-- Migration: Multi-tool booking support
-- Adds booking_items table to support customers booking multiple tools in one booking

-- Create booking_items junction table for many-to-many relationship
create table booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  tool_id uuid not null references tools(id),
  quantity integer not null default 1 check (quantity > 0),
  price_at_booking decimal(10,2) not null,
  created_at timestamptz default now(),
  unique(booking_id, tool_id)
);

-- Create indexes for performance
create index booking_items_booking_idx on booking_items(booking_id);
create index booking_items_tool_idx on booking_items(tool_id);

-- Make tool_id nullable in bookings (null for multi-tool, populated for legacy single-tool)
alter table bookings alter column tool_id drop not null;

-- Update check_availability function to work with both legacy and new booking_items
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

  -- Count bookings from both legacy (tool_id) and new (booking_items) sources
  select count(*) into v_booked
  from bookings b
  where b.status = 'approved'
    and (
      -- Legacy: single-tool bookings via tool_id (no booking_items)
      (b.tool_id = p_tool_id and not exists (select 1 from booking_items where booking_id = b.id))
      or
      -- New: multi-tool via booking_items
      (exists (select 1 from booking_items bi where bi.booking_id = b.id and bi.tool_id = p_tool_id))
    )
    and b.start_time < p_end
    and b.end_time > p_start;

  return greatest(0, v_quantity - v_booked);
end;
$$ language plpgsql;

-- Enable RLS on booking_items
alter table booking_items enable row level security;

-- RLS policy: customers can view booking_items for their own bookings
create policy "customers_select_own_booking_items"
  on booking_items for select
  using (
    auth.uid() = (select customer_id from bookings where id = booking_id)
    or
    exists (select 1 from bookings where id = booking_id and status = 'pending')
  );

-- RLS policy: admins can view all booking_items
create policy "admin_all_booking_items"
  on booking_items for all
  using (
    exists (
      select 1 from settings where admin_password_hash is not null
    )
  );
