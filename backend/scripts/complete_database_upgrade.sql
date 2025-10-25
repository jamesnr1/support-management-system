-- Complete Database Upgrade Script
-- This script implements all data protection improvements
-- Run this in Supabase SQL Editor

-- ==============================================
-- 1. ADD SOFT DELETE COLUMNS
-- ==============================================

-- Add deleted_at column to all tables
ALTER TABLE support_workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE worker_availability ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE unavailability_periods ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- ==============================================
-- 2. ADD CRITICAL INDEXES
-- ==============================================

-- Indexes for shifts table (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_participant ON shifts(participant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_workers ON shifts USING GIN(workers) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_date_participant ON shifts(shift_date, participant_id) WHERE deleted_at IS NULL;

-- Indexes for worker availability
CREATE INDEX IF NOT EXISTS idx_availability_worker_day ON worker_availability(worker_id, day_of_week) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_availability_worker ON worker_availability(worker_id) WHERE deleted_at IS NULL;

-- Indexes for unavailability periods
CREATE INDEX IF NOT EXISTS idx_unavailability_worker ON unavailability_periods(worker_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_unavailability_dates ON unavailability_periods(start_date, end_date) WHERE deleted_at IS NULL;

-- Indexes for support workers
CREATE INDEX IF NOT EXISTS idx_workers_status ON support_workers(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workers_name ON support_workers(full_name) WHERE deleted_at IS NULL;

-- Indexes for participants
CREATE INDEX IF NOT EXISTS idx_participants_code ON participants(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(full_name) WHERE deleted_at IS NULL;

-- Indexes on deleted_at columns for soft delete queries
CREATE INDEX IF NOT EXISTS idx_support_workers_deleted_at ON support_workers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_participants_deleted_at ON participants(deleted_at);
CREATE INDEX IF NOT EXISTS idx_shifts_deleted_at ON shifts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_worker_availability_deleted_at ON worker_availability(deleted_at);
CREATE INDEX IF NOT EXISTS idx_unavailability_periods_deleted_at ON unavailability_periods(deleted_at);
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON locations(deleted_at);

-- ==============================================
-- 3. FIX FOREIGN KEY CONSTRAINTS
-- ==============================================

-- Drop existing constraints if they exist
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

-- ==============================================
-- 4. CREATE VIEWS FOR ACTIVE RECORDS
-- ==============================================

-- Create views for active (non-deleted) records
CREATE OR REPLACE VIEW active_support_workers AS
SELECT * FROM support_workers WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_participants AS
SELECT * FROM participants WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_shifts AS
SELECT * FROM shifts WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_worker_availability AS
SELECT * FROM worker_availability WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_unavailability_periods AS
SELECT * FROM unavailability_periods WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_locations AS
SELECT * FROM locations WHERE deleted_at IS NULL;

-- ==============================================
-- 5. ADD DOCUMENTATION
-- ==============================================

-- Add comments for documentation
COMMENT ON COLUMN support_workers.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN participants.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN shifts.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN worker_availability.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN unavailability_periods.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN locations.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';

COMMENT ON CONSTRAINT shifts_participant_id_fkey ON shifts IS 'Cascade delete shifts when participant is deleted';
COMMENT ON CONSTRAINT shifts_location_id_fkey ON shifts IS 'Set location to NULL when location is deleted';
COMMENT ON CONSTRAINT worker_availability_worker_id_fkey ON worker_availability IS 'Cascade delete availability when worker is deleted';
COMMENT ON CONSTRAINT unavailability_periods_worker_id_fkey ON unavailability_periods IS 'Cascade delete unavailability periods when worker is deleted';

-- ==============================================
-- 6. UPDATE STATISTICS
-- ==============================================

-- Analyze tables after index creation to update statistics
ANALYZE support_workers;
ANALYZE participants;
ANALYZE shifts;
ANALYZE worker_availability;
ANALYZE unavailability_periods;
ANALYZE locations;

-- ==============================================
-- 7. VERIFICATION QUERIES
-- ==============================================

-- Verify the upgrade was successful
SELECT 
    'support_workers' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_records,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_records
FROM support_workers
UNION ALL
SELECT 
    'participants' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_records,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_records
FROM participants
UNION ALL
SELECT 
    'shifts' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_records,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_records
FROM shifts;

-- Show index information
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('support_workers', 'participants', 'shifts', 'worker_availability', 'unavailability_periods', 'locations')
ORDER BY tablename, indexname;
