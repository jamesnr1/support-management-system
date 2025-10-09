-- Schema update to support split availability (multiple time ranges per day)
-- This removes the UNIQUE constraint and adds a sequence number for ordering

-- First, backup existing data
CREATE TABLE IF NOT EXISTS availability_rule_backup AS 
SELECT * FROM availability_rule;

-- Drop the unique constraint
ALTER TABLE availability_rule DROP CONSTRAINT IF EXISTS availability_rule_worker_id_weekday_key;

-- Add a sequence column for ordering multiple rules per day
ALTER TABLE availability_rule ADD COLUMN IF NOT EXISTS sequence_number smallint DEFAULT 1;

-- Add a rule_type column to distinguish between different types of availability
ALTER TABLE availability_rule ADD COLUMN IF NOT EXISTS rule_type text DEFAULT 'standard';

-- Update existing records to have sequence_number = 1
UPDATE availability_rule SET sequence_number = 1 WHERE sequence_number IS NULL;

-- Add new constraints
ALTER TABLE availability_rule ADD CONSTRAINT availability_rule_sequence_check 
    CHECK (sequence_number BETWEEN 1 AND 10);

-- Create a new unique constraint that allows multiple rules per day
ALTER TABLE availability_rule ADD CONSTRAINT availability_rule_unique_per_sequence
    UNIQUE (worker_id, weekday, sequence_number);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_availability_worker_weekday 
    ON availability_rule(worker_id, weekday);

COMMENT ON TABLE availability_rule IS 'Worker availability rules supporting multiple time ranges per day';
COMMENT ON COLUMN availability_rule.sequence_number IS 'Order of availability rules for the same day (1-10)';
COMMENT ON COLUMN availability_rule.rule_type IS 'Type of availability rule: standard, split_morning, split_evening, etc.';
