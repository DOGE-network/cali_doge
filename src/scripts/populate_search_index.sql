-- Populate search_index table with only searchable entities
-- This script only includes tables that the search API actually supports

-- Set a 30-minute timeout (1800 seconds)
-- SET statement_timeout = '1800s';

-- Clear existing search_index data first
DELETE FROM search_index;

-- Insert vendors into search_index
INSERT INTO search_index (term, type, source_id, additional_data)
SELECT 
  name as term,
  'vendor' as type,
  id as source_id,
  jsonb_build_object(
    'display', name,
    'context', COALESCE('Vendor with EIN: ' || ein, 'Vendor')
  ) as additional_data
FROM vendors
WHERE name IS NOT NULL AND name != '';

-- Insert departments into search_index
INSERT INTO search_index (term, type, source_id, additional_data)
SELECT 
  name as term,
  'department' as type,
  organizational_code as source_id,
  jsonb_build_object(
    'display', name,
    'context', COALESCE(description, name),
    'canonical_name', canonical_name,
    'abbreviation', abbreviation,
    'key_functions', key_functions,
    'aliases', aliases
  ) as additional_data
FROM departments
WHERE name IS NOT NULL AND name != '' AND organizational_code IS NOT NULL;

-- Insert programs into search_index
INSERT INTO search_index (term, type, source_id, additional_data)
SELECT 
  name as term,
  'program' as type,
  project_code as source_id,
  jsonb_build_object(
    'display', name,
    'context', name,
    'program_description_ids', program_description_ids
  ) as additional_data
FROM programs
WHERE name IS NOT NULL AND name != '' AND project_code IS NOT NULL;

-- Insert funds into search_index
INSERT INTO search_index (term, type, source_id, additional_data)
SELECT 
  name as term,
  'fund' as type,
  fund_code as source_id,
  jsonb_build_object(
    'display', name,
    'context', COALESCE(description, name),
    'fund_group', fund_group
  ) as additional_data
FROM funds
WHERE name IS NOT NULL AND name != '' AND fund_code IS NOT NULL;

-- Insert program_descriptions as keywords into search_index
INSERT INTO search_index (term, type, source_id, additional_data)
SELECT 
  'Program Description ' || id as term,
  'keyword' as type,
  id as source_id,
  jsonb_build_object(
    'display', 'Program Description ' || id,
    'context', description,
    'sources', sources
  ) as additional_data
FROM program_descriptions
WHERE description IS NOT NULL AND description != '';

-- Show summary of what was inserted
SELECT 
  type,
  COUNT(*) as count
FROM search_index
GROUP BY type
ORDER BY type;