-- Remove unused database tables
-- Execute this in your Supabase SQL Editor

-- Remove the unused worker_availability table (duplicate of availability_rule)
DROP TABLE IF EXISTS worker_availability;

-- Verify table was removed
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'worker_availability';

-- Should return no rows if successful
