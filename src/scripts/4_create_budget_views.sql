-- 4_create_budget_views
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