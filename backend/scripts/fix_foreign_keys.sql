-- Fix foreign key constraints with proper CASCADE rules
-- Run this in Supabase SQL Editor

-- First, drop existing constraints if they exist
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_participant_id_fkey;
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_location_id_fkey;
ALTER TABLE worker_availability DROP CONSTRAINT IF EXISTS worker_availability_worker_id_fkey;
ALTER TABLE unavailability_periods DROP CONSTRAINT IF EXISTS unavailability_periods_worker_id_fkey;

-- Add foreign key constraints with CASCADE rules
ALTER TABLE shifts
ADD CONSTRAINT shifts_participant_id_fkey
FOREIGN KEY (participant_id) 
REFERENCES participants(id) 
ON DELETE CASCADE;

ALTER TABLE shifts
ADD CONSTRAINT shifts_location_id_fkey
FOREIGN KEY (location_id) 
REFERENCES locations(id) 
ON DELETE SET NULL;

ALTER TABLE worker_availability
ADD CONSTRAINT worker_availability_worker_id_fkey
FOREIGN KEY (worker_id)
REFERENCES support_workers(id)
ON DELETE CASCADE;

ALTER TABLE unavailability_periods
ADD CONSTRAINT unavailability_periods_worker_id_fkey
FOREIGN KEY (worker_id)
REFERENCES support_workers(id)
ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON CONSTRAINT shifts_participant_id_fkey ON shifts IS 'Cascade delete shifts when participant is deleted';
COMMENT ON CONSTRAINT shifts_location_id_fkey ON shifts IS 'Set location to NULL when location is deleted';
COMMENT ON CONSTRAINT worker_availability_worker_id_fkey ON worker_availability IS 'Cascade delete availability when worker is deleted';
COMMENT ON CONSTRAINT unavailability_periods_worker_id_fkey ON unavailability_periods IS 'Cascade delete unavailability periods when worker is deleted';
