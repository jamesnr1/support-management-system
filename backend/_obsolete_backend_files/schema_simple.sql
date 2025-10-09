-- Simplified schema to test step by step
-- Run these one at a time to identify the issue

-- Step 1: Create participants table
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

-- Step 2: Create support_workers table
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

-- Step 3: Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create roster_data table
CREATE TABLE IF NOT EXISTS roster_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_type VARCHAR(20) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_type)
);

-- Step 5: Create shifts table (with shift_date instead of date)
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
