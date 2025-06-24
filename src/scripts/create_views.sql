-- refresh_views_incremental.sql
-- Alternative approach to refresh materialized views with better timeout handling

-- Drop and recreate views instead of refreshing to avoid timeout issues
-- This is more efficient for large datasets

-- DEPRECATED: department_spending table and related views removed as of 2024-06-23. 

-- Set longer timeout for materialized view creation
SET statement_timeout = '600s'; -- 10 minutes for large view creation

-- Drop existing views to avoid conflicts
DROP MATERIALIZED VIEW IF EXISTS departments_with_workforce CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2016 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2017 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2018 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2019 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2020 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2021 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2022 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2023 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor_fy2024 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor CASCADE;
DROP MATERIALIZED VIEW IF EXISTS budget_line_items_with_names CASCADE;
DROP MATERIALIZED VIEW IF EXISTS programs_with_descriptions CASCADE;
DROP MATERIALIZED VIEW IF EXISTS fund_compare_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS department_compare_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS program_compare_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_payments_summary CASCADE;

-- Create departments with workforce materialized view
CREATE MATERIALIZED VIEW departments_with_workforce AS
SELECT 
  d.id,
  d.organizational_code,
  d.name,
  d.canonical_name,
  d.aliases,
  d.description,
  d.entity_code,
  d.org_level,
  d.budget_status,
  d.key_functions,
  d.abbreviation,
  d.parent_agency,
  d.note,
  d.created_at,
  d.updated_at,
  -- Workforce data by year
  COALESCE(
    jsonb_object_agg(
      dw.fiscal_year::text, 
      jsonb_build_object(
        'headCount', dw.head_count,
        'wages', dw.total_wages
      )
    ) FILTER (WHERE dw.fiscal_year IS NOT NULL),
    '{}'::jsonb
  ) as workforce_yearly,
  -- Distribution data by type and year
  COALESCE(
    jsonb_object_agg(
      dd.distribution_type,
      dd.distribution_data
    ) FILTER (WHERE dd.distribution_type IS NOT NULL),
    '{}'::jsonb
  ) as distributions_yearly
FROM departments d
LEFT JOIN department_workforce dw ON d.id = dw.department_id
LEFT JOIN department_distributions dd ON d.id = dd.department_id
GROUP BY 
  d.id,
  d.organizational_code,
  d.name,
  d.canonical_name,
  d.aliases,
  d.description,
  d.entity_code,
  d.org_level,
  d.budget_status,
  d.key_functions,
  d.abbreviation,
  d.parent_agency,
  d.note,
  d.created_at,
  d.updated_at;

-- Create indexes for the new view
CREATE INDEX IF NOT EXISTS idx_departments_with_workforce_id ON departments_with_workforce(id);
CREATE INDEX IF NOT EXISTS idx_departments_with_workforce_name ON departments_with_workforce(name);
CREATE INDEX IF NOT EXISTS idx_departments_with_workforce_org_code ON departments_with_workforce(organizational_code);
CREATE INDEX IF NOT EXISTS idx_departments_with_workforce_workforce_yearly ON departments_with_workforce USING GIN(workforce_yearly);
CREATE INDEX IF NOT EXISTS idx_departments_with_workforce_distributions_yearly ON departments_with_workforce USING GIN(distributions_yearly);

-- Create year-partitioned materialized views for 10x-100x performance improvement
-- Each view contains only one year of data, dramatically reducing scan time
-- Using partitioned table for better performance

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2016 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2016;

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2017 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2017;

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2018 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2018;

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2019 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2019;

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2020 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2020;

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2021 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2021;

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2022 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2022;

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2023 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2023;

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor_fy2024 AS
SELECT
  vt.*,
  v.name as vendor_name
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE vt.fiscal_year = 2024;

-- Create optimal indexes for each year-partitioned view
-- These indexes are critical for search API performance

-- FY2016 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2016_vendor_name ON vendor_transactions_with_vendor_fy2016(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2016_department_name ON vendor_transactions_with_vendor_fy2016(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2016_program_code ON vendor_transactions_with_vendor_fy2016(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2016_fund_code ON vendor_transactions_with_vendor_fy2016(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2016_amount ON vendor_transactions_with_vendor_fy2016(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2016_dept_name_trgm ON vendor_transactions_with_vendor_fy2016 USING gin (department_name gin_trgm_ops);

-- FY2017 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2017_vendor_name ON vendor_transactions_with_vendor_fy2017(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2017_department_name ON vendor_transactions_with_vendor_fy2017(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2017_program_code ON vendor_transactions_with_vendor_fy2017(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2017_fund_code ON vendor_transactions_with_vendor_fy2017(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2017_amount ON vendor_transactions_with_vendor_fy2017(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2017_dept_name_trgm ON vendor_transactions_with_vendor_fy2017 USING gin (department_name gin_trgm_ops);

-- FY2018 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2018_vendor_name ON vendor_transactions_with_vendor_fy2018(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2018_department_name ON vendor_transactions_with_vendor_fy2018(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2018_program_code ON vendor_transactions_with_vendor_fy2018(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2018_fund_code ON vendor_transactions_with_vendor_fy2018(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2018_amount ON vendor_transactions_with_vendor_fy2018(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2018_dept_name_trgm ON vendor_transactions_with_vendor_fy2018 USING gin (department_name gin_trgm_ops);

-- FY2019 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2019_vendor_name ON vendor_transactions_with_vendor_fy2019(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2019_department_name ON vendor_transactions_with_vendor_fy2019(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2019_program_code ON vendor_transactions_with_vendor_fy2019(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2019_fund_code ON vendor_transactions_with_vendor_fy2019(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2019_amount ON vendor_transactions_with_vendor_fy2019(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2019_dept_name_trgm ON vendor_transactions_with_vendor_fy2019 USING gin (department_name gin_trgm_ops);

-- FY2020 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2020_vendor_name ON vendor_transactions_with_vendor_fy2020(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2020_department_name ON vendor_transactions_with_vendor_fy2020(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2020_program_code ON vendor_transactions_with_vendor_fy2020(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2020_fund_code ON vendor_transactions_with_vendor_fy2020(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2020_amount ON vendor_transactions_with_vendor_fy2020(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2020_dept_name_trgm ON vendor_transactions_with_vendor_fy2020 USING gin (department_name gin_trgm_ops);

-- FY2021 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2021_vendor_name ON vendor_transactions_with_vendor_fy2021(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2021_department_name ON vendor_transactions_with_vendor_fy2021(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2021_program_code ON vendor_transactions_with_vendor_fy2021(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2021_fund_code ON vendor_transactions_with_vendor_fy2021(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2021_amount ON vendor_transactions_with_vendor_fy2021(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2021_dept_name_trgm ON vendor_transactions_with_vendor_fy2021 USING gin (department_name gin_trgm_ops);

-- FY2022 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2022_vendor_name ON vendor_transactions_with_vendor_fy2022(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2022_department_name ON vendor_transactions_with_vendor_fy2022(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2022_program_code ON vendor_transactions_with_vendor_fy2022(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2022_fund_code ON vendor_transactions_with_vendor_fy2022(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2022_amount ON vendor_transactions_with_vendor_fy2022(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2022_dept_name_trgm ON vendor_transactions_with_vendor_fy2022 USING gin (department_name gin_trgm_ops);

-- FY2023 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2023_vendor_name ON vendor_transactions_with_vendor_fy2023(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2023_department_name ON vendor_transactions_with_vendor_fy2023(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2023_program_code ON vendor_transactions_with_vendor_fy2023(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2023_fund_code ON vendor_transactions_with_vendor_fy2023(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2023_amount ON vendor_transactions_with_vendor_fy2023(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2023_dept_name_trgm ON vendor_transactions_with_vendor_fy2023 USING gin (department_name gin_trgm_ops);

-- FY2024 indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2024_vendor_name ON vendor_transactions_with_vendor_fy2024(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2024_department_name ON vendor_transactions_with_vendor_fy2024(department_name);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2024_program_code ON vendor_transactions_with_vendor_fy2024(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2024_fund_code ON vendor_transactions_with_vendor_fy2024(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2024_amount ON vendor_transactions_with_vendor_fy2024(amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fy2024_dept_name_trgm ON vendor_transactions_with_vendor_fy2024 USING gin (department_name gin_trgm_ops);



CREATE MATERIALIZED VIEW budget_line_items_with_names AS
SELECT
  bli.id,
  bli.amount,
  bli.project_code,
  bli.fund_code,
  b.fiscal_year,
  b.department_code,
  d.name AS department_name,
  p.name AS program_name,
  f.name AS fund_name
FROM budget_line_items bli
JOIN budgets b ON bli.budget_id = b.id
LEFT JOIN departments d ON b.department_code = d.organizational_code
LEFT JOIN programs p ON bli.project_code = p.project_code
LEFT JOIN funds f ON bli.fund_code = f.fund_code;

CREATE MATERIALIZED VIEW programs_with_descriptions AS
SELECT
  p.project_code,
  p.name AS program_name,
  p.program_description_ids,
  -- Create arrays of description texts and sources from program_description_ids
  ARRAY(
    SELECT pd.description 
    FROM program_descriptions pd 
    WHERE pd.id = ANY(p.program_description_ids)
    ORDER BY pd.created_at
  ) AS description_texts,
  -- Flatten sources into a single array of all unique sources (more robust approach)
  ARRAY(
    SELECT DISTINCT source_item
    FROM program_descriptions pd,
         unnest(pd.sources) AS source_item
    WHERE pd.id = ANY(p.program_description_ids)
    ORDER BY source_item
  ) AS all_sources,
  p.created_at AS program_created_at,
  p.updated_at AS program_updated_at
FROM programs p
ORDER BY p.project_code;

-- Simplified fund_compare_summary that works with any data
CREATE MATERIALIZED VIEW fund_compare_summary AS
SELECT
  f.fund_code,
  f.name AS fund_name,
  COALESCE(v.year, b.year) AS year,
  COALESCE(v.vendor_amount, 0) AS vendor_amount,
  COALESCE(b.budget_amount, 0) AS budget_amount
FROM funds f
LEFT JOIN (
  SELECT 
    fund_code,
    fiscal_year AS year,
    SUM(amount) AS vendor_amount
  FROM (
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2016
    UNION ALL
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2017
    UNION ALL
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2018
    UNION ALL
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2019
    UNION ALL
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2020
    UNION ALL
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2021
    UNION ALL
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2022
    UNION ALL
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2023
    UNION ALL
    SELECT fund_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2024
  ) all_vendor_data
  WHERE fund_code IS NOT NULL
  GROUP BY fund_code, fiscal_year
) v ON f.fund_code = v.fund_code
LEFT JOIN (
  SELECT 
    bli.fund_code,
    b.fiscal_year AS year,
    SUM(bli.amount) AS budget_amount
  FROM budget_line_items bli
  JOIN budgets b ON bli.budget_id = b.id
  WHERE bli.fund_code IS NOT NULL
  GROUP BY bli.fund_code, b.fiscal_year
) b ON f.fund_code = b.fund_code AND (v.year = b.year OR v.year IS NULL OR b.year IS NULL)
WHERE v.fund_code IS NOT NULL OR b.fund_code IS NOT NULL;

-- Simplified department_compare_summary that works with any data
CREATE MATERIALIZED VIEW department_compare_summary AS
SELECT
  d.name AS department_name,
  d.organizational_code AS department_code,
  COALESCE(v.year, b.year) AS year,
  COALESCE(v.vendor_amount, 0) AS vendor_amount,
  COALESCE(b.budget_amount, 0) AS budget_amount
FROM departments d
LEFT JOIN (
  SELECT 
    COALESCE(department_code, 
      (SELECT organizational_code FROM departments WHERE name = vt.department_name LIMIT 1)
    ) AS dept_code,
    fiscal_year AS year,
    SUM(amount) AS vendor_amount
  FROM (
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2016
    UNION ALL
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2017
    UNION ALL
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2018
    UNION ALL
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2019
    UNION ALL
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2020
    UNION ALL
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2021
    UNION ALL
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2022
    UNION ALL
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2023
    UNION ALL
    SELECT department_code, department_name, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2024
  ) vt
  WHERE department_code IS NOT NULL OR department_name IS NOT NULL
  GROUP BY department_code, department_name, fiscal_year
) v ON d.organizational_code = v.dept_code
LEFT JOIN (
  SELECT 
    b.department_code,
    b.fiscal_year AS year,
    SUM(bli.amount) AS budget_amount
  FROM budget_line_items bli
  JOIN budgets b ON bli.budget_id = b.id
  WHERE b.department_code IS NOT NULL
  GROUP BY b.department_code, b.fiscal_year
) b ON d.organizational_code = b.department_code AND (v.year = b.year OR v.year IS NULL OR b.year IS NULL)
WHERE v.dept_code IS NOT NULL OR b.department_code IS NOT NULL;

-- Simplified program_compare_summary that works with any data
CREATE MATERIALIZED VIEW program_compare_summary AS
SELECT
  p.project_code AS program_code,
  p.name AS program_name,
  COALESCE(v.year, b.year) AS year,
  COALESCE(v.vendor_amount, 0) AS vendor_amount,
  COALESCE(b.budget_amount, 0) AS budget_amount
FROM programs p
LEFT JOIN (
  SELECT 
    program_code,
    fiscal_year AS year,
    SUM(amount) AS vendor_amount
  FROM (
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2016
    UNION ALL
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2017
    UNION ALL
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2018
    UNION ALL
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2019
    UNION ALL
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2020
    UNION ALL
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2021
    UNION ALL
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2022
    UNION ALL
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2023
    UNION ALL
    SELECT program_code, fiscal_year, amount FROM vendor_transactions_with_vendor_fy2024
  ) all_vendor_data
  WHERE program_code IS NOT NULL
  GROUP BY program_code, fiscal_year
) v ON p.project_code = v.program_code
LEFT JOIN (
  SELECT 
    bli.project_code,
    b.fiscal_year AS year,
    SUM(bli.amount) AS budget_amount
  FROM budget_line_items bli
  JOIN budgets b ON bli.budget_id = b.id
  WHERE bli.project_code IS NOT NULL
  GROUP BY bli.project_code, b.fiscal_year
) b ON p.project_code = b.project_code AND (v.year = b.year OR v.year IS NULL OR b.year IS NULL)
WHERE v.program_code IS NOT NULL OR b.project_code IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fund_compare_summary_fund_code_year ON fund_compare_summary(fund_code, year);
CREATE INDEX IF NOT EXISTS idx_department_compare_summary_department_code_year ON department_compare_summary(department_code, year);
CREATE INDEX IF NOT EXISTS idx_department_compare_summary_department_name_year ON department_compare_summary(department_name, year);
CREATE INDEX IF NOT EXISTS idx_program_compare_summary_program_code_year ON program_compare_summary(program_code, year);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_with_names_project_code_year ON budget_line_items_with_names(project_code, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_programs_with_descriptions_project_code ON programs_with_descriptions(project_code);
CREATE INDEX IF NOT EXISTS idx_programs_with_descriptions_program_name ON programs_with_descriptions(program_name);
CREATE INDEX IF NOT EXISTS idx_programs_with_descriptions_all_sources ON programs_with_descriptions USING GIN(all_sources);

-- Add performance indexes for department_name lookups
CREATE INDEX IF NOT EXISTS idx_budget_line_items_with_names_department_name
  ON budget_line_items_with_names(department_name);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_with_names_department_name_year
  ON budget_line_items_with_names(department_name, fiscal_year);

-- Create vendor payments summary view for efficient pagination
-- This aggregates all vendor transactions into one row per vendor with totals
CREATE MATERIALIZED VIEW vendor_payments_summary AS
SELECT
  vendor_name,
  ARRAY_AGG(DISTINCT department_name) FILTER (WHERE department_name IS NOT NULL) AS departments,
  ARRAY_AGG(DISTINCT program_code) FILTER (WHERE program_code IS NOT NULL) AS programs,
  ARRAY_AGG(DISTINCT fund_code) FILTER (WHERE fund_code IS NOT NULL) AS funds,
  ARRAY_AGG(DISTINCT category) FILTER (WHERE category IS NOT NULL) AS categories,
  ARRAY_AGG(DISTINCT description) FILTER (WHERE description IS NOT NULL) AS descriptions,
  SUM(amount) AS total_amount,
  COUNT(*) AS transaction_count,
  MIN(fiscal_year) AS first_year,
  MAX(fiscal_year) AS last_year,
  ARRAY_AGG(DISTINCT fiscal_year ORDER BY fiscal_year) AS years_active
FROM (
  SELECT * FROM vendor_transactions_with_vendor_fy2016
  UNION ALL
  SELECT * FROM vendor_transactions_with_vendor_fy2017
  UNION ALL
  SELECT * FROM vendor_transactions_with_vendor_fy2018
  UNION ALL
  SELECT * FROM vendor_transactions_with_vendor_fy2019
  UNION ALL
  SELECT * FROM vendor_transactions_with_vendor_fy2020
  UNION ALL
  SELECT * FROM vendor_transactions_with_vendor_fy2021
  UNION ALL
  SELECT * FROM vendor_transactions_with_vendor_fy2022
  UNION ALL
  SELECT * FROM vendor_transactions_with_vendor_fy2023
  UNION ALL
  SELECT * FROM vendor_transactions_with_vendor_fy2024
) all_years
WHERE vendor_name IS NOT NULL
GROUP BY vendor_name;

-- Create indexes for vendor_payments_summary for optimal performance
CREATE INDEX IF NOT EXISTS idx_vendor_payments_summary_vendor_name ON vendor_payments_summary(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_summary_total_amount ON vendor_payments_summary(total_amount DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_summary_transaction_count ON vendor_payments_summary(transaction_count DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_summary_departments ON vendor_payments_summary USING GIN(departments);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_summary_programs ON vendor_payments_summary USING GIN(programs);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_summary_funds ON vendor_payments_summary USING GIN(funds);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_summary_categories ON vendor_payments_summary USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_summary_descriptions ON vendor_payments_summary USING GIN(descriptions);

-- Create function to get departments with workforce data
CREATE OR REPLACE FUNCTION get_departments_with_workforce()
RETURNS TABLE (
  id uuid,
  organizational_code text,
  name text,
  canonical_name text,
  aliases text[],
  description text,
  entity_code integer,
  org_level integer,
  budget_status text,
  key_functions text,
  abbreviation text,
  parent_agency text,
  note text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  workforce_yearly jsonb,
  distributions_yearly jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.organizational_code,
    d.name,
    d.canonical_name,
    d.aliases,
    d.description,
    d.entity_code,
    d.org_level,
    d.budget_status,
    d.key_functions,
    d.abbreviation,
    d.parent_agency,
    d.note,
    d.created_at,
    d.updated_at,
    COALESCE(
      jsonb_object_agg(
        dw.fiscal_year::text, 
        jsonb_build_object(
          'headCount', dw.head_count,
          'wages', dw.total_wages
        )
      ) FILTER (WHERE dw.fiscal_year IS NOT NULL),
      '{}'::jsonb
    ) as workforce_yearly,
    COALESCE(
      jsonb_object_agg(
        dd.distribution_type,
        dd.distribution_data
      ) FILTER (WHERE dd.distribution_type IS NOT NULL),
      '{}'::jsonb
    ) as distributions_yearly
  FROM departments d
  LEFT JOIN department_workforce dw ON d.id = dw.department_id
  LEFT JOIN department_distributions dd ON d.id = dd.department_id
  GROUP BY 
    d.id,
    d.organizational_code,
    d.name,
    d.canonical_name,
    d.aliases,
    d.description,
    d.entity_code,
    d.org_level,
    d.budget_status,
    d.key_functions,
    d.abbreviation,
    d.parent_agency,
    d.note,
    d.created_at,
    d.updated_at;
END;
$$ LANGUAGE plpgsql; 