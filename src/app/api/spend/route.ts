import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const vendor = searchParams.get('vendor');
    const program = searchParams.get('program');
    const fund = searchParams.get('fund');
    const year = searchParams.get('year');
    const view = searchParams.get('view') || 'vendor';
    const compareBy = searchParams.get('compareBy') || 'department';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const sort = searchParams.get('sort') || 'amount';
    const order = searchParams.get('order') || 'desc';

    const supabase = getServiceSupabase();

    if (view === 'budget') {
      // Budget view - use budget_line_items_with_names materialized view
      let query = supabase
        .from('budget_line_items_with_names')
        .select('*', { count: 'exact' });

      // Apply filters
      if (department) {
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

      const { data, error, count } = await query
        .order('amount', { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

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
      const { data: totalData, error: totalError } = await supabase
        .from('budget_line_items_with_names')
        .select('amount')
        .ilike('department_name', department ? `%${department}%` : '%')
        .eq('fiscal_year', year ? parseInt(year) : 0);

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
        vendor: 'Budget Allocation',
        program: item.program_name || 'Unknown Program',
        fund: item.fund_name || 'Unknown Fund',
        amount: parseFloat(item.amount.toString())
      })) || [];

      const totalPages = Math.ceil((count || 0) / limit);
      const currentPage = page;
      const itemsPerPage = limit;
      const totalItems = count || 0;

      return NextResponse.json({
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
          recordCount: totalItems
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
      const sortField = sort === 'amount' ? 'vendor_amount' : 
                       sort === 'year' ? 'year' :
                       sort === 'vendorAmount' ? 'vendor_amount' :
                       sort === 'budgetAmount' ? 'budget_amount' :
                       compareBy === 'department' ? 'department_name' :
                       compareBy === 'program' ? 'program_name' :
                       compareBy === 'fund' ? 'fund_name' : 'vendor_amount';
      const ascending = order === 'asc';
      query = query.order(sortField, { ascending });

      const { data, error, count } = await query
        .range(offset, offset + limit - 1);

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

      return NextResponse.json({
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
        
        if (department) {
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
          .range(offset, offset + limit - 1);

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
          if (department) {
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
          const aVal = a[sortField] || 0;
          const bVal = b[sortField] || 0;
          return ascending ? aVal - bVal : bVal - aVal;
        });
        
        // Apply pagination
        const startIndex = offset;
        const endIndex = offset + limit;
        data = allTransactions.slice(startIndex, endIndex);
        count = allTransactions.length;
        totalAmount = allTransactions.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
      }

      // Transform data to match expected format
      const spending = data?.map(item => ({
        year: item.fiscal_year,
        department: item.department_name || 'Unknown Department',
        vendor: item.vendor_name || 'Unknown Vendor',
        program: item.program_code || 'Unknown Program',
        fund: item.fund_code || 'Unknown Fund',
        amount: parseFloat(item.amount.toString())
      })) || [];

      const totalPages = Math.ceil((count || 0) / limit);
      const currentPage = page;
      const itemsPerPage = limit;
      const totalItems = count || 0;

      return NextResponse.json({
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
          recordCount: totalItems
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