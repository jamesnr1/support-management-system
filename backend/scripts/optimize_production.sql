-- Production optimization scripts
-- Execute these in your Supabase SQL Editor for optimal performance

-- 1. Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_support_workers_status ON support_workers(status);
CREATE INDEX IF NOT EXISTS idx_support_workers_code ON support_workers(code);
CREATE INDEX IF NOT EXISTS idx_participants_code ON participants(code);
CREATE INDEX IF NOT EXISTS idx_availability_rule_worker_weekday ON availability_rule(worker_id, weekday);
CREATE INDEX IF NOT EXISTS idx_unavailability_periods_dates ON unavailability_periods(from_date, to_date);

-- 2. Add missing deleted_at columns if not already present
ALTER TABLE support_workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 3. Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_support_workers_deleted_at ON support_workers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_participants_deleted_at ON participants(deleted_at);

-- 4. Remove unused worker_availability table if it exists
DROP TABLE IF EXISTS worker_availability;

-- 5. Optimize table statistics for better query planning
ANALYZE support_workers;
ANALYZE participants;
ANALYZE availability_rule;
ANALYZE unavailability_periods;
ANALYZE locations;

-- 6. Set up Row Level Security policies for production
ALTER TABLE support_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailability_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 7. Create policies (customize based on your authentication system)
-- For now, allowing all operations - customize as needed for your security requirements
CREATE POLICY IF NOT EXISTS "Allow all operations on support_workers" ON support_workers FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on participants" ON participants FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on availability_rule" ON availability_rule FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on unavailability_periods" ON unavailability_periods FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on locations" ON locations FOR ALL USING (true);

-- 8. Verify all tables and indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('support_workers', 'participants', 'availability_rule', 'unavailability_periods', 'locations')
ORDER BY tablename, indexname;

-- 9. Check table sizes and row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
