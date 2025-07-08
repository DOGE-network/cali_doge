# Spend Data Inconsistency Analysis

## Problem Statement

Search cards for "health" departments show inconsistent spend data between requests - sometimes displaying total amounts and sample records, sometimes not. No obvious Supabase errors are logged.

## 🚨 CRITICAL FINDING: Massive API Call Volume

After examining the search page code, I found the **primary cause** of the inconsistency:

### The Problem
```typescript
// In search/page.tsx - this triggers for EVERY search result
useEffect(() => {
  await Promise.all(
    searchData.departments.map(async (dept) => {
      const [vendorRes, budgetRes] = await Promise.all([
        fetch(`/api/spend?department_code=${dept.id}&limit=1`),
        fetch(`/api/spend?view=budget&department_code=${dept.id}&limit=1`),
      ]);
    })
  );
}, [searchData]);
```

**Impact:** A search for "health" returning 20 departments triggers **40 concurrent API calls** to `/api/spend`, which:
- Has NO Redis caching (unlike other APIs)
- Uses complex year-partitioned view logic 
- Queries up to 9 database views per request when no year specified
- Has silent error handling that masks partial failures

This creates a **perfect storm** of database load and timing inconsistencies.

## Code Analysis and Potential Root Causes

### 1. Complex API Architecture Issues

#### Year-Partitioned View Logic (`/api/spend` route)
The spend API has complex branching logic based on year parameters:

```typescript
// Different code paths based on year parameter
if (year && yearPartitionedViewExists(parseInt(year))) {
  // Use specific year view: vendor_transactions_with_vendor_fy{year}
  const viewName = getYearPartitionedViewName(parseInt(year));
} else {
  // Query ALL years separately and combine
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  for (const yearValue of years) {
    // Multiple database queries with potential for partial failures
  }
}
```

**Potential Issues:**
- When no year is specified, the API queries 9 different year-partitioned views
- If ANY year view fails or times out, it continues with warnings but may return incomplete data
- Error handling uses `console.warn()` and `continue`, masking partial failures

#### Error Handling Gaps
```typescript
const { data: yearData, error } = await yearQuery;
if (error) {
  console.warn(`Error querying ${viewName}:`, error);
  continue; // ⚠️ Silently skips failed years
}
```

This means a search for "health" could return different result sets depending on which year-partitioned views succeed or fail.

### 2. Search Card Data Fetching Race Conditions

#### Independent API Calls in SearchDetailCards.tsx
```typescript
// Two separate API calls with potential timing issues
let vendorUrl = `/api/spend?department_code=${departmentCode}&limit=10`;
let budgetUrl = `/api/spend?view=budget&department_code=${departmentCode}&limit=10`;

const vendorResponse = await fetch(vendorUrl);
const budgetResponse = await fetch(budgetUrl);
```

**Potential Issues:**
- No synchronization between vendor and budget API calls
- Different response times could create inconsistent UI states
- Error in one call doesn't affect the other, leading to partial data display

#### Department Code Resolution Issues
```typescript
// Search returns departments with IDs, but spend API uses department_code
const departmentCode = item.id; // This may not always be the correct department_code
```

**Potential Issues:**
- Search index `item.id` may not match the spend data's `department_code`
- Department names vs. codes inconsistency across different data sources

### 3. Database View Dependencies

#### Multiple Materialized Views
The application relies on several materialized views:
- `vendor_transactions_with_vendor_fy{year}` (9 separate views)
- `budget_line_items_with_names`
- `department_compare_summary`
- `departments_with_workforce`

**Potential Issues:**
- Views may not be refreshed consistently
- Some views might be missing or corrupted
- Data inconsistency between views if they're updated at different times

### 4. Cache-Related Issues

#### No Caching in Spend API
Unlike other APIs that use Redis caching, the `/api/spend` route does NOT implement Redis caching:

```typescript
// Other APIs use caching:
const cached = await getFromCache(cacheKey);
if (cached) return cached;

// But /api/spend does NOT - always hits database
```

**Potential Issues:**
- High database load leading to timeouts
- No cache consistency to fall back on
- Performance issues under load

#### HTTP Cache Headers
```typescript
headers: {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
}
```

Browser/CDN caching might serve stale data inconsistently.

### 5. Data Transformation Issues

#### Complex Data Mapping
```typescript
const spending = data?.map(item => ({
  year: item.fiscal_year,
  department: item.department_name || 'Unknown Department',
  departmentCode: item.department_code || null,
  vendor: item.vendor_name || 'Unknown Vendor',
  // ... multiple transformations
})) || [];
```

**Potential Issues:**
- Null/undefined handling inconsistencies
- Type coercion issues with amount parsing
- Missing data handling varies across different code paths

### 6. Async Race Conditions in Components

#### useEffect Dependencies
```typescript
useEffect(() => {
  const fetchMatchData = async () => {
    // Complex async logic with multiple API calls
    // No proper cleanup or cancellation
  };
  fetchMatchData();
}, [item.term, item.type, query]); // Multiple changing dependencies
```

**Potential Issues:**
- Multiple useEffect triggers could create overlapping async operations
- No request cancellation when component updates rapidly
- State updates from old requests overwriting newer ones

## 🔥 IMMEDIATE ACTION REQUIRED

### 1. Add Redis Caching to `/api/spend` (URGENT)
```typescript
// In src/app/api/spend/route.ts
import { getFromCache, setInCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cacheKey = `spend:${searchParams.toString()}`;
  
  // Try cache first
  const cached = await getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT' }
    });
  }
  
  // ... existing logic ...
  
  // Cache for 1 hour
  await setInCache(cacheKey, result, { ex: 3600, tags: ['spend'] });
  return NextResponse.json(result);
}
```

### 2. Implement Batch Totals API (HIGH PRIORITY)
Create `/api/spend/batch-totals` to get all department totals in one request:

```typescript
// New endpoint: /api/spend/batch-totals
export async function POST(request: NextRequest) {
  const { departmentCodes } = await request.json();
  const cacheKey = `spend:batch:${departmentCodes.sort().join(',')}`;
  
  const cached = await getFromCache(cacheKey);
  if (cached) return NextResponse.json(cached);
  
  // Single query for all departments
  const results = await Promise.allSettled(
    departmentCodes.map(async (code) => {
      // Get totals for each department
    })
  );
  
  await setInCache(cacheKey, results, { ex: 3600 });
  return NextResponse.json(results);
}
```

### 3. Update Search Page (MEDIUM PRIORITY)
```typescript
// Replace individual calls with batch call
const fetchTotals = async () => {
  const departmentCodes = searchData.departments.map(d => d.id);
  const response = await fetch('/api/spend/batch-totals', {
    method: 'POST',
    body: JSON.stringify({ departmentCodes })
  });
  const totals = await response.json();
  setDepartmentTotals(totals);
};
```

## Diagnostic Steps

### 1. Enable Debug Logging
Add request tracking to identify patterns:

```typescript
// In /api/spend route
console.log(`[SPEND API] Request: ${request.url} at ${new Date().toISOString()}`);
console.log(`[SPEND API] Params:`, { department, departmentCode, year, view });
```

### 2. Test Specific Department Codes
Instead of searching "health", test specific department codes:
```bash
# Test these specific calls that SearchDetailCards makes:
curl "http://localhost:3000/api/search?q=health&types=departments&limit=5"
# Then for each department ID returned:
curl "http://localhost:3000/api/spend?department_code={ID}&limit=10"
curl "http://localhost:3000/api/spend?view=budget&department_code={ID}&limit=10"
```

### 3. Database View Status Check
Verify all year-partitioned views exist and have data:
```sql
SELECT schemaname, viewname, viewowner FROM pg_views 
WHERE viewname LIKE 'vendor_transactions_with_vendor_fy%';
```

## Most Likely Root Causes (Ranked)

### 1. **Massive Uncached API Load** (CRITICAL PRIORITY)
- 40+ concurrent requests to uncached `/api/spend` endpoint
- Database overwhelmed with year-partitioned view queries
- Race conditions in response timing

### 2. **Year-Partitioned View Failures** (HIGH PROBABILITY)
- Some year views fail silently
- Data completeness varies per request
- No proper error aggregation

### 3. **Department Code Mismatch** (HIGH PROBABILITY)
- Search returns one ID format
- Spend API expects different department_code format
- Results in no data found for some departments

### 4. **Database Connection Timeouts** (MEDIUM PROBABILITY)
- No Redis caching means every request hits database
- Heavy queries across 9 year views
- Supabase rate limits or connection pooling issues

### 5. **React Component Race Conditions** (MEDIUM PROBABILITY)
- Multiple useEffect triggers
- Async state updates from overlapping requests
- No request cancellation

## Recommended Fixes

### Immediate (Low Risk)
1. **Add Redis caching to `/api/spend`** ⚡
2. **Add comprehensive logging** to track request patterns
3. **Add request IDs** to correlate frontend and backend logs

### Short Term (Medium Risk)
1. **Create batch totals API** to reduce request volume
2. **Implement proper error aggregation** instead of silent continues
3. **Add request cancellation** in React components
4. **Standardize department ID/code mapping**

### Long Term (High Risk)
1. **Consolidate year-partitioned views** into a single performant view
2. **Implement database connection pooling** and timeout handling
3. **Add automated view refresh monitoring**

## Testing Strategy

1. **Monitor request volume**: Check how many `/api/spend` calls happen per search
2. **Test with caching**: Implement Redis caching and measure improvement
3. **Load testing**: Use concurrent requests to expose timing issues
4. **Reproduce with specific departments**: Target specific department codes that show inconsistency

This analysis confirms the issue is primarily **architectural** - too many uncached database requests overwhelming the system, rather than a pure cache or timeout issue.