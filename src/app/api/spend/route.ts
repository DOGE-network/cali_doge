import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

// Helper function to get the appropriate year-partitioned view name
function getYearPartitionedViewName(fiscalYear: number): string {
  return `vendor_transactions_with_vendor_fy${fiscalYear}`;
}

// Available year-partitioned views
const AVAILABLE_YEAR_VIEWS = new Set([
  'vendor_transactions_with_vendor_fy2016',
  'vendor_transactions_with_vendor_fy2017',
  'vendor_transactions_with_vendor_fy2018',
  'vendor_transactions_with_vendor_fy2019',
  'vendor_transactions_with_vendor_fy2020',
  'vendor_transactions_with_vendor_fy2021',
  'vendor_transactions_with_vendor_fy2022',
  'vendor_transactions_with_vendor_fy2023',
  'vendor_transactions_with_vendor_fy2024'
]);

// Helper function to check if a year-partitioned view exists
function yearPartitionedViewExists(fiscalYear: number): boolean {
  const viewName = getYearPartitionedViewName(fiscalYear);
  return AVAILABLE_YEAR_VIEWS.has(viewName);
}

// Helper function to generate cache key
function generateCacheKey(searchParams: URLSearchParams): string {
  // Sort parameters for consistent cache keys
  const sortedParams = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return `spend:${sortedParams}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const departmentCode = searchParams.get('department_code');
    const batch = searchParams.get('batch'); // New batch parameter for multiple department codes
    const vendor = searchParams.get('vendor');
    const program = searchParams.get('program');
    const fund = searchParams.get('fund');
    const year = searchParams.get('year');
    const view = searchParams.get('view') || 'vendor';
    const compareBy = searchParams.get('compareBy') || 'department';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offsetParam = searchParams.get('offset');
    const offset = offsetParam !== null ? parseInt(offsetParam, 10) : 0;
    // Calculate offset from page if not provided directly
    const calculatedOffset = offsetParam === null ? (page - 1) * limit : offset;
    const sort = searchParams.get('sort') || 'amount';
    const order = searchParams.get('order') || 'desc';

    // Handle batch request for multiple department codes
    if (batch !== null) {
      try {
        const departmentCodes = batch.split(',').map(code => code.trim()).filter(Boolean);
        if (departmentCodes.length === 0) {
          return NextResponse.json({
            error: 'No valid department codes provided in batch parameter'
          }, { status: 400 });
        }

        // Generate cache key for batch request
        const batchCacheKey = `batch:${departmentCodes.sort().join(',')}`;
        console.log(`[SPEND API] Batch request for ${departmentCodes.length} departments: ${departmentCodes.join(', ')}`);
        console.log(`[SPEND API] Batch cache key: ${batchCacheKey}`);

        // Check cache for batch request
        try {
          const cachedBatchResult = await getFromCache(batchCacheKey);
          if (cachedBatchResult) {
            console.log(`[SPEND API] Batch cache HIT for key: ${batchCacheKey}`);
            return NextResponse.json(cachedBatchResult, {
              headers: {
                'X-Cache': 'HIT',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
              }
            });
          }
          console.log(`[SPEND API] Batch cache MISS for key: ${batchCacheKey}`);
        } catch (cacheError) {
          console.warn(`[SPEND API] Batch cache error: ${cacheError}`);
          // Continue with database queries if cache fails
        }

        const supabase = getServiceSupabase();
        const results: Record<string, { vendorTotal: number | null; budgetTotal: number | null; vendorRecordCount: number | null; budgetRecordCount: number | null; vendorYears?: number[]; budgetYears?: number[] }> = {};

        // Process each department code sequentially to avoid connection pool exhaustion
        for (const deptCode of departmentCodes) {
          try {
            // Get vendor totals across all available fiscal years
            const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
            let vendorTotal = 0;
            let vendorRecordCount = 0;
            const vendorYears: number[] = [];
            
            // Query each year-partitioned view sequentially with delays
            for (const yearValue of years) {
              const viewName = getYearPartitionedViewName(yearValue);
              try {
                const yearQuery = (supabase as any)
                  .from(viewName)
                  .select('amount', { count: 'exact' })
                  .eq('department_code', deptCode);
                const { data: yearData, count: yearCount, error: yearError } = await yearQuery;
                if (yearError) {
                  console.warn(`[SPEND API] Error querying ${viewName} for department ${deptCode}:`, yearError);
                  continue;
                }
                if (yearData && yearData.length > 0) {
                  const yearTotal = yearData.reduce((sum: number, item: any) => sum + parseFloat(item.amount.toString()), 0);
                  vendorTotal += yearTotal;
                  vendorRecordCount += yearCount || 0;
                  vendorYears.push(yearValue);
                }
                
                // Add delay between year queries to prevent connection pool exhaustion
                await new Promise(resolve => setTimeout(resolve, 50));
                
              } catch (yearError) {
                console.warn(`[SPEND API] Error processing ${viewName} for department ${deptCode}:`, yearError);
                continue;
              }
            }

            // Get budget totals and years
            let budgetQuery = supabase
              .from('budget_line_items_with_names')
              .select('amount, fiscal_year', { count: 'exact' })
              .eq('department_code', deptCode);
            const budgetResult = await budgetQuery;
            const budgetTotal = budgetResult.data?.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0) || 0;
            const budgetYears = Array.from(new Set((budgetResult.data || []).map(item => item.fiscal_year))).filter(Boolean).sort();

            results[deptCode] = {
              vendorTotal,
              budgetTotal,
              vendorRecordCount,
              budgetRecordCount: budgetResult.count || 0,
              vendorYears,
              budgetYears
            };

          } catch (error) {
            console.warn(`[SPEND API] Error processing department ${deptCode}:`, error);
            results[deptCode] = {
              vendorTotal: null,
              budgetTotal: null,
              vendorRecordCount: null,
              budgetRecordCount: null
            };
          }
          
          // Add delay between department processing
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const batchResult = {
          batch: results,
          totalDepartments: departmentCodes.length,
          processedDepartments: Object.keys(results).length
        };

        // Cache the batch result for 1 hour
        try {
          await setInCache(batchCacheKey, batchResult, { ex: 3600, tags: ['spend', 'batch'] });
          console.log(`[SPEND API] Cached batch result for key: ${batchCacheKey}`);
        } catch (cacheError) {
          console.warn(`[SPEND API] Failed to cache batch result: ${cacheError}`);
        }

        return NextResponse.json(batchResult, {
          headers: {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
          }
        });

      } catch (error) {
        console.error('[SPEND API] Batch request error:', error);
        return NextResponse.json({
          error: 'Failed to process batch request',
          details: error
        }, { status: 500 });
      }
    }

    // Generate cache key and check cache
    const cacheKey = generateCacheKey(searchParams);
    console.log(`[SPEND API] Cache key: ${cacheKey}`);
    
    try {
      const cachedResult = await getFromCache(cacheKey);
      if (cachedResult) {
        console.log(`[SPEND API] Cache HIT for key: ${cacheKey}`);
        return NextResponse.json(cachedResult, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
          }
        });
      }
      console.log(`[SPEND API] Cache MISS for key: ${cacheKey}`);
    } catch (cacheError) {
      console.warn(`[SPEND API] Cache error: ${cacheError}`);
      // Continue with database query if cache fails
    }

    const supabase = getServiceSupabase();

    if (view === 'budget') {
      // Budget view - use budget_line_items_with_names materialized view
      let query = supabase
        .from('budget_line_items_with_names')
        .select('*', { count: 'exact' });

      // Apply filters
      if (departmentCode) {
        query = query.eq('department_code', departmentCode);
      } else if (department) {
        query = query.ilike('department_name', `%${department}%`);
      }
      if (year) {
        query = query.eq('fiscal_year', parseInt(year));
      }
      if (program) {
        query = query.ilike('program_name', `%${program}%`);
      }
      if (fund) {
        query = query.ilike('fund_name', `%${fund}%`);
      }

      // Determine sort field for budget view
      const sortField = sort === 'amount' ? 'amount' : 
                       sort === 'year' ? 'fiscal_year' :
                       sort === 'department' ? 'department_name' :
                       sort === 'program' ? 'program_name' :
                       sort === 'fund' ? 'fund_name' : 'amount';
      const ascending = order === 'asc';

      const { data, error, count } = await query
        .order(sortField, { ascending })
        .range(calculatedOffset, calculatedOffset + limit - 1);

      if (error) {
        console.error('Budget query error:', error);
        return NextResponse.json({
          spending: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false
          },
          summary: {
            totalAmount: 0,
            recordCount: 0
          },
          error: 'Failed to fetch budget data',
          details: error
        }, { status: 500 });
      }

      // Calculate totals
      let totalQuery = supabase
        .from('budget_line_items_with_names')
        .select('amount');
      if (departmentCode) {
        totalQuery = totalQuery.eq('department_code', departmentCode);
      } else if (department) {
        totalQuery = totalQuery.ilike('department_name', `%${department}%`);
      }
      if (year) {
        totalQuery = totalQuery.eq('fiscal_year', parseInt(year));
      }
      const { data: totalData, error: totalError } = await totalQuery;

      if (totalError) {
        console.error('Budget total calculation error:', totalError);
        return NextResponse.json({
          spending: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false
          },
          summary: {
            totalAmount: 0,
            recordCount: 0
          },
          error: 'Failed to calculate budget totals',
          details: totalError
        }, { status: 500 });
      }

      const totalAmount = totalData?.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0) || 0;

      // Transform data to match expected format
      const spending = data?.map(item => ({
        year: item.fiscal_year,
        department: item.department_name || 'Unknown Department',
        departmentCode: item.department_code || null,
        vendor: 'Budget Allocation',
        program: item.program_name || 'Unknown Program',
        fund: item.fund_name || 'Unknown Fund',
        amount: parseFloat(item.amount.toString())
      })) || [];

      // Collect all unique years from spending data
      const years = Array.from(new Set(spending.map(item => item.year))).filter(Boolean).sort();

      const totalPages = Math.ceil((count || 0) / limit);
      const currentPage = page;
      const itemsPerPage = limit;
      const totalItems = count || 0;

      const budgetResult = {
        spending,
        pagination: {
          currentPage,
          totalPages,
          totalItems,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        },
        summary: {
          totalAmount,
          recordCount: totalItems,
          years
        }
      };

      // Cache the budget result for 1 hour
      try {
        await setInCache(cacheKey, budgetResult, { ex: 3600, tags: ['spend', 'budget'] });
        console.log(`[SPEND API] Cached budget result for key: ${cacheKey}`);
      } catch (cacheError) {
        console.warn(`[SPEND API] Failed to cache budget result: ${cacheError}`);
      }

      return NextResponse.json(budgetResult, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
        }
      });

    } else if (view === 'compare') {
      // Compare view - use compare summary materialized views
      let query;
      let totalQuery;
      
      // Select the appropriate compare summary view based on compareBy parameter
      switch (compareBy) {
        case 'department':
          query = supabase
            .from('department_compare_summary')
            .select('*', { count: 'exact' });
          totalQuery = supabase
            .from('department_compare_summary')
            .select('vendor_amount, budget_amount');
          break;
        case 'program':
          query = supabase
            .from('program_compare_summary')
            .select('*', { count: 'exact' });
          totalQuery = supabase
            .from('program_compare_summary')
            .select('vendor_amount, budget_amount');
          break;
        case 'fund':
          query = supabase
            .from('fund_compare_summary')
            .select('*', { count: 'exact' });
          totalQuery = supabase
            .from('fund_compare_summary')
            .select('vendor_amount, budget_amount');
          break;
        default:
          query = supabase
            .from('department_compare_summary')
            .select('*', { count: 'exact' });
          totalQuery = supabase
            .from('department_compare_summary')
            .select('vendor_amount, budget_amount');
      }

      // Apply filters
      if (year) {
        query = query.eq('year', parseInt(year));
        totalQuery = totalQuery.eq('year', parseInt(year));
      }
      if (department && compareBy === 'department') {
        query = query.ilike('department_name', `%${department}%`);
        totalQuery = totalQuery.ilike('department_name', `%${department}%`);
      }
      if (program && compareBy === 'program') {
        query = query.ilike('program_name', `%${program}%`);
        totalQuery = totalQuery.ilike('program_name', `%${program}%`);
      }
      if (fund && compareBy === 'fund') {
        query = query.ilike('fund_name', `%${fund}%`);
        totalQuery = totalQuery.ilike('fund_name', `%${fund}%`);
      }

      // Apply sorting
      let sortField = sort;
      if (sort === 'amount' || !['vendorAmount','budgetAmount','year','department','program','fund'].includes(sort)) {
        sortField = 'vendor_amount'; // Default to vendor_amount for compare view
      } else if (sort === 'vendorAmount') {
        sortField = 'vendor_amount';
      } else if (sort === 'budgetAmount') {
        sortField = 'budget_amount';
      } else if (sort === 'year') {
        sortField = 'year';
      } else if (sort === 'department') {
        sortField = 'department_name';
      } else if (sort === 'program') {
        sortField = 'program_name';
      } else if (sort === 'fund') {
        sortField = 'fund_name';
      }
      const ascending = order === 'asc';
      query = query.order(sortField, { ascending });

      const { data, error, count } = await query
        .range(calculatedOffset, calculatedOffset + limit - 1);

      if (error) {
        console.error('Compare query error:', error);
        return NextResponse.json({
          spending: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false
          },
          summary: {
            totalAmount: 0,
            recordCount: 0
          },
          error: 'Failed to fetch compare data',
          details: error
        }, { status: 500 });
      }

      // Get total amounts
      const { data: totalData, error: totalError } = await totalQuery;

      if (totalError) {
        console.error('Compare total calculation error:', totalError);
        return NextResponse.json({
          spending: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false
          },
          summary: {
            totalAmount: 0,
            recordCount: 0
          },
          error: 'Failed to calculate compare totals',
          details: totalError
        }, { status: 500 });
      }

      const totalVendorAmount = totalData?.reduce((sum, item) => sum + parseFloat(item.vendor_amount.toString()), 0) || 0;
      const totalBudgetAmount = totalData?.reduce((sum, item) => sum + parseFloat(item.budget_amount.toString()), 0) || 0;

      // Transform data to match expected format for compare view
      const spending = data?.map(item => ({
        year: item.year,
        department: compareBy === 'department' ? item.department_name : '',
        departmentCode: compareBy === 'department' ? item.department_code : '',
        departmentName: compareBy === 'department' ? item.department_name : '',
        program: compareBy === 'program' ? item.program_name : '',
        programCode: compareBy === 'program' ? item.program_code : '',
        programName: compareBy === 'program' ? item.program_name : '',
        fund: compareBy === 'fund' ? item.fund_name : '',
        fundCode: compareBy === 'fund' ? item.fund_code : '',
        fundName: compareBy === 'fund' ? item.fund_name : '',
        vendor: 'N/A',
        amount: 0, // Not used in compare view
        vendorAmount: parseFloat(item.vendor_amount.toString()),
        budgetAmount: parseFloat(item.budget_amount.toString())
      })) || [];

      const totalPages = Math.ceil((count || 0) / limit);
      const currentPage = page;
      const itemsPerPage = limit;
      const totalItems = count || 0;

      const compareResult = {
        spending,
        pagination: {
          currentPage,
          totalPages,
          totalItems,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        },
        summary: {
          totalAmount: totalVendorAmount + totalBudgetAmount,
          recordCount: totalItems
        }
      };

      // Cache the compare result for 1 hour
      try {
        await setInCache(cacheKey, compareResult, { ex: 3600, tags: ['spend', 'compare'] });
        console.log(`[SPEND API] Cached compare result for key: ${cacheKey}`);
      } catch (cacheError) {
        console.warn(`[SPEND API] Failed to cache compare result: ${cacheError}`);
      }

      return NextResponse.json(compareResult, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
        }
      });

    } else {
      // Vendor view - use year-partitioned views for optimal performance
      let data: any[] = [];
      let count = 0;
      let totalAmount = 0;
      
      // If year is specified, use the specific year-partitioned view
      if (year && yearPartitionedViewExists(parseInt(year))) {
        const viewName = getYearPartitionedViewName(parseInt(year));
        
        const query = (supabase as any)
          .from(viewName)
          .select('*', { count: 'exact' });
          
        const totalQuery = (supabase as any)
          .from(viewName)
          .select('amount');

        // Apply filters
        let filteredQuery = query;
        let filteredTotalQuery = totalQuery;
        
        if (departmentCode) {
          filteredQuery = filteredQuery.eq('department_code', departmentCode);
          filteredTotalQuery = filteredTotalQuery.eq('department_code', departmentCode);
        } else if (department) {
          filteredQuery = filteredQuery.ilike('department_name', `%${department}%`);
          filteredTotalQuery = filteredTotalQuery.ilike('department_name', `%${department}%`);
        }
        if (vendor) {
          filteredQuery = filteredQuery.ilike('vendor_name', `%${vendor}%`);
          filteredTotalQuery = filteredTotalQuery.ilike('vendor_name', `%${vendor}%`);
        }
        if (program) {
          filteredQuery = filteredQuery.ilike('program_code', `%${program}%`);
          filteredTotalQuery = filteredTotalQuery.ilike('program_code', `%${program}%`);
        }
        if (fund) {
          filteredQuery = filteredQuery.ilike('fund_code', `%${fund}%`);
          filteredTotalQuery = filteredTotalQuery.ilike('fund_code', `%${fund}%`);
        }

        // Apply sorting
        const sortField = sort === 'amount' ? 'amount' : 
                         sort === 'year' ? 'fiscal_year' :
                         sort === 'department' ? 'department_name' :
                         sort === 'vendor' ? 'vendor_name' :
                         sort === 'program' ? 'program_code' :
                         sort === 'fund' ? 'fund_code' : 'amount';
        const ascending = order === 'asc';
        filteredQuery = filteredQuery.order(sortField, { ascending });

        const { data: queryData, error, count: queryCount } = await filteredQuery
          .range(calculatedOffset, calculatedOffset + limit - 1);

        if (error) {
          console.error('Vendor query error:', error);
          return NextResponse.json({
            spending: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: limit,
              hasNextPage: false,
              hasPrevPage: false
            },
            summary: {
              totalAmount: 0,
              recordCount: 0
            },
            error: 'Failed to fetch vendor data',
            details: error
          }, { status: 500 });
        }

        // Get total amount
        const { data: totalData, error: totalError } = await filteredTotalQuery;

        if (totalError) {
          console.error('Vendor total calculation error:', totalError);
          return NextResponse.json({
            spending: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: limit,
              hasNextPage: false,
              hasPrevPage: false
            },
            summary: {
              totalAmount: 0,
              recordCount: 0
            },
            error: 'Failed to calculate vendor totals',
            details: totalError
          }, { status: 500 });
        }

        data = queryData || [];
        count = queryCount || 0;
        totalAmount = totalData?.reduce((sum: number, item: any) => sum + parseFloat(item.amount.toString()), 0) || 0;

      } else {
        // Query all years separately and combine results
        const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
        const allTransactions: any[] = [];
        
        for (const yearValue of years) {
          const viewName = getYearPartitionedViewName(yearValue);
          
          let yearQuery = (supabase as any).from(viewName).select('*');
          
          // Apply filters
          if (departmentCode) {
            yearQuery = yearQuery.eq('department_code', departmentCode);
          } else if (department) {
            yearQuery = yearQuery.ilike('department_name', `%${department}%`);
          }
          if (vendor) {
            yearQuery = yearQuery.ilike('vendor_name', `%${vendor}%`);
          }
          if (program) {
            yearQuery = yearQuery.ilike('program_code', `%${program}%`);
          }
          if (fund) {
            yearQuery = yearQuery.ilike('fund_code', `%${fund}%`);
          }
          
          const { data: yearData, error } = await yearQuery;
          
          if (error) {
            console.warn(`Error querying ${viewName}:`, error);
            continue;
          }
          
          if (yearData) {
            allTransactions.push(...yearData);
          }
        }
        
        // Sort all transactions
        const sortField = sort === 'amount' ? 'amount' : 
                         sort === 'year' ? 'fiscal_year' :
                         sort === 'department' ? 'department_name' :
                         sort === 'vendor' ? 'vendor_name' :
                         sort === 'program' ? 'program_code' :
                         sort === 'fund' ? 'fund_code' : 'amount';
        const ascending = order === 'asc';
        
        allTransactions.sort((a, b) => {
          const aVal = a[sortField] || '';
          const bVal = b[sortField] || '';
          
          // Handle numeric fields
          if (sortField === 'amount' || sortField === 'fiscal_year') {
            const aNum = typeof aVal === 'number' ? aVal : parseFloat(aVal) || 0;
            const bNum = typeof bVal === 'number' ? bVal : parseFloat(bVal) || 0;
            return ascending ? aNum - bNum : bNum - aNum;
          }
          
          // Handle string fields
          const aStr = String(aVal);
          const bStr = String(bVal);
          return ascending ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
        
        // Apply pagination
        const startIndex = calculatedOffset;
        const endIndex = calculatedOffset + limit;
        data = allTransactions.slice(startIndex, endIndex);
        count = allTransactions.length;
        totalAmount = allTransactions.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
      }

      // Transform data to match expected format
      const spending = data?.map(item => ({
        year: item.fiscal_year,
        department: item.department_name || 'Unknown Department',
        departmentCode: item.department_code || null,
        vendor: item.vendor_name || 'Unknown Vendor',
        program: item.program_code || 'Unknown Program',
        fund: item.fund_code || 'Unknown Fund',
        amount: parseFloat(item.amount.toString())
      })) || [];

      // Collect all unique years from spending data
      const years = Array.from(new Set(spending.map(item => item.year))).filter(Boolean).sort();

      const totalPages = Math.ceil((count || 0) / limit);
      const currentPage = page;
      const itemsPerPage = limit;
      const totalItems = count || 0;

      const vendorResult = {
        spending,
        pagination: {
          currentPage,
          totalPages,
          totalItems,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        },
        summary: {
          totalAmount,
          recordCount: totalItems,
          years
        }
      };

      // Cache the vendor result for 1 hour
      try {
        await setInCache(cacheKey, vendorResult, { ex: 3600, tags: ['spend', 'vendor'] });
        console.log(`[SPEND API] Cached vendor result for key: ${cacheKey}`);
      } catch (cacheError) {
        console.warn(`[SPEND API] Failed to cache vendor result: ${cacheError}`);
      }

      return NextResponse.json(vendorResult, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
        }
      });
    }

  } catch (error) {
    console.error('Spend API error:', error);
    return NextResponse.json({
      spending: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 50,
        hasNextPage: false,
        hasPrevPage: false
      },
      summary: {
        totalAmount: 0,
        recordCount: 0
      },
      error: 'Failed to fetch spending data',
      details: error
    }, { status: 500 });
  }
} 