import asyncpg
import os
from pathlib import Path
from dotenv import load_dotenv
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class Database:
    _pool = None
    
    @classmethod
    async def create_pool(cls):
        """Create database connection pool"""
        if cls._pool is None:
            database_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/rostering_db')
            try:
                cls._pool = await asyncpg.create_pool(database_url, min_size=1, max_size=10)
                logger.info("Database connection pool created successfully")
            except Exception as e:
                logger.error(f"Failed to create database pool: {e}")
                raise
        return cls._pool
    
    @classmethod
    async def close_pool(cls):
        """Close database connection pool"""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None
            logger.info("Database connection pool closed")
    
    @classmethod
    async def get_connection(cls):
        """Get database connection from pool"""
        if cls._pool is None:
            await cls.create_pool()
        return cls._pool

# Database schema creation (simplified from your supabase.sql)
SCHEMA_SQL = """
-- Create tables (simplified, removing NDIS references)
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  participant_number TEXT,
  location_id INTEGER REFERENCES locations(id),
  default_ratio TEXT,
  plan_start DATE,
  plan_end DATE
);

CREATE TABLE IF NOT EXISTS support_workers (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  max_hours INTEGER CHECK (max_hours BETWEEN 0 AND 168),
  car TEXT,
  skills TEXT,
  sex TEXT,
  telegram BIGINT,
  digital_signature TEXT
);

CREATE TABLE IF NOT EXISTS availability_rule (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES support_workers(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  from_time TIME,
  to_time TIME,
  is_full_day BOOLEAN NOT NULL DEFAULT false,
  wraps_midnight BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(worker_id, weekday)
);

CREATE TABLE IF NOT EXISTS unavailability_periods (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES support_workers(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('Holiday', 'Sick', 'Personal', 'Other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (to_date >= from_date)
);

CREATE TABLE IF NOT EXISTS plan_info (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
  service_domain TEXT NOT NULL CHECK (service_domain IN ('Self-Care','Community Participation')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  week_type TEXT CHECK (week_type IN ('A','B')),
  weekly_weekday_hours NUMERIC(5,2),
  weekly_evening_hours NUMERIC(5,2),
  weekly_night_hours NUMERIC(5,2),
  weekly_saturday_hours NUMERIC(5,2),
  weekly_sunday_hours NUMERIC(5,2),
  weekly_public_holiday_hours NUMERIC(5,2)
);

CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  shift_number TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location_id INTEGER REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'Scheduled',
  ratio_workers INTEGER NOT NULL DEFAULT 1,
  ratio_participants INTEGER NOT NULL DEFAULT 1,
  support_type TEXT DEFAULT 'Self-Care' CHECK (support_type IN ('Self-Care', 'Community Participation'))
);

CREATE TABLE IF NOT EXISTS shift_workers (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES support_workers(id),
  role TEXT,
  alloc_status TEXT NOT NULL DEFAULT 'Assigned',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_participants (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
  participant_id INTEGER REFERENCES participants(id)
);

-- Insert basic data
INSERT INTO locations (name) VALUES ('Glandore'), ('Plympton Park') 
ON CONFLICT (name) DO NOTHING;

-- Insert sample participants
INSERT INTO participants (code, full_name, participant_number, location_id, default_ratio, plan_start, plan_end)
SELECT 'LIB001', 'Libby', '430463678', l.id, '2:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
ON CONFLICT (code) DO NOTHING;

INSERT INTO participants (code, full_name, participant_number, location_id, default_ratio, plan_start, plan_end)
SELECT 'JAM001', 'James', '430961531', l.id, '2:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Plympton Park'
ON CONFLICT (code) DO NOTHING;

INSERT INTO participants (code, full_name, participant_number, location_id, default_ratio, plan_start, plan_end)
SELECT 'ACE001', 'Ace', '430123456', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
ON CONFLICT (code) DO NOTHING;

INSERT INTO participants (code, full_name, participant_number, location_id, default_ratio, plan_start, plan_end)
SELECT 'GRA001', 'Grace', '430234567', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
ON CONFLICT (code) DO NOTHING;

INSERT INTO participants (code, full_name, participant_number, location_id, default_ratio, plan_start, plan_end)
SELECT 'MIL001', 'Milan', '430345678', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
ON CONFLICT (code) DO NOTHING;
"""

async def init_database():
    """Initialize database with schema and basic data"""
    try:
        pool = await Database.create_pool()
        async with pool.acquire() as conn:
            await conn.execute(SCHEMA_SQL)
            logger.info("Database schema initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise