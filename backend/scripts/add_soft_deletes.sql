-- Add soft delete columns to all tables
-- Run this in Supabase SQL Editor

-- Add deleted_at column to all tables
ALTER TABLE support_workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE worker_availability ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE unavailability_periods ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- Create indexes on deleted_at columns for performance
CREATE INDEX IF NOT EXISTS idx_support_workers_deleted_at ON support_workers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_participants_deleted_at ON participants(deleted_at);
CREATE INDEX IF NOT EXISTS idx_shifts_deleted_at ON shifts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_worker_availability_deleted_at ON worker_availability(deleted_at);
CREATE INDEX IF NOT EXISTS idx_unavailability_periods_deleted_at ON unavailability_periods(deleted_at);
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON locations(deleted_at);

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

-- Add comments for documentation
COMMENT ON COLUMN support_workers.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN participants.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN shifts.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN worker_availability.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN unavailability_periods.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN locations.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
