-- 1_drop_views
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