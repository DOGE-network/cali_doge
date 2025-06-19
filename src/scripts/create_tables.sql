-- Recreate vendors table
CREATE TABLE public.vendors (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  ein text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT vendors_pkey PRIMARY KEY (id),
  CONSTRAINT vendors_name_unique UNIQUE (name)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors USING btree (name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_vendors_ein ON public.vendors USING btree (ein) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_vendors_search ON public.vendors USING gin (to_tsvector('english'::regconfig, name)) TABLESPACE pg_default;

-- Recreate budget_line_items table
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
  CONSTRAINT budget_line_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  CONSTRAINT budget_line_items_fund_code_fkey FOREIGN KEY (fund_code) REFERENCES funds(fund_code),
  CONSTRAINT budget_line_items_program_code_fkey FOREIGN KEY (project_code) REFERENCES programs(project_code)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON public.budget_line_items USING btree (budget_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_budget_items_program ON public.budget_line_items USING btree (project_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_budget_items_fund ON public.budget_line_items USING btree (fund_code) TABLESPACE pg_default;

-- Recreate budgets table
CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  department_code text NOT NULL,
  fiscal_year integer NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_department_code_fkey FOREIGN KEY (department_code) REFERENCES departments(organizational_code)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_budgets_department ON public.budgets USING btree (department_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON public.budgets USING btree (fiscal_year) TABLESPACE pg_default;

-- Recreate department_distributions table
CREATE TABLE public.department_distributions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  department_code text NOT NULL,
  fiscal_year integer NOT NULL,
  distribution_type text NOT NULL,
  distribution_data jsonb NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT department_distributions_pkey PRIMARY KEY (id),
  CONSTRAINT department_distributions_department_code_fiscal_year_distri_key UNIQUE (department_code, fiscal_year, distribution_type),
  CONSTRAINT department_distributions_department_code_fkey FOREIGN KEY (department_code) REFERENCES departments(organizational_code),
  CONSTRAINT department_distributions_distribution_type_check CHECK ((distribution_type = ANY (ARRAY['tenure'::text, 'salary'::text, 'age'::text])))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_dept_dist_dept ON public.department_distributions USING btree (department_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_dept_dist_year ON public.department_distributions USING btree (fiscal_year) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_dept_dist_type ON public.department_distributions USING btree (distribution_type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_dept_dist_data ON public.department_distributions USING gin (distribution_data) TABLESPACE pg_default;

-- Recreate department_spending table
CREATE TABLE public.department_spending (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  department_code text NOT NULL,
  fiscal_year integer NOT NULL,
  total_amount numeric(20,2) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT department_spending_pkey PRIMARY KEY (id),
  CONSTRAINT department_spending_department_code_fiscal_year_key UNIQUE (department_code, fiscal_year),
  CONSTRAINT department_spending_department_code_fkey FOREIGN KEY (department_code) REFERENCES departments(organizational_code)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_dept_spending_dept ON public.department_spending USING btree (department_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_dept_spending_year ON public.department_spending USING btree (fiscal_year) TABLESPACE pg_default;

-- Recreate department_workforce table
CREATE TABLE public.department_workforce (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  department_code text NOT NULL,
  fiscal_year integer NOT NULL,
  head_count integer NOT NULL,
  total_wages numeric(20,2) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT department_workforce_pkey PRIMARY KEY (id),
  CONSTRAINT department_workforce_department_code_fiscal_year_key UNIQUE (department_code, fiscal_year),
  CONSTRAINT department_workforce_department_code_fkey FOREIGN KEY (department_code) REFERENCES departments(organizational_code)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_dept_workforce_dept ON public.department_workforce USING btree (department_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_dept_workforce_year ON public.department_workforce USING btree (fiscal_year) TABLESPACE pg_default;

-- Recreate departments table
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
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_departments_org_code ON public.departments USING btree (organizational_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments USING btree (parent_agency) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_departments_search ON public.departments USING gin (to_tsvector('english'::regconfig, ((((((name || ' '::text) || COALESCE(canonical_name, ''::text)) || ' '::text) || COALESCE(abbreviation, ''::text)) || ' '::text) || COALESCE(key_functions, ''::text)))) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_departments_aliases ON public.departments USING gin (aliases) TABLESPACE pg_default;

-- Recreate funds table
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
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_funds_fund_code ON public.funds USING btree (fund_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_funds_fund_group ON public.funds USING btree (fund_group) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_funds_search ON public.funds USING gin (to_tsvector('english'::regconfig, ((name || ' '::text) || COALESCE(description, ''::text)))) TABLESPACE pg_default;

-- Recreate mailing_list table
CREATE TABLE public.mailing_list (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  email text NOT NULL,
  subscribed_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT mailing_list_pkey PRIMARY KEY (id),
  CONSTRAINT mailing_list_email_key UNIQUE (email)
) TABLESPACE pg_default;

-- Recreate programs table
CREATE TABLE public.programs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  project_code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  sources text[] NULL DEFAULT '{}'::text[],
  CONSTRAINT programs_pkey PRIMARY KEY (id),
  CONSTRAINT programs_project_code_key UNIQUE (project_code)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_programs_project_code ON public.programs USING btree (project_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_programs_sources ON public.programs USING gin (sources) TABLESPACE pg_default;