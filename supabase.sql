-- Complete NDIS Support Worker Database Schema
-- Run this entire script in your Supabase SQL Editor

SET TIME ZONE 'Australia/Adelaide';

-- =============================================================================
-- PART 1: CORE TABLES
-- =============================================================================
BEGIN;

-- Core tables extracted from original SQL
CREATE TABLE IF NOT EXISTS locations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public_holidays (
  holiday_date date PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  ndis_number text,
  location_id bigint REFERENCES locations(id),
  default_ratio text,
  plan_start date,
  plan_end date
);

CREATE TABLE IF NOT EXISTS support_workers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'Active',
  user_id uuid REFERENCES auth.users(id),
  max_hours INTEGER CHECK (max_hours BETWEEN 0 AND 168),
  car text,
  skills text,
  sex text,
  telegram BIGINT,
  digital_signature text
);

CREATE TABLE IF NOT EXISTS availability_rule (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  worker_id bigint REFERENCES support_workers(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  from_time time,
  to_time time,
  is_full_day boolean NOT NULL DEFAULT false,
  wraps_midnight boolean NOT NULL DEFAULT false,
  UNIQUE(worker_id, weekday)
);

CREATE TABLE IF NOT EXISTS plan_info (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id bigint REFERENCES participants(id) ON DELETE CASCADE,
  service_domain text NOT NULL CHECK (service_domain IN ('Self-Care','Community Participation')),
  effective_from date NOT NULL,
  effective_to date,
  week_type text CHECK (week_type IN ('A','B')),
  weekly_weekday_hours numeric(5,2),
  weekly_evening_hours numeric(5,2),
  weekly_night_hours numeric(5,2),
  weekly_saturday_hours numeric(5,2),
  weekly_sunday_hours numeric(5,2),
  weekly_public_holiday_hours numeric(5,2)
);

CREATE TABLE IF NOT EXISTS shifts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_number text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location_id bigint REFERENCES locations(id),
  status text NOT NULL DEFAULT 'Scheduled',
  ratio_workers integer NOT NULL DEFAULT 1,
  ratio_participants integer NOT NULL DEFAULT 1,
  support_type text DEFAULT 'Self-Care' CHECK (support_type IN ('Self-Care', 'Community Participation'))
);

CREATE TABLE IF NOT EXISTS shift_workers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id bigint REFERENCES support_workers(id),
  role text,
  alloc_status text NOT NULL DEFAULT 'Assigned',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_participants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES shifts(id) ON DELETE CASCADE,
  participant_id bigint REFERENCES participants(id)
);

CREATE TABLE IF NOT EXISTS shift_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES shifts(id) ON DELETE CASCADE,
  log_type text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_cancellations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id bigint REFERENCES support_workers(id),
  cancel_time timestamptz NOT NULL,
  reason_short text,
  location_id bigint REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS shift_late_starts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id bigint REFERENCES support_workers(id),
  actual_start timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMIT;

-- =============================================================================
-- PART 2: TEMPLATE SYSTEM TABLES
-- =============================================================================
BEGIN;

-- Roster templates for Week A/B patterns
CREATE TABLE IF NOT EXISTS roster_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  week_type text CHECK (week_type IN ('A', 'B', 'Custom')),
  is_draft boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Template shifts (use day offsets, not actual dates)
CREATE TABLE IF NOT EXISTS template_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES roster_templates(id) ON DELETE CASCADE,
  day_offset integer NOT NULL CHECK (day_offset BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday
  start_time time NOT NULL,
  end_time time NOT NULL,
  participants text[] NOT NULL,
  location_id bigint REFERENCES locations(id),
  ratio_workers integer NOT NULL DEFAULT 1,
  ratio_participants integer NOT NULL DEFAULT 1,
  support_type text DEFAULT 'Self-Care' CHECK (support_type IN ('Self-Care', 'Community Participation'))
);

-- Applied rosters tracking
CREATE TABLE IF NOT EXISTS applied_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES roster_templates(id),
  start_date date NOT NULL,
  weeks_count integer NOT NULL DEFAULT 1 CHECK (weeks_count > 0),
  applied_at timestamptz DEFAULT now()
);

-- Worker unavailability periods
CREATE TABLE IF NOT EXISTS unavailability_periods (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  worker_id bigint REFERENCES support_workers(id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason text NOT NULL CHECK (reason IN ('Holiday', 'Sick', 'Personal', 'Other')),
  created_at timestamptz DEFAULT now(),
  CHECK (to_date >= from_date)
);

-- Google Calendar appointments integration
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id bigint REFERENCES participants(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  google_event_id text UNIQUE,
  synced_at timestamptz DEFAULT now(),
  CHECK (end_time > start_time)
);

COMMIT;

-- =============================================================================
-- PART 3: FUNDING TABLES
-- =============================================================================
BEGIN;

-- Create funding_items table
CREATE TABLE IF NOT EXISTS funding_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text UNIQUE NOT NULL,
  description text,
  service_domain text NOT NULL CHECK (service_domain IN ('Self-Care','Community Participation')),
  rate_category text NOT NULL CHECK (rate_category IN ('WEEKDAY','EVENING','NIGHT','SATURDAY','SUNDAY','PUBLIC_HOLIDAY')),
  effective_from date,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true
);

COMMIT;

-- =============================================================================
-- PART 4: VIEWS & INDEXES
-- =============================================================================
BEGIN;

CREATE OR REPLACE VIEW v_shift_rate_category AS
WITH shift_segments AS (
  SELECT
    s.id, s.start_time, s.end_time, s.ratio_participants,
    EXTRACT(dow FROM s.start_time)::smallint AS weekday_num,
    ph.holiday_date,
    generate_series(
      GREATEST(s.start_time, s.start_time::date + interval '6 hours'),
      LEAST(s.end_time,   s.end_time::date   + interval '1 day' - interval '1 microsecond'),
      interval '1 hour'
    ) AS segment_start
  FROM shifts s
  LEFT JOIN public_holidays ph ON ph.holiday_date = s.start_time::date
),
categorized_segments AS (
  SELECT
    id, start_time, end_time, ratio_participants, segment_start,
    CASE
      WHEN holiday_date IS NOT NULL THEN 'PUBLIC_HOLIDAY'
      WHEN weekday_num = 6 THEN 'SATURDAY'
      WHEN weekday_num = 0 THEN 'SUNDAY'
      WHEN EXTRACT(hour FROM segment_start) >= 20 OR EXTRACT(hour FROM segment_start) < 6 THEN 'NIGHT'
      WHEN EXTRACT(hour FROM segment_start) >= 18 THEN 'EVENING'
      ELSE 'WEEKDAY'
    END AS rate_category,
    LEAST(segment_start + interval '1 hour', end_time) AS segment_end
  FROM shift_segments
  WHERE segment_start < end_time
)
SELECT
  id, start_time, end_time, ratio_participants,
  rate_category, segment_start, segment_end,
  EXTRACT(epoch FROM (segment_end - segment_start))/3600.0 / NULLIF(ratio_participants,0) AS hours_per_participant
FROM categorized_segments
ORDER BY id, segment_start;

CREATE OR REPLACE VIEW v_shift_hours_by_category AS
SELECT
  sp.participant_id,
  src.rate_category,
  date_trunc('week', src.start_time) AS week_start,
  CASE WHEN (EXTRACT(week FROM src.start_time)::int % 2) = 1 THEN 'A' ELSE 'B' END AS week_type,
  SUM(src.hours_per_participant) AS hours_used
FROM v_shift_rate_category src
JOIN shift_participants sp ON sp.shift_id = src.id
JOIN shifts s ON s.id = src.id
WHERE src.rate_category IS NOT NULL
  AND s.status = 'Completed'
GROUP BY sp.participant_id,
         src.rate_category,
         date_trunc('week', src.start_time),
         CASE WHEN (EXTRACT(week FROM src.start_time)::int % 2) = 1 THEN 'A' ELSE 'B' END;

CREATE OR REPLACE VIEW v_plan_depletion AS
SELECT
  pi.participant_id,
  p.full_name AS participant_name,
  pi.service_domain,
  pi.effective_from,
  pi.effective_to,
  pi.week_type,
  sh.rate_category,
  sh.week_start,
  COALESCE(sh.hours_used, 0) AS hours_used,
  CASE sh.rate_category
    WHEN 'WEEKDAY'        THEN pi.weekly_weekday_hours
    WHEN 'EVENING'        THEN pi.weekly_evening_hours
    WHEN 'NIGHT'          THEN pi.weekly_night_hours
    WHEN 'SATURDAY'       THEN pi.weekly_saturday_hours
    WHEN 'SUNDAY'         THEN pi.weekly_sunday_hours
    WHEN 'PUBLIC_HOLIDAY' THEN pi.weekly_public_holiday_hours
    ELSE 0
  END AS hours_planned,
  ROUND(
    (COALESCE(sh.hours_used,0) / NULLIF(
      CASE sh.rate_category
        WHEN 'WEEKDAY'        THEN pi.weekly_weekday_hours
        WHEN 'EVENING'        THEN pi.weekly_evening_hours
        WHEN 'NIGHT'          THEN pi.weekly_night_hours
        WHEN 'SATURDAY'       THEN pi.weekly_saturday_hours
        WHEN 'SUNDAY'         THEN pi.weekly_sunday_hours
        WHEN 'PUBLIC_HOLIDAY' THEN pi.weekly_public_holiday_hours
        ELSE 1
      END, 0)
    ) * 100, 2) AS depletion_pct
FROM plan_info pi
JOIN participants p ON p.id = pi.participant_id
LEFT JOIN v_shift_hours_by_category sh
  ON sh.participant_id = pi.participant_id
 AND sh.week_start    >= pi.effective_from
 AND (sh.week_start   <  pi.effective_to OR pi.effective_to IS NULL)
 AND (pi.week_type IS NULL OR sh.week_type = pi.week_type)
WHERE sh.rate_category IS NOT NULL
ORDER BY p.full_name, sh.week_start, sh.rate_category;

CREATE OR REPLACE VIEW v_worker_effective_intervals AS
WITH base AS (
  SELECT
    w.id AS worker_id, w.code, w.full_name, w.status,
    a.weekday, a.from_time, a.to_time, a.is_full_day, a.wraps_midnight
  FROM support_workers w
  JOIN availability_rule a ON a.worker_id = w.id
  WHERE w.user_id = auth.uid()
),
segments AS (
  SELECT worker_id, code, full_name, status, weekday,
         time '00:00' AS seg_start, time '23:59:59.999999' AS seg_end,
         false AS next_day, 'full' AS segment_type, 1::smallint AS segment_no
  FROM base WHERE is_full_day
  UNION ALL
  SELECT worker_id, code, full_name, status, weekday,
         from_time, to_time, false, 'same_day', 1::smallint
  FROM base
  WHERE NOT is_full_day AND NOT wraps_midnight AND from_time IS NOT NULL AND to_time IS NOT NULL
  UNION ALL
  SELECT worker_id, code, full_name, status, weekday,
         from_time, time '23:59:59.999999', false, 'overnight_p1', 1::smallint
  FROM base
  WHERE NOT is_full_day AND wraps_midnight AND from_time IS NOT NULL AND to_time IS NOT NULL
  UNION ALL
  SELECT worker_id, code, full_name, status, ((weekday + 1) % 7)::smallint AS weekday,
         time '00:00', to_time, true, 'overnight_p2', 2::smallint
  FROM base
  WHERE NOT is_full_day AND wraps_midnight AND from_time IS NOT NULL AND to_time IS NOT NULL
)
SELECT * FROM segments
ORDER BY code, weekday, segment_no;

-- Enhanced CSV payroll export view
CREATE OR REPLACE VIEW v_csv_payroll_export AS
WITH shift_funding AS (
  SELECT 
    s.id AS shift_id,
    s.start_time,
    s.end_time,
    l.name AS location,
    EXTRACT(dow FROM s.start_time)::smallint AS weekday_num,
    ph.holiday_date,
    CASE 
      WHEN ph.holiday_date IS NOT NULL THEN 'PUBLIC_HOLIDAY'
      WHEN EXTRACT(dow FROM s.start_time) = 6 THEN 'SATURDAY'
      WHEN EXTRACT(dow FROM s.start_time) = 0 THEN 'SUNDAY'
      WHEN EXTRACT(hour FROM s.start_time) >= 20 OR EXTRACT(hour FROM s.start_time) < 6 THEN 'NIGHT'
      WHEN EXTRACT(hour FROM s.start_time) >= 18 THEN 'EVENING'
      ELSE 'WEEKDAY'
    END AS rate_category,
    COALESCE(s.support_type, 'Self-Care') AS service_domain
  FROM shifts s
  LEFT JOIN locations l ON l.id = s.location_id
  LEFT JOIN public_holidays ph ON ph.holiday_date = s.start_time::date
)
SELECT 
  sw.full_name AS worker_name,
  p.full_name AS participant_name,
  s.start_time::date AS shift_date,
  to_char(s.start_time, 'HH24:MI') AS start_time,
  to_char(s.end_time, 'HH24:MI') AS end_time,
  (EXTRACT(epoch FROM (s.end_time - s.start_time))/3600.0)::numeric(10,2) AS total_hours,
  sf.location,
  sf.service_domain AS support_type,
  (s.ratio_workers::text || ':' || s.ratio_participants::text) AS support_ratio,
  CASE sf.service_domain
    WHEN 'Self-Care' THEN 
      CASE sf.rate_category
        WHEN 'WEEKDAY' THEN 'SCWD'
        WHEN 'EVENING' THEN 'SCWE'
        WHEN 'NIGHT' THEN 
          CASE sf.weekday_num
            WHEN 6 THEN 'SCSatN'
            WHEN 0 THEN 'SCSunN'
            ELSE 'SCWN'
          END
        WHEN 'SATURDAY' THEN 'SCSat'
        WHEN 'SUNDAY' THEN 'SCSun'
        WHEN 'PUBLIC_HOLIDAY' THEN 'SCPH'
      END
    WHEN 'Community Participation' THEN
      CASE sf.rate_category
        WHEN 'WEEKDAY' THEN 'CPWD'
        WHEN 'EVENING' THEN 'CPWE'
        WHEN 'SATURDAY' THEN 'CPSat'
        WHEN 'SUNDAY' THEN 'CPSun'
        WHEN 'PUBLIC_HOLIDAY' THEN 'CPPH'
      END
  END AS funding_code
FROM shifts s
JOIN shift_funding sf ON sf.shift_id = s.id
JOIN shift_workers lw ON lw.shift_id = s.id AND lw.alloc_status <> 'Cancelled'
JOIN support_workers sw ON sw.id = lw.worker_id
JOIN shift_participants sp ON sp.shift_id = s.id
JOIN participants p ON p.id = sp.participant_id
WHERE s.status = 'Completed'
ORDER BY s.start_time, sw.full_name, p.full_name;

-- Additional report views
CREATE OR REPLACE VIEW v_shift_report_overview AS
SELECT
  s.id, s.shift_number, s.start_time, s.end_time,
  l.name AS location,
  s.status,
  string_agg(DISTINCT sw.full_name, ', ') FILTER (WHERE sw.id IS NOT NULL) AS workers,
  string_agg(DISTINCT p.full_name,  ', ') FILTER (WHERE p.id  IS NOT NULL) AS participants,
  max(sl.created_at)  AS last_log_at,
  max(sc.cancel_time) AS last_cancellation_at,
  max(ls.created_at)  AS last_late_start_log_at
FROM shifts s
LEFT JOIN locations l ON l.id = s.location_id
LEFT JOIN shift_workers lw ON lw.shift_id = s.id AND lw.alloc_status <> 'Cancelled'
LEFT JOIN support_workers sw ON sw.id = lw.worker_id
LEFT JOIN shift_participants sp ON sp.shift_id = s.id
LEFT JOIN participants p ON p.id = sp.participant_id
LEFT JOIN shift_logs sl ON sl.shift_id = s.id
LEFT JOIN shift_cancellations sc ON sc.shift_id = s.id
LEFT JOIN shift_late_starts ls ON ls.shift_id = s.id
GROUP BY s.id, s.shift_number, s.start_time, s.end_time, l.name, s.status;

CREATE OR REPLACE VIEW v_csv_support_worker_shift_report AS
SELECT
  s.id AS shift_id,
  s.shift_number,
  s.start_time::date AS shift_date,
  TO_CHAR(s.start_time, 'HH24:MI') AS start_time,
  TO_CHAR(s.end_time, 'HH24:MI') AS end_time,
  (EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600.0)::NUMERIC(10,2) AS total_hours,
  COALESCE(l.name, 'TBA') AS location,
  STRING_AGG(DISTINCT sw.full_name, ', ') AS support_workers,
  STRING_AGG(DISTINCT p.full_name, ', ') AS participants,
  COALESCE(s.support_type, 'Self-Care') AS support_type,
  (s.ratio_workers::TEXT || ':' || COALESCE(s.ratio_participants::TEXT, '1')) AS support_ratio,
  CASE
    WHEN EXTRACT(DOW FROM s.start_time) = 6 THEN 'Saturday'
    WHEN EXTRACT(DOW FROM s.start_time) = 0 THEN 'Sunday'
    WHEN ph.holiday_date IS NOT NULL THEN 'Public Holiday'
    WHEN EXTRACT(HOUR FROM s.start_time) >= 20 OR EXTRACT(HOUR FROM s.start_time) < 6 THEN 'Night'
    WHEN EXTRACT(HOUR FROM s.start_time) >= 18 THEN 'Evening'
    ELSE 'Weekday'
  END AS shift_category,
  s.status
FROM shifts s
LEFT JOIN locations l ON l.id = s.location_id
LEFT JOIN shift_workers lw ON lw.shift_id = s.id AND lw.alloc_status <> 'Cancelled'
LEFT JOIN support_workers sw ON sw.id = lw.worker_id
LEFT JOIN shift_participants sp ON sp.shift_id = s.id
LEFT JOIN participants p ON p.id = sp.participant_id
LEFT JOIN public_holidays ph ON ph.holiday_date = s.start_time::date
GROUP BY s.id, s.shift_number, s.start_time, s.end_time, l.name, s.support_type,
         s.ratio_workers, s.ratio_participants, s.status, ph.holiday_date
ORDER BY s.start_time;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_shifts_start_time_status ON shifts(start_time, status);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(full_name);
CREATE INDEX IF NOT EXISTS idx_support_workers_user ON support_workers(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_workers_shift_status ON shift_workers(shift_id, alloc_status);
CREATE INDEX IF NOT EXISTS idx_shift_participants_shift ON shift_participants(shift_id);
CREATE INDEX IF NOT EXISTS idx_template_shifts_template ON template_shifts(template_id);
CREATE INDEX IF NOT EXISTS idx_template_shifts_day ON template_shifts(day_offset);
CREATE INDEX IF NOT EXISTS idx_unavailability_worker_dates ON unavailability_periods(worker_id, from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_appointments_participant_time ON appointments(participant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_applied_rosters_dates ON applied_rosters(start_date, weeks_count);

COMMIT;

-- PART 5: REFERENCE DATA
-- =============================================================================
BEGIN;

-- Locations (only the two that exist)
INSERT INTO locations (name) VALUES ('Glandore')
ON CONFLICT (name) DO NOTHING;

INSERT INTO locations (name) VALUES ('Plympton Park')
ON CONFLICT (name) DO NOTHING;

-- Public holidays for 2025
INSERT INTO public_holidays (holiday_date, description) VALUES
  ('2025-01-01', 'New Year''s Day'),
  ('2025-01-27', 'Australia Day Holiday'),
  ('2025-03-10', 'Adelaide Cup'),
  ('2025-04-18', 'Good Friday'),
  ('2025-04-21', 'Easter Monday'),
  ('2025-04-25', 'Anzac Day'),
  ('2025-06-09', 'King''s Birthday'),
  ('2025-10-06', 'Labour Day'),
  ('2025-12-25', 'Christmas Day'),
  ('2025-12-26', 'Boxing Day')
ON CONFLICT (holiday_date) DO NOTHING;

-- Enhanced NDIS funding codes
INSERT INTO funding_items (code, description, service_domain, rate_category, effective_from) VALUES
  ('SCWD', 'Self-Care Weekday', 'Self-Care', 'WEEKDAY', '2025-01-01'),
  ('SCWE', 'Self-Care Weekday Evening', 'Self-Care', 'EVENING', '2025-01-01'),
  ('SCWN', 'Self-Care Weekday Night', 'Self-Care', 'NIGHT', '2025-01-01'),
  ('SCSat', 'Self-Care Saturday', 'Self-Care', 'SATURDAY', '2025-01-01'),
  ('SCSatN', 'Self-Care Saturday Night', 'Self-Care', 'NIGHT', '2025-01-01'),
  ('SCSun', 'Self-Care Sunday', 'Self-Care', 'SUNDAY', '2025-01-01'),
  ('SCSunN', 'Self-Care Sunday Night', 'Self-Care', 'NIGHT', '2025-01-01'),
  ('SCPH', 'Self-Care Public Holiday', 'Self-Care', 'PUBLIC_HOLIDAY', '2025-01-01'),
  ('CPWD', 'Community Participation Weekday', 'Community Participation', 'WEEKDAY', '2025-01-01'),
  ('CPWE', 'Community Participation Weekday Evening', 'Community Participation', 'EVENING', '2025-01-01'),
  ('CPSat', 'Community Participation Saturday', 'Community Participation', 'SATURDAY', '2025-01-01'),
  ('CPSun', 'Community Participation Sunday', 'Community Participation', 'SUNDAY', '2025-01-01'),
  ('CPPH', 'Community Participation Public Holiday', 'Community Participation', 'PUBLIC_HOLIDAY', '2025-01-01')
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- =============================================================================
-- PART 6: PARTICIPANTS WITH PLAN INFO
-- =============================================================================
BEGIN;

-- Add all 5 participants
INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'LIB001', 'Libby', '430463678', l.id, '2:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
AND NOT EXISTS (SELECT 1 FROM participants WHERE code = 'LIB001');

INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'JAM001', 'James', '430961531', l.id, '2:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Plympton Park'
AND NOT EXISTS (SELECT 1 FROM participants WHERE code = 'JAM001');

INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'ACE001', 'Ace', '430123456', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
AND NOT EXISTS (SELECT 1 FROM participants WHERE code = 'ACE001');

INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'GRA001', 'Grace', '430234567', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
AND NOT EXISTS (SELECT 1 FROM participants WHERE code = 'GRA001');

INSERT INTO participants (code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end) 
SELECT 'MIL001', 'Milan', '430345678', l.id, '1:1', '2025-01-01', '2025-12-31'
FROM locations l WHERE l.name = 'Glandore'
AND NOT EXISTS (SELECT 1 FROM participants WHERE code = 'MIL001');

-- Libby plan info (Self-Care)
INSERT INTO plan_info (participant_id, service_domain, effective_from, weekly_weekday_hours, weekly_evening_hours, weekly_night_hours, weekly_saturday_hours, weekly_sunday_hours, weekly_public_holiday_hours) 
SELECT p.id, 'Self-Care', '2025-01-01', 70, 10, 56, 14, 14, 14
FROM participants p WHERE p.code = 'LIB001'
AND NOT EXISTS (SELECT 1 FROM plan_info WHERE participant_id = p.id AND service_domain = 'Self-Care');

-- James plan info (Self-Care)
INSERT INTO plan_info (participant_id, service_domain, effective_from, weekly_weekday_hours, weekly_evening_hours, weekly_night_hours, weekly_saturday_hours, weekly_sunday_hours, weekly_public_holiday_hours) 
SELECT p.id, 'Self-Care', '2025-01-01', 70, 10, 56, 14, 14, 14
FROM participants p WHERE p.code = 'JAM001'
AND NOT EXISTS (SELECT 1 FROM plan_info WHERE participant_id = p.id AND service_domain = 'Self-Care');

-- Ace plan info (Self-Care)
INSERT INTO plan_info (participant_id, service_domain, effective_from, weekly_weekday_hours, weekly_evening_hours, weekly_night_hours, weekly_saturday_hours, weekly_sunday_hours, weekly_public_holiday_hours) 
SELECT p.id, 'Self-Care', '2025-01-01', 70, 10, 49, 14, 14, 14
FROM participants p WHERE p.code = 'ACE001'
AND NOT EXISTS (SELECT 1 FROM plan_info WHERE participant_id = p.id AND service_domain = 'Self-Care');

-- Grace plan info (Self-Care)
INSERT INTO plan_info (participant_id, service_domain, effective_from, weekly_weekday_hours, weekly_evening_hours, weekly_night_hours, weekly_saturday_hours, weekly_sunday_hours, weekly_public_holiday_hours) 
SELECT p.id, 'Self-Care', '2025-01-01', 70, 10, 49, 14, 14, 14
FROM participants p WHERE p.code = 'GRA001'
AND NOT EXISTS (SELECT 1 FROM plan_info WHERE participant_id = p.id AND service_domain = 'Self-Care');

-- Milan plan info (Self-Care)
INSERT INTO plan_info (participant_id, service_domain, effective_from, weekly_weekday_hours, weekly_saturday_hours, weekly_sunday_hours, weekly_public_holiday_hours) 
SELECT p.id, 'Self-Care', '2025-01-01', 15, 3, 3, 6
FROM participants p WHERE p.code = 'MIL001'
AND NOT EXISTS (SELECT 1 FROM plan_info WHERE participant_id = p.id AND service_domain = 'Self-Care');

-- Milan plan info (Community Participation)
INSERT INTO plan_info (participant_id, service_domain, effective_from, weekly_saturday_hours, weekly_sunday_hours, weekly_public_holiday_hours) 
SELECT p.id, 'Community Participation', '2025-01-01', 3, 3, 6
FROM participants p WHERE p.code = 'MIL001'
AND NOT EXISTS (SELECT 1 FROM plan_info WHERE participant_id = p.id AND service_domain = 'Community Participation');

COMMIT;

-- =============================================================================
-- PART 7: ROW LEVEL SECURITY
-- =============================================================================
BEGIN;

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_late_starts ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE applied_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailability_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON locations;
CREATE POLICY "Allow all operations for authenticated users" ON locations
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public_holidays;
CREATE POLICY "Allow all operations for authenticated users" ON public_holidays
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON participants;
CREATE POLICY "Allow all operations for authenticated users" ON participants
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON support_workers;
CREATE POLICY "Allow all operations for authenticated users" ON support_workers
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON availability_rule;
CREATE POLICY "Allow all operations for authenticated users" ON availability_rule
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON plan_info;
CREATE POLICY "Allow all operations for authenticated users" ON plan_info
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shifts;
CREATE POLICY "Allow all operations for authenticated users" ON shifts
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shift_workers;
CREATE POLICY "Allow all operations for authenticated users" ON shift_workers
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shift_participants;
CREATE POLICY "Allow all operations for authenticated users" ON shift_participants
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shift_logs;
CREATE POLICY "Allow all operations for authenticated users" ON shift_logs
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shift_cancellations;
CREATE POLICY "Allow all operations for authenticated users" ON shift_cancellations
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON shift_late_starts;
CREATE POLICY "Allow all operations for authenticated users" ON shift_late_starts
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON roster_templates;
CREATE POLICY "Allow all operations for authenticated users" ON roster_templates
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON template_shifts;
CREATE POLICY "Allow all operations for authenticated users" ON template_shifts
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON applied_rosters;
CREATE POLICY "Allow all operations for authenticated users" ON applied_rosters
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON unavailability_periods;
CREATE POLICY "Allow all operations for authenticated users" ON unavailability_periods
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON appointments;
CREATE POLICY "Allow all operations for authenticated users" ON appointments
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON funding_items;
CREATE POLICY "Allow all operations for authenticated users" ON funding_items
FOR ALL USING (auth.uid() IS NOT NULL);

COMMIT;

-- PART 8: SUPPORT WORKERS DATA WITH AVAILABILITY (fixed)
-- PART 8: SUPPORT WORKERS DATA WITH AVAILABILITY (fixed)
BEGIN;
WITH
raw AS (
  -- code,status,car,digital_signature,email,max_hours,full_name,phone,sex,skills,telegram_val,
  -- mon_from,mon_to,tue_from,tue_to,wed_from,wed_to,thu_from,thu_to,fri_from,fri_to,sat_from,sat_to,sun_from,sun_to,
  -- unav_from_raw,unav_to_raw
  SELECT *
  FROM (VALUES
    ('Anika','Active','Yes',NULL,'afreeka86@gmail.com',25,'Anika','0419494990','Female','ADLs, Appointments, Driving, Manual Handling','8342063979',
     NULL,NULL, 16.00,22.00, NULL,NULL, NULL,16.00, NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL),
    ('Arti','Active','No',NULL,'artipatel329@gmail.com',60,'Artiben (Arti) Patel','0493436483','Female','ADLs','850198777',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, NULL,NULL),
    ('Avani','Active','Yes',NULL,'patel.avani2526@gmail.com',60,'Avani Patel','0410000945','Female','ADLs, Manual Handling','8449135748',
     17.00,22.00, 17.00,22.00, 17.00,22.00, 17.00,22.00, 17.00,22.00, 11.00,22.00, 11.00,22.00, NULL,NULL),
    ('Chaynne','Active','Yes',NULL,'chaynnejones18@hotmail.com',38,'Chaynne Humphrys','0405824151','Female','ADLs, Appointments, Driving, Manual Handling, Study','8064088889',
     9.00,16.00, 12.00,16.00, 9.00,16.00, 9.00,13.00, 9.00,16.00, 12.00,16.00, NULL,NULL, '2025-09-06','2025-09-21'),
    ('Chi','Active','Yes',NULL,'chithiha27@yahoo.com.au',20,'Chi Ha','0403463709','Female','ADLs, Appointments, Massage','8311789304',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 15.00,22.00, 15.00,22.00, NULL,NULL, NULL,NULL, '2025-08-16','2025-08-28'),
    ('Shar','Active','Yes',NULL,'dxpatel313@gmail.com',60,'Dikshita (Shar) Patel','0452365646','Female','ADLs, Appointments, Manual Handling','8374884196',
     18.00,6.00, 18.00,6.00, 18.00,6.00, NULL,NULL, 18.00,6.00, 18.00,6.00, 18.00,18.00, NULL,NULL),
    ('Dhara','Active','Yes',NULL,'dharapatel1414@gmail.com',60,'Dhara Patel','0406288338','Female','ADLs, Manual Handling','1094911292',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 18.00,6.00, 18.00,6.00, 0.00,24.00, 0.00,24.00, '2025-08-17','2025-08-22'),
    ('Gaumit','Active','Yes',NULL,'gaumitpatel1234@gmail.com',60,'Gaumit Patel','0450645918','Male','ADLs, Manual Handling','1261296980',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, '2025-08-17','2025-08-22'),
    ('Happy','Active','Yes',NULL,'Mharsh1598@gmail.com',60,'Harshkumar (Happy) Modi','0451598445','Male','ADLs, Manual Handling','5958423116',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 16.00,6.00, 16.00,NULL, NULL,NULL),
    ('Rosie','Active','Yes',NULL,'rosie04020@outlook.com',60,'Japneet (Rosie) Kaur','0450655026','Female','ADLs, Admin, Appointments, Cleaning, Manual Handling, Meal Preparation','8048882582',
     6.00,22.00, 6.00,22.00, 6.00,22.00, 6.00,22.00, 6.00,22.00, 0.00,24.00, 0.00,24.00, NULL,NULL),
    ('Krunal','Active','Yes',NULL,'Krunal.07@hotmail.com',60,'Krunalkumar (Krunal) Patel','0401611263','Male','ADLs, Manual Handling','5243039735',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 18.00,6.00, 18.00,6.00, NULL,NULL),
    ('Rita','Active','No',NULL,NULL,60,'Margerite (Rita) Gjergji','0','Female','ADLs, Manual Handling','0',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 14.00,6.00, 14.00,6.00, NULL,NULL),
    ('Mayu','Active','Yes',NULL,'mayurpatel9558@gmail.com',60,'Mayurkumar (Mayu) Patel','0432925615','Male','ADLs, Manual Handling','7191321896',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 6.00,14.00, 6.00,14.00, NULL,NULL),
    ('Mihir','Active','Yes',NULL,'mihirpatel2260@gmail.com',60,'Mihir Patel','0469680399','Male','ADLs, Manual Handling','1909582500',
     NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, 0.00,24.00, 0.00,16.00, NULL,NULL),
    ('MP','Active','Yes',NULL,'mrunal4uall@gmail.com',60,'Mrunalkumar (MP) Patel','0470632029','Male','ADLs, Manual Handling','616546381',
     NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, 0.00,24.00, 0.00,24.00, NULL,NULL),
    ('Hamza','Active','Yes',NULL,'Mhsc63456@gmail.com',60,'Muhammad (Hamza) Hamza','0451893874','Male','ADLs, Appointments, Manual Handling','5511592287',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, NULL,NULL),
    ('Vera','Active','Yes',NULL,'Vera.z.ymeraj@icloud.com',60,'Pranvera (Vera) Ymeraj','0403271459','Female','ADLs, Manual Handling','8491531854',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 16.00,9.00, 16.00,9.00, NULL,NULL),
    ('Reena','Active','Yes',NULL,'gunanandreena2@gmail.com',60,'Reena Gunanand','0412269109','Female','ADLs, Admin, Appointments, Manual Handling','7966579151',
     NULL,NULL, 9.00,12.00, NULL,NULL, NULL,6.00, NULL,NULL, NULL,NULL, 6.00,8.00, NULL,NULL),
    ('Sandy','Active','Yes',NULL,'sndytrn@hotmail.com',20,'Sandy Tran','0404556435','Female','ADLs, Appointments, Driving, Manual Handling','8245818500',
     NULL,NULL, 6.00,14.00, NULL,NULL, NULL,NULL, NULL,NULL, 6.00,14.00, NULL,NULL, NULL,NULL),
    ('Sanjay','Active','Yes',NULL,'sanjay_9061@yahoo.com',60,'Sanjaykumar (Sanjay) Patel','0430308618','Male','ADLs, Manual Handling','6286702355',
     6.00,24.00, 6.00,24.00, 6.00,24.00, 6.00,24.00, 6.00,24.00, 0.00,24.00, 0.00,24.00, NULL,NULL),
    ('Sapana','Active','No',NULL,'sapana296@yahoo.com',60,'Sapanaben (Sapana) Krunalkumar Patel','0436025113','Female','ADLs, Manual Handling','8208188750',
     0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, 0.00,24.00, NULL,NULL, NULL,NULL, NULL,NULL),
    ('Taufique','Active','No',NULL,NULL,NULL,'Taufique Raza',NULL,NULL,NULL,'8398024932',
     NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL),
    ('Parvinder','Active','Yes',NULL,'parvinder@example.com',60,'Parvinder Singh','0412345678','Male','ADLs, Manual Handling','1234567890',
     NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, NULL,NULL, 0.00,24.00, 0.00,24.00, NULL,NULL)
  ) AS t(
      code,status,car,digital_signature,email,max_hours,full_name,phone,sex,skills,telegram_val,
      mon_from,mon_to,tue_from,tue_to,wed_from,wed_to,thu_from,thu_to,fri_from,fri_to,sat_from,sat_to,sun_from,sun_to,
      unav_from_raw,unav_to_raw
  )
),
upserted AS (
  INSERT INTO support_workers (code, full_name, email, phone, status, max_hours, car, skills, sex, telegram, digital_signature)
  SELECT
      r.code,
      COALESCE(NULLIF(r.full_name,''), r.code),
      NULLIF(r.email,''),
      NULLIF(NULLIF(r.phone,''),'0'),
      COALESCE(NULLIF(r.status,''), 'Active'),
      NULLIF(r.max_hours, 0),
      NULLIF(r.car,''),
      NULLIF(r.skills,''),
      NULLIF(r.sex,''),
      CASE
        WHEN r.telegram_val IS NOT NULL
        AND r.telegram_val ~ '^\d+$'
        AND r.telegram_val <> '0'
        THEN r.telegram_val::bigint
        ELSE NULL
      END AS telegram,
      NULLIF(r.digital_signature,'')
  FROM raw r
  ON CONFLICT (code) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        status = EXCLUDED.status,
        max_hours = EXCLUDED.max_hours,
        car = EXCLUDED.car,
        skills = EXCLUDED.skills,
        sex = EXCLUDED.sex,
        telegram = EXCLUDED.telegram,
        digital_signature = EXCLUDED.digital_signature
  RETURNING id, code
),
mapped AS (
  SELECT sw.id AS worker_id, r.code, 0 AS weekday, r.mon_from AS from_num, r.mon_to AS to_num FROM raw r JOIN upserted sw ON sw.code = r.code
  UNION ALL SELECT sw.id, r.code, 1, r.tue_from, r.tue_to FROM raw r JOIN upserted sw ON sw.code = r.code
  UNION ALL SELECT sw.id, r.code, 2, r.wed_from, r.wed_to FROM raw r JOIN upserted sw ON sw.code = r.code
  UNION ALL SELECT sw.id, r.code, 3, r.thu_from, r.thu_to FROM raw r JOIN upserted sw ON sw.code = r.code
  UNION ALL SELECT sw.id, r.code, 4, r.fri_from, r.fri_to FROM raw r JOIN upserted sw ON sw.code = r.code
  UNION ALL SELECT sw.id, r.code, 5, r.sat_from, r.sat_to FROM raw r JOIN upserted sw ON sw.code = r.code
  UNION ALL SELECT sw.id, r.code, 6, r.sun_from, r.sun_to FROM raw r JOIN upserted sw ON sw.code = r.code
),
norm AS (
  SELECT
      worker_id,
      weekday::smallint,
      from_num,
      to_num,
      COALESCE((from_num = 0 AND to_num = 24), false) AS is_full_day,
      COALESCE((from_num IS NOT NULL AND to_num IS NOT NULL AND from_num <> to_num AND from_num > to_num), false) AS wraps_midnight
  FROM mapped
  WHERE from_num IS NOT NULL AND to_num IS NOT NULL -- Only include rows with valid times
),
-- Deduplicate by selecting the first valid row per worker_id, weekday
final_rows AS (
  SELECT DISTINCT ON (worker_id, weekday)
      worker_id,
      weekday,
      from_num,
      to_num,
      is_full_day,
      wraps_midnight
  FROM norm
  ORDER BY worker_id, weekday, from_num ASC
),
-- Delete all existing availability rules for workers being updated
deleted AS (
  DELETE FROM availability_rule ar
  WHERE EXISTS (
    SELECT 1
    FROM final_rows fr
    WHERE fr.worker_id = ar.worker_id
  )
  RETURNING ar.worker_id, ar.weekday
),
-- Insert deduplicated availability rules
inserted AS (
  INSERT INTO availability_rule (worker_id, weekday, from_time, to_time, is_full_day, wraps_midnight)
  SELECT
      fr.worker_id,
      fr.weekday,
      CASE
        WHEN fr.is_full_day OR fr.from_num IS NULL OR fr.to_num IS NULL THEN NULL
        WHEN fr.from_num = 24 THEN NULL
        ELSE make_time(floor(fr.from_num)::int, round((fr.from_num - floor(fr.from_num)) * 60)::int, 0)
      END AS from_time,
      CASE
        WHEN fr.is_full_day OR fr.from_num IS NULL OR fr.to_num IS NULL THEN NULL
        WHEN fr.to_num = 24 THEN time '23:59:59.999999'
        ELSE make_time(floor(fr.to_num)::int, round((fr.to_num - floor(fr.to_num)) * 60)::int, 0)
      END AS to_time,
      fr.is_full_day,
      fr.wraps_midnight
  FROM final_rows fr
  ON CONFLICT (worker_id, weekday) DO NOTHING -- Safeguard against any remaining duplicates
  RETURNING worker_id, weekday
),
-- Insert unavailability periods
unavailability AS (
  INSERT INTO unavailability_periods (worker_id, from_date, to_date, reason)
  SELECT
      sw.id,
      r.unav_from_raw::date,
      r.unav_to_raw::date,
      'Holiday' AS reason
  FROM raw r
  JOIN upserted sw ON sw.code = r.code
  WHERE r.unav_from_raw IS NOT NULL AND r.unav_to_raw IS NOT NULL
  ON CONFLICT DO NOTHING
)
SELECT 'Inserted support workers and availability rules' AS result;

COMMIT;