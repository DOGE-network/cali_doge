import { NextResponse } from 'next/server';
import { parseFilterValue, matchesFilter, mapProgramCodesToNames, mapFundCodesToNames } from '@/lib/utils';

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
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : null; // Default to null (all years)
  
  // Map frontend column names to database column names
  const columnMapping: Record<string, string> = {
    'vendor': 'vendor_name',
    'totalAmount': 'total_amount',
    'transactionCount': 'transaction_count'
  };
  
  // Valid sort columns for the vendor query
  const validSortColumns = ['vendor_name', 'total_amount', 'transaction_count'];
  
  try {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const frontendSortBy = searchParams.get('sort') || 'totalAmount';
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

    console.log('Top Vendors API request:', { sortBy, sortOrder, page: validPage, limit, search, year });

    const supabase = require('@/lib/supabase').getServiceSupabase();

    // Use the new vendor_payments_summary view
    let query = supabase
      .from('vendor_payments_summary')
      .select('*', { count: 'exact' });

    // Apply year filter if specified
    if (year) {
      query = query.contains('years_active', [year]);
    }
  

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const startIndex = (validPage - 1) * limit;
    const endIndex = startIndex + limit - 1;
    query = query.range(startIndex, endIndex);

    // Execute the query
    const { data: vendorRecords, error: txError, count } = await query;

    if (txError) throw txError;

    // Transform the data to match the expected interface
    let records: TopVendorRecord[] = (vendorRecords || []).map((record: any) => ({
      year: year || 0, // Use 0 to indicate all years
      years: year ? [year.toString()] : record.years_active?.map((y: number) => y.toString()) || [],
      vendor: record.vendor_name,
      totalAmount: record.total_amount,
      transactionCount: record.transaction_count,
      departments: record.departments || [],
      programs: record.programs || [],
      funds: record.funds || [],
      categories: record.categories || [],
      descriptions: record.descriptions || [],
      primaryDepartment: undefined,
      primaryDepartmentSlug: undefined
    }));

    // Map program codes to names
    records.forEach(record => {
      record.programs = mapProgramCodesToNames(record.programs);
      record.funds = mapFundCodesToNames(record.funds);
    });

    // Apply free-text filtering if provided (in memory for now)
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

    // Pagination metadata - use the actual count from the database
    const totalItems = count || 0;
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
        year: year || 0, // Use 0 to indicate all years
        availableYears: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
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