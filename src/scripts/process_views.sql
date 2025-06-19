-- process_views
- last step after monthly process new table data from json sources
-- Refresh all materialized views
REFRESH MATERIALIZED VIEW fund_compare_summary;
REFRESH MATERIALIZED VIEW department_compare_summary;
REFRESH MATERIALIZED VIEW program_compare_summary;
REFRESH MATERIALIZED VIEW vendor_transactions_with_vendor;
REFRESH MATERIALIZED VIEW budget_line_items_with_names; 