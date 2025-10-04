-- Support Management System Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    ndis_number VARCHAR(20),
    location_id UUID,
    default_ratio VARCHAR(10) DEFAULT '1:1',
    plan_start DATE,
    plan_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Workers table
CREATE TABLE IF NOT EXISTS support_workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active',
    max_hours INTEGER DEFAULT 40,
    car VARCHAR(10) DEFAULT 'No',
    skills TEXT,
    sex VARCHAR(10),
    telegram VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roster Data table (stores weekly roster data as JSON)
CREATE TABLE IF NOT EXISTS roster_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_type VARCHAR(20) NOT NULL, -- 'weekA', 'weekB', 'nextA', 'nextB'
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_type)
);

-- Shifts table (for individual shift records)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID REFERENCES participants(id),
    worker_id UUID REFERENCES support_workers(id),
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    support_type VARCHAR(50) DEFAULT 'Self-Care',
    ratio VARCHAR(10) DEFAULT '1:1',
    location_id UUID REFERENCES locations(id),
    notes TEXT,
    shift_number VARCHAR(50),
    duration DECIMAL(4,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_participants_code ON participants(code);
CREATE INDEX IF NOT EXISTS idx_support_workers_status ON support_workers(status);
CREATE INDEX IF NOT EXISTS idx_support_workers_name ON support_workers(full_name);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_participant ON shifts(participant_id);
CREATE INDEX IF NOT EXISTS idx_shifts_worker ON shifts(worker_id);

-- Insert sample locations
INSERT INTO locations (name, address) VALUES 
('Glandore', 'Glandore, SA'),
('Plympton Park', 'Plympton Park, SA')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (allow all operations for now - customize as needed)
CREATE POLICY "Allow all operations on participants" ON participants FOR ALL USING (true);
CREATE POLICY "Allow all operations on support_workers" ON support_workers FOR ALL USING (true);
CREATE POLICY "Allow all operations on locations" ON locations FOR ALL USING (true);
CREATE POLICY "Allow all operations on roster_data" ON roster_data FOR ALL USING (true);
CREATE POLICY "Allow all operations on shifts" ON shifts FOR ALL USING (true);
