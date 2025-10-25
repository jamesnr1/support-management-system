-- Fix missing deleted_at columns
-- Execute this in your Supabase SQL Editor

-- Add missing deleted_at columns to support_workers table
ALTER TABLE support_workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add missing deleted_at columns to participants table  
ALTER TABLE participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Verify columns were added
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('support_workers', 'participants') 
AND column_name = 'deleted_at'
ORDER BY table_name;

-- Add indexes for soft delete queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_support_workers_deleted_at ON support_workers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_participants_deleted_at ON participants(deleted_at);
