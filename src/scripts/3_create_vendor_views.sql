-- 3_create_vendor_views
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