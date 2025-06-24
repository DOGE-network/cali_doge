-- CREATE TABLES

DROP TABLE IF EXISTS public.budget_line_items CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.department_distributions CASCADE;
DROP TABLE IF EXISTS public.department_spending CASCADE;
DROP TABLE IF EXISTS public.department_workforce CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.funds CASCADE;
-- DROP TABLE IF EXISTS public.mailing_list CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.search_index CASCADE;
DROP TABLE IF EXISTS public.vendor_transactions CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.program_descriptions CASCADE;

CREATE TABLE public.funds (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  fund_code text NOT NULL,
  name text NOT NULL,
  fund_group text NOT NULL,
  description text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT funds_pkey PRIMARY KEY (id),
  CONSTRAINT funds_fund_code_key UNIQUE (fund_code)
);
CREATE INDEX IF NOT EXISTS idx_funds_fund_code ON public.funds USING btree (fund_code);
CREATE INDEX IF NOT EXISTS idx_funds_fund_group ON public.funds USING btree (fund_group);
CREATE INDEX IF NOT EXISTS idx_funds_search ON public.funds USING gin (to_tsvector('english'::regconfig, ((name || ' '::text) || COALESCE(description, ''::text))));

-- CREATE TABLE public.mailing_list (
--   id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
--   email text NOT NULL,
--   subscribed_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
--   CONSTRAINT mailing_list_pkey PRIMARY KEY (id),
--   CONSTRAINT mailing_list_email_key UNIQUE (email)
-- );

CREATE TABLE public.programs (
  project_code text NOT NULL,
  name text NOT NULL,
  program_description_ids uuid[] NULL DEFAULT '{}'::uuid[],
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT programs_pkey PRIMARY KEY (project_code)
);
CREATE INDEX IF NOT EXISTS idx_programs_name ON public.programs USING btree (name);

CREATE TABLE public.vendors (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  ein text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT vendors_pkey PRIMARY KEY (id),
  CONSTRAINT vendors_name_unique UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors USING btree (name);
CREATE INDEX IF NOT EXISTS idx_vendors_ein ON public.vendors USING btree (ein);
CREATE INDEX IF NOT EXISTS idx_vendors_search ON public.vendors USING gin (to_tsvector('english'::regconfig, name));


CREATE TABLE public.vendor_transactions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  vendor_id uuid NOT NULL,
  fiscal_year integer NOT NULL,
  department_name text NULL,
  department_code text NULL,
  agency_name text NULL,
  account_type text NULL,
  category text NULL,
  subcategory text NULL,
  description text NULL,
  program_code text NULL,
  fund_code text NULL,
  amount numeric(20,2) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  transaction_count integer NULL,
  CONSTRAINT vendor_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_transactions_fund_code_fkey FOREIGN KEY (fund_code) REFERENCES public.funds(fund_code),
  CONSTRAINT vendor_transactions_program_code_fkey FOREIGN KEY (program_code) REFERENCES public.programs(project_code),
  CONSTRAINT vendor_transactions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_vendor ON public.vendor_transactions USING btree (vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fiscal_year ON public.vendor_transactions USING btree (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_program ON public.vendor_transactions USING btree (program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fund ON public.vendor_transactions USING btree (fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_category ON public.vendor_transactions USING btree (category);

CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  organizational_code text NULL,
  name text NOT NULL,
  canonical_name text NULL,
  org_level integer NULL,
  budget_status text NULL,
  key_functions text NULL,
  abbreviation text NULL,
  parent_agency text NULL,
  entity_code integer NULL,
  note text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  aliases text[] NULL DEFAULT '{}'::text[],
  description text NULL,
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_name_key UNIQUE (name),
  CONSTRAINT departments_organizational_code_key UNIQUE (organizational_code)
);
CREATE INDEX IF NOT EXISTS idx_departments_org_code ON public.departments USING btree (organizational_code);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments USING btree (parent_agency);
CREATE INDEX IF NOT EXISTS idx_departments_search ON public.departments USING gin (to_tsvector('english'::regconfig, ((((((name || ' '::text) || COALESCE(canonical_name, ''::text)) || ' '::text) || COALESCE(abbreviation, ''::text)) || ' '::text) || COALESCE(key_functions, ''::text)))) ;
CREATE INDEX IF NOT EXISTS idx_departments_aliases ON public.departments USING gin (aliases);


CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  department_code text NOT NULL,
  fiscal_year integer NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_department_code_fkey FOREIGN KEY (department_code) REFERENCES public.departments(organizational_code)
);
CREATE INDEX IF NOT EXISTS idx_budgets_department ON public.budgets USING btree (department_code);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON public.budgets USING btree (fiscal_year);


CREATE TABLE public.budget_line_items (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  budget_id uuid NOT NULL,
  project_code text NULL,
  fund_code text NULL,
  amount numeric(20,2) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  fund_type smallint NULL,
  CONSTRAINT budget_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT budget_line_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE,
  CONSTRAINT budget_line_items_fund_code_fkey FOREIGN KEY (fund_code) REFERENCES public.funds(fund_code),
  CONSTRAINT budget_line_items_program_code_fkey FOREIGN KEY (project_code) REFERENCES public.programs(project_code)
);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON public.budget_line_items USING btree (budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_program ON public.budget_line_items USING btree (project_code);
CREATE INDEX IF NOT EXISTS idx_budget_items_fund ON public.budget_line_items USING btree (fund_code);


CREATE TABLE public.department_distributions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  department_id uuid NOT NULL,
  fiscal_year integer NOT NULL,
  distribution_type text NOT NULL,
  distribution_data jsonb NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT department_distributions_pkey PRIMARY KEY (id),
  CONSTRAINT department_distributions_department_id_fiscal_year_distri_key UNIQUE (department_id, fiscal_year, distribution_type),
  CONSTRAINT department_distributions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE,
  CONSTRAINT department_distributions_distribution_type_check CHECK ((distribution_type = ANY (ARRAY['tenure'::text, 'salary'::text, 'age'::text])))
);
CREATE INDEX IF NOT EXISTS idx_dept_dist_dept ON public.department_distributions USING btree (department_id);
CREATE INDEX IF NOT EXISTS idx_dept_dist_year ON public.department_distributions USING btree (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_dept_dist_type ON public.department_distributions USING btree (distribution_type);
CREATE INDEX IF NOT EXISTS idx_dept_dist_data ON public.department_distributions USING gin (distribution_data);

-- DEPRECATED: department_spending table removed as of 2024-06-23. 

CREATE TABLE public.department_workforce (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  department_id uuid NOT NULL,
  fiscal_year integer NOT NULL,
  head_count integer NOT NULL,
  total_wages numeric(20,2) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT department_workforce_pkey PRIMARY KEY (id),
  CONSTRAINT department_workforce_department_id_fiscal_year_key UNIQUE (department_id, fiscal_year),
  CONSTRAINT department_workforce_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dept_workforce_dept ON public.department_workforce USING btree (department_id);
CREATE INDEX IF NOT EXISTS idx_dept_workforce_year ON public.department_workforce USING btree (fiscal_year);


CREATE TABLE public.search_index (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  term text NOT NULL,
  type text NOT NULL,
  source_id text NOT NULL,
  additional_data jsonb NULL,
  fiscal_year integer NULL,
  fts tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((((term || ' '::text) || COALESCE((additional_data ->> 'display'::text), ''::text)) || ' '::text) || COALESCE((additional_data ->> 'context'::text), ''::text)))) STORED NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT search_index_pkey PRIMARY KEY (id),
  CONSTRAINT search_index_term_type_source_id_key UNIQUE (term, type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_search_text ON public.search_index USING gin (to_tsvector('english'::regconfig, term));
CREATE INDEX IF NOT EXISTS idx_search_term ON public.search_index USING btree (term);
CREATE INDEX IF NOT EXISTS idx_search_type ON public.search_index USING btree (type);
CREATE INDEX IF NOT EXISTS idx_search_source ON public.search_index USING btree (source_id);
CREATE INDEX IF NOT EXISTS idx_search_fiscal_year ON public.search_index USING btree (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_search_additional_data ON public.search_index USING gin (additional_data);
CREATE INDEX IF NOT EXISTS idx_search_fts ON public.search_index USING gin (fts);

-- New table to store individual program descriptions
CREATE TABLE public.program_descriptions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  description text NOT NULL,
  sources text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT program_descriptions_pkey PRIMARY KEY (id)
);