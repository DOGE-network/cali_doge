-- 6_create_payments_views
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