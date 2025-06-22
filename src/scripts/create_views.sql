-- Create All views

CREATE MATERIALIZED VIEW vendor_transactions_with_vendor AS
select
  vt.*,
  v.name as vendor_name
from
  vendor_transactions vt
  join vendors v on vt.vendor_id = v.id;

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

CREATE MATERIALIZED VIEW fund_compare_summary AS
SELECT
  f.fund_code,
  f.name AS fund_name,
  y.year,
  COALESCE(SUM(v.amount), 0) AS vendor_amount,
  COALESCE(SUM(b.amount), 0) AS budget_amount
FROM
  funds f
CROSS JOIN (
  SELECT DISTINCT fiscal_year AS year FROM vendor_transactions_with_vendor
  UNION
  SELECT DISTINCT fiscal_year AS year FROM budget_line_items_with_names
) y
LEFT JOIN vendor_transactions_with_vendor v
  ON v.fund_code = f.fund_code AND v.fiscal_year = y.year
LEFT JOIN budget_line_items_with_names b
  ON b.fund_code = f.fund_code AND b.fiscal_year = y.year
GROUP BY f.fund_code, f.name, y.year;

-- this second left join needs to use department name instead of department code
CREATE MATERIALIZED VIEW department_compare_summary AS
SELECT
  d.name AS department_name,
  d.organizational_code AS department_code,
  y.year,
  COALESCE(SUM(v.amount), 0) AS vendor_amount,
  COALESCE(SUM(b.amount), 0) AS budget_amount
FROM
  departments d
CROSS JOIN (
  SELECT DISTINCT fiscal_year AS year FROM vendor_transactions_with_vendor
  UNION
  SELECT DISTINCT fiscal_year AS year FROM budget_line_items_with_names
) y
LEFT JOIN vendor_transactions_with_vendor v
  ON v.department_name = d.name AND v.fiscal_year = y.year
LEFT JOIN budget_line_items_with_names b
  ON b.department_code = d.organizational_code AND b.fiscal_year = y.year
GROUP BY d.name, d.organizational_code, y.year;


CREATE MATERIALIZED VIEW program_compare_summary AS
SELECT
  p.project_code AS program_code,
  p.name AS program_name,
  y.year,
  COALESCE(SUM(v.amount), 0) AS vendor_amount,
  COALESCE(SUM(b.amount), 0) AS budget_amount
FROM
  programs p
CROSS JOIN (
  SELECT DISTINCT fiscal_year AS year FROM vendor_transactions_with_vendor
  UNION
  SELECT DISTINCT fiscal_year AS year FROM budget_line_items_with_names
) y
LEFT JOIN vendor_transactions_with_vendor v
  ON v.program_code = p.project_code AND v.fiscal_year = y.year
LEFT JOIN budget_line_items_with_names b
  ON b.project_code = p.project_code AND b.fiscal_year = y.year
GROUP BY p.project_code, p.name, y.year;


-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fund_compare_summary_fund_code_year ON fund_compare_summary(fund_code, year);
CREATE INDEX IF NOT EXISTS 
idx_department_compare_summary_department_code_year ON 
department_compare_summary(department_code, year);
CREATE INDEX IF NOT EXISTS idx_department_compare_summary_department_name_year ON department_compare_summary(department_name, year);
CREATE INDEX IF NOT EXISTS idx_program_compare_summary_program_code_year ON program_compare_summary(program_code, year);
CREATE INDEX IF NOT EXISTS 
idx_vendor_transactions_with_vendor_vendor_code_year 
ON vendor_transactions_with_vendor(vendor_name, 
program_code, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_with_vendor_vendor_name_year ON vendor_transactions_with_vendor(vendor_name, program_code, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_with_names_project_code_year ON budget_line_items_with_names(project_code, fiscal_year);
CREATE INDEX idx_vendor_totals_amount ON vendor_totals_all_years(total_amount DESC);

-- Create programs view with all descriptions joined
CREATE MATERIALIZED VIEW programs_with_descriptions AS
SELECT
  p.project_code,
  p.name AS program_name,
  p.program_description_ids,
  pd.id AS description_id,
  pd.description,
  pd.sources,
  pd.created_at AS description_created_at,
  pd.updated_at AS description_updated_at,
  p.created_at AS program_created_at,
  p.updated_at AS program_updated_at
FROM programs p
LEFT JOIN program_descriptions pd ON pd.id = ANY(p.program_description_ids)
ORDER BY p.project_code, pd.description;

-- Add index for the new programs view
CREATE INDEX IF NOT EXISTS idx_programs_with_descriptions_project_code ON programs_with_descriptions(project_code);
CREATE INDEX IF NOT EXISTS idx_programs_with_descriptions_description ON programs_with_descriptions(description);