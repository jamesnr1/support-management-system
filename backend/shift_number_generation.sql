-- Enhanced Shift Number Generation - Compact Format
-- Run this in your Supabase SQL Editor (replaces the last section)

-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS trigger_set_shift_number ON shifts;
DROP FUNCTION IF EXISTS set_shift_number();
DROP FUNCTION IF EXISTS generate_shift_number();
DROP SEQUENCE IF EXISTS shift_number_seq;

-- Create a function to generate compact shift numbers
-- Format: [L][YYYYMMDD][NN] (e.g., L2025101001)
-- L = First letter of participant name
-- YYYYMMDD = Full date
-- NN = Daily sequence number (01-99)
CREATE OR REPLACE FUNCTION generate_shift_number(shift_date DATE, participant_code TEXT) 
RETURNS TEXT AS $$
DECLARE
    first_letter TEXT;
    date_str TEXT;
    daily_count INTEGER;
    shift_num TEXT;
BEGIN
    -- Get first letter of participant name (uppercase)
    SELECT UPPER(SUBSTRING(full_name, 1, 1))
    INTO first_letter
    FROM participants
    WHERE code = participant_code
    LIMIT 1;
    
    -- If participant not found, use 'X'
    IF first_letter IS NULL OR first_letter = '' THEN
        first_letter := 'X';
    END IF;
    
    -- Format date as YYYYMMDD
    date_str := TO_CHAR(shift_date, 'YYYYMMDD');
    
    -- Count existing shifts for this participant on this date
    SELECT COUNT(*) + 1
    INTO daily_count
    FROM shifts s
    JOIN shift_participants sp ON sp.shift_id = s.id
    JOIN participants p ON p.id = sp.participant_id
    WHERE s.start_time::date = shift_date
      AND p.code = participant_code;
    
    -- Format: [L][YYYYMMDD][NN]
    shift_num := first_letter || date_str || LPAD(daily_count::TEXT, 2, '0');
    
    RETURN shift_num;
END;
$$ LANGUAGE plpgsql;

-- Function to set shift number on insert (trigger function)
CREATE OR REPLACE FUNCTION set_shift_number() 
RETURNS TRIGGER AS $$
DECLARE
    participant_code TEXT;
    shift_date DATE;
BEGIN
    -- Only generate if shift_number is null or empty
    IF NEW.shift_number IS NULL OR NEW.shift_number = '' THEN
        -- Get the date from start_time
        shift_date := NEW.start_time::date;
        
        -- Get the first participant code for this shift
        -- Note: This will be called AFTER shift_participants is populated
        SELECT p.code INTO participant_code
        FROM shift_participants sp
        JOIN participants p ON p.id = sp.participant_id
        WHERE sp.shift_id = NEW.id
        LIMIT 1;
        
        -- If no participant yet (shouldn't happen with proper app flow), use default
        IF participant_code IS NULL THEN
            participant_code := 'UNKNOWN';
            NEW.shift_number := 'X' || TO_CHAR(shift_date, 'YYYYMMDD') || LPAD(NEW.id::TEXT, 2, '0');
        ELSE
            NEW.shift_number := generate_shift_number(shift_date, participant_code);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alternative: Function to generate shift number for UPDATE (after participants are added)
CREATE OR REPLACE FUNCTION update_shift_number_after_participant() 
RETURNS TRIGGER AS $$
DECLARE
    participant_code TEXT;
    shift_date DATE;
    current_shift_number TEXT;
BEGIN
    -- Get current shift number
    SELECT shift_number, start_time::date 
    INTO current_shift_number, shift_date
    FROM shifts 
    WHERE id = NEW.shift_id;
    
    -- Only update if shift_number is null, empty, or starts with X (pending)
    IF current_shift_number IS NULL 
       OR current_shift_number = '' 
       OR (current_shift_number LIKE 'X%' AND LENGTH(current_shift_number) = 12) THEN
        
        -- Get participant code
        SELECT p.code INTO participant_code
        FROM participants p
        WHERE p.id = NEW.participant_id;
        
        -- Update the shift number
        UPDATE shifts
        SET shift_number = generate_shift_number(shift_date, participant_code)
        WHERE id = NEW.shift_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on shifts table (for new shifts)
CREATE TRIGGER trigger_set_shift_number
    BEFORE INSERT ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION set_shift_number();

-- Create trigger on shift_participants table (to update shift number after participant is added)
DROP TRIGGER IF EXISTS trigger_update_shift_number_after_participant ON shift_participants;
CREATE TRIGGER trigger_update_shift_number_after_participant
    AFTER INSERT ON shift_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_shift_number_after_participant();

-- Test the function with examples
SELECT 
    generate_shift_number('2025-10-10'::date, 'LIB001') as libby_shift,
    generate_shift_number('2025-10-10'::date, 'JAM001') as james_shift,
    generate_shift_number('2025-10-10'::date, 'ACE001') as ace_shift,
    generate_shift_number('2025-10-10'::date, 'GRA001') as grace_shift,
    generate_shift_number('2025-10-10'::date, 'MIL001') as milan_shift;

-- Show the results
SELECT 
    'Shift number generation updated!' as status,
    'Format: [L][YYYYMMDD][NN]' as format,
    'Example: L2025101001 (Libby, Oct 10 2025, shift #1)' as example;

