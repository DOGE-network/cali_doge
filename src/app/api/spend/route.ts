import { NextResponse } from 'next/server';
import { getVendorsData, readJsonFile } from '@/lib/api/dataAccess';
import { getDepartmentSlugs } from '@/lib/blog';
import type { DepartmentsJSON } from '@/types/department';
import type { BudgetsJSON } from '@/types/budget';
import type { ProgramsJSON } from '@/types/program';
import type { FundsJSON } from '@/types/fund';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

// Types
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
  [key: string]: string | number | undefined; // For dynamic year columns
}

// eslint-disable-next-line no-unused-vars
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

// Helper functions
function parseFilterValue(value: string): { terms: string[], operator: 'AND' | 'OR' } {
  const normalizedValue = value.replace(/,/g, ' AND ');
  const hasOr = normalizedValue.toUpperCase().includes(' OR ');
  const terms = hasOr 
    ? normalizedValue.split(/\s+OR\s+/i)
    : normalizedValue.split(/\s+AND\s+/i);
  
  const cleanedTerms = terms.map(term => {
    term = term.trim();
    if (term.startsWith('"') && term.endsWith('"')) {
      return term.slice(1, -1);
    }
    return term;
  }).filter(term => term.length > 0);
  
  return {
    terms: cleanedTerms,
    operator: hasOr ? 'OR' : 'AND'
  };
}

function matchesFilter(value: string, filterTerms: { terms: string[], operator: 'AND' | 'OR' }): boolean {
  const searchValue = value.toLowerCase();
  if (filterTerms.operator === 'OR') {
    return filterTerms.terms.some(term => searchValue.includes(term.toLowerCase()));
  } else {
    return filterTerms.terms.every(term => searchValue.includes(term.toLowerCase()));
  }
}

// Main API handler
export async function GET(request: Request) {
  try {
    const url = new URL(request.url || '', 'http://localhost');
    const searchParams = url.searchParams;
    
    // Parse query parameters
    const view = searchParams.get('view') || 'vendor';
    const year = searchParams.get('year') || '2024';
    const sort = searchParams.get('sort') || 'totalAmount';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const filter = searchParams.get('filter');
    const department = searchParams.get('department');

    // Validate year format
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: 'Invalid year format. Year must be a 4-digit number.' },
        { status: 400 }
      );
    }

    // Load data from multiple sources
    const [departmentSlugs, vendorsData, departmentsData, budgetsData, programsData, fundsData] = await Promise.all([
      getDepartmentSlugs(),
      getVendorsData(year),
      readJsonFile('departments.json') as Promise<DepartmentsJSON>,
      readJsonFile('budgets.json') as Promise<BudgetsJSON>,
      readJsonFile('programs.json') as Promise<ProgramsJSON>,
      readJsonFile('funds.json') as Promise<FundsJSON>
    ]);

    // Create lookup maps
    const departmentByOrgCode = new Map();
    const departmentSlugMap = new Map();
    const programMap = new Map();
    const fundMap = new Map();

    // Populate department maps
    departmentsData.departments.forEach(dept => {
      departmentByOrgCode.set(String(dept.organizationalCode).padStart(4, '0'), dept.name);
      const matchingSlug = departmentSlugs.find(slug => {
        const [orgCode] = slug.split('_');
        return orgCode === String(dept.organizationalCode).padStart(4, '0');
      });
      if (matchingSlug) {
        departmentSlugMap.set(dept.name, matchingSlug);
      }
    });

    // Populate program map
    programsData.programs.forEach(prog => {
      programMap.set(prog.projectCode, prog.name || 'Unknown Program');
    });

    // Populate fund map
    fundsData.funds.forEach(fund => {
      fundMap.set(fund.fundCode, fund.fundName);
    });

    // Process data based on view
    if (view === 'vendor') {
      // Support both formats: year-specific (t) and all-vendors (v or vendors)
      let vendors: any[] = [];
      if (vendorsData) {
        if (Array.isArray(vendorsData.v)) {
          vendors = vendorsData.v;
        } else if (Array.isArray(vendorsData.vendors)) {
          vendors = vendorsData.vendors;
        } else if (Array.isArray(vendorsData.t)) {
          vendors = vendorsData.t;
        }
      }

      // Filter vendors for the specified year
      let yearVendors: any[] = [];
      if (vendors.length > 0) {
        if (typeof vendors[0].n === 'string') {
          yearVendors = vendors;
        } else {
          yearVendors = vendors.filter(vendor => {
            return Array.isArray(vendor.n) && vendor.n.some(nameEntry => {
              return Array.isArray(nameEntry.fy) && nameEntry.fy.some(yearEntry => yearEntry.y === year);
            });
          });
        }
      }

      // Calculate totals for each vendor
      const vendorAggregates = new Map<string, {
        totalAmount: number;
        transactionCount: number;
        departments: Set<string>;
        programs: Set<string>;
        funds: Set<string>;
        departmentAmounts: Map<string, number>;
      }>();

      yearVendors.forEach(vendor => {
        if (typeof vendor.n === 'string') {
          // Year-specific format
          if (Array.isArray(vendor.d)) {
            vendor.d.forEach(dept => {
              dept.at?.forEach(accountType => {
                accountType.ac?.forEach(accountCat => {
                  accountCat.asc?.forEach(subCat => {
                    subCat.ad?.forEach(desc => {
                      const deptName = departmentByOrgCode.get(String(dept.oc).padStart(4, '0')) || 'Unknown Department';
                      const progName = programMap.get(desc.pc) || 'Unknown Program';
                      const fundName = fundMap.get(String(desc.fc)) || 'Unknown Fund';

                      if (!vendorAggregates.has(vendor.n)) {
                        vendorAggregates.set(vendor.n, {
                          totalAmount: 0,
                          transactionCount: 0,
                          departments: new Set(),
                          programs: new Set(),
                          funds: new Set(),
                          departmentAmounts: new Map()
                        });
                      }

                      const aggregate = vendorAggregates.get(vendor.n)!;
                      aggregate.totalAmount += desc.a || 0;
                      aggregate.transactionCount += desc.ct || 0;
                      aggregate.departments.add(deptName);
                      aggregate.programs.add(progName);
                      aggregate.funds.add(fundName);

                      const currentDeptAmount = aggregate.departmentAmounts.get(deptName) || 0;
                      aggregate.departmentAmounts.set(deptName, currentDeptAmount + (desc.a || 0));
                    });
                  });
                });
              });
            });
          }
        } else if (Array.isArray(vendor.n)) {
          // All-vendors format
          vendor.n.forEach(nameEntry => {
            if (Array.isArray(nameEntry.fy)) {
              nameEntry.fy.forEach(fiscalYear => {
                if (fiscalYear.y === year) {
                  fiscalYear.pc?.forEach(projectCode => {
                    projectCode.oc?.forEach(orgCode => {
                      orgCode.fc?.forEach(fundCode => {
                        const deptName = departmentByOrgCode.get(String(orgCode.c).padStart(4, '0')) || 'Unknown Department';
                        const progName = programMap.get(projectCode.c) || 'Unknown Program';
                        const fundName = fundMap.get(String(fundCode.c)) || 'Unknown Fund';

                        if (!vendorAggregates.has(nameEntry.n)) {
                          vendorAggregates.set(nameEntry.n, {
                            totalAmount: 0,
                            transactionCount: 0,
                            departments: new Set(),
                            programs: new Set(),
                            funds: new Set(),
                            departmentAmounts: new Map()
                          });
                        }

                        const aggregate = vendorAggregates.get(nameEntry.n)!;
                        aggregate.totalAmount += fundCode.a || 0;
                        aggregate.transactionCount += fundCode.ct || 0;
                        aggregate.departments.add(deptName);
                        aggregate.programs.add(progName);
                        aggregate.funds.add(fundName);

                        const currentDeptAmount = aggregate.departmentAmounts.get(deptName) || 0;
                        aggregate.departmentAmounts.set(deptName, currentDeptAmount + (fundCode.a || 0));
                      });
                    });
                  });
                }
              });
            }
          });
        }
      });

      // Convert aggregates to records
      const vendorRecords = Array.from(vendorAggregates.entries()).map(([name, data]) => {
        // Find primary department (highest amount)
        let primaryDepartment = 'Unknown Department';
        let maxAmount = 0;
        data.departmentAmounts.forEach((amount, dept) => {
          if (amount > maxAmount) {
            maxAmount = amount;
            primaryDepartment = dept;
          }
        });

        // Pick a representative program and fund (or join all)
        const program = data.programs.size > 0 ? Array.from(data.programs).join(', ') : 'Unknown Program';
        const fund = data.funds.size > 0 ? Array.from(data.funds).join(', ') : 'Unknown Fund';

        return {
          year: parseInt(year),
          vendor: name,
          totalAmount: data.totalAmount,
          amount: data.totalAmount, // For table display
          transactionCount: data.transactionCount,
          departments: Array.from(data.departments),
          programs: Array.from(data.programs),
          funds: Array.from(data.funds),
          program, // For table display
          fund,    // For table display
          department: primaryDepartment, // For table display
          departmentSlug: departmentSlugMap.get(primaryDepartment), // For table display
          primaryDepartment,
          primaryDepartmentSlug: departmentSlugMap.get(primaryDepartment)
        };
      });

      // Sort records
      vendorRecords.sort((a, b) => {
        const multiplier = order === 'desc' ? -1 : 1;
        switch (sort) {
          case 'vendor':
            return multiplier * a.vendor.localeCompare(b.vendor);
          case 'transactionCount':
            return multiplier * (a.transactionCount - b.transactionCount);
          case 'primaryDepartment':
            return multiplier * (a.primaryDepartment || '').localeCompare(b.primaryDepartment || '');
          case 'totalAmount':
          default:
            return multiplier * (a.totalAmount - b.totalAmount);
        }
      });

      // Apply filter if provided
      let filteredRecords = vendorRecords;
      if (filter) {
        const filterTerms = parseFilterValue(filter);
        filteredRecords = vendorRecords.filter(record => 
          matchesFilter(record.vendor, filterTerms) ||
          record.departments.some(dept => matchesFilter(dept, filterTerms)) ||
          record.programs.some(prog => matchesFilter(prog, filterTerms)) ||
          record.funds.some(fund => matchesFilter(fund, filterTerms))
        );
      }

      // Apply department filter if provided
      if (department) {
        const departmentLower = department.toLowerCase();
        filteredRecords = filteredRecords
          .map(record => {
            const match = Array.isArray(record.departments)
              ? record.departments.find(d => d.toLowerCase().includes(departmentLower))
              : undefined;
            if (match) {
              return { ...record, department: match };
            }
            return undefined as typeof record | undefined;
          })
          .filter((r): r is typeof filteredRecords[0] => Boolean(r));
      }

      // Apply vendor filter if provided
      const vendorParam = searchParams.get('vendor');
      if (vendorParam) {
        const vendorLower = vendorParam.toLowerCase();
        filteredRecords = filteredRecords
          .map(record => {
            if (record.vendor && record.vendor.toLowerCase().includes(vendorLower)) {
              return record;
            }
            return undefined as typeof record | undefined;
          })
          .filter((r): r is typeof filteredRecords[0] => Boolean(r));
      }

      // Apply fund filter if provided
      const fundParam = searchParams.get('fund');
      if (fundParam) {
        const fundLower = fundParam.toLowerCase();
        filteredRecords = filteredRecords
          .map(record => {
            const match = Array.isArray(record.funds)
              ? record.funds.find(f => f.toLowerCase().includes(fundLower))
              : undefined;
            if (match) {
              return { ...record, fund: match };
            }
            return undefined as typeof record | undefined;
          })
          .filter((r): r is typeof filteredRecords[0] => Boolean(r));
      }

      // Apply program filter if provided
      const programParam = searchParams.get('program');
      if (programParam) {
        const programLower = programParam.toLowerCase();
        filteredRecords = filteredRecords
          .map(record => {
            const match = Array.isArray(record.programs)
              ? record.programs.find(p => p.toLowerCase().includes(programLower))
              : undefined;
            if (match) {
              return { ...record, program: match };
            }
            return undefined as typeof record | undefined;
          })
          .filter((r): r is typeof filteredRecords[0] => Boolean(r));
      }

      // Pagination
      const totalItems = filteredRecords.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

      // Calculate summary statistics
      const totalAmount = filteredRecords.reduce((sum, record) => sum + record.totalAmount, 0);
      const recordCount = filteredRecords.length;

      // Collect available years
      const availableYearsSet = new Set<number>();
      if (typeof vendors[0]?.n === 'string') {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), 'src/data');
        const files = fs.readdirSync(dataDir);
        files.forEach(file => {
          const match = file.match(/^vendors_(\d{4})\.json$/);
          if (match) availableYearsSet.add(parseInt(match[1]));
        });
      } else {
        vendors.forEach(vendor => {
          if (Array.isArray(vendor.n)) {
            vendor.n.forEach(nameEntry => {
              if (Array.isArray(nameEntry.fy)) {
                nameEntry.fy.forEach(fiscalYear => {
                  availableYearsSet.add(fiscalYear.y);
                });
              }
            });
          }
        });
      }

      const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

      return NextResponse.json({
        spending: paginatedRecords,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: {
          totalAmount,
          recordCount
        },
        availableYears
      });

    } else if (view === 'budget') {
      // Process budget data
      const budgetRecords: SpendingRecord[] = [];
      budgetsData.budget.forEach(orgBudget => {
        orgBudget.fiscalYear.forEach(fiscalYear => {
          fiscalYear.projectCode.forEach(projectCode => {
            projectCode.fundingType.forEach(fundingType => {
              fundingType.fundCode.forEach(fundAllocation => {
                const deptName = departmentByOrgCode.get(String(orgBudget.code).padStart(4, '0')) || 'Unknown Department';
                const progName = programMap.get(projectCode.code) || 'Unknown Program';
                const fundName = fundMap.get(String(fundAllocation.code)) || 'Unknown Fund';
                const departmentSlug = departmentSlugMap.get(deptName);

                budgetRecords.push({
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

      // Filter by year if specified
      let filteredRecords = budgetRecords;
      if (year) {
        filteredRecords = budgetRecords.filter(record => record.year === parseInt(year));
      }

      // Sort records
      filteredRecords.sort((a, b) => {
        const multiplier = order === 'desc' ? -1 : 1;
        switch (sort) {
          case 'department':
            return multiplier * a.department.localeCompare(b.department);
          case 'program':
            return multiplier * a.program.localeCompare(b.program);
          case 'fund':
            return multiplier * a.fund.localeCompare(b.fund);
          case 'amount':
          default:
            return multiplier * (a.amount - b.amount);
        }
      });

      // Pagination
      const totalItems = filteredRecords.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

      // Calculate summary statistics
      const totalAmount = filteredRecords.reduce((sum, record) => sum + record.amount, 0);
      const recordCount = filteredRecords.length;

      return NextResponse.json({
        spending: paginatedRecords,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: {
          totalAmount,
          recordCount
        }
      });
    }

    // Minimal compare view handler
    else if (view === 'compare') {
      // Get compareBy field (department, program, fund)
      const compareBy = searchParams.get('compareBy') || 'department';
      // Aggregate vendor data
      const vendorAgg = new Map<string, { year: number, key: string, vendorAmount: number }>();
      // Use all years in vendor data
      let vendors: any[] = [];
      if (vendorsData) {
        if (Array.isArray(vendorsData.v)) {
          vendors = vendorsData.v;
        } else if (Array.isArray(vendorsData.vendors)) {
          vendors = vendorsData.vendors;
        } else if (Array.isArray(vendorsData.t)) {
          vendors = vendorsData.t;
        }
      }
      vendors.forEach(vendor => {
        if (typeof vendor.n === 'string') {
          // Year-specific format
          if (Array.isArray(vendor.d)) {
            vendor.d.forEach(dept => {
              dept.at?.forEach(accountType => {
                accountType.ac?.forEach(accountCat => {
                  accountCat.asc?.forEach(subCat => {
                    subCat.ad?.forEach(desc => {
                      let key = '';
                      if (compareBy === 'department') key = dept.n;
                      else if (compareBy === 'program') key = desc.pc || 'Unknown Program';
                      else if (compareBy === 'fund') key = desc.fc ? fundMap.get(String(desc.fc)) || 'Unknown Fund' : 'Unknown Fund';
                      if (!key) key = 'Unknown';
                      const mapKey = `${desc.y || year}_${key}`;
                      const prev = vendorAgg.get(mapKey);
                      vendorAgg.set(mapKey, {
                        year: desc.y || parseInt(year),
                        key,
                        vendorAmount: (prev?.vendorAmount || 0) + (desc.a || 0)
                      });
                    });
                  });
                });
              });
            });
          }
        } else if (Array.isArray(vendor.n)) {
          // All-vendors format
          vendor.n.forEach(nameEntry => {
            if (Array.isArray(nameEntry.fy)) {
              nameEntry.fy.forEach(fiscalYear => {
                const y = fiscalYear.y;
                fiscalYear.pc?.forEach(projectCode => {
                  projectCode.oc?.forEach(orgCode => {
                    orgCode.fc?.forEach(fundCode => {
                      let key = '';
                      if (compareBy === 'department') key = departmentByOrgCode.get(String(orgCode.c).padStart(4, '0')) || 'Unknown Department';
                      else if (compareBy === 'program') key = programMap.get(projectCode.c) || 'Unknown Program';
                      else if (compareBy === 'fund') key = fundMap.get(String(fundCode.c)) || 'Unknown Fund';
                      if (!key) key = 'Unknown';
                      const mapKey = `${y}_${key}`;
                      const prev = vendorAgg.get(mapKey);
                      vendorAgg.set(mapKey, {
                        year: y,
                        key,
                        vendorAmount: (prev?.vendorAmount || 0) + (fundCode.a || 0)
                      });
                    });
                  });
                });
              });
            }
          });
        }
      });
      // Aggregate budget data
      const budgetAgg = new Map<string, { year: number, key: string, budgetAmount: number }>();
      budgetsData.budget.forEach(orgBudget => {
        orgBudget.fiscalYear.forEach(fiscalYear => {
          fiscalYear.projectCode.forEach(projectCode => {
            projectCode.fundingType.forEach(fundingType => {
              fundingType.fundCode.forEach(fundAllocation => {
                let key = '';
                if (compareBy === 'department') key = departmentByOrgCode.get(String(orgBudget.code).padStart(4, '0')) || 'Unknown Department';
                else if (compareBy === 'program') key = programMap.get(projectCode.code) || 'Unknown Program';
                else if (compareBy === 'fund') key = fundMap.get(String(fundAllocation.code)) || 'Unknown Fund';
                if (!key) key = 'Unknown';
                const mapKey = `${fiscalYear.year}_${key}`;
                const prev = budgetAgg.get(mapKey);
                budgetAgg.set(mapKey, {
                  year: fiscalYear.year,
                  key,
                  budgetAmount: (prev?.budgetAmount || 0) + (fundAllocation.amount || 0)
                });
              });
            });
          });
        });
      });
      // Merge results
      const allKeys = new Set(Array.from(vendorAgg.keys()).concat(Array.from(budgetAgg.keys())));
      let compareRecords = Array.from(allKeys).map(mapKey => {
        const v = vendorAgg.get(mapKey);
        const b = budgetAgg.get(mapKey);
        return {
          year: v?.year || b?.year || parseInt(year),
          [compareBy]: v?.key || b?.key || 'Unknown',
          vendorAmount: v?.vendorAmount || 0,
          budgetAmount: b?.budgetAmount || 0
        };
      });
      // Sort and paginate
      if (sort === 'vendorAmount' || sort === 'budgetAmount') {
        const multiplier = order === 'asc' ? 1 : -1;
        compareRecords.sort((a, b) => multiplier * ((a[sort] || 0) - (b[sort] || 0)));
      } else if (sort === 'year') {
        const multiplier = order === 'asc' ? 1 : -1;
        compareRecords.sort((a, b) => multiplier * ((a.year || 0) - (b.year || 0)));
      } else if (sort === compareBy) {
        const multiplier = order === 'asc' ? 1 : -1;
        compareRecords.sort((a, b) => {
          const aVal = (a[compareBy] || '').toString();
          const bVal = (b[compareBy] || '').toString();
          return multiplier * aVal.localeCompare(bVal);
        });
      } else {
        // Default: sort by year desc
        compareRecords.sort((a, b) => b.year - a.year);
      }
      const totalItems = compareRecords.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRecords = compareRecords.slice(startIndex, endIndex);
      // Return
      return NextResponse.json({
        spending: paginatedRecords,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: {
          totalAmount: paginatedRecords.reduce((sum, r) => sum + (r.vendorAmount || 0), 0),
          recordCount: paginatedRecords.length
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid view parameter. Must be either "vendor", "budget", or "compare".' },
      { status: 400 }
    );

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