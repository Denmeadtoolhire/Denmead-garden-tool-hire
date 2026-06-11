-- Add new status values and fields to bookings
alter table bookings
  alter column status set default 'pending',
  alter column status drop not null;

-- Add constraint with new statuses
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending', 'approved', 'alternative_suggested', 'cancelled'));

-- Add fields for alternative suggestions and customer response token
alter table bookings
  add column if not exists suggested_start_time timestamptz,
  add column if not exists suggested_end_time timestamptz,
  add column if not exists response_token uuid default gen_random_uuid(),
  add column if not exists admin_notes text;

-- Update existing confirmed bookings to approved
update bookings set status = 'approved' where status = 'confirmed';

-- Update availability function to only block APPROVED bookings
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
    and status = 'approved'
    and start_time < p_end
    and end_time > p_start;

  return greatest(0, v_quantity - v_booked);
end;
$$ language plpgsql;
