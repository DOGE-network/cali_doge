-- 5_create_spend_views
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
