-- ============================================================
-- Tides Center - California State Budget Data Queries
-- Run against the Cali DOGE Supabase database
-- ============================================================

-- 1. Search for Tides Center in the search index
SELECT id, term, type, source_id, additional_data
FROM search_index
WHERE term ILIKE '%tides%'
ORDER BY type, term;

-- 2. Find Tides Center in vendors table (by name)
SELECT id, name, ein, created_at
FROM vendors
WHERE name ILIKE '%tides%center%'
   OR name ILIKE '%tides center%'
   OR name ILIKE '%the tides center%';

-- 3. Find Tides entities by EIN
SELECT id, name, ein
FROM vendors
WHERE ein IN ('94-3213100', '943213100',     -- Tides Center
              '51-0198509', '510198509',     -- Tides Foundation
              '94-3153687', '943153687');     -- Tides Advocacy

-- 4. Find ALL vendors with "tides" in the name
SELECT id, name, ein
FROM vendors
WHERE name ILIKE '%tides%'
ORDER BY name;

-- 5. Total spending on Tides Center by fiscal year (all years combined view)
SELECT
  v.name AS vendor_name,
  vt.fiscal_year,
  SUM(vt.amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE v.name ILIKE '%tides center%'
   OR v.name ILIKE '%tides%center%'
   OR v.ein IN ('94-3213100', '943213100')
GROUP BY v.name, vt.fiscal_year
ORDER BY vt.fiscal_year DESC;

-- 6. Tides Center spending by department
SELECT
  v.name AS vendor_name,
  vt.department_code,
  d.name AS department_name,
  SUM(vt.amount) AS total_amount,
  COUNT(*) AS transaction_count,
  MIN(vt.fiscal_year) AS first_year,
  MAX(vt.fiscal_year) AS last_year
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
LEFT JOIN departments d ON vt.department_code = d.organizational_code
WHERE v.name ILIKE '%tides center%'
   OR v.name ILIKE '%tides%center%'
   OR v.ein IN ('94-3213100', '943213100')
GROUP BY v.name, vt.department_code, d.name
ORDER BY total_amount DESC;

-- 7. Detailed transaction list for Tides Center (most recent first)
SELECT
  v.name AS vendor_name,
  vt.fiscal_year,
  vt.department_code,
  vt.amount,
  vt.category,
  vt.subcategory,
  vt.description,
  vt.program_code,
  vt.fund_code,
  vt.agency_name,
  vt.account_type,
  vt.transaction_date
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE v.name ILIKE '%tides center%'
   OR v.name ILIKE '%tides%center%'
   OR v.ein IN ('94-3213100', '943213100')
ORDER BY vt.fiscal_year DESC, vt.amount DESC
LIMIT 500;

-- 8. Year-partitioned queries (for performance)
-- FY 2024
SELECT vendor_name, department_code, amount, category, subcategory, description, program_code, fund_code
FROM vendor_transactions_with_vendor_fy2024
WHERE vendor_name ILIKE '%tides center%' OR vendor_name ILIKE '%tides%center%'
ORDER BY amount DESC;

-- FY 2023
SELECT vendor_name, department_code, amount, category, subcategory, description, program_code, fund_code
FROM vendor_transactions_with_vendor_fy2023
WHERE vendor_name ILIKE '%tides center%' OR vendor_name ILIKE '%tides%center%'
ORDER BY amount DESC;

-- FY 2022
SELECT vendor_name, department_code, amount, category, subcategory, description, program_code, fund_code
FROM vendor_transactions_with_vendor_fy2022
WHERE vendor_name ILIKE '%tides center%' OR vendor_name ILIKE '%tides%center%'
ORDER BY amount DESC;

-- FY 2021
SELECT vendor_name, department_code, amount, category, subcategory, description, program_code, fund_code
FROM vendor_transactions_with_vendor_fy2021
WHERE vendor_name ILIKE '%tides center%' OR vendor_name ILIKE '%tides%center%'
ORDER BY amount DESC;

-- FY 2020
SELECT vendor_name, department_code, amount, category, subcategory, description, program_code, fund_code
FROM vendor_transactions_with_vendor_fy2020
WHERE vendor_name ILIKE '%tides center%' OR vendor_name ILIKE '%tides%center%'
ORDER BY amount DESC;

-- FY 2019
SELECT vendor_name, department_code, amount, category, subcategory, description, program_code, fund_code
FROM vendor_transactions_with_vendor_fy2019
WHERE vendor_name ILIKE '%tides center%' OR vendor_name ILIKE '%tides%center%'
ORDER BY amount DESC;

-- 9. Summary: All Tides entities combined spending
SELECT
  v.name AS vendor_name,
  v.ein,
  COUNT(*) AS total_transactions,
  SUM(vt.amount) AS total_amount,
  MIN(vt.fiscal_year) AS first_year,
  MAX(vt.fiscal_year) AS last_year,
  COUNT(DISTINCT vt.department_code) AS departments_count
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE v.name ILIKE '%tides%'
GROUP BY v.name, v.ein
ORDER BY total_amount DESC;

-- 10. Cross-reference with budget line items
SELECT
  b.department_code,
  d.name AS department_name,
  bli.amount AS budget_amount,
  bli.fund_code,
  f.name AS fund_name,
  bli.project_code,
  p.name AS program_name,
  b.fiscal_year
FROM budget_line_items bli
JOIN budgets b ON bli.budget_id = b.id
LEFT JOIN departments d ON b.department_code = d.organizational_code
LEFT JOIN funds f ON bli.fund_code = f.fund_code
LEFT JOIN programs p ON bli.project_code = p.project_code
WHERE b.department_code IN ('4260', '4265', '3720', '3900', '0555', '6120', '7350', '7100')
  AND b.fiscal_year >= 2019
ORDER BY b.department_code, b.fiscal_year;
