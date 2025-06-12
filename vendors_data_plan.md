# text

1. **Data Analysis & Migration Strategy**
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

2. **Migration Reasoning**
- Move to Supabase:
  * Historical vendor data (2016-2023): Keep in Supabase for querying
  * Current year vendor data (2024): Keep in Supabase for active queries
  * Search index: Move to Supabase for real-time search
  * Departments/Programs: Keep in Supabase for relationship queries
- Keep in JSON:
  * Budget data: Small enough to keep in Vercel
  * Any static reference data

3. **Monthly Update Process**

A. **Automated Update Pipeline**:
```typescript
// src/scripts/update_supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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
        slug: dept.slug,
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
            total_wages: dept.wages?.yearly?.[CURRENT_YEAR] || null,
            average_tenure: dept.averageTenureYears,
            average_salary: dept.averageSalary,
            average_age: dept.averageAge
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
  const filePath = path.join(DATA_DIR, 'search.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('search.json does not exist');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // Delete existing search index for the current year's entities
  console.log('Deleting existing search index entries for current year...');
  
  // We need to be careful here and only delete entries related to the current year
  // This requires knowing which entries correspond to the current year
  // For simplicity, we can add a fiscal_year field to the search_index table
  // and filter based on that
  
  // Insert/update search index
  await processBatches(
    data.keywords,
    100,
    async (batch) => {
      const searchItems = batch.map((item: any) => ({
        term: item.term,
        type: item.type,
        source_id: item.id,
        additional_data: {
          display: item.display,
          score: item.score
        }
      }));
      
      const { error } = await supabase
        .from('search_index')
        .upsert(searchItems, {
          onConflict: 'term, type, source_id'
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

B. **CI/CD Integration**:
```yaml
# .github/workflows/update-supabase.yml
name: Update Supabase Data

on:
  schedule:
    # Run on the 1st and 15th of each month
    - cron: '0 0 1,15 * *'
  workflow_dispatch:
    # Allow manual triggers

jobs:
  update-data:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
        
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate JSON data files
        run: npm run generate-data
        
      - name: Update Supabase
        run: npm run update-supabase
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          
      - name: Notify on success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Supabase data update completed successfully!"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "⚠️ Supabase data update failed! Please check the logs."
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

C. **Monitoring and Validation**:
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

async function validateVendors() {
  console.log('Validating vendors data...');
  
  // Count vendors in JSON file
  const filePath = path.join(DATA_DIR, `vendors_${CURRENT_YEAR}.json`);
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const jsonCount = jsonData.t.length;
  
  // Count vendors in Supabase
  const { count: dbCount, error } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('fiscal_year', CURRENT_YEAR);
    
  if (error) {
    console.error('Error counting vendors in Supabase:', error);
    return false;
  }
  
  console.log(`JSON vendors count: ${jsonCount}, Supabase vendors count: ${dbCount}`);
  
  // Allow for some discrepancy due to de-duplication
  const threshold = 0.95; // 95% match
  return dbCount >= jsonCount * threshold;
}

async function validateSearchIndex() {
  console.log('Validating search index...');
  
  // Count search entries in JSON file
  const filePath = path.join(DATA_DIR, 'search.json');
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const jsonCount = jsonData.keywords.length;
  
  // Count search entries in Supabase
  const { count: dbCount, error } = await supabase
    .from('search_index')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error counting search entries in Supabase:', error);
    return false;
  }
  
  console.log(`JSON search entries count: ${jsonCount}, Supabase search entries count: ${dbCount}`);
  
  // Allow for some discrepancy
  const threshold = 0.95; // 95% match
  return dbCount >= jsonCount * threshold;
}

async function runValidation() {
  console.log('Starting validation...');
  
  const vendorsValid = await validateVendors();
  const searchValid = await validateSearchIndex();
  
  if (vendorsValid && searchValid) {
    console.log('Validation passed!');
    return true;
  } else {
    console.error('Validation failed!');
    return false;
  }
}

runValidation()
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

4. **Codebase Modifications**

A. **Supabase Client Setup**:
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

B. **API Routes Updates (Examples)**:

1. **Search API**:
```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  // Cache key based on query parameters
  const cacheKey = `search:${query}:${limit}:${offset}`;
  
  // Try to get from cache first
  const cachedResults = await kv.get(cacheKey);
  if (cachedResults) {
    return NextResponse.json(cachedResults);
  }
  
  const supabase = getServiceSupabase();
  
  // Perform search with proper pagination
  const { data, error, count } = await supabase
    .from('search_index')
    .select('*', { count: 'exact' })
    .ilike('term', `%${query}%`)
    .order('term')
    .range(offset, offset + limit - 1);
    
  if (error) {
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
  
  const results = {
    items: data,
    total: count,
    limit,
    offset,
    query
  };
  
  // Cache results for 1 hour
  await kv.set(cacheKey, results, { ex: 3600 });
  
  return NextResponse.json(results);
}
```

2. **Vendors API**:
```typescript
// src/app/api/vendors/top/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const limit = parseInt(searchParams.get('limit') || '10');
  
  // Cache key
  const cacheKey = `vendors:top:${year}:${limit}`;
  
  // Try to get from cache first
  const cachedResults = await kv.get(cacheKey);
  if (cachedResults) {
    return NextResponse.json(cachedResults);
  }
  
  const supabase = getServiceSupabase();
  
  // Get top vendors by total amount
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('fiscal_year', year)
    .order('total_amount', { ascending: false })
    .limit(limit);
    
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch top vendors', details: error.message },
      { status: 500 }
    );
  }
  
  // Cache results for 24 hours
  await kv.set(cacheKey, { vendors: data, year, limit }, { ex: 86400 });
  
  return NextResponse.json({ vendors: data, year, limit });
}
```

3. **Department API**:
```typescript
// src/app/api/departments/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { kv } from '@vercel/kv';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  
  // Cache key
  const cacheKey = `department:${slug}`;
  
  // Try to get from cache first
  const cachedDepartment = await kv.get(cacheKey);
  if (cachedDepartment) {
    return NextResponse.json(cachedDepartment);
  }
  
  const supabase = getServiceSupabase();
  
  // Get department by slug
  const { data: department, error: deptError } = await supabase
    .from('departments')
    .select('*')
    .eq('slug', slug)
    .single();
    
  if (deptError || !department) {
    return NextResponse.json(
      { error: 'Department not found' },
      { status: 404 }
    );
  }
  
  // Get spending data
  const { data: spending, error: spendingError } = await supabase
    .from('department_spending')
    .select('*')
    .eq('department_code', department.organizational_code)
    .order('fiscal_year', { ascending: false });
    
  // Get workforce data
  const { data: workforce, error: workforceError } = await supabase
    .from('department_workforce')
    .select('*')
    .eq('department_code', department.organizational_code)
    .order('fiscal_year', { ascending: false });
    
  // Get distributions
  const { data: distributions, error: distributionsError } = await supabase
    .from('department_distributions')
    .select('*')
    .eq('department_code', department.organizational_code);
    
  // Format the results to match the existing structure
  const result = {
    ...department,
    spending: {
      yearly: spending?.reduce((acc, item) => {
        acc[item.fiscal_year] = item.total_amount;
        return acc;
      }, {} as Record<number, number>)
    },
    headCount: {
      yearly: workforce?.reduce((acc, item) => {
        acc[item.fiscal_year] = item.head_count;
        return acc;
      }, {} as Record<number, number>)
    },
    wages: {
      yearly: workforce?.reduce((acc, item) => {
        acc[item.fiscal_year] = item.total_wages;
        return acc;
      }, {} as Record<number, number>)
    }
    // Additional formatting for other properties...
  };
  
  // Cache the result for 24 hours
  await kv.set(cacheKey, result, { ex: 86400 });
  
  return NextResponse.json(result);
}
```

C. **Frontend Component Updates**:

1. **Search Component Update**:
```typescript
// src/components/SearchComponent.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    
    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.items);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(searchTimeout);
  }, [query]);
  
  const handleResultClick = (result) => {
    // Navigate based on result type
    switch (result.type) {
      case 'department':
        router.push(`/departments/${result.additional_data.display.slug}`);
        break;
      case 'vendor':
        router.push(`/vendors/${result.source_id}`);
        break;
      default:
        router.push(`/search/results?q=${encodeURIComponent(query)}`);
    }
  };
  
  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search departments, vendors, programs..."
        className="search-input"
      />
      
      {loading && <div className="search-loading">Loading...</div>}
      
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((result) => (
            <li 
              key={`${result.type}-${result.source_id}`}
              onClick={() => handleResultClick(result)}
              className="search-result-item"
            >
              <span className="result-type">{result.type}</span>
              <span className="result-name">{result.term}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

D. **Data Access Layer**:
```typescript
// src/lib/data/vendors.ts
import { getServiceSupabase } from '@/lib/supabase';
import { kv } from '@vercel/kv';

export async function getTopVendors(year: number, limit: number = 10) {
  const cacheKey = `vendors:top:${year}:${limit}`;
  
  // Try to get from cache first
  const cached = await kv.get(cacheKey);
  if (cached) return cached;
  
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('fiscal_year', year)
    .order('total_amount', { ascending: false })
    .limit(limit);
    
  if (error) throw new Error(`Failed to fetch top vendors: ${error.message}`);
  
  const result = { vendors: data, year, limit };
  
  // Cache for 24 hours
  await kv.set(cacheKey, result, { ex: 86400 });
  
  return result;
}

export async function getVendorById(id: string) {
  const cacheKey = `vendor:${id}`;
  
  // Try to get from cache first
  const cached = await kv.get(cacheKey);
  if (cached) return cached;
  
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw new Error(`Vendor not found: ${error.message}`);
  
  // Cache for 24 hours
  await kv.set(cacheKey, data, { ex: 86400 });
  
  return data;
}

// Similar functions for other vendor-related operations...
```

E. **Required Package Updates**:
```json
// package.json additions
{
  "dependencies": {
    "@supabase/supabase-js": "^2.20.0",
    "@vercel/kv": "^0.2.0"
  }
}
```

5. **Vercel Configuration**

A. **Environment Variables**:
```yaml
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
KV_URL=your-kv-url
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token
KV_REST_API_READ_ONLY_TOKEN=your-kv-read-only-token
```

B. **Vercel Project Settings**:
```json
// vercel.json
{
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
    }
  ],
  "regions": ["sfo1"],
  "functions": {
    "api/vendors/top/route.ts": {
      "memory": 1024
    },
    "api/search/route.ts": {
      "memory": 1024,
      "maxDuration": 10
    },
    "api/spend/route.ts": {
      "memory": 2048,
      "maxDuration": 15
    }
  }
}
```

C. **KV Cache Configuration**:
```typescript
// src/lib/cache.ts
import { kv } from '@vercel/kv';

export type CacheOptions = {
  ex?: number; // Expiration in seconds
  nx?: boolean; // Only set if the key doesn't exist
  tags?: string[]; // Tags for cache invalidation
};

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setInCache<T>(
  key: string, 
  value: T, 
  options: CacheOptions = {}
): Promise<void> {
  try {
    await kv.set(key, value, options);
    
    // If tags are provided, store key references for later invalidation
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await kv.sadd(`tag:${tag}`, key);
      }
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function invalidateByTag(tag: string): Promise<void> {
  try {
    // Get all keys with this tag
    const keys = await kv.smembers<string>(`tag:${tag}`);
    
    // Delete all keys
    if (keys.length > 0) {
      await kv.del(...keys, `tag:${tag}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}
```

D. **CRON API for Data Updates**:
```typescript
// src/app/api/cron/update-data/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { invalidateByTag } from '@/lib/cache';

const execAsync = promisify(exec);

// Vercel will call this endpoint based on the cron schedule in vercel.json
export async function GET(request: Request) {
  // Verify that this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    // Run data generation script (this would normally be part of the CI/CD process)
    // but for completeness, we include it here
    console.log('Running data generation...');
    await execAsync('npm run generate-data');
    
    // Update Supabase with new data
    console.log('Updating Supabase...');
    await execAsync('npm run update-supabase');
    
    // Invalidate relevant caches
    console.log('Invalidating cache...');
    await invalidateByTag('vendors');
    await invalidateByTag('departments');
    await invalidateByTag('search');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data update completed successfully' 
    });
  } catch (error) {
    console.error('Data update failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
```

6. **CDN Configuration**

A. **Edge Caching Strategy**:
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

7. **Additional Considerations**

A. **Monitoring Setup**:
```typescript
// src/lib/monitoring.ts
import { Datadog } from '@datadog/browser-rum';
import { createClient } from '@supabase/supabase-js';

// Initialize monitoring
export function initMonitoring() {
  if (process.env.NEXT_PUBLIC_DATADOG_APP_ID) {
    Datadog.init({
      applicationId: process.env.NEXT_PUBLIC_DATADOG_APP_ID,
      clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN!,
      site: 'datadoghq.com',
      service: 'cali-doge-frontend',
      env: process.env.NEXT_PUBLIC_VERCEL_ENV,
      version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      trackInteractions: true,
      defaultPrivacyLevel: 'mask-user-input'
    });
  }
}

// Log Supabase query performance
export async function logQueryPerformance<T>(
  tableName: string,
  operation: string,
  callback: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await callback();
    const duration = performance.now() - start;
    
    // Log to monitoring system
    console.log(`[DB] ${operation} on ${tableName} took ${duration.toFixed(2)}ms`);
    
    if (duration > 1000) {
      // Alert on slow queries
      console.warn(`[DB] Slow query: ${operation} on ${tableName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[DB] Error in ${operation} on ${tableName} after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}
```

B. **Error Handling Strategy**:
```typescript
// src/lib/error-handling.ts
import * as Sentry from '@sentry/nextjs';

export function initErrorHandling() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    });
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('Error:', error, context);
  
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export class ApiError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return { error: error.message, statusCode: error.statusCode };
  }
  
  captureError(error instanceof Error ? error : new Error(String(error)));
  
  return { 
    error: 'An unexpected error occurred', 
    statusCode: 500 
  };
}
```

8. **Implementation Phases**

A. **Phase 1: Setup and Planning** (Week 1)
1. Create Supabase project
2. Set up database structure
3. Develop initial migration scripts
4. Set up monitoring and error reporting
5. Configure Vercel environment

Tasks:
- Create Supabase project and set up proper access controls
- Create database tables with appropriate indexes
- Develop and test migration scripts for smaller datasets
- Set up Datadog/Sentry for monitoring
- Configure Vercel with required environment variables
- Update package.json with new dependencies

B. **Phase 2: Initial Migration** (Weeks 2-3)
1. Migrate static reference data
2. Migrate historical vendor data
3. Create and test data access layer
4. Develop API routes
5. Test and validate data integrity

Tasks:
- Migrate departments, programs, funds data
- Migrate vendor data (start with smaller datasets)
- Develop and test data access functions
- Implement API routes for departments, vendors, search
- Create validation scripts to verify data integrity
- Implement caching strategy
- Deploy to staging environment for testing

C. **Phase 3: Frontend Updates** (Weeks 3-4)
1. Update components to use new data sources
2. Implement UI for displaying transaction data
3. Update search functionality
4. Test performance and user experience
5. Implement error handling

Tasks:
- Update all components to use new API routes
- Create reusable hooks for data fetching
- Implement pagination for large datasets
- Test performance and optimize where needed
- Add proper loading states and error handling
- Test cross-browser compatibility

D. **Phase 4: Testing & Optimization** (Week 5)
1. Performance testing
2. Security auditing
3. Optimization of queries and caching
4. Load testing with production-like data
5. Rollback procedure testing

Tasks:
- Conduct comprehensive testing of all API routes
- Optimize SQL queries for performance
- Test caching strategy under load
- Security audit of Supabase configuration
- Develop and test rollback procedures
- Optimize frontend performance

E. **Phase 5: Final Migration & Launch** (Week 6)
1. Complete migration of all data
2. Switch production environment to new data sources
3. Monitor performance and errors
4. Implement any required fixes
5. Document the new system

Tasks:
- Complete final data migration
- Switch API routes to use Supabase in production
- Monitor closely for errors or performance issues
- Document the new data structure and access patterns
- Train team on new system
- Develop plan for ongoing maintenance

