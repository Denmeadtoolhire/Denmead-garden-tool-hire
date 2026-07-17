ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_hire_type_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_hire_type_check CHECK (hire_type IN ('4hr', '1day', '2day'));
