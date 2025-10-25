-- Add critical database indexes for performance
-- Run this in Supabase SQL Editor

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

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shifts_worker_date ON shifts USING GIN(workers) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_availability_worker_time ON worker_availability(worker_id, start_time, end_time) WHERE deleted_at IS NULL;

-- Analyze tables after index creation to update statistics
ANALYZE support_workers;
ANALYZE participants;
ANALYZE shifts;
ANALYZE worker_availability;
ANALYZE unavailability_periods;
ANALYZE locations;
