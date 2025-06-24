## **Data Sources**
  * vendors_2016.json
  * vendors_2017.json
  * vendors_2018.json
  * vendors_2019.json (84.56 MB)
  * vendors_2023.json (81.82 MB)
  * vendors_2022.json (81.21 MB)
  * vendors_2021.json (80.01 MB)
  * vendors_2020.json (72.38 MB)
  * search.json (64.04 MB)
  * funds.json
  * programs.json
  * budgets.json
  * departments.json 

## **Monthly Update Supabase Script**:
```typescript
// src/scripts/update_supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const config = {
  batchSize: 100,
  dataDir: path.join(process.cwd(), 'src/data'),
  currentYear: new Date().getFullYear()
};

// Error handling and logging
const logError = (context: string, error: any) => {
  console.error({
    timestamp: new Date().toISOString(),
    context,
    error: error.message,
    details: error.details || {}
  });
};

// Data validation
const validateData = (data: any, type: string) => {
  switch (type) {
    case 'vendor':
      if (!data.n || !data.e || typeof data.a !== 'number' || typeof data.c !== 'number') {
        throw new Error('Invalid vendor data structure');
      }
      break;
    case 'fund':
      if (!data.fundCode || !data.fundName || !data.fundGroup) {
        throw new Error('Invalid fund data structure');
      }
      break;
    case 'department':
      if (!data.organizationalCode || !data.name) {
        throw new Error('Invalid department data structure');
      }
      break;
  }
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const DATA_DIR = path.join(process.cwd(), 'src/data');
const CURRENT_YEAR = new Date().getFullYear();

// Helper function for batch processing
async function processBatches<T>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<void>
) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  console.log(`Processing ${batches.length} batches of size ${batchSize}`);
  
  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length}`);
    await processFn(batches[i]);
  }
}

// Update vendors data
async function updateVendors() {
  console.log('Updating vendors data...');
  const currentYearFile = `vendors_${CURRENT_YEAR}.json`;
  const filePath = path.join(DATA_DIR, currentYearFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`${currentYearFile} does not exist`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const fiscalYear = CURRENT_YEAR;
  
  // First, delete existing vendor data for the current year
  console.log(`Deleting existing vendor data for ${fiscalYear}...`);
  
  // Get all vendors for the current year
  const { data: existingVendors, error: fetchError } = await supabase
    .from('vendors')
    .select('id')
    .eq('fiscal_year', fiscalYear);
    
  if (fetchError) {
    console.error(`Error fetching existing vendors:`, fetchError);
    return;
  }
  
  if (existingVendors && existingVendors.length > 0) {
    // Delete transactions for these vendors
    const vendorIds = existingVendors.map(v => v.id);
    await processBatches(
      vendorIds,
      100,
      async (batch) => {
        const { error } = await supabase
          .from('vendor_transactions')
          .delete()
          .in('vendor_id', batch);
          
        if (error) console.error(`Error deleting vendor transactions:`, error);
      }
    );
    
    // Delete vendors
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('fiscal_year', fiscalYear);
      
    if (error) console.error(`Error deleting vendors:`, error);
  }
  
  // Now insert new vendor data
  await processBatches(
    data.t,
    100,
    async (batch) => {
      const vendorsToInsert = batch.map((vendor: any) => ({
        name: vendor.n,
        ein: vendor.e,
        fiscal_year: fiscalYear,
        total_amount: vendor.a,
        transaction_count: vendor.c
      }));
      
      const { error } = await supabase
        .from('vendors')
        .insert(vendorsToInsert);
        
      if (error) console.error(`Error inserting vendors:`, error);
      
      // Now fetch the inserted vendors to get their IDs
      const { data: insertedVendors, error: fetchError } = await supabase
      .from('vendors')
        .select('id, name, fiscal_year')
        .in('name', batch.map((v: any) => v.n))
        .eq('fiscal_year', fiscalYear);
        
      if (fetchError) {
        console.error(`Error fetching inserted vendors:`, fetchError);
        return;
      }
      
      // Create a map of vendor name to ID
      const vendorMap = new Map();
      insertedVendors.forEach((v: any) => {
        vendorMap.set(`${v.name}_${v.fiscal_year}`, v.id);
      });
      
      // Insert transactions
      const transactions = [];
      for (const vendor of batch) {
        const vendorId = vendorMap.get(`${vendor.n}_${fiscalYear}`);
        if (!vendorId) continue;
        
        if (vendor.t && Array.isArray(vendor.t)) {
          vendor.t.forEach((transaction: any) => {
            transactions.push({
              vendor_id: vendorId,
          fiscal_year: fiscalYear,
              amount: transaction.a,
              transaction_date: transaction.d ? new Date(transaction.d) : null,
              department_code: transaction.dc,
              program_code: transaction.pc,
              fund_code: transaction.fc,
              category: transaction.ca,
              description: transaction.de
            });
          });
        }
      }
      
      if (transactions.length > 0) {
        await processBatches(
          transactions,
          100,
          async (transactionBatch) => {
            const { error } = await supabase
              .from('vendor_transactions')
              .insert(transactionBatch);
              
            if (error) console.error(`Error inserting transactions:`, error);
          }
        );
      }
    }
  );
}

// Update funds data
async function updateFunds() {
  console.log('Updating funds data...');
  const filePath = path.join(DATA_DIR, 'funds.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('funds.json does not exist');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  if (!data.funds || !Array.isArray(data.funds)) {
    console.error('Invalid funds data structure');
    return;
  }
  
  // Process funds in batches
  await processBatches(
    data.funds,
    100,
    async (batch) => {
      const fundsToUpsert = batch.map((fund: any) => ({
        fund_code: fund.fundCode,
        name: fund.fundName,
        fund_group: fund.fundGroup,
        description: fund.fundDescription
      }));
      
      const { error } = await supabase
        .from('funds')
        .upsert(fundsToUpsert, {
          onConflict: 'fund_code'
        });
        
      if (error) console.error(`Error updating funds:`, error);
    }
  );
  
  console.log('Funds data update completed');
}

// Update departments data
async function updateDepartments() {
  console.log('Updating departments data...');
  const filePath = path.join(DATA_DIR, 'departments.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('departments.json does not exist');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // Update departments
  await processBatches(
    data,
    50,
    async (batch) => {
      const departmentsToUpsert = batch.map((dept: any) => ({
        organizational_code: dept.organizationalCode,
        name: dept.name,
        canonical_name: dept.canonicalName,
        org_level: dept.orgLevel,
        budget_status: dept.budget_status,
        key_functions: dept.keyFunctions,
        abbreviation: dept.abbreviation,
        parent_agency: dept.parent_agency,
        entity_code: dept.entityCode,
        note: dept.note
      }));
      
      const { error } = await supabase
        .from('departments')
        .upsert(departmentsToUpsert, {
          onConflict: 'organizational_code'
        });
        
      if (error) console.error(`Error updating departments:`, error);
      
      // Update department spending for current year
      const spending = [];
      for (const dept of batch) {
        if (dept.spending && dept.spending.yearly && dept.spending.yearly[CURRENT_YEAR]) {
          spending.push({
            department_code: dept.organizationalCode,
            fiscal_year: CURRENT_YEAR,
            total_amount: dept.spending.yearly[CURRENT_YEAR]
          });
        }
      }
      
      if (spending.length > 0) {
        const { error: spendingError } = await supabase
          .from('department_spending')
          .upsert(spending, {
            onConflict: 'department_code, fiscal_year'
          });
          
        if (spendingError) console.error(`Error updating department spending:`, spendingError);
      }
      
      // Update workforce data for current year
      const workforce = [];
      for (const dept of batch) {
        if (dept.headCount && dept.headCount.yearly && dept.headCount.yearly[CURRENT_YEAR]) {
          workforce.push({
            department_code: dept.organizationalCode,
            fiscal_year: CURRENT_YEAR,
            head_count: dept.headCount.yearly[CURRENT_YEAR],
            total_wages: dept.wages?.yearly?.[CURRENT_YEAR] || null
          });
        }
      }
      
      if (workforce.length > 0) {
        const { error: workforceError } = await supabase
          .from('department_workforce')
          .upsert(workforce, {
            onConflict: 'department_code, fiscal_year'
          });
          
        if (workforceError) console.error(`Error updating department workforce:`, workforceError);
      }
      
      // Update distributions for current year
      const distributions = [];
      for (const dept of batch) {
        // Tenure distribution
        if (dept.tenureDistribution && dept.tenureDistribution.yearly && dept.tenureDistribution.yearly[CURRENT_YEAR]) {
          distributions.push({
            department_code: dept.organizationalCode,
            fiscal_year: CURRENT_YEAR,
            distribution_type: 'tenure',
            distribution_data: dept.tenureDistribution.yearly[CURRENT_YEAR]
          });
        }
        
        // Salary distribution
        if (dept.salaryDistribution && dept.salaryDistribution.yearly && dept.salaryDistribution.yearly[CURRENT_YEAR]) {
          distributions.push({
            department_code: dept.organizationalCode,
            fiscal_year: CURRENT_YEAR,
            distribution_type: 'salary',
            distribution_data: dept.salaryDistribution.yearly[CURRENT_YEAR]
          });
        }
        
        // Age distribution
        if (dept.ageDistribution && dept.ageDistribution.yearly && dept.ageDistribution.yearly[CURRENT_YEAR]) {
          distributions.push({
            department_code: dept.organizationalCode,
            fiscal_year: CURRENT_YEAR,
            distribution_type: 'age',
            distribution_data: dept.ageDistribution.yearly[CURRENT_YEAR]
          });
        }
      }
      
      if (distributions.length > 0) {
        await processBatches(
          distributions,
          100,
          async (distributionBatch) => {
            const { error: distributionError } = await supabase
              .from('department_distributions')
              .upsert(distributionBatch, {
                onConflict: 'department_code, fiscal_year, distribution_type'
              });
              
            if (distributionError) console.error(`Error updating distributions:`, distributionError);
          }
        );
      }
    }
  );
}

// Update programs data
async function updatePrograms() {
  console.log('Updating programs data...');
  const filePath = path.join(DATA_DIR, 'programs.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('programs.json does not exist');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  await processBatches(
    data,
    100,
    async (batch) => {
      const programsToUpsert = batch.map((program: any) => ({
        project_code: program.projectCode,
        name: program.name,
        description: program.descriptions?.default || null,
        department_code: program.departmentCode,
        fiscal_year: program.fiscalYear || null
      }));
      
  const { error } = await supabase
        .from('programs')
        .upsert(programsToUpsert, {
          onConflict: 'project_code'
        });
        
      if (error) console.error(`Error updating programs:`, error);
    }
  );
}

// Update search index
async function updateSearchIndex() {
  console.log('Updating search index...');
  
  // First, ensure the search_index table has the full-text search column
  const { error: alterError } = await supabase.rpc('ensure_search_index_fts');
  if (alterError) {
    console.error('Error ensuring search index structure:', alterError);
    return;
  }
  
  // Process each data type and update search index
  const searchItems = [];
  
  // Process departments
  const { data: departments } = await supabase
    .from('departments')
    .select('*');
    
  if (departments) {
    departments.forEach(dept => {
      searchItems.push({
        term: dept.name,
        type: 'department',
        source_id: dept.organizational_code,
        additional_data: {
          display: dept.name,
          context: dept.description || dept.name,
          slug: dept.slug
        }
      });
    });
  }

  // Process vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*');
    
  if (vendors) {
    vendors.forEach(vendor => {
      searchItems.push({
        term: vendor.name,
        type: 'vendor',
        source_id: vendor.id,
        additional_data: {
          display: vendor.name,
          context: `Vendor with EIN: ${vendor.ein || 'N/A'}`,
          total_amount: vendor.total_amount
        }
      });
    });
  }

  // Process programs
  const { data: programs } = await supabase
    .from('programs')
    .select('*');
    
  if (programs) {
    programs.forEach(program => {
      searchItems.push({
        term: program.name,
        type: 'program',
        source_id: program.project_code,
        additional_data: {
          display: program.name,
          context: program.description || program.name,
          department_code: program.department_code
        }
      });
    });
  }

  // Process funds
  const { data: funds } = await supabase
    .from('funds')
    .select('*');
    
  if (funds) {
    funds.forEach(fund => {
      searchItems.push({
        term: fund.name,
        type: 'fund',
        source_id: fund.fund_code,
        additional_data: {
          display: fund.name,
          context: fund.description || fund.name,
          fund_group: fund.fund_group
        }
      });
    });
  }

  // Batch insert search items
  await processBatches(
    searchItems,
    100,
    async (batch) => {
      const { error } = await supabase
        .from('search_index')
        .upsert(batch, {
          onConflict: 'term,type,source_id'
        });
        
      if (error) console.error(`Error updating search index:`, error);
    }
  );
}

// Update budgets data
async function updateBudgets() {
  console.log('Updating budgets data...');
  const filePath = path.join(DATA_DIR, 'budgets.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('budgets.json does not exist');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // Delete existing budget data for the current year
  console.log(`Deleting existing budget data for ${CURRENT_YEAR}...`);
  
  const { error: deleteError } = await supabase
    .from('budgets')
    .delete()
    .eq('fiscal_year', CURRENT_YEAR);
    
  if (deleteError) console.error(`Error deleting existing budgets:`, deleteError);
  
  // Process each department's budget
  for (const [deptCode, deptBudget] of Object.entries(data)) {
    // Check if there's data for the current year
    if (!deptBudget.yearly || !deptBudget.yearly[CURRENT_YEAR]) continue;
    
    const yearData = deptBudget.yearly[CURRENT_YEAR];
    
    // Insert budget record
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .insert({
        department_code: deptCode,
        fiscal_year: CURRENT_YEAR,
        amount: yearData.total,
        budget_type: 'enacted'
      })
      .select('id');
      
    if (budgetError) {
      console.error(`Error updating budget for ${deptCode}, ${CURRENT_YEAR}:`, budgetError);
      continue;
    }
    
    if (!budgetData || budgetData.length === 0) {
      console.error(`Failed to get budget ID for ${deptCode}, ${CURRENT_YEAR}`);
      continue;
    }
    
    const budgetId = budgetData[0].id;
    
    // Insert line items if available
    if (yearData.lineItems && Array.isArray(yearData.lineItems)) {
      const lineItems = yearData.lineItems.map((item: any) => ({
        budget_id: budgetId,
        program_code: item.programCode,
        fund_code: item.fundCode,
        amount: item.amount,
        description: item.description
      }));
      
      await processBatches(
        lineItems,
        100,
        async (batch) => {
          const { error } = await supabase
            .from('budget_line_items')
            .insert(batch);
            
          if (error) console.error(`Error updating budget line items:`, error);
        }
      );
    }
  }
}

// Run all updates
async function runUpdates() {
  try {
    await updateDepartments();
    await updatePrograms();
    await updateFunds();
    await updateBudgets();
    await updateVendors();
    await updateSearchIndex();
    console.log('All updates completed successfully!');
  } catch (error) {
    console.error('Update process failed:', error);
  }
}

runUpdates();
```

## **Monitoring and Validation**:
```typescript
// src/scripts/validate_supabase_data.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const DATA_DIR = path.join(process.cwd(), 'src/data');
const CURRENT_YEAR = new Date().getFullYear();

// Combined validation and consistency check
async function validateData() {
  console.log('Starting data validation...');
  
  // Validate vendors data
  const vendorsValid = await validateVendors();
  if (!vendorsValid) {
    console.error('Vendors validation failed');
    return false;
  }
  
  // Validate funds data
  const fundsValid = await validateFunds();
  if (!fundsValid) {
    console.error('Funds validation failed');
    return false;
  }
  
  // Validate search index
  const searchValid = await validateSearchIndex();
  if (!searchValid) {
    console.error('Search index validation failed');
    return false;
  }
  
  // Check data consistency
  const consistencyValid = await checkDataConsistency();
  if (!consistencyValid) {
    console.error('Data consistency check failed');
    return false;
  }
  
  console.log('All validations passed successfully!');
  return true;
}

// Check data consistency across related tables
async function checkDataConsistency() {
  console.log('Checking data consistency...');
  
  // Verify vendor amounts match transaction totals
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, total_amount')
    .eq('fiscal_year', CURRENT_YEAR);
    
  if (!vendors) {
    console.error('No vendors found for consistency check');
    return false;
  }
  
  for (const vendor of vendors) {
    const { data: transactions } = await supabase
      .from('vendor_transactions')
      .select('amount')
      .eq('vendor_id', vendor.id);
      
    if (!transactions) continue;
    
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    if (Math.abs(total - vendor.total_amount) > 0.01) {
      console.error(`Inconsistent total for vendor ${vendor.id}: expected ${vendor.total_amount}, got ${total}`);
      return false;
    }
  }
  
  return true;
}

// Run validation
validateData()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
```

## **Database Table Designs**

### **Funds Table**:
```sql
CREATE TABLE funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_code TEXT NOT NULL UNIQUE,  -- Stored as text to preserve leading zeros
  name TEXT NOT NULL,
  fund_group TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_funds_fund_code ON funds(fund_code);
CREATE INDEX idx_funds_fund_group ON funds(fund_group);

-- Full-text search index for name and description
CREATE INDEX idx_funds_search ON funds USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### **Departments Table**:
```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizational_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  canonical_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  org_level INTEGER,
  budget_status TEXT,
  key_functions TEXT,
  abbreviation TEXT,
  parent_agency TEXT,
  entity_code INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_departments_org_code ON departments(organizational_code);
CREATE INDEX idx_departments_slug ON departments(slug);
CREATE INDEX idx_departments_parent ON departments(parent_agency);

-- Full-text search index
CREATE INDEX idx_departments_search ON departments USING GIN(to_tsvector('english', 
  name || ' ' || 
  COALESCE(canonical_name, '') || ' ' || 
  COALESCE(abbreviation, '') || ' ' || 
  COALESCE(key_functions, '')
));
```

#### **Department Spending Table**:
```sql
CREATE TABLE department_spending (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code TEXT NOT NULL REFERENCES departments(organizational_code),
  fiscal_year INTEGER NOT NULL,
  total_amount DECIMAL(20, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_code, fiscal_year)
);

-- Indexes
CREATE INDEX idx_dept_spending_dept ON department_spending(department_code);
CREATE INDEX idx_dept_spending_year ON department_spending(fiscal_year);
```

#### **Department Workforce Table**:
```sql
CREATE TABLE department_workforce (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code TEXT NOT NULL REFERENCES departments(organizational_code),
  fiscal_year INTEGER NOT NULL,
  head_count INTEGER NOT NULL,
  total_wages DECIMAL(20, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_code, fiscal_year)
);

-- Indexes
CREATE INDEX idx_dept_workforce_dept ON department_workforce(department_code);
CREATE INDEX idx_dept_workforce_year ON department_workforce(fiscal_year);
```

#### **Department Distributions Table**:
```sql
CREATE TABLE department_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code TEXT NOT NULL REFERENCES departments(organizational_code),
  fiscal_year INTEGER NOT NULL,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN ('tenure', 'salary', 'age')),
  distribution_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_code, fiscal_year, distribution_type)
);

-- Indexes
CREATE INDEX idx_dept_dist_dept ON department_distributions(department_code);
CREATE INDEX idx_dept_dist_year ON department_distributions(fiscal_year);
CREATE INDEX idx_dept_dist_type ON department_distributions(distribution_type);
CREATE INDEX idx_dept_dist_data ON department_distributions USING GIN(distribution_data);
```

#### update to departments table
```sql
-- Drop the slug index first
DROP INDEX IF EXISTS idx_departments_slug;

-- Remove the unique constraint on slug
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_slug_key;

-- Remove the slug column
ALTER TABLE departments DROP COLUMN IF EXISTS slug;

-- Update any views or functions that might reference the slug column
-- Note: You may need to update these based on your specific views/functions
DROP VIEW IF EXISTS department_search_view;
CREATE OR REPLACE VIEW department_search_view AS
SELECT 
  id,
  organizational_code,
  name,
  canonical_name,
  org_level,
  budget_status,
  key_functions,
  abbreviation,
  parent_agency,
  entity_code,
  note,
  to_tsvector('english', 
    name || ' ' || 
    COALESCE(canonical_name, '') || ' ' || 
    COALESCE(abbreviation, '') || ' ' || 
    COALESCE(key_functions, '')
  ) as search_vector
FROM departments; 
```

#### second update to departments table
```sql
-- Add aliases column to departments table
-- This column will store an array of department name aliases
ALTER TABLE departments
ADD COLUMN aliases TEXT[] DEFAULT '{}';

-- Add comment to explain the column's purpose
COMMENT ON COLUMN departments.aliases IS 'Array of alternative names/aliases for the department';

-- Create an index for faster searches on aliases
CREATE INDEX idx_departments_aliases ON departments USING GIN (aliases);

-- Example of how to update aliases for a department:
-- UPDATE departments 
-- SET aliases = ARRAY['Alternative Name 1', 'Alternative Name 2']
-- WHERE organizational_code = 'DEPT_CODE'; 
```

#### third update to departments table
```sql
-- Add description column to departments table
ALTER TABLE departments
ADD COLUMN description TEXT;

-- Add comment to explain the column's purpose
COMMENT ON COLUMN departments.description IS 'Optional description of the department'; 
```

### **Programs Table**:
```sql
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  department_code TEXT REFERENCES departments(organizational_code),
  fiscal_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_programs_project_code ON programs(project_code);
CREATE INDEX idx_programs_department ON programs(department_code);
CREATE INDEX idx_programs_fiscal_year ON programs(fiscal_year);

-- Full-text search index
CREATE INDEX idx_programs_search ON programs USING GIN(to_tsvector('english', 
  name || ' ' || COALESCE(description, '')
));
```
#### second update programs table
```sql
-- Rename program_code to project_code in budget_line_items table
ALTER TABLE budget_line_items RENAME COLUMN program_code TO project_code;

-- Remove department_code and fiscal_year columns
ALTER TABLE programs DROP COLUMN IF EXISTS department_code;
ALTER TABLE programs DROP COLUMN IF EXISTS fiscal_year;

-- Add sources array column
ALTER TABLE programs ADD COLUMN IF NOT EXISTS sources text[] DEFAULT '{}';

-- Update existing programs to include legacy_import source
UPDATE programs SET sources = ARRAY['legacy_import'] WHERE sources IS NULL OR sources = '{}';

-- Add foreign key constraint for project_code
ALTER TABLE budget_line_items 
  ADD CONSTRAINT budget_line_items_project_code_fkey 
  FOREIGN KEY (project_code) 
  REFERENCES programs(project_code) 
  ON DELETE CASCADE;

-- Add index on sources array for better query performance
CREATE INDEX IF NOT EXISTS idx_programs_sources ON programs USING GIN (sources);

-- Add comment to explain the sources field
COMMENT ON COLUMN programs.sources IS 'Array of source identifiers where this program was found (e.g., budget_0110_2024)';

```

### **Budgets Table**:
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code TEXT NOT NULL REFERENCES departments(organizational_code),
  fiscal_year INTEGER NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  budget_type TEXT NOT NULL, -- 'enacted', 'proposed', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_code, fiscal_year, budget_type)
);

-- Indexes
CREATE INDEX idx_budgets_department ON budgets(department_code);
CREATE INDEX idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX idx_budgets_type ON budgets(budget_type);
```

#### **Budget Line Items Table**:
```sql
CREATE TABLE budget_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  program_code TEXT REFERENCES programs(project_code),
  fund_code TEXT REFERENCES funds(fund_code),
  amount DECIMAL(20, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_budget_items_budget ON budget_line_items(budget_id);
CREATE INDEX idx_budget_items_program ON budget_line_items(program_code);
CREATE INDEX idx_budget_items_fund ON budget_line_items(fund_code);
```

### **Vendors Table**:
-- ein field does not have values yet.
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ein TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_ein ON vendors(ein);
CREATE INDEX idx_vendors_fiscal_year ON vendors(fiscal_year);
CREATE INDEX idx_vendors_amount ON vendors(total_amount);

-- Full-text search index
CREATE INDEX idx_vendors_search ON vendors USING GIN(to_tsvector('english', name));
```

### **Vendor Transactions Table**:
```sql
CREATE TABLE vendor_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  transaction_date TIMESTAMPTZ,
  transaction_count INTEGER NOT NULL,
  department_code TEXT REFERENCES departments(organizational_code),
  program_code TEXT REFERENCES programs(project_code),
  fund_code TEXT REFERENCES funds(fund_code),
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendor_trans_vendor ON vendor_transactions(vendor_id);
CREATE INDEX idx_vendor_trans_fiscal_year ON vendor_transactions(fiscal_year);
CREATE INDEX idx_vendor_trans_department ON vendor_transactions(department_code);
CREATE INDEX idx_vendor_trans_program ON vendor_transactions(program_code);
CREATE INDEX idx_vendor_trans_fund ON vendor_transactions(fund_code);
CREATE INDEX idx_vendor_trans_date ON vendor_transactions(transaction_date);
CREATE INDEX idx_vendor_trans_category ON vendor_transactions(category);
```

### **Search Index Table**:

#### third update table script
```sql
-- Create search index table
CREATE TABLE IF NOT EXISTS search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('department', 'vendor', 'program', 'fund')),
  source_id TEXT NOT NULL,
  total_amount NUMERIC,
  transaction_count INTEGER,
  years INTEGER[],
  additional_data JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term, type, source_id)
); 
```

#### secondary update table script
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create funds table
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  fund_group TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizational_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  canonical_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  org_level INTEGER,
  budget_status TEXT,
  key_functions TEXT,
  abbreviation TEXT,
  parent_agency TEXT,
  entity_code INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create department spending table
CREATE TABLE IF NOT EXISTS department_spending (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code TEXT NOT NULL REFERENCES departments(organizational_code),
  fiscal_year INTEGER NOT NULL,
  total_amount DECIMAL(20, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_code, fiscal_year)
);

-- Create department workforce table
CREATE TABLE IF NOT EXISTS department_workforce (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code TEXT NOT NULL REFERENCES departments(organizational_code),
  fiscal_year INTEGER NOT NULL,
  head_count INTEGER NOT NULL,
  total_wages DECIMAL(20, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_code, fiscal_year)
);

-- Create department distributions table
CREATE TABLE IF NOT EXISTS department_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code TEXT NOT NULL REFERENCES departments(organizational_code),
  fiscal_year INTEGER NOT NULL,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN ('tenure', 'salary', 'age')),
  distribution_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_code, fiscal_year, distribution_type)
);

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  department_code TEXT REFERENCES departments(organizational_code),
  fiscal_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code TEXT NOT NULL REFERENCES departments(organizational_code),
  fiscal_year INTEGER NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  budget_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_code, fiscal_year, budget_type)
);

-- Create budget line items table
CREATE TABLE IF NOT EXISTS budget_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  program_code TEXT REFERENCES programs(project_code),
  fund_code TEXT REFERENCES funds(fund_code),
  amount DECIMAL(20, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ein TEXT,
  fiscal_year INTEGER NOT NULL,
  total_amount DECIMAL(20, 2) NOT NULL,
  transaction_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vendor transactions table
CREATE TABLE IF NOT EXISTS vendor_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  transaction_date TIMESTAMPTZ,
  department_code TEXT REFERENCES departments(organizational_code),
  program_code TEXT REFERENCES programs(project_code),
  fund_code TEXT REFERENCES funds(fund_code),
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create search index table
CREATE TABLE IF NOT EXISTS search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('department', 'vendor', 'program', 'fund')),
  source_id TEXT NOT NULL,
  total_amount NUMERIC,
  transaction_count INTEGER,
  years INTEGER[],
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term, type, source_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_funds_fund_code ON funds(fund_code);
CREATE INDEX IF NOT EXISTS idx_funds_fund_group ON funds(fund_group);
CREATE INDEX IF NOT EXISTS idx_funds_search ON funds USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_departments_org_code ON departments(organizational_code);
CREATE INDEX IF NOT EXISTS idx_departments_slug ON departments(slug);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_agency);
CREATE INDEX IF NOT EXISTS idx_departments_search ON departments USING GIN(to_tsvector('english', 
  name || ' ' || 
  COALESCE(canonical_name, '') || ' ' || 
  COALESCE(abbreviation, '') || ' ' || 
  COALESCE(key_functions, '')
));

CREATE INDEX IF NOT EXISTS idx_dept_spending_dept ON department_spending(department_code);
CREATE INDEX IF NOT EXISTS idx_dept_spending_year ON department_spending(fiscal_year);

CREATE INDEX IF NOT EXISTS idx_dept_workforce_dept ON department_workforce(department_code);
CREATE INDEX IF NOT EXISTS idx_dept_workforce_year ON department_workforce(fiscal_year);

CREATE INDEX IF NOT EXISTS idx_dept_dist_dept ON department_distributions(department_code);
CREATE INDEX IF NOT EXISTS idx_dept_dist_year ON department_distributions(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_dept_dist_type ON department_distributions(distribution_type);
CREATE INDEX IF NOT EXISTS idx_dept_dist_data ON department_distributions USING GIN(distribution_data);

CREATE INDEX IF NOT EXISTS idx_programs_project_code ON programs(project_code);
CREATE INDEX IF NOT EXISTS idx_programs_department ON programs(department_code);
CREATE INDEX IF NOT EXISTS idx_programs_fiscal_year ON programs(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_programs_search ON programs USING GIN(to_tsvector('english', 
  name || ' ' || COALESCE(description, '')
));

CREATE INDEX IF NOT EXISTS idx_budgets_department ON budgets(department_code);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_type ON budgets(budget_type);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_line_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_program ON budget_line_items(program_code);
CREATE INDEX IF NOT EXISTS idx_budget_items_fund ON budget_line_items(fund_code);

CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_ein ON vendors(ein);
CREATE INDEX IF NOT EXISTS idx_vendors_fiscal_year ON vendors(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_vendors_amount ON vendors(total_amount);
CREATE INDEX IF NOT EXISTS idx_vendors_search ON vendors USING GIN(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_vendor_trans_vendor ON vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fiscal_year ON vendor_transactions(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_department ON vendor_transactions(department_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_program ON vendor_transactions(program_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_fund ON vendor_transactions(fund_code);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_date ON vendor_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_category ON vendor_transactions(category);

CREATE INDEX IF NOT EXISTS idx_search_term ON search_index(term);
CREATE INDEX IF NOT EXISTS idx_search_type ON search_index(type);
CREATE INDEX IF NOT EXISTS idx_search_source ON search_index(source_id);
CREATE INDEX IF NOT EXISTS idx_search_fiscal_year ON search_index(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_search_text ON search_index USING GIN(to_tsvector('english', term));

-- Create function to ensure search index structure
CREATE OR REPLACE FUNCTION ensure_search_index_fts()
RETURNS void AS $$
BEGIN
  -- Add fts column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'search_index' 
    AND column_name = 'fts'
  ) THEN
    ALTER TABLE search_index
    ADD COLUMN fts tsvector 
    GENERATED ALWAYS AS (
      to_tsvector('english', 
        term || ' ' || 
        COALESCE(additional_data->>'display', '') || ' ' ||
        COALESCE(additional_data->>'context', '')
      )
    ) STORED;
    
    CREATE INDEX idx_search_fts ON search_index USING GIN(fts);
  END IF;
END;
$$ LANGUAGE plpgsql; 
```

#### intial table script
```sql
CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term TEXT NOT NULL,
  type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  additional_data JSONB,
  fiscal_year INTEGER,
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      term || ' ' || 
      COALESCE(additional_data->>'display', '') || ' ' ||
      COALESCE(additional_data->>'context', '')
    )
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term, type, source_id)
);

-- Indexes
CREATE INDEX idx_search_term ON search_index(term);
CREATE INDEX idx_search_type ON search_index(type);
CREATE INDEX idx_search_source ON search_index(source_id);
CREATE INDEX idx_search_fiscal_year ON search_index(fiscal_year);
CREATE INDEX idx_search_additional_data ON search_index USING GIN(additional_data);
CREATE INDEX idx_search_fts ON search_index USING GIN(fts);

-- Full-text search index
CREATE INDEX idx_search_text ON search_index USING GIN(to_tsvector('english', term));

-- Function to ensure search index structure
CREATE OR REPLACE FUNCTION ensure_search_index_fts()
RETURNS void AS $$
BEGIN
  -- Add fts column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'search_index' 
    AND column_name = 'fts'
  ) THEN
    ALTER TABLE search_index
    ADD COLUMN fts tsvector 
    GENERATED ALWAYS AS (
      to_tsvector('english', 
        term || ' ' || 
        COALESCE(additional_data->>'display', '') || ' ' ||
        COALESCE(additional_data->>'context', '')
      )
    ) STORED;
    
    CREATE INDEX idx_search_fts ON search_index USING GIN(fts);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## **Codebase Modifications**

### **Search API Migration**:
```typescript
// src/app/api/search/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';
import { trackSearch } from '@/lib/analytics/search';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: NextRequest) {
  try {
  const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const types = searchParams.get('types')?.split(',') || ['departments', 'vendors', 'programs', 'funds'];
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const excludeCommon = searchParams.get('exclude_common') === 'true';
  
  // Try to get from cache first
    const cacheKey = `search:${query}:${types.join(',')}:${limit}:${excludeCommon}`;
    const cachedResults = await getFromCache(cacheKey);
  if (cachedResults) {
    return NextResponse.json(cachedResults);
  }
  
  const supabase = getServiceSupabase();
  
    // Build the search query using PostgreSQL full-text search
    let searchQuery = supabase
    .from('search_index')
      .select('*')
      .textSearch('fts', query, {
        type: 'websearch',
        config: 'english'
      });

    // Apply type filters if specified
    if (types.length > 0) {
      searchQuery = searchQuery.in('type', types);
    }

    // Get results with pagination
    const { data, error, count } = await searchQuery
    .order('term')
      .limit(limit);
    
  if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Format results by type
  const results = {
      departments: data.filter(item => item.type === 'department'),
      vendors: data.filter(item => item.type === 'vendor'),
      programs: data.filter(item => item.type === 'program'),
      funds: data.filter(item => item.type === 'fund'),
      keywords: data.filter(item => item.type === 'keyword'),
      totalResults: count || 0,
      query,
      appliedFilters: {
        types,
        excludeCommon,
        limit
      }
  };
  
  // Cache results for 1 hour
    await setInCache(cacheKey, results, { ex: 3600 });
    
    // Track search analytics
    await trackSearch(query, { types, excludeCommon, limit }, count || 0);
  
  return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
```

### **Update search with tips**

```typescript
// src/app/search/page.tsx
// Add SearchTips component
function SearchTips() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4 bg-gray-50 rounded-lg p-3 text-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-gray-700 hover:text-gray-900"
      >
        <span className="font-medium">Search Tips</span>
        <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-2 text-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <h4 className="font-medium mb-1">Basic Search</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Simple word: <code className="bg-gray-100 px-1 rounded">california</code></li>
                <li>Phrase: <code className="bg-gray-100 px-1 rounded">"public safety"</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Advanced Operators</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>AND: <code className="bg-gray-100 px-1 rounded">health & safety</code></li>
                <li>OR: <code className="bg-gray-100 px-1 rounded">police | fire</code></li>
                <li>NOT: <code className="bg-gray-100 px-1 rounded">!private</code></li>
                <li>Prefix: <code className="bg-gray-100 px-1 rounded">calif*</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### **Vendors API Migration**:
```typescript
// src/app/api/vendors/top/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';

export async function GET(request: Request) {
  try {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const limit = parseInt(searchParams.get('limit') || '10');
  
  // Try to get from cache first
    const cacheKey = `vendors:top:${year}:${limit}`;
    const cachedResults = await getFromCache(cacheKey);
  if (cachedResults) {
    return NextResponse.json(cachedResults);
  }
  
  const supabase = getServiceSupabase();
  
  // Get top vendors by total amount
  const { data, error } = await supabase
    .from('vendors')
      .select(`
        *,
        vendor_transactions (
          amount,
          transaction_date,
          department_code,
          program_code,
          fund_code
        )
      `)
    .eq('fiscal_year', year)
    .order('total_amount', { ascending: false })
    .limit(limit);
    
  if (error) {
      console.error('Error fetching top vendors:', error);
      return NextResponse.json({ error: 'Failed to fetch top vendors' }, { status: 500 });
    }

    const results = {
      vendors: data,
      year,
      limit
    };
  
  // Cache results for 24 hours
    await setInCache(cacheKey, results, { ex: 86400 });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in top vendors API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### **Departments API Migration**:
```typescript
// src/app/api/departments/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';
import { getDepartmentSlugs } from '@/lib/blog';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    
    // Verify this is a valid department slug
    const validSlugs = await getDepartmentSlugs();
    if (!validSlugs.includes(slug)) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    
    // Extract organizational code from slug (format: {orgCode}_{name})
    const [orgCode] = slug.split('_');
    
    // Try to get from cache first
    const cacheKey = `department:${slug}`;
    const cachedDepartment = await getFromCache(cacheKey);
    if (cachedDepartment) {
      return NextResponse.json(cachedDepartment);
    }
    
    const supabase = getServiceSupabase();
    
    // Get department by organizational code
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('organizational_code', orgCode)
      .single();
      
    if (deptError || !department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    
    // Get workforce data
    const { data: workforce } = await supabase
      .from('department_workforce')
      .select('*')
      .eq('department_code', department.organizational_code)
      .order('fiscal_year', { ascending: false });
      
    // Get distributions
    const { data: distributions } = await supabase
      .from('department_distributions')
      .select('*')
      .eq('department_code', department.organizational_code);
      
    // Format the results
    const result = {
      ...department,
      workforce: {
        yearly: workforce?.reduce((acc, item) => {
          acc[item.fiscal_year] = {
            headCount: item.head_count,
            wages: item.total_wages
          };
          return acc;
        }, {} as Record<number, any>)
      },
      distributions: distributions?.reduce((acc, item) => {
        if (!acc[item.distribution_type]) {
          acc[item.distribution_type] = {};
        }
        acc[item.distribution_type][item.fiscal_year] = item.distribution_data;
        return acc;
      }, {} as Record<string, Record<number, any>>)
    };
    
    // Cache the result for 24 hours
    await setInCache(cacheKey, result, { ex: 86400 });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in department API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### **Programs API Migration**:
```typescript
// src/app/api/programs/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department');
    const fiscalYear = searchParams.get('year');

    // Try to get from cache first
    const cacheKey = `programs:${departmentCode}:${fiscalYear}`;
    const cachedPrograms = await getFromCache(cacheKey);
    if (cachedPrograms) {
      return NextResponse.json(cachedPrograms);
    }

    const supabase = getServiceSupabase();

    // Build the query
    let query = supabase
      .from('programs')
      .select('*');

    // Apply filters if provided
    if (departmentCode) {
      query = query.eq('department_code', departmentCode);
    }
    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching programs:', error);
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
    }

    // Cache results for 1 hour
    await setInCache(cacheKey, data, { ex: 3600 });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in programs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### **Funds API Migration**:
```typescript
// src/app/api/funds/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundGroup = searchParams.get('group');
  
  // Try to get from cache first
    const cacheKey = `funds:${fundGroup || 'all'}`;
    const cachedFunds = await getFromCache(cacheKey);
    if (cachedFunds) {
      return NextResponse.json(cachedFunds);
    }
  
  const supabase = getServiceSupabase();
  
    // Build the query
    let query = supabase
      .from('funds')
      .select('*');

    // Apply group filter if provided
    if (fundGroup) {
      query = query.eq('fund_group', fundGroup);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching funds:', error);
      return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 });
    }

    // Cache results for 24 hours
    await setInCache(cacheKey, data, { ex: 86400 });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in funds API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### **Budgets API Migration**:
```typescript
// src/app/api/budgets/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department');
    const fiscalYear = searchParams.get('year');
    const budgetType = searchParams.get('type') || 'enacted';
  
  // Try to get from cache first
    const cacheKey = `budgets:${departmentCode}:${fiscalYear}:${budgetType}`;
    const cachedBudgets = await getFromCache(cacheKey);
    if (cachedBudgets) {
      return NextResponse.json(cachedBudgets);
    }
  
  const supabase = getServiceSupabase();
  
    // Get budget data
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_line_items (
          program_code,
          fund_code,
          amount,
          description
        )
      `)
      .eq('department_code', departmentCode)
      .eq('fiscal_year', fiscalYear)
      .eq('budget_type', budgetType);

    if (budgetError) {
      console.error('Error fetching budgets:', budgetError);
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
    }

    // Cache results for 24 hours
    await setInCache(cacheKey, budgets, { ex: 86400 });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error('Error in budgets API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### **Data Access Layer**:
```typescript
// src/lib/api/dataAccess.ts
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';
import type { Database } from '@/types/supabase';

// Base class for all data access
class QueryBuilder<T> {
  protected table: string;
  protected defaultTTL: number = 3600; // 1 hour default cache

  constructor(table: string) {
    this.table = table;
  }

  protected async getFromCache<T>(key: string): Promise<T | null> {
    return getFromCache<T>(key);
  }

  protected async setInCache<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    await setInCache(key, data, { ex: ttl });
  }

  protected getCacheKey(...parts: (string | number)[]): string {
    return `${this.table}:${parts.join(':')}`;
  }
}

// Department data access
class DepartmentAccess extends QueryBuilder<Database['public']['Tables']['departments']['Row']> {
  constructor() {
    super('departments');
  }

  async getDepartments(fiscalYear?: number) {
    const cacheKey = this.getCacheKey('all', fiscalYear || 'all');
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let query = supabase.from('departments').select('*');
    
    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    const { data, error } = await query;
    if (error) throw error;

    await this.setInCache(cacheKey, data);
    return data;
  }

  async getDepartmentBySlug(slug: string) {
    const cacheKey = this.getCacheKey('slug', slug);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Vendor data access
class VendorAccess extends QueryBuilder<Database['public']['Tables']['vendors']['Row']> {
  constructor() {
    super('vendors');
  }

  async getVendors(filters: {
    fiscalYear?: number;
    sortBy?: 'total_amount' | 'transaction_count';
    limit?: number;
  } = {}) {
    const { fiscalYear, sortBy = 'total_amount', limit = 10 } = filters;
    const cacheKey = this.getCacheKey('list', fiscalYear || 'all', sortBy, limit);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let query = supabase.from('vendors').select('*');

    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    query = query.order(sortBy, { ascending: false }).limit(limit);
    const { data, error } = await query;

    if (error) throw error;
    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Search data access
class SearchAccess extends QueryBuilder<Database['public']['Tables']['search_index']['Row']> {
  constructor() {
    super('search');
  }

  async search(query: string, options: {
    types?: string[];
    limit?: number;
  } = {}) {
    const { types, limit = 10 } = options;
    const cacheKey = this.getCacheKey('query', query, types?.join(',') || 'all', limit);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let searchQuery = supabase
      .from('search_index')
      .select('*')
      .textSearch('fts', query, {
        type: 'websearch',
        config: 'english'
      });

    if (types?.length) {
      searchQuery = searchQuery.in('type', types);
    }

    const { data, error } = await searchQuery.limit(limit);
    if (error) throw error;

    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Spend data access
class SpendAccess extends QueryBuilder<Database['public']['Tables']['vendor_transactions']['Row']> {
  constructor() {
    super('spend');
  }

  async getSpendData(filters: {
    fiscalYear?: number;
    departmentCode?: string;
    vendorId?: string;
    programCode?: string;
    fundCode?: string;
  } = {}) {
    const cacheKey = this.getCacheKey('spend', JSON.stringify(filters));
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let query = supabase.from('vendor_transactions').select('*');

    if (filters.fiscalYear) {
      query = query.eq('fiscal_year', filters.fiscalYear);
    }
    if (filters.departmentCode) {
      query = query.eq('department_code', filters.departmentCode);
    }
    if (filters.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters.programCode) {
      query = query.eq('program_code', filters.programCode);
    }
    if (filters.fundCode) {
      query = query.eq('fund_code', filters.fundCode);
    }

    const { data, error } = await query;
    if (error) throw error;

    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Export singleton instances
export const departments = new DepartmentAccess();
export const vendors = new VendorAccess();
export const search = new SearchAccess();
export const spend = new SpendAccess();
```

### **Supabase Client Setup**:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// For server-side operations with elevated privileges
export const getServiceSupabase = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};
```

### **Required Package Updates**:
```json
// package.json additions
{
  "dependencies": {
    "@supabase/supabase-js": "^2.20.0",
    "@upstash/redis": "^1.28.4"
  }
}
```

## **Vercel Configuration**

### **Environment Variables**:
- created by creating the upstash kv through vercel storage
- var saved to .env.local for testing and vercel env var automatically

### **Vercel Project Settings**:
```json
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/update-data",
      "schedule": "0 0 1,15 * *"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=60, stale-while-revalidate=600"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "functions": {
    "api/vendors/top/route.ts": {
      "memory": 1024,
      "maxDuration": 10
    },
    "api/search/route.ts": {
      "memory": 1024,
      "maxDuration": 10
    },
    "api/spend/route.ts": {
      "memory": 2048,
      "maxDuration": 15
    }
  },
  "regions": ["sfo1"],
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

### **Upstash KV Cache Configuration**:
```typescript
// src/lib/cache.ts
import { Redis } from '@upstash/redis';
import type { SetCommandOptions } from '@upstash/redis';

// Redis.fromEnv() will automatically read UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv();

export type CacheOptions = {
  ex?: number; // Expiration in seconds
  nx?: boolean; // Only set if the key doesn't exist
  tags?: string[]; // Tags for cache invalidation
};

/**
 * Get a value from the cache
 * @param key The cache key
 * @returns The cached value or null if not found
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set a value in the cache
 * @param key The cache key
 * @param value The value to cache
 * @param options Cache options including expiration and tags
 */
export async function setInCache<T>(
  key: string, 
  value: T, 
  options: CacheOptions = {}
): Promise<void> {
  try {
    const { tags, ...redisOptions } = options;
    // Type assertion needed due to Upstash Redis type definitions being more restrictive than necessary.
    // The options we're passing are valid at runtime, but TypeScript's type system is too strict.
    const setOptions = {
      ex: redisOptions.ex,
      nx: redisOptions.nx ? true : undefined
    } as unknown as SetCommandOptions;
    
    await redis.set(key, value, setOptions);
    
    // If tags are provided, store key references for later invalidation
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await redis.sadd(`tag:${tag}`, key);
      }
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Invalidate all cache entries with a specific tag
 * @param tag The tag to invalidate
 */
export async function invalidateByTag(tag: string): Promise<void> {
  try {
    // Get all keys with this tag
    const keys = await redis.smembers<string[]>(`tag:${tag}`);
    
    // Delete all keys
    if (keys && keys.length > 0) {
      await redis.del(...keys, `tag:${tag}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}
```

### **CDN Configuration**:
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Set cache headers for static assets
  if (request.nextUrl.pathname.startsWith('/static/')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  }
  
  // Set cache headers for API responses
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Dynamic but cacheable API routes
    if (
      request.nextUrl.pathname.includes('/search') ||
      request.nextUrl.pathname.includes('/vendors/top') ||
      request.nextUrl.pathname.includes('/departments')
    ) {
      response.headers.set(
        'Cache-Control',
        'public, max-age=60, stale-while-revalidate=600'
      );
    } else {
      // Default API caching strategy
      response.headers.set(
        'Cache-Control',
        'public, max-age=10, stale-while-revalidate=60'
      );
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/static/:path*',
    '/api/:path*'
  ],
};
```

## **Implementation Steps**

### **Step 1: Setup and Planning** 

1. Create Supabase project and set up proper access controls ✅ COMPLETED
2. Manually create database tables with appropriate indexes ✅ COMPLETED
3. Develop and test migration scripts for smaller datasets ✅ COMPLETED
4. Configure Vercel with required environment variables ✅ COMPLETED
5. Update package.json with new dependencies ✅ COMPLETED

### **Step 2: Initial Migration** 

1. Migrate departments, programs, funds, vendor data ✅ COMPLETED
2. Implement data access functions ✅ COMPLETED
3. Implement API routes for departments, spend, vendors, search ✅ COMPLETED
4. Test validation scripts to verify data integrity ✅ COMPLETED
5. Implement caching strategy ✅ COMPLETED
6. Implement jest tests ✅ COMPLETED

### **Step 3: Frontend Updates**

- Update all components to use new API routes
- Create reusable hooks for data fetching
- Implement pagination for large datasets
- Test performance and optimize where needed
- Add proper loading states and error handling
- Test cross-browser compatibility
- Add search query operator documentation and examples
- Implement search result highlighting
- Add search filters and type selection
- Implement search analytics tracking

### **Step 4: Testing & Optimization**

- Conduct comprehensive testing of all API routes
- Optimize SQL queries for performance
- Test caching strategy under load
- Security audit of Supabase configuration
- Develop and test rollback procedures
- Optimize frontend performance
- Migrate vendor data (2016 - 2022)

### **Step 5: Final Migration & Launch**

- Complete final data migration
- Switch API routes to use Supabase in production
- Monitor closely for errors or performance issues
- Document the new data structure and access patterns
- Train team on new system
- Develop plan for ongoing maintenance

### **Step 6: Protect IP**

- move processing scripts, json and text data as result of processing to backend private repository
- remove these files from git history
- cali-doge will become frontend application
- backend will support the commercial data analytics business
