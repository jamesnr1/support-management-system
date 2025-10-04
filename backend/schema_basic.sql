-- Basic NDIS Support Worker Database Schema (without complex views)
-- Run this in your Supabase SQL Editor

SET TIME ZONE 'Australia/Adelaide';

-- =============================================================================
-- PART 1: CORE TABLES
-- =============================================================================
BEGIN;

-- Core tables
CREATE TABLE IF NOT EXISTS locations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public_holidays (
  holiday_date date PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  ndis_number text,
  location_id bigint REFERENCES locations(id),
  default_ratio text,
  plan_start date,
  plan_end date
);

CREATE TABLE IF NOT EXISTS support_workers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'Active',
  user_id uuid REFERENCES auth.users(id),
  max_hours INTEGER CHECK (max_hours BETWEEN 0 AND 168),
  car text,
  skills text,
  sex text,
  telegram BIGINT,
  digital_signature text
);

CREATE TABLE IF NOT EXISTS availability_rule (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  worker_id bigint REFERENCES support_workers(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  from_time time,
  to_time time,
  is_full_day boolean NOT NULL DEFAULT false,
  wraps_midnight boolean NOT NULL DEFAULT false,
  UNIQUE(worker_id, weekday)
);

CREATE TABLE IF NOT EXISTS plan_info (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id bigint REFERENCES participants(id) ON DELETE CASCADE,
  service_domain text NOT NULL CHECK (service_domain IN ('Self-Care','Community Participation')),
  effective_from date NOT NULL,
  effective_to date,
  week_type text CHECK (week_type IN ('A','B')),
  weekly_weekday_hours numeric(5,2),
  weekly_evening_hours numeric(5,2),
  weekly_night_hours numeric(5,2),
  weekly_saturday_hours numeric(5,2),
  weekly_sunday_hours numeric(5,2),
  weekly_public_holiday_hours numeric(5,2)
);

CREATE TABLE IF NOT EXISTS shifts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_number text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location_id bigint REFERENCES locations(id),
  status text NOT NULL DEFAULT 'Scheduled',
  ratio_workers integer NOT NULL DEFAULT 1,
  ratio_participants integer NOT NULL DEFAULT 1,
  support_type text DEFAULT 'Self-Care' CHECK (support_type IN ('Self-Care', 'Community Participation'))
);

CREATE TABLE IF NOT EXISTS shift_workers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id bigint REFERENCES support_workers(id),
  role text,
  alloc_status text NOT NULL DEFAULT 'Assigned',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_participants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES shifts(id) ON DELETE CASCADE,
  participant_id bigint REFERENCES participants(id)
);

-- Roster data table (for compatibility with existing system)
CREATE TABLE IF NOT EXISTS roster_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_type VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_type)
);

COMMIT;

-- =============================================================================
-- PART 2: SAMPLE DATA
-- =============================================================================
BEGIN;

-- Insert sample locations
INSERT INTO locations (name) VALUES ('Glandore'), ('Plympton Park')
ON CONFLICT (name) DO NOTHING;

-- Insert sample participants
INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'LIB001', 'Libby', '430463678', l.id, '2:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
ON CONFLICT (code) DO NOTHING;

INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'JAM001', 'James', '430961531', l.id, '2:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Plympton Park'
ON CONFLICT (code) DO NOTHING;

INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'ACE001', 'Ace', '430123456', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
ON CONFLICT (code) DO NOTHING;

INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'GRA001', 'Grace', '430234567', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
ON CONFLICT (code) DO NOTHING;

INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'MIL001', 'Milan', '430345678', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- =============================================================================
-- PART 3: ROW LEVEL SECURITY
-- =============================================================================
BEGIN;

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_data ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (drop existing ones first)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON locations;
CREATE POLICY "Allow all operations for authenticated users" ON locations
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public_holidays;
CREATE POLICY "Allow all operations for authenticated users" ON public_holidays
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON participants;
CREATE POLICY "Allow all operations for authenticated users" ON participants
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON support_workers;
CREATE POLICY "Allow all operations for authenticated users" ON support_workers
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON availability_rule;
CREATE POLICY "Allow all operations for authenticated users" ON availability_rule
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON plan_info;
CREATE POLICY "Allow all operations for authenticated users" ON plan_info
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shifts;
CREATE POLICY "Allow all operations for authenticated users" ON shifts
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shift_workers;
CREATE POLICY "Allow all operations for authenticated users" ON shift_workers
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shift_participants;
CREATE POLICY "Allow all operations for authenticated users" ON shift_participants
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON roster_data;
CREATE POLICY "Allow all operations for authenticated users" ON roster_data
FOR ALL USING (auth.uid() IS NOT NULL);

COMMIT;
