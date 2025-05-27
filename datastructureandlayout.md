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

## 1. Data Model Definition and Type Files - IMPLEMENTED

All type files have been implemented with enhanced features beyond the original plan:

### Programs JSON and Type File - IMPLEMENTED ✅
**Location:** `src/types/program.ts`

**Implemented Features:**
```typescript
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
  sources?: Array<{ name: string; url: string; }>; // Enhanced with metadata
  lastUpdated?: string; // Enhanced with tracking
}
```

### Funds JSON and Type File - IMPLEMENTED ✅
**Location:** `src/types/fund.ts`

**Implemented Features:**
```typescript
export interface Fund {
  fundCode: string;  // Enhanced: string to preserve leading zeros
  fundName: string;
  fundGroup: string;
  fundDescription: string;
}

export type FundGroup = // Enhanced: typed fund groups
  | "Governmental Cost Funds" | "Special Revenue Funds"
  | "Transportation Funds" | "Bond Funds" | "Federal Funds" | "Other Funds";

export interface FundsJSON {
  funds: Fund[];
  sources?: Array<{ name: string; url: string; }>; // Enhanced with metadata
  lastUpdated?: string; // Enhanced with tracking
}
```

### Budgets JSON and Type File - IMPLEMENTED ✅
**Location:** `src/types/budget.ts`

**Implemented Features:**
```typescript
export type FundingType = 0 | 1; // 0 = "State Operations:" or 1 = "Local Assistance:"

export interface FundAllocation {
  code: string;  // Enhanced: string to preserve leading zeros
  count: number;
  amount: number;
}

export interface FundingTypeData {
  type: FundingType;
  fundCode: FundAllocation[];
}

export interface ProjectCodeData {
  code: string;  // Enhanced: string to preserve leading zeros
  fundingType: FundingTypeData[];
}

export interface FiscalYearData {
  year: number;
  projectCode: ProjectCodeData[];
}

export interface OrganizationalBudget {
  code: string;  // Enhanced: string to preserve leading zeros
  fiscalYear: FiscalYearData[];
}

export interface BudgetsJSON {
  budget: OrganizationalBudget[];
  processedFiles?: string[]; // Enhanced: processing tracking
  lastProcessedFile?: string | null;
  lastProcessedTimestamp?: string | null;
  sources?: Array<{ name: string; url: string; }>;
  lastUpdated?: string;
}
```

### Search JSON and Type File - IMPLEMENTED ✅
**Location:** `src/types/search.ts`

**Implemented Features:**
```typescript
export interface SearchItem {
  term: string;
  type: 'department' | 'vendor' | 'program' | 'fund';
  id: string;
}

export interface KeywordSource {
  type: 'department' | 'program';
  id: string;
  context: string;
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
  lastUpdated?: string; // Enhanced with tracking
}

// Enhanced: Additional search functionality
export interface SearchOptions {
  types?: ('department' | 'vendor' | 'program' | 'fund' | 'keyword')[];
  limit?: number;
  includeFunds?: boolean;
  includePrograms?: boolean;
  includeKeywords?: boolean;
}
```

### Vendors JSON Structure - IMPLEMENTED ✅
**Location:** `src/types/vendor.ts`

**Implemented Structure (Optimized):**
```typescript
export interface OptimizedVendor {
  n: string;    // name
  e?: string;   // ein (optional)
  fy: OptimizedFiscalYear[];
}

export interface OptimizedFiscalYear {
  y: number;    // year
  pc: OptimizedProjectCode[];
}

export interface OptimizedProjectCode {
  c: string;    // code
  oc: OptimizedOrgCode[];
}

export interface OptimizedOrgCode {
  c: number;    // code
  fc: OptimizedFundCode[];
}

export interface OptimizedFundCode {
  c: number;    // code
  ct: number;   // count
  a: number;    // amount
}

export interface OptimizedVendorsJSON {
  vendors: OptimizedVendor[];
}
```

**Additional Vendor Types Implemented:**
- `VendorTransaction` - Yearly transaction data with compressed field names
- `VendorTransactionsCSV` - CSV import structure
- `EINMetadata` - EIN resolution tracking
- Multiple API response structures for different views

## 2. Data Processing Scripts Update

### Process Budgets Script (process_budgets.ts) - IMPLEMENTED
The budget processing script is already implemented with comprehensive functionality:

**Current Implementation Features:**
- **Two-stage user approval process** for granular control over department and budget data updates
- **Section identification logic** using expenditure markers ("3-YEAR EXPENDITURES AND POSITIONS" or "3-YR EXPENDITURES AND POSITIONS")
- **Department matching** using src/lib/departmentMatching.js with confidence scoring
- **Program descriptions processing** with 4-digit to 7-digit project code conversion
- **Budget allocations extraction** with overwrite logic for existing data
- **ProcessedFiles tracking** to prevent duplicate processing
- **Comprehensive logging** with transaction IDs and detailed statistics
- **Incremental data saving** to prevent data loss

**Data Processing Flow:**
1. **Initial Setup**: Load departments.json, programs.json, budgets.json, and funds.json
2. **File Scanning**: Process budget text files with skip logic for already processed files
3. **Section Identification**: Find department sections using organizational codes and expenditure markers
4. **Department Processing**: Match departments with confidence scoring and user approval
5. **Program Descriptions**: Extract and update program data with source tracking
6. **Budget Allocations**: Extract detailed expenditures with overwrite logic for existing data
7. **Two-Stage Approval**: Separate approval for department changes vs program/budget/fund changes
8. **Data Persistence**: Incremental saving with comprehensive statistics tracking

**Output Files:**
- programs.json: Updated with project codes, names, and descriptions
- budgets.json: Updated with detailed budget allocations and processedFiles tracking
- departments.json: Updated with department data and descriptions
- funds.json: Updated with fund codes and names
- Comprehensive log files with transaction IDs

### Process Vendors Script (process_vendors.ts) - IMPLEMENTED
The vendor processing script is already implemented with advanced functionality:

**Current Implementation Features:**
- **Yearly transaction data structure** with compressed field names for efficiency
- **EIN resolution framework** (commented out but structured for future implementation)
- **Program and fund validation** with automatic updates to programs.json and funds.json
- **ProcessedFiles tracking** to prevent duplicate processing
- **Memory usage monitoring** and progress tracking for large datasets
- **Comprehensive validation** for fund codes and program codes
- **Multiple output formats** supporting both transaction and vendor-centric views

**Data Processing Flow:**
1. **Initialization**: Setup logging, create directories, load existing data
2. **CSV Processing**: Parse vendor transaction CSV files by fiscal year
3. **Data Extraction**: Extract vendor, department, program, and fund information
4. **Validation**: Validate fund codes and program codes against existing data
5. **Structure Generation**: Create yearly transaction files and enhanced vendor data
6. **EIN Resolution**: Framework ready for EIN lookup integration
7. **Data Persistence**: Write validated data with comprehensive statistics

**Output Files:**
- vendor_transaction_YYYY.json: Yearly transaction data with compressed structure
- vendors.json: Enhanced vendor data with EIN framework
- Updated programs.json and funds.json with new entries
- Comprehensive log files with processing statistics

### EIN Resolution Framework - READY FOR IMPLEMENTATION
Both scripts include frameworks for EIN resolution but are currently commented out pending API integration decisions.

### EIN Resolution and Management (not implemented)

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

### Currently Implemented APIs ✅

#### Department API - IMPLEMENTED
**Location:** `src/app/api/departments/route.ts`

**Current Endpoints:**
- `GET /api/departments` - List all departments with enhanced data
- `GET /api/departments?format=departments` - Return departments array only

**Features Implemented:**
- **Type-safe data handling** using DepartmentsJSON interface
- **Markdown page integration** with automatic slug matching
- **Workforce data detection** and hasWorkforceData flags
- **Budget status filtering** (active/inactive departments)
- **Organizational level grouping** and parent agency distribution
- **Caching strategy** with 1-hour revalidation
- **Comprehensive logging** with department statistics

#### Vendor APIs - TO BE REPLACED
**Current Location:** `src/app/api/vendors/` (will be removed)

**Current Endpoints (to be deprecated):**
- `GET /api/vendors/vendor-departments` - Vendor data grouped by departments
- `GET /api/vendors/department-vendors` - Department data grouped by vendors  
- `GET /api/vendors/account-vendors` - Account-based vendor groupings
- `GET /api/vendors/program-vendors` - Program-based vendor groupings

**Migration Plan:**
- **Remove existing vendor API endpoints** in `src/app/api/vendors/`
- **Replace with unified vendor API** at `src/app/api/vendors/route.ts`
- **Preserve existing functionality** through query parameters and response formatting

#### Data Access Layer - IMPLEMENTED ✅
**Location:** `src/lib/api/dataAccess.ts`

**Features Implemented:**
- **Cached data access** with file modification time validation
- **Generic JSON file reading** with error handling
- **Specialized data getters** for all data types:
  - `getBudgetsData()` - Access to budgets.json
  - `getFundsData()` - Access to funds.json  
  - `getProgramsData()` - Access to programs.json
  - `getVendorsData()` - Access to vendors.json
  - `getSearchData()` - Access to search.json
- **Cache management** with selective clearing
- **File writing utilities** with directory creation

### APIs Ready for Implementation

#### Vendor API - READY FOR IMPLEMENTATION (REPLACEMENT)
**Proposed Location:** `src/app/api/vendors/route.ts`

**Proposed Endpoints:**
- `GET /api/vendors` - List all vendors with pagination and filtering
- `GET /api/vendors/top100/:year` - Get top 100 vendors by spending for specific year
- `GET /api/vendors/:id` - Get vendor details by ID
- `GET /api/vendors/:id/transactions` - Get vendor transactions with pagination

**Query Parameters for Unified API:**
- `view=departments` - Return vendor-departments view (replaces /vendor-departments)
- `view=accounts` - Return account-vendors view (replaces /account-vendors)  
- `view=programs` - Return program-vendors view (replaces /program-vendors)
- `department=name` - Filter by department name
- `year=YYYY` - Filter by fiscal year
- `page=N&limit=N` - Pagination controls
- `sort=amount|name|count|year|department|program|fund` - Enhanced sorting options
- `order=asc|desc` - Sort order (default: desc for amount)

**Response Format for Top 100 Vendors:**
```typescript
{
  vendors: Array<{
    name: string;
    year: number;
    department: string;
    program: string;
    fund: string;
    amount: number;
    // Additional sortable fields
  }>;
  pagination: PaginationInfo;
}
```

**Implementation Notes:**
- **Support payments page requirements** with top 100 vendors endpoint
- **Enhanced sorting capabilities** for all required columns (year, department, vendor, program, fund, amount)
- **Default sorting** by amount (high to low) as specified
- **Consolidate existing functionality** from 4 separate endpoints into 1 unified API
- **Leverage existing data access layer** with `getVendorsData()` and `getVendorTransactionsData()`
- **Use existing type interfaces** from `src/types/vendor.ts`

#### Program API - READY FOR IMPLEMENTATION
**Proposed Endpoints:**
- `GET /api/programs` - List all programs with pagination
- `GET /api/programs/:projectCode` - Get program details by project code

**Enhanced Response Format for Hover Functionality:**
```typescript
{
  projectCode: string;
  name: string;
  programDescriptions: Array<{
    description: string;
    source: string;
  }>;
}
```

**Implementation Notes:**
- **Support spend page hover functionality** with program descriptions and sources
- Data access layer already supports `getProgramsData()`
- Type interfaces fully defined in `src/types/program.ts`
- Data populated by process_budgets.ts script

#### Budget API - READY FOR IMPLEMENTATION  
**Proposed Endpoints:**
- `GET /api/budgets` - List budget data with filtering options
- `GET /api/budgets/:organizationalCode` - Get budget by organizational code
- `GET /api/budgets/:organizationalCode/:fiscalYear` - Get budget for specific fiscal year

**Implementation Notes:**
- Data access layer already supports `getBudgetsData()`
- Type interfaces fully defined in `src/types/budget.ts`
- Data populated by process_budgets.ts script with processedFiles tracking

#### Fund API - READY FOR IMPLEMENTATION
**Proposed Endpoints:**
- `GET /api/funds` - List all funds with filtering
- `GET /api/funds/:fundCode` - Get fund details by code

**Implementation Notes:**
- Data access layer already supports `getFundsData()`
- Type interfaces fully defined in `src/types/fund.ts`
- Data populated by both process_budgets.ts and process_vendors.ts scripts

#### Spend API - READY FOR IMPLEMENTATION (NEW)
**Proposed Location:** `src/app/api/spend/route.ts`

**Proposed Endpoints:**
- `GET /api/spend` - Get spending data with comprehensive filtering and sorting

**Query Parameters for Spend Page:**
- `view=budget|vendor|compare` - Display mode selection
- `filter=all|year|department|vendor|program|fund` - Filter type
- `year=YYYY` - Filter by fiscal year
- `department=name` - Filter by department name
- `vendor=name` - Filter by vendor name
- `program=code` - Filter by program code
- `fund=code` - Filter by fund code
- `sort=year|department|vendor|program|fund|amount` - Sort column
- `order=asc|desc` - Sort order (default: desc for amount)
- `page=N&limit=N` - Pagination controls

**Response Format:**
```typescript
{
  spending: Array<{
    year: number;
    department: string;
    departmentSlug?: string; // For markdown page links
    vendor: string;
    program: string;
    fund: string;
    amount: number;
  }>;
  pagination: PaginationInfo;
  summary: {
    totalAmount: number;
    recordCount: number;
  };
}
```

**Implementation Notes:**
- **Support updated spend page requirements** with comprehensive filtering and sorting
- **Department markdown links** included when available
- **Default amount sorting** (high to low) as specified
- **Leverage existing data access layer** for budget, vendor, and program data
- **Combine data from multiple sources** for comprehensive spend view

#### Search API - READY FOR IMPLEMENTATION
**Proposed Endpoints:**
- `GET /api/search` - Enhanced search across all data types
- `GET /api/search?q=query&types=department,vendor,program,fund`

**Enhanced Search Features:**
- **Broad search capability** across all data types
- **Common word filtering** - exclude words like "the", "and", "like", etc.
- **Real-time suggestions** as user types
- **Keyword extraction** for improved search results

**Query Parameters:**
- `q=query` - Search query string
- `types=department,vendor,program,fund` - Filter by data types
- `limit=N` - Limit number of results (default: 10)
- `exclude_common=true` - Exclude common words (default: true)

**Implementation Notes:**
- **Support enhanced search functionality** with broad search and common word filtering
- Data access layer already supports `getSearchData()`
- Type interfaces fully defined in `src/types/search.ts`
- Search data structure includes departments, vendors, programs, funds, and keywords

### Integration with Existing APIs ✅
- **Department API** already enhanced with new data structures
- **Vendor APIs** fully implemented with multiple view perspectives
- **Data access layer** provides unified interface for all data types
- **Type safety** maintained across all implementations

## 4. Frontend UI Updates

### updated payments page
- display the top 100 vendors spend for each year
- display all the fields as sortable columns
- pull data from api

### Updated Spend Page
- pull data from api(s)
- Pulldown option to display budget, vendor, or compare
- Filter pulldown by all, year, department, vendor, program or fund 
- display columns year, department, vendor, program, fund, amount
- each column will sort toggle high or low on click
- default sort amount column high to low
- For each department name show link to markdown page if exists
- For each program on hover show program descriptions and their sources (pull from program api)
- For each vendor on hover show link options to propublica and data republican using the name

### Enhanced Search Functionality
- Use search API which sources from search.json
- Display options with vendor, program, and department as user types
- Implement keyword extraction process for improved search results. we want a very broad search capability while excluding common words "like, the, and, ..."

### Department Specific Markdown Pages
- Spend section: from json sources, fiscal year, vendor name, program name, fund name, total amount spend
- Workforce section: points to workforce page display for department
- Custom text on the department from the markdown text
- Sources from the markdown text

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
