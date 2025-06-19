import { NextResponse } from 'next/server';
import { parseFilterValue, matchesFilter } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

interface TopVendorRecord {
  year: number;
  years: string[];
  vendor: string;
  totalAmount: number;
  transactionCount: number;
  departments: string[];
  programs: string[];
  funds: string[];
  categories: string[];
  descriptions: string[];
  primaryDepartment?: string;
  primaryDepartmentSlug?: string;
}

interface TopVendorsResponse {
  vendors: TopVendorRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    totalAmount: number;
    vendorCount: number;
    year: number;
    availableYears: string[];
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get('limit') || '100', 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 100 : rawLimit;
  
  // Map frontend column names to database column names
  const columnMapping: Record<string, string> = {
    'vendor': 'vendor_name',
    'totalAmount': 'total_amount',
    'transactionCount': 'transaction_count'
    // Note: programs, funds, categories, descriptions are not available in the vendor_totals_all_years view
    // They would need to be fetched separately or added to the view
  };
  
  // Valid sort columns for the vendor_totals_all_years view
  const validSortColumns = ['vendor_name', 'total_amount', 'transaction_count'];
  
  try {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const frontendSortBy = searchParams.get('sort') || 'total_amount';
    const sortBy = columnMapping[frontendSortBy] || frontendSortBy; // Map to database column name
    
    // Validate that the sort column exists in the view
    if (!validSortColumns.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sort column: ${frontendSortBy}. Valid columns are: ${Object.keys(columnMapping).join(', ')}` },
        { status: 400 }
      );
    }
    
    const sortOrder = searchParams.get('order') || 'desc';
    const search = searchParams.get('filter') || '';

    // Validate and sanitize pagination parameters
    const validPage = isNaN(page) || page < 1 ? 1 : page;

    console.log('Top Vendors API request:', { sortBy, sortOrder, page: validPage, limit, search });

    const supabase = require('@/lib/supabase').getServiceSupabase();

    // Use the vendor_totals_all_years materialized view for efficient aggregation
    let query = supabase
      .from('vendor_totals_all_years')
      .select('*', { count: 'exact' });

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const startIndex = (validPage - 1) * limit;
    const endIndex = startIndex + limit - 1;
    query = query.range(startIndex, endIndex);

    // Execute the query
    const { data: vendorTotals, error: txError, count } = await query;

    if (txError) throw txError;

    // Process vendors into records (data is already aggregated from the view)
    let records: TopVendorRecord[] = [];

    vendorTotals.forEach((vendorTotal) => {
      records.push({
        year: 0, // 0 indicates all years
        years: Array.isArray(vendorTotal.years) ? vendorTotal.years.filter(Boolean) : [],
        vendor: vendorTotal.vendor_name || 'Unknown Vendor',
        totalAmount: vendorTotal.total_amount || 0,
        transactionCount: vendorTotal.transaction_count || 0,
        departments: Array.isArray(vendorTotal.departments) ? vendorTotal.departments.filter(Boolean) : [],
        programs: Array.isArray(vendorTotal.programs) ? vendorTotal.programs.filter(Boolean) : [],
        funds: Array.isArray(vendorTotal.funds) ? vendorTotal.funds.filter(Boolean) : [],
        categories: Array.isArray(vendorTotal.categories) ? vendorTotal.categories.filter(Boolean) : [],
        descriptions: Array.isArray(vendorTotal.descriptions) ? vendorTotal.descriptions.filter(Boolean) : [],
        primaryDepartment: undefined,
        primaryDepartmentSlug: undefined
      });
    });

    // Apply free-text filtering if provided
    if (search) {
      const filterTerms = parseFilterValue(search);
      records = records.filter(record =>
        matchesFilter(record.vendor, filterTerms) ||
        record.departments.some(dept => matchesFilter(dept, filterTerms)) ||
        record.programs.some(prog => matchesFilter(prog, filterTerms)) ||
        record.funds.some(fund => matchesFilter(fund, filterTerms))
      );
    }

    // Calculate summary statistics
    const totalAmount = records.reduce((sum, record) => sum + record.totalAmount, 0);
    const vendorCount = records.length;

    // Pagination metadata
    const totalItems = count || records.length;
    const totalPages = Math.ceil(totalItems / limit);

    const response: TopVendorsResponse = {
      vendors: records,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1,
      },
      summary: {
        totalAmount,
        vendorCount,
        year: 0, // 0 indicates all years
        availableYears: [],
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in top vendors API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        vendors: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false,
        },
        summary: {
          totalAmount: 0,
          vendorCount: 0,
          year: 0,
          availableYears: [],
        },
      },
      { status: 500 }
    );
  }
} 