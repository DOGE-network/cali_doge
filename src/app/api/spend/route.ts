import { NextResponse } from 'next/server';
import { parseFilterValue, matchesFilter } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  try {
    const url = new URL(request.url || '', 'http://localhost');
    const searchParams = url.searchParams;
    const view = searchParams.get('view') || 'vendor';
    const sort = searchParams.get('sort') || 'vendor';
    const order = searchParams.get('order') || 'asc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const filter = searchParams.get('filter');
    const department = searchParams.get('department');
    const vendorParam = searchParams.get('vendor');
    const fundParam = searchParams.get('fund');
    const programParam = searchParams.get('program');

    const supabase = require('@/lib/supabase').getServiceSupabase();

    if (view === 'vendor') {
      // Pagination params
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit - 1;

      // Use the view for vendor transactions with vendor name
      let query = supabase
        .from('vendor_transactions_with_vendor')
        .select('*', { count: 'exact' });

      // Filtering (move as much as possible to SQL)
      if (vendorParam) {
        query = query.ilike('vendor_name', `%${vendorParam}%`);
      }
      if (department) {
        query = query.ilike('department_code', `%${department}%`);
      }
      if (programParam) {
        query = query.ilike('program_code', `%${programParam}%`);
      }
      if (fundParam) {
        query = query.ilike('fund_code', `%${fundParam}%`);
      }
      // Sorting
      if (sort === 'amount') {
        query = query.order('amount', { ascending: order === 'asc' });
      } else if (sort === 'year') {
        query = query.order('fiscal_year', { ascending: order === 'asc' });
      } else if (sort === 'vendor') {
        query = query.order('vendor_name', { ascending: order === 'asc' });
      }

      // Pagination
      query = query.range(startIndex, endIndex);

      // Fetch paginated transactions and total count
      const { data: transactions, error: txError, count } = await query;
      if (txError) throw txError;

      // Extract unique department, program, and fund codes from paginated transactions
      const departmentCodes = Array.from(new Set(transactions.map(tx => tx.department_code).filter(Boolean)));
      const programCodes = Array.from(new Set(transactions.map(tx => tx.program_code).filter(Boolean)));
      const fundCodes = Array.from(new Set(transactions.map(tx => tx.fund_code).filter(Boolean)));
      // Fetch only those departments, programs, and funds
      let allDepartments: { organizational_code: string; name: string }[] = [];
      if (departmentCodes.length > 0) {
        const { data: departmentsData, error: deptError } = await supabase
          .from('departments')
          .select('organizational_code, name')
          .in('organizational_code', departmentCodes);
        if (deptError) throw deptError;
        allDepartments = departmentsData || [];
      }
      let allPrograms: { project_code: string; name: string }[] = [];
      if (programCodes.length > 0) {
        const { data: programsData, error: progError } = await supabase
          .from('programs')
          .select('project_code, name')
          .in('project_code', programCodes);
        if (progError) throw progError;
        allPrograms = programsData || [];
      }
      let allFunds: { fund_code: string; name: string }[] = [];
      if (fundCodes.length > 0) {
        const { data: fundsData, error: fundError } = await supabase
          .from('funds')
          .select('fund_code, name')
          .in('fund_code', fundCodes);
        if (fundError) throw fundError;
        allFunds = fundsData || [];
      }
      // Build lookup maps
      const departmentMap = new Map();
      allDepartments.forEach(dept => {
        departmentMap.set(dept.organizational_code, dept.name);
      });
      const programMap = new Map();
      allPrograms.forEach(prog => {
        programMap.set(prog.project_code, prog.name);
      });
      const fundMap = new Map();
      allFunds.forEach(fund => {
        fundMap.set(fund.fund_code, fund.name);
      });
      // Map each transaction to a record for the UI
      let records = transactions.map(tx => ({
        year: tx.fiscal_year,
        department: departmentMap.get(tx.department_code) || 'Unknown Department',
        vendor: tx.vendor_name || 'Unknown Vendor',
        program: programMap.get(tx.program_code) || 'Unknown Program',
        fund: fundMap.get(tx.fund_code) || 'Unknown Fund',
        amount: tx.amount || 0,
      }));
      // Filtering for free-text filter (must be done after join)
      if (filter) {
        const filterTerms = parseFilterValue(filter);
        records = records.filter(record =>
          matchesFilter(record.vendor, filterTerms) ||
          matchesFilter(record.department, filterTerms) ||
          matchesFilter(record.program, filterTerms) ||
          matchesFilter(record.fund, filterTerms)
        );
      }
      // Sorting for department, program, fund (must be done after join)
      if (['department', 'program', 'fund'].includes(sort)) {
        records.sort((a, b) => {
          const multiplier = order === 'desc' ? -1 : 1;
          return multiplier * a[sort].localeCompare(b[sort]);
        });
      }
      // Pagination metadata
      const totalItems = count ?? records.length;
      const totalPages = Math.ceil(totalItems / limit);
      const paginatedRecords = records;
      const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
      const recordCount = records.length;
      return NextResponse.json({
        spending: paginatedRecords,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        summary: {
          totalAmount,
          recordCount,
        },
        availableYears: [],
      });
    }
    if (view === 'budget') {
      try {
        // Pagination params
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit - 1;

        console.debug('[Budget API] Start budget view (using view budget_line_items_with_names)', { page, limit, sort, order, department, programParam, fundParam, filter });

        // Query the flattened view
        let query = supabase
          .from('budget_line_items_with_names')
          .select('*', { count: 'exact' });

        // Filtering (move as much as possible to SQL)
        if (department) {
          query = query.ilike('department_code', `%${department}%`);
        }
        if (programParam) {
          query = query.ilike('program_name', `%${programParam}%`);
        }
        if (fundParam) {
          query = query.ilike('fund_name', `%${fundParam}%`);
        }
      if (filter) {
          // Free-text filter across department, program, fund
          const filterValue = `%${filter}%`;
          query = query.or(`department_name.ilike.${filterValue},program_name.ilike.${filterValue},fund_name.ilike.${filterValue}`);
      }

        // Sorting
        const sortable = {
          year: 'fiscal_year',
          department: 'department_name',
          program: 'program_name',
          fund: 'fund_name',
          amount: 'amount',
        };
        const sortCol = sortable[sort] || 'amount';
        query = query.order(sortCol, { ascending: order === 'asc' });

        // Pagination
        query = query.range(startIndex, endIndex);

        console.debug('[Budget API] Fetching from view...');
        const { data: records, error: viewError, count } = await query;
        if (viewError) { console.error('[Budget API] viewError', viewError); throw viewError; }
        console.debug('[Budget API] Records fetched', { count: records?.length, total: count });

        // Map each record for the UI
        const mappedRecords = (records || []).map(item => ({
          year: item.fiscal_year,
          department: item.department_name || 'Unknown Department',
          vendor: 'Budget Allocation',
          program: item.program_name || 'Unknown Program',
          fund: item.fund_name || 'Unknown Fund',
          amount: item.amount || 0,
        }));
        console.debug('[Budget API] Records mapped', { count: mappedRecords.length });

        // Pagination metadata
        const totalItems = count ?? mappedRecords.length;
      const totalPages = Math.ceil(totalItems / limit);
        const paginatedRecords = mappedRecords;
        const totalAmount = mappedRecords.reduce((sum, record) => sum + record.amount, 0);
        const recordCount = mappedRecords.length;

        console.debug('[Budget API] Returning response', { totalItems, totalPages, recordCount, totalAmount });
      return NextResponse.json({
        spending: paginatedRecords,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
        summary: {
          totalAmount,
            recordCount,
          },
          availableYears: [],
        });
      } catch (err) {
        console.error('[Budget API] Caught error', err);
        throw err;
      }
    }
    if (view === 'compare') {
      try {
        const compareBy = searchParams.get('compareBy') || 'department';
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit - 1;
        const yearParam = searchParams.get('year');

        // Map compareBy to summary table and columns
        const compareConfig = {
          fund: {
            table: 'fund_compare_summary',
            codeField: 'fund_code',
            nameField: 'fund_name',
          },
          department: {
            table: 'department_compare_summary',
            codeField: 'department_code',
            nameField: 'department_name',
          },
          program: {
            table: 'program_compare_summary',
            codeField: 'program_code',
            nameField: 'program_name',
          },
        };
        const { table, codeField, nameField } = compareConfig[compareBy];

        let query = supabase.from(table).select('*', { count: 'exact' });

        // Filtering by year
        if (yearParam) {
          query = query.eq('year', parseInt(yearParam, 10));
        }

        // Filtering by compareBy field (code or name)
        if (filter) {
          query = query.or(`${codeField}.ilike.%${filter}%,${nameField}.ilike.%${filter}%`);
        }

        // Sorting
        if (sort === 'vendorAmount') {
          query = query.order('vendor_amount', { ascending: order === 'asc' });
        } else if (sort === 'budgetAmount') {
          query = query.order('budget_amount', { ascending: order === 'asc' });
        } else if (sort === 'year') {
          query = query.order('year', { ascending: order === 'asc' });
        } else if (sort === `${compareBy}`) {
          query = query.order(nameField, { ascending: order === 'asc' });
        } else if (sort === `${compareBy}Name`) {
          query = query.order(nameField, { ascending: order === 'asc' });
        }
        // Pagination
        query = query.range(startIndex, endIndex);

        const { data, error, count } = await query;
        if (error) throw error;

        // Map to UI format
        const records = (data || []).map(row => ({
          year: row.year,
          [`${compareBy}Code`]: row[codeField],
          [`${compareBy}Name`]: row[nameField],
          vendorAmount: row.vendor_amount || 0,
          budgetAmount: row.budget_amount || 0,
        }));

        const totalItems = count ?? records.length;
        const totalPages = Math.ceil(totalItems / limit);

        return NextResponse.json({
          spending: records,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
          summary: {
            totalAmount: records.reduce((sum, r) => sum + (r.vendorAmount || 0), 0),
            recordCount: records.length,
          },
        });
      } catch (err) {
        console.error('[Compare API] Caught error', err);
        throw err;
      }
    }
    return NextResponse.json({ error: 'Invalid view parameter. Must be either "vendor", "budget", or "compare".' }, { status: 400 });
  } catch (err) {
    console.error('Spend API error:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch spending data',
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
        }
      },
      { status: 500 }
    );
  }
} 