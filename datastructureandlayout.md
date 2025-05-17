# Data Processing Pipeline

## Current Data Pipeline

1. **Data Collection**:
   - src/scripts/download_publicpay_csv.js Workforce CSV from publicpay.ca.gov
   - src/scripts/download_budgets.sh Budget PDF from ebudget.ca.gov
   - src/scripts/download_vendor_transactions.js vendor CSV from fiscal.ca.gov

2. **Data Processing**:
   - src/scripts/extract_pdf_text.py extract text from budget PDF files
   - src/scripts/process_vendors.ts process vendor CSV for vendor json records
   - src/scripts/process_department_spending.js process budget text for fund, program, and department json records
   - src/scripts/process_department_salary.js process salary CSV for department json record salary and headcount fields
   - markdown files are created by AI prompt using the budget text files using 2015 - 2025 fiscal years

3. **Data Sources**:
   - ebudget for department, fund, and program json
   - fiscal for vendor json

# Reordered Implementation Plan

## 1. Data Model Definition and Type Files

### Programs JSON and Type File
```typescript
// src/types/program.ts
export interface ProgramDescription {
  description: string;
  source: string;
}

export interface Program {
  projectCode: string;
  name: string;
  programDescriptions: ProgramDescription[];
}

export interface ProgramsJSON {
  programs: Program[];
}
```

### Funds JSON and Type File
```typescript
// src/types/fund.ts
export interface Fund {
  fundCode: number;
  fundName: string;
  fundGroup: string;
  fundDescription: string;
}

export interface FundsJSON {
  funds: Fund[];
}
```

### Budgets JSON and Type File
```typescript
// src/types/budget.ts
export type FundingType = 0 | 1; // 0 = "State Operations:" or 1 = "Local Assistance:"

export interface FundAllocation {
  code: number;
  count: number;
  amount: number;
}

export interface FundingTypeData {
  type: FundingType;
  fundCode: FundAllocation[];
}

export interface OrganizationCodeData {
  code: number;
  fundingType: FundingTypeData[];
}

export interface ProjectCodeData {
  code: string;
  organizationCode: OrganizationCodeData[];
}

export interface FiscalYearData {
  year: number;
  projectCode: ProjectCodeData[];
}

export interface OrganizationalBudget {
  code: number;
  fiscalYear: FiscalYearData[];
}

export interface BudgetsJSON {
  budget: OrganizationalBudget[];
}
```

### Search JSON and Type File
```typescript
// src/types/search.ts
export interface SearchItem {
  term: string;
  type: 'department' | 'vendor' | 'program' | 'fund';
  id: string;
}

export interface KeywordSource {
  type: 'department' | 'program';
  id: string;
  context: string; // Short phrase containing the keyword for context
}

export interface KeywordItem {
  term: string;
  type: 'keyword';
  sources: KeywordSource[];
}

export interface SearchJSON {
  departments: SearchItem[];
  vendors: SearchItem[];
  programs: SearchItem[];
  funds?: SearchItem[];
  keywords: KeywordItem[];
}
```

### Vendors JSON Structure Update
- Update vendors.json structure:
```
vendors[
ein: string; //  
vendorName: array
    name: string; // "Sam's IT"
    fiscalYear: array
        year:number; // [2016, 2027]
        projectCode: array
            code:string; // "0280980"
            organizationCode: array
                code: number; [9870] 
                fundCode: Array<{ //fund
                    code: number; [5678]
                    count: number; [39]
                    amount: number; [234394.49]
```

## 2. Data Processing Scripts Update

### Update Process Department Spending Script
- Update process_department_spending.js code, logging, and header comments:
  - Each budget txt file has multiple department sections followed by program descriptions and subsections
  - Log all output, input, writes, reads, errors and actions
  - Section: for each with 4 digit org code and department name on a line followed by department description as paragraphs, and then followed by "3-YR EXPENDITURES AND POSITIONS"
  - Match 4 digit org code and department name to a single record in departments.json using src/lib/departmentMatching.js
  - If match then update the department json record organizational code, and or add the department name to aliases
  - Subsection one: match "PROGRAM DESCRIPTIONS" programs and subprograms
  - Subsection two: match "DETAILED EXPENDITURES BY PROGRAM" for budget data

### Vendor Processing Scripts Update
- Create two json files: vendor_transactions.json and vendors.json
- vendor_transactions.json will use the vendor transactions type interface in vendors.ts
- vendors.json follows the updated structure
- EIN will be added through resolution process

### EIN Resolution and Management

#### Integration with Vendor Processing
```typescript
// In src/scripts/process_vendors.ts
import axios from 'axios';
import prompt from 'prompt-sync';

// Add string similarity function for name matching
function calculateStringSimilarity(str1: string, str2: string): number {
  // Implementation details...
}

// Add EIN lookup functions
async function lookupNonprofitEIN(vendorName: string): Promise<{ein: string | null, matches: any[]}> {
  // Implementation details...
}

async function lookupBusinessEIN(vendorName: string, state?: string): Promise<{ein: string | null, matches: any[]}> {
  // Implementation details...
}

// Process each vendor
for (const vendorName in vendorData.vendors) {
  // EIN resolution logic...
}

// After processing all vendors, write updated data
log({ message: 'Writing updated vendor data with EINs...', isSubStep: true });
writeVendorData({ transactions: Object.values(vendorData.vendors) }, VENDOR_TRANSACTION_PATH);
```

#### Batch Processing for EIN Resolution
```typescript
async function batchResolveEINs() {
  const vendors = await loadVendorsWithoutEINs();
  const results = {
    resolved: 0,
    failed: 0,
    total: vendors.length
  };
  
  // Process in small batches with delays to respect API limits
  // Implementation details...
  
  return results;
}
```

#### Data Governance for EIN Management
- Implement a data governance process for EIN data:
  1. Record provenance of all EINs (source, date acquired, confidence level)
  2. Regular validation process against authoritative sources
  3. Audit trail for all EIN changes

### Validation and Error Handling

#### Input Validation
```typescript
function validateInputSchema(data: unknown, schema: JSONSchema): ValidationResult {
  const validator = new Validator();
  const result = validator.validate(data, schema);
  return {
    isValid: result.valid,
    errors: result.errors.map(err => ({
      path: err.property,
      message: err.message,
      value: err.instance
    }))
  };
}
```

#### Processing Validation
- Each processing script will implement:
  1. Pre-processing validation (input format, required fields)
  2. Processing-time validation (business rules, data transformations)
  3. Post-processing validation (output schema, data consistency)

#### Error Handling Strategy
- Three-tier error handling approach for recoverable errors, partial failures, and critical failures

#### Data Consistency Checks
```typescript
function validateConsistency() {
  // Check departments in vendors.json exist in departments.json
  // Implementation details...
}
```

#### Type Validation
```typescript
import { z } from "zod";

const ProgramSchema = z.object({
  // Schema details...
});

function validateProgram(data: unknown): Program {
  return ProgramSchema.parse(data);
}
```

## 3. API Implementation

### Core Data APIs

#### Program API
- `GET /api/programs` - List all programs with pagination
- `GET /api/programs/:projectCode` - Get program details by project code

#### Budget API
- `GET /api/budgets` - List budget data with filtering options
- `GET /api/budgets/:organizationalCode` - Get budget by organizational code
- `GET /api/budgets/:organizationalCode/:fiscalYear` - Get budget for specific fiscal year

#### Fund API
- `GET /api/funds` - List all funds with filtering
- `GET /api/funds/:fundCode` - Get fund details by code

#### Vendor API
- `GET /api/vendors` - List all vendors with pagination and filtering
- `GET /api/vendors/:id` - Get vendor details by ID
- `GET /api/vendors/:id/transactions` - Get vendor transactions with pagination

### Integration APIs

#### Search API
- `GET /api/search` - Enhanced search across all data types

#### Aggregation APIs
- `GET /api/departments/:organizationalCode/summary` - Get department summary
- `GET /api/analytics/spending` - Get spending analytics with multi-dimensional filtering

### API Implementation Support

#### Data Access Layer
```typescript
// src/lib/api/dataAccess.ts
import fs from 'fs';
import path from 'path';

// Generic function to read JSON data files
export async function readJsonFile<T>(filename: string): Promise<T> {
  // Implementation details...
}

// Cached data access for better performance
export async function getCachedJsonData<T>(filename: string): Promise<T> {
  // Implementation details...
}
```

#### Integration with Existing APIs
- Preserve existing department API endpoints for backward compatibility
- Enhance existing department data service to incorporate new data
- Extend the current search implementation

## 4. Frontend UI Updates

### Updated Spend Page
- Pulldown option to display budget, vendor, or compare
- Filter pulldown by field options
- For each department field show link to markdown page
- For each program on hover show program descriptions and their sources
- For each vendor on hover show link options to propublica and data republican using the EIN

### Enhanced Search Functionality
- Use search API which sources from search.json
- Display options with vendor, program, and department as user types
- Implement keyword extraction process for improved search results

### Department Specific Markdown Pages
- Spend section: from json sources, fiscal year, vendor name, program name, fund name, total amount spend
- Workforce section: points to workforce page display for department
- Custom text on the department
- Sources

### Program and Fund Detail Pages
- Create new pages to display program and fund details
- Include relationship data to departments and vendors

## 5. Testing Strategy

### Unit Tests for Data Processing Scripts
- Test data extraction and transformation logic
- Test EIN resolution functions
- Test validation and error handling

### Integration Tests for API Endpoints
- Test all API endpoints with various parameters
- Test data consistency across endpoints
- Test backward compatibility with existing endpoints

### End-to-End Tests for Critical User Flows
- Test search functionality
- Test department page navigation
- Test spend page filtering and display

## Additional Requirements

### Data Validation Framework
- Add schema validation for all input and output JSON files
- Implement cross-references between related data files
- Add data quality metrics and reporting

### Incremental Update Strategy
- Implement differential updates for efficiency
- Manage data versioning between updates
- Support rollback capability

### Documentation
- Document data models and their relationships
- Create API documentation
- Add developer guides for extending the system

### Performance Optimization
- Add caching strategy for API responses
- Optimize JSON file structures for query patterns
- Implement pagination and filtering for large datasets

### Security Considerations
- Secure handling of EIN data
- API rate limiting and authentication if needed
- Data access controls
