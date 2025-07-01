-- 7_create_workforce_views
-- refresh_views_incremental.sql
-- Alternative approach to refresh materialized views with better timeout handling

-- Drop and recreate views instead of refreshing to avoid timeout issues
-- This is more efficient for large datasets

-- DEPRECATED: department_spending table and related views removed as of 2024-06-23. 

-- Set longer timeout for materialized view creation
-- SET statement_timeout = '600s'; -- 10 minutes for large view creation

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