-- refresh_views_incremental.sql
-- Alternative approach to refresh materialized views with better timeout handling

-- Drop and recreate views instead of refreshing to avoid timeout issues
-- This is more efficient for large datasets

-- DEPRECATED: department_spending table and related views removed as of 2024-06-23. 

-- Drop existing materialized views
DROP MATERIALIZED VIEW IF EXISTS vendor_transactions_with_vendor CASCADE;
DROP MATERIALIZED VIEW IF EXISTS budget_line_items_with_names CASCADE;
DROP MATERIALIZED VIEW IF EXISTS programs_with_descriptions CASCADE;
DROP MATERIALIZED VIEW IF EXISTS fund_compare_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS department_compare_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS program_compare_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vendor_totals_all_years CASCADE;
DROP MATERIALIZED VIEW IF EXISTS departments_with_workforce CASCADE;

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

-- Recreate views in order of complexity (simplest first)
CREATE MATERIALIZED VIEW vendor_transactions_with_vendor AS
select
  vt.*,
  v.name as vendor_name
from
  vendor_transactions vt
  join vendors v on vt.vendor_id = v.id;

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
  FROM vendor_transactions 
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
  FROM vendor_transactions vt
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
  FROM vendor_transactions 
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

CREATE MATERIALIZED VIEW vendor_totals_all_years AS
SELECT 
  vendor_id,
  vendor_name,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count,
  ARRAY_AGG(DISTINCT fiscal_year) as years,
  ARRAY_AGG(DISTINCT department_code) as codes,
  ARRAY_AGG(DISTINCT department_name) as departments,
  ARRAY_AGG(DISTINCT agency_name) as agencies,
  ARRAY_AGG(DISTINCT account_type) as account_types,
  ARRAY_AGG(DISTINCT category) as categories,
  ARRAY_AGG(DISTINCT subcategory) as subcategories,
  ARRAY_AGG(DISTINCT program_code) as programs,
  ARRAY_AGG(DISTINCT fund_code) as funds,
  ARRAY_AGG(DISTINCT description) as descriptions
FROM vendor_transactions_with_vendor
GROUP BY vendor_id, vendor_name;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_fund_compare_summary_fund_code_year ON fund_compare_summary(fund_code, year);
CREATE INDEX IF NOT EXISTS idx_department_compare_summary_department_code_year ON department_compare_summary(department_code, year);
CREATE INDEX IF NOT EXISTS idx_department_compare_summary_department_name_year ON department_compare_summary(department_name, year);
CREATE INDEX IF NOT EXISTS idx_program_compare_summary_program_code_year ON program_compare_summary(program_code, year);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_with_vendor_vendor_code_year ON vendor_transactions_with_vendor(vendor_name, program_code, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_with_vendor_vendor_name_year ON vendor_transactions_with_vendor(vendor_name, program_code, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_with_names_project_code_year ON budget_line_items_with_names(project_code, fiscal_year);
CREATE INDEX idx_vendor_totals_amount ON vendor_totals_all_years(total_amount DESC);
CREATE INDEX IF NOT EXISTS idx_programs_with_descriptions_project_code ON programs_with_descriptions(project_code);
CREATE INDEX IF NOT EXISTS idx_programs_with_descriptions_program_name ON programs_with_descriptions(program_name);
CREATE INDEX IF NOT EXISTS idx_programs_with_descriptions_all_sources ON programs_with_descriptions USING GIN(all_sources);

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
  created_at timestamptz,
  updated_at timestamptz,
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
    d.updated_at
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql; 