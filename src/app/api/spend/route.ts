import { NextResponse } from 'next/server';
import budgetsData from '@/data/budgets.json';
import programsData from '@/data/programs.json';
import fundsData from '@/data/funds.json';
const { getVendorsData, readJsonFile } = require('@/lib/api/dataAccess');
import type { BudgetsJSON } from '@/types/budget';
import type { OptimizedVendorsJSON } from '@/types/vendor';
import type { ProgramsJSON } from '@/types/program';
import type { FundsJSON } from '@/types/fund';
import { getDepartmentSlugs } from '@/lib/blog';
import type { DepartmentsJSON } from '@/types/department';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

// Helper function to format fiscal year
function formatFiscalYear(year: number): string {
  return `FY${year}_FY${year + 1}`;
}

// Helper function to get year range
function getYearRange(yearRange: string, availableYears: number[]): number[] {
  const sortedYears = [...availableYears].sort((a, b) => b - a); // Most recent first
  
  if (yearRange === 'recent') {
    // Return last 3 years
    return sortedYears.slice(0, 3);
  }
  
  // Return all years
  return sortedYears;
}

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

interface YearColumnRecord {
  department: string;
  departmentSlug?: string;
  vendor: string;
  program: string;
  fund: string;
  [key: string]: string | number | undefined; // For dynamic year columns like FY2023_FY2024
}

interface SpendResponse {
  spending: SpendingRecord[] | YearColumnRecord[];
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
  yearColumns?: string[];
  availableYears?: number[];
  yearRange?: 'recent' | 'all';
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
    const yearRange = searchParams.get('yearRange') || 'all'; // all|recent
    const yearColumns = searchParams.get('yearColumns') === 'true';

    console.log('Spend API request:', { view, filter, year, department, vendor, program, fund, sort, order, page, limit });

    // Load data from multiple sources
    const [departmentSlugs, vendorsData, departmentsData] = await Promise.all([
      getDepartmentSlugs(),
      getVendorsData() as Promise<OptimizedVendorsJSON>,
      readJsonFile('departments.json') as Promise<DepartmentsJSON>
    ]);
    
    const typedBudgets = budgetsData as unknown as BudgetsJSON;
    const typedVendors = vendorsData as OptimizedVendorsJSON;
    const typedPrograms = programsData as unknown as ProgramsJSON;
    const typedFunds = fundsData as unknown as FundsJSON;
    const typedDepartments = departmentsData as DepartmentsJSON;

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
    typedPrograms.programs.forEach(prog => {
      programMap.set(prog.projectCode, prog.name || 'Unknown Program');
    });

    // Create fund lookup map
    const fundMap = new Map();
    typedFunds.funds.forEach(fundItem => {
      fundMap.set(fundItem.fundCode, fundItem.fundName);
    });

    // Collect all available years
    const availableYearsSet = new Set<number>();
    
    // Get years from vendor data
    const vendors = (typedVendors as any).v || [];
    vendors.forEach((vendorGroup: any) => {
      const vendorNames = vendorGroup.n || [];
      vendorNames.forEach((vendor: any) => {
        const fiscalYears = vendor.fy || [];
        fiscalYears.forEach((fiscalYear: any) => {
          availableYearsSet.add(parseInt(fiscalYear.y));
        });
      });
    });
    
    // Get years from budget data
    typedBudgets.budget.forEach(orgBudget => {
      orgBudget.fiscalYear.forEach(fiscalYear => {
        availableYearsSet.add(fiscalYear.year);
      });
    });

    const availableYears = Array.from(availableYearsSet);
    const selectedYears = getYearRange(yearRange, availableYears);

    let spendingRecords: SpendingRecord[] = [];
    let yearColumnRecords: YearColumnRecord[] = [];

    if (yearColumns) {
      // Year columns view - aggregate by entity with year amounts as columns
      const aggregationMap = new Map<string, YearColumnRecord>();

      // Process vendor data
      if (view === 'vendor' || view === 'compare') {
        vendors.forEach((vendorGroup: any) => {
          const vendorNames = vendorGroup.n || [];
          vendorNames.forEach((vendor: any) => {
            const fiscalYears = vendor.fy || [];
            fiscalYears.forEach((fiscalYear: any) => {
              const year = parseInt(fiscalYear.y);
              if (!selectedYears.includes(year)) return;

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

                    const key = `${deptName}|${vendor.n}|${progName}|${fundName}`;
                    
                    if (!aggregationMap.has(key)) {
                      aggregationMap.set(key, {
                        department: deptName,
                        departmentSlug,
                        vendor: vendor.n,
                        program: progName,
                        fund: fundName
                      });
                    }

                    const existing = aggregationMap.get(key)!;
                    const yearKey = formatFiscalYear(year);
                    const currentAmount = (existing[yearKey] as number) || 0;
                    existing[yearKey] = currentAmount + fundCode.a;
                  });
                });
              });
            });
          });
        });
      }

      // Process budget data
      if (view === 'budget' || view === 'compare') {
        typedBudgets.budget.forEach(orgBudget => {
          orgBudget.fiscalYear.forEach(fiscalYear => {
            if (!selectedYears.includes(fiscalYear.year)) return;

            fiscalYear.projectCode.forEach(projectCode => {
              projectCode.fundingType.forEach(fundingType => {
                fundingType.fundCode.forEach(fundAllocation => {
                  const deptName = departmentByOrgCode.get(String(orgBudget.code).padStart(4, '0')) || 'Unknown Department';
                  const progName = programMap.get(projectCode.code) || 'Unknown Program';
                  const fundName = fundMap.get(String(fundAllocation.code)) || 'Unknown Fund';
                  const departmentSlug = departmentSlugMap.get(deptName);

                  const vendorName = view === 'budget' ? 'Budget Allocation' : 'Budget Allocation';
                  const key = `${deptName}|${vendorName}|${progName}|${fundName}`;
                  
                  if (!aggregationMap.has(key)) {
                    aggregationMap.set(key, {
                      department: deptName,
                      departmentSlug,
                      vendor: vendorName,
                      program: progName,
                      fund: fundName
                    });
                  }

                  const existing = aggregationMap.get(key)!;
                  const yearKey = formatFiscalYear(fiscalYear.year);
                  
                  if (view === 'compare') {
                    // For compare view, add to budget amount columns
                    const budgetYearKey = `budget_${yearKey}`;
                    const currentAmount = (existing[budgetYearKey] as number) || 0;
                    existing[budgetYearKey] = currentAmount + fundAllocation.amount;
                  } else {
                    // For budget view, add to regular year columns
                    const currentAmount = (existing[yearKey] as number) || 0;
                    existing[yearKey] = currentAmount + fundAllocation.amount;
                  }
                });
              });
            });
          });
        });
      }

             yearColumnRecords = Array.from(aggregationMap.values());

    } else {
      // Original row-based view (existing logic)
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

      } else if (view === 'vendor') {
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

    // Apply filters and sorting
    let filteredRecords: SpendingRecord[] | YearColumnRecord[];
    let totalAmount: number;
    let recordCount: number;

    if (yearColumns) {
      // Handle year columns filtering and sorting
      let filteredYearRecords = yearColumnRecords;

      if (department) {
        filteredYearRecords = filteredYearRecords.filter(record => 
          record.department.toLowerCase().includes(department.toLowerCase())
        );
      }

      if (vendor) {
        filteredYearRecords = filteredYearRecords.filter(record => 
          record.vendor.toLowerCase().includes(vendor.toLowerCase())
        );
      }

      if (program) {
        filteredYearRecords = filteredYearRecords.filter(record => 
          record.program.toLowerCase().includes(program.toLowerCase())
        );
      }

      if (fund) {
        filteredYearRecords = filteredYearRecords.filter(record => 
          record.fund.toLowerCase().includes(fund.toLowerCase())
        );
      }

      // Apply sorting for year columns
      filteredYearRecords.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sort) {
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
          default:
            // For year columns, sort by first available year column
            const firstYearKey = selectedYears.length > 0 ? formatFiscalYear(selectedYears[0]) : '';
            aValue = (a[firstYearKey] as number) || 0;
            bValue = (b[firstYearKey] as number) || 0;
            break;
        }

        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
      });

      // Calculate summary for year columns
      totalAmount = filteredYearRecords.reduce((sum, record) => {
        let recordTotal = 0;
        selectedYears.forEach(year => {
          const yearKey = formatFiscalYear(year);
          recordTotal += (record[yearKey] as number) || 0;
        });
        return sum + recordTotal;
      }, 0);
      
      recordCount = filteredYearRecords.length;
      filteredRecords = filteredYearRecords;

    } else {
      // Handle regular row-based filtering and sorting
      let filteredRowRecords = spendingRecords;

      if (year) {
        filteredRowRecords = filteredRowRecords.filter(record => record.year === parseInt(year));
      }

      if (department) {
        filteredRowRecords = filteredRowRecords.filter(record => 
          record.department.toLowerCase().includes(department.toLowerCase())
        );
      }

      if (vendor) {
        filteredRowRecords = filteredRowRecords.filter(record => 
          record.vendor.toLowerCase().includes(vendor.toLowerCase())
        );
      }

      if (program) {
        filteredRowRecords = filteredRowRecords.filter(record => 
          record.program.toLowerCase().includes(program.toLowerCase())
        );
      }

      if (fund) {
        filteredRowRecords = filteredRowRecords.filter(record => 
          record.fund.toLowerCase().includes(fund.toLowerCase())
        );
      }

      // Apply sorting for regular rows
      filteredRowRecords.sort((a, b) => {
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

      // Calculate summary for regular rows
      totalAmount = filteredRowRecords.reduce((sum, record) => sum + record.amount, 0);
      recordCount = filteredRowRecords.length;
      filteredRecords = filteredRowRecords;
    }

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
      },
      yearColumns: selectedYears.map(formatFiscalYear),
      availableYears: selectedYears,
             yearRange: yearRange as 'recent' | 'all'
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
        },
        yearColumns: [],
        availableYears: [],
        yearRange: 'recent'
      },
      { status: 500 }
    );
  }
} 