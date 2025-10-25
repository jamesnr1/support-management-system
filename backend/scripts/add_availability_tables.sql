-- Add availability tables to existing database
-- Run this in your Supabase SQL Editor

-- Worker Availability table (for weekly availability rules)
CREATE TABLE IF NOT EXISTS worker_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES support_workers(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sunday, 1=Monday, etc.
    from_time TIME,
    to_time TIME,
    is_full_day BOOLEAN DEFAULT FALSE,
    wraps_midnight BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(worker_id, weekday)
);

-- Unavailability Periods table (for temporary unavailability)
CREATE TABLE IF NOT EXISTS unavailability_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES support_workers(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_worker_availability_worker ON worker_availability(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_availability_weekday ON worker_availability(weekday);
CREATE INDEX IF NOT EXISTS idx_unavailability_worker ON unavailability_periods(worker_id);
CREATE INDEX IF NOT EXISTS idx_unavailability_dates ON unavailability_periods(from_date, to_date);

-- Enable Row Level Security
ALTER TABLE worker_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailability_periods ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (allow all operations for now - customize as needed)
CREATE POLICY "Allow all operations on worker_availability" ON worker_availability FOR ALL USING (true);
CREATE POLICY "Allow all operations on unavailability_periods" ON unavailability_periods FOR ALL USING (true);
