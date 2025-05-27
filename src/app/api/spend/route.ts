import { NextResponse } from 'next/server';
const { getBudgetsData, getVendorsData, getProgramsData, getFundsData } = require('@/lib/api/dataAccess');
import type { BudgetsJSON } from '@/types/budget';
import type { OptimizedVendorsJSON } from '@/types/vendor';
import type { ProgramsJSON } from '@/types/program';
import type { FundsJSON } from '@/types/fund';
import { getDepartmentSlugs } from '@/lib/blog';
import departmentsData from '@/data/departments.json';
import type { DepartmentsJSON } from '@/types/department';

export const revalidate = 3600; // Revalidate every hour

interface SpendingRecord {
  year: number;
  department: string;
  departmentSlug?: string;
  vendor: string;
  program: string;
  fund: string;
  amount: number;
  // For compare view
  vendorAmount?: number;
  budgetAmount?: number;
}

interface SpendResponse {
  spending: SpendingRecord[];
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
    recordCount: number;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const view = searchParams.get('view') || 'vendor'; // budget|vendor|compare
    const compareBy = searchParams.get('compareBy') || 'department'; // department|program|fund (for compare view)
    const filter = searchParams.get('filter') || 'all'; // all|year|department|vendor|program|fund
    const year = searchParams.get('year');
    const department = searchParams.get('department');
    const vendor = searchParams.get('vendor');
    const program = searchParams.get('program');
    const fund = searchParams.get('fund');
    const sort = searchParams.get('sort') || 'amount'; // year|department|vendor|program|fund|amount
    const order = searchParams.get('order') || 'desc'; // asc|desc
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    console.log('Spend API request:', { view, filter, year, department, vendor, program, fund, sort, order, page, limit });

    // Load data from multiple sources
    const [budgetsData, vendorsData, programsData, fundsData, departmentSlugs] = await Promise.all([
      getBudgetsData() as Promise<BudgetsJSON>,
      getVendorsData() as Promise<OptimizedVendorsJSON>,
      getProgramsData() as Promise<ProgramsJSON>,
      getFundsData() as Promise<FundsJSON>,
      getDepartmentSlugs()
    ]);

    const typedDepartments = departmentsData as unknown as DepartmentsJSON;

    // Create department lookup maps
    const departmentByOrgCode = new Map();
    const departmentSlugMap = new Map();
    
    typedDepartments.departments.forEach(dept => {
      departmentByOrgCode.set(String(dept.organizationalCode).padStart(4, '0'), dept.name);
      
      // Find matching markdown slug
      const matchingSlug = departmentSlugs.find(slug => {
        const [orgCode] = slug.split('_');
        return orgCode === String(dept.organizationalCode).padStart(4, '0');
      });
      
      if (matchingSlug) {
        departmentSlugMap.set(dept.name, matchingSlug);
      }
    });

    // Create program lookup map
    const programMap = new Map();
    programsData.programs.forEach(prog => {
      programMap.set(prog.projectCode, prog.name || 'Unknown Program');
    });

    // Create fund lookup map
    const fundMap = new Map();
    fundsData.funds.forEach(fundItem => {
      fundMap.set(fundItem.fundCode, fundItem.fundName);
    });

    let spendingRecords: SpendingRecord[] = [];

    if (view === 'compare') {
      // For compare view, aggregate vendor and budget amounts by the specified field
      const aggregationMap = new Map<string, {
        year: number;
        department: string;
        departmentSlug?: string;
        program: string;
        fund: string;
        vendorAmount: number;
        budgetAmount: number;
      }>();

      // Process vendor data
      const vendors = (vendorsData as any).v || [];
      vendors.forEach((vendorGroup: any) => {
        const vendorNames = vendorGroup.n || [];
        vendorNames.forEach((vendor: any) => {
          const fiscalYears = vendor.fy || [];
          fiscalYears.forEach((fiscalYear: any) => {
            const projectCodes = fiscalYear.pc || [];
            projectCodes.forEach((projectCode: any) => {
              const orgCodes = projectCode.oc || [];
              orgCodes.forEach((orgCode: any) => {
                const fundCodes = orgCode.fc || [];
                fundCodes.forEach((fundCode: any) => {
                  const deptName = departmentByOrgCode.get(String(orgCode.c).padStart(4, '0')) || 'Unknown Department';
                  const progName = programMap.get(projectCode.c) || 'Unknown Program';
                  const fundName = fundMap.get(String(fundCode.c)) || 'Unknown Fund';
                  const departmentSlug = departmentSlugMap.get(deptName);

                  // Create aggregation key based on compareBy field
                  let compareValue: string;
                  switch (compareBy) {
                    case 'program':
                      compareValue = progName;
                      break;
                    case 'fund':
                      compareValue = fundName;
                      break;
                    case 'department':
                    default:
                      compareValue = deptName;
                      break;
                  }

                  const key = `${parseInt(fiscalYear.y)}-${compareValue}`;
                  
                  if (!aggregationMap.has(key)) {
                    aggregationMap.set(key, {
                      year: parseInt(fiscalYear.y),
                      department: deptName,
                      departmentSlug,
                      program: progName,
                      fund: fundName,
                      vendorAmount: 0,
                      budgetAmount: 0
                    });
                  }

                  const existing = aggregationMap.get(key)!;
                  existing.vendorAmount += fundCode.a;
                });
              });
            });
          });
        });
      });

      // Process budget data
      budgetsData.budget.forEach(orgBudget => {
        orgBudget.fiscalYear.forEach(fiscalYear => {
          fiscalYear.projectCode.forEach(projectCode => {
            projectCode.fundingType.forEach(fundingType => {
              fundingType.fundCode.forEach(fundAllocation => {
                const deptName = departmentByOrgCode.get(String(orgBudget.code).padStart(4, '0')) || 'Unknown Department';
                const progName = programMap.get(projectCode.code) || 'Unknown Program';
                const fundName = fundMap.get(String(fundAllocation.code)) || 'Unknown Fund';
                const departmentSlug = departmentSlugMap.get(deptName);

                // Create aggregation key based on compareBy field
                let compareValue: string;
                switch (compareBy) {
                  case 'program':
                    compareValue = progName;
                    break;
                  case 'fund':
                    compareValue = fundName;
                    break;
                  case 'department':
                  default:
                    compareValue = deptName;
                    break;
                }

                const key = `${fiscalYear.year}-${compareValue}`;
                
                if (!aggregationMap.has(key)) {
                  aggregationMap.set(key, {
                    year: fiscalYear.year,
                    department: deptName,
                    departmentSlug,
                    program: progName,
                    fund: fundName,
                    vendorAmount: 0,
                    budgetAmount: 0
                  });
                }

                const existing = aggregationMap.get(key)!;
                existing.budgetAmount += fundAllocation.amount;
              });
            });
          });
        });
      });

      // Convert aggregation map to records
      spendingRecords = Array.from(aggregationMap.values()).map(item => ({
        year: item.year,
        department: item.department,
        departmentSlug: item.departmentSlug,
        vendor: 'Comparison', // Not used in compare view
        program: item.program,
        fund: item.fund,
        amount: item.vendorAmount + item.budgetAmount, // Total for sorting
        vendorAmount: item.vendorAmount,
        budgetAmount: item.budgetAmount
      }));

    } else {
      // Process data for vendor and budget views (existing logic)
      if (view === 'vendor') {
        // Process vendor data - handle actual structure with v array
        const vendors = (vendorsData as any).v || [];
        vendors.forEach((vendorGroup: any) => {
          const vendorNames = vendorGroup.n || [];
          vendorNames.forEach((vendor: any) => {
            const fiscalYears = vendor.fy || [];
            fiscalYears.forEach((fiscalYear: any) => {
              const projectCodes = fiscalYear.pc || [];
              projectCodes.forEach((projectCode: any) => {
                const orgCodes = projectCode.oc || [];
                orgCodes.forEach((orgCode: any) => {
                  const fundCodes = orgCode.fc || [];
                  fundCodes.forEach((fundCode: any) => {
                    const deptName = departmentByOrgCode.get(String(orgCode.c).padStart(4, '0')) || 'Unknown Department';
                    const progName = programMap.get(projectCode.c) || 'Unknown Program';
                    const fundName = fundMap.get(String(fundCode.c)) || 'Unknown Fund';
                    const departmentSlug = departmentSlugMap.get(deptName);

                    spendingRecords.push({
                      year: parseInt(fiscalYear.y),
                      department: deptName,
                      departmentSlug,
                      vendor: vendor.n,
                      program: progName,
                      fund: fundName,
                      amount: fundCode.a
                    });
                  });
                });
              });
            });
          });
        });
      }

      if (view === 'budget') {
        // Process budget data
        budgetsData.budget.forEach(orgBudget => {
          orgBudget.fiscalYear.forEach(fiscalYear => {
            fiscalYear.projectCode.forEach(projectCode => {
              projectCode.fundingType.forEach(fundingType => {
                fundingType.fundCode.forEach(fundAllocation => {
                  const deptName = departmentByOrgCode.get(String(orgBudget.code).padStart(4, '0')) || 'Unknown Department';
                  const progName = programMap.get(projectCode.code) || 'Unknown Program';
                  const fundName = fundMap.get(String(fundAllocation.code)) || 'Unknown Fund';
                  const departmentSlug = departmentSlugMap.get(deptName);

                  spendingRecords.push({
                    year: fiscalYear.year,
                    department: deptName,
                    departmentSlug,
                    vendor: 'Budget Allocation',
                    program: progName,
                    fund: fundName,
                    amount: fundAllocation.amount
                  });
                });
              });
            });
          });
        });
      }
    }

    // Apply filters
    let filteredRecords = spendingRecords;

    if (year) {
      filteredRecords = filteredRecords.filter(record => record.year === parseInt(year));
    }

    if (department) {
      filteredRecords = filteredRecords.filter(record => 
        record.department.toLowerCase().includes(department.toLowerCase())
      );
    }

    if (vendor) {
      filteredRecords = filteredRecords.filter(record => 
        record.vendor.toLowerCase().includes(vendor.toLowerCase())
      );
    }

    if (program) {
      filteredRecords = filteredRecords.filter(record => 
        record.program.toLowerCase().includes(program.toLowerCase())
      );
    }

    if (fund) {
      filteredRecords = filteredRecords.filter(record => 
        record.fund.toLowerCase().includes(fund.toLowerCase())
      );
    }

    // Apply sorting
    filteredRecords.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort) {
        case 'year':
          aValue = a.year;
          bValue = b.year;
          break;
        case 'department':
          aValue = a.department.toLowerCase();
          bValue = b.department.toLowerCase();
          break;
        case 'vendor':
          aValue = a.vendor.toLowerCase();
          bValue = b.vendor.toLowerCase();
          break;
        case 'program':
          aValue = a.program.toLowerCase();
          bValue = b.program.toLowerCase();
          break;
        case 'fund':
          aValue = a.fund.toLowerCase();
          bValue = b.fund.toLowerCase();
          break;
        case 'vendorAmount':
          aValue = a.vendorAmount || 0;
          bValue = b.vendorAmount || 0;
          break;
        case 'budgetAmount':
          aValue = a.budgetAmount || 0;
          bValue = b.budgetAmount || 0;
          break;
        case 'amount':
        default:
          aValue = a.amount;
          bValue = b.amount;
          break;
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    // Calculate summary
    const totalAmount = filteredRecords.reduce((sum, record) => sum + record.amount, 0);
    const recordCount = filteredRecords.length;

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const totalPages = Math.ceil(recordCount / limit);
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    const response: SpendResponse = {
      spending: paginatedRecords,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: recordCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary: {
        totalAmount,
        recordCount
      }
    };

    console.log('Spend API response summary:', {
      totalRecords: recordCount,
      totalAmount: totalAmount.toLocaleString(),
      paginatedCount: paginatedRecords.length,
      view,
      filters: { year, department, vendor, program, fund }
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });

  } catch (error) {
    console.error('Error in Spend API:', error);
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