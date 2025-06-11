import { NextResponse } from 'next/server';
import programsData from '@/data/programs.json';
import fundsData from '@/data/funds.json';
const { getVendorsData, readJsonFile } = require('@/lib/api/dataAccess');
import type { ProgramsJSON } from '@/types/program';
import type { FundsJSON } from '@/types/fund';
import { getDepartmentSlugs } from '@/lib/blog';
import type { DepartmentsJSON } from '@/types/department';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

interface TopVendorRecord {
  year: number;
  vendor: string;
  totalAmount: number;
  transactionCount: number;
  departments: string[];
  programs: string[];
  funds: string[];
  // For linking to department pages
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

function parseFilterValue(value: string): { terms: string[], operator: 'AND' | 'OR' } {
  // Replace commas with AND
  const normalizedValue = value.replace(/,/g, ' AND ');
  
  // Check if the value contains OR
  const hasOr = normalizedValue.toUpperCase().includes(' OR ');
  
  // Split by the operator
  const terms = hasOr 
    ? normalizedValue.split(/\s+OR\s+/i)
    : normalizedValue.split(/\s+AND\s+/i);
  
  // Clean up terms and handle quoted phrases
  const cleanedTerms = terms.map(term => {
    // Remove extra spaces
    term = term.trim();
    // Handle quoted phrases
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url || '', 'http://localhost');
    const searchParams = url.searchParams;
    
    // Parse query parameters
    const year = searchParams.get('year') || '2024';
    const sort = searchParams.get('sort') || 'totalAmount'; // vendor|totalAmount|transactionCount|primaryDepartment
    const order = searchParams.get('order') || 'desc'; // asc|desc
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const filter = searchParams.get('filter');

    // Validate year format
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: 'Invalid year format. Year must be a 4-digit number.' },
        { status: 400 }
      );
    }

    console.log('Top Vendors API request:', { year, sort, order, page, limit, filter });

    // Load data from multiple sources
    const [departmentSlugs, vendorsData, departmentsData] = await Promise.all([
      getDepartmentSlugs(),
      getVendorsData(year),
      readJsonFile('departments.json')
    ]);

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
        // Year-specific format: vendor.n is a string (vendor name)
        yearVendors = vendors;
      } else {
        // All-vendors format: vendor.n is an array
        yearVendors = vendors.filter(vendor => {
          return Array.isArray(vendor.n) && vendor.n.some(nameEntry => {
            return Array.isArray(nameEntry.fy) && nameEntry.fy.some(yearEntry => yearEntry.y === year);
          });
        });
      }
    }
    
    // Calculate totals for each vendor
    let vendorTotals: any[] = [];
    try {
      if (typeof yearVendors[0]?.n === 'string') {
        // Year-specific format aggregation (minimal: just count and sum amounts)
        vendorTotals = yearVendors.map(vendor => {
          let totalAmount = 0;
          let transactionCount = 0;
          const programSet = new Set<string>();
          // Traverse nested structure to sum amounts, counts, and collect programs
          if (Array.isArray(vendor.d)) {
            vendor.d.forEach(dept => {
              dept.at?.forEach(accountType => {
                accountType.ac?.forEach(accountCat => {
                  accountCat.asc?.forEach(subCat => {
                    subCat.ad?.forEach(desc => {
                      totalAmount += desc.a || 0;
                      transactionCount += desc.ct || 0;
                      if (desc.pc) programSet.add(desc.pc);
                    });
                  });
                });
              });
            });
          }
          // Collect departments, programs, funds
          const departments = Array.isArray(vendor.d) ? vendor.d.map(dept => dept.n).filter(Boolean) : [];
          const programs = Array.from(programSet);
          const funds = [];
          // Optionally, extract more details if needed
          return {
            name: vendor.n,
            totalAmount,
            transactionCount,
            departments,
            programs,
            funds,
            primaryDepartment: departments[0] || null,
            primaryDepartmentSlug: null // Could be set if slugs are available
          };
        });
      } else {
        // All-vendors format aggregation (existing logic)
        vendorTotals = yearVendors.map(vendor => {
          const totalAmount = Array.isArray(vendor.n) ? vendor.n.reduce((sum, nameEntry) => {
            return sum + (Array.isArray(nameEntry.fy) ? nameEntry.fy.reduce((yearSum, yearEntry) => {
              if (yearEntry.y !== year) return yearSum;
              return yearSum + (Array.isArray(yearEntry.pc) ? yearEntry.pc.reduce((pcSum, pcEntry) => {
                return pcSum + (Array.isArray(pcEntry.oc) ? pcEntry.oc.reduce((ocSum, ocEntry) => {
                  return ocSum + (Array.isArray(ocEntry.fc) ? ocEntry.fc.reduce((fcSum, fcEntry) => {
                    return fcSum + (fcEntry.a || 0);
                  }, 0) : 0);
                }, 0) : 0);
              }, 0) : 0);
            }, 0) : 0);
          }, 0) : 0;
          return {
            name: Array.isArray(vendor.n) && vendor.n[0] ? vendor.n[0].n : '',
            ein: vendor.e,
            totalAmount
          };
        });
      }
    } catch (err) {
      console.error('Aggregation error:', err);
      return NextResponse.json({ error: String(err), vendors: [], pagination: { currentPage: page, totalPages: 0, totalItems: 0, itemsPerPage: limit, hasNextPage: false, hasPrevPage: false }, summary: { totalAmount: 0, vendorCount: 0, year, availableYears: [] } }, { status: 500 });
    }

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

    // Aggregate vendor data by vendor name and year
    const vendorAggregates = new Map<string, {
      totalAmount: number;
      transactionCount: number;
      departments: Set<string>;
      programs: Set<string>;
      funds: Set<string>;
      departmentAmounts: Map<string, number>; // To find primary department
    }>();

    // Process vendor data - handle actual structure with v array
    vendorTotals.forEach((vendorTotal) => {
      const vendor = yearVendors.find(v => v.n[0].n === vendorTotal.name);
      if (!vendor) return;

      const fiscalYears = vendor.n[0]?.fy || [];
      fiscalYears.forEach((fiscalYear) => {
          // Only process the requested year
        if (fiscalYear.y !== year) return;

          const projectCodes = fiscalYear.pc || [];
        projectCodes.forEach((projectCode) => {
            const orgCodes = projectCode.oc || [];
          orgCodes.forEach((orgCode) => {
              const fundCodes = orgCode.fc || [];
            fundCodes.forEach((fundCode) => {
                const deptName = departmentByOrgCode.get(String(orgCode.c).padStart(4, '0')) || 'Unknown Department';
                const progName = programMap.get(projectCode.c) || 'Unknown Program';
                const fundName = fundMap.get(String(fundCode.c)) || 'Unknown Fund';

                // Get or create vendor aggregate
              if (!vendorAggregates.has(vendorTotal.name)) {
                vendorAggregates.set(vendorTotal.name, {
                  totalAmount: vendorTotal.totalAmount,
                    transactionCount: 0,
                    departments: new Set(),
                    programs: new Set(),
                    funds: new Set(),
                    departmentAmounts: new Map()
                  });
                }

              const aggregate = vendorAggregates.get(vendorTotal.name)!;
              aggregate.transactionCount += fundCode.ct;
                aggregate.departments.add(deptName);
                aggregate.programs.add(progName);
                aggregate.funds.add(fundName);

                // Track department amounts to find primary department
                const currentDeptAmount = aggregate.departmentAmounts.get(deptName) || 0;
              aggregate.departmentAmounts.set(deptName, currentDeptAmount + fundCode.a);
            });
          });
        });
      });
    });

    // Convert aggregates to records
    const vendorRecords: TopVendorRecord[] = Array.from(vendorAggregates.entries()).map(([name, data]) => {
      // Find primary department (highest amount)
      let primaryDepartment = 'Unknown Department';
      let maxAmount = 0;
      data.departmentAmounts.forEach((amount, dept) => {
        if (amount > maxAmount) {
          maxAmount = amount;
          primaryDepartment = dept;
        }
      });

      return {
        year: parseInt(year),
        vendor: name,
        totalAmount: data.totalAmount,
        transactionCount: data.transactionCount,
        departments: Array.from(data.departments),
        programs: Array.from(data.programs),
        funds: Array.from(data.funds),
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
    if (filter) {
      const filterTerms = parseFilterValue(filter);
      let _filteredRecords = vendorRecords.filter(record => 
        matchesFilter(record.vendor, filterTerms) ||
        record.departments.some(dept => matchesFilter(dept, filterTerms)) ||
        record.programs.some(prog => matchesFilter(prog, filterTerms)) ||
        record.funds.some(fund => matchesFilter(fund, filterTerms))
      );
    }

    // Sort vendorTotals before pagination
    if (sort && vendorTotals.length > 0) {
      const multiplier = order === 'asc' ? 1 : -1;
      vendorTotals.sort((a, b) => {
        switch (sort) {
          case 'vendor':
          case 'name':
            return multiplier * (a.name || '').localeCompare(b.name || '');
          case 'totalAmount':
            return multiplier * ((a.totalAmount || 0) - (b.totalAmount || 0));
          case 'transactionCount':
            return multiplier * ((a.transactionCount || 0) - (b.transactionCount || 0));
          case 'primaryDepartment':
            return multiplier * ((a.primaryDepartment || '').localeCompare(b.primaryDepartment || ''));
          default:
            return 0;
        }
      });
    }

    // Calculate pagination
    console.log('vendorTotals length:', vendorTotals.length);
    if (vendorTotals.length > 0) {
      console.log('Sample vendorTotals:', JSON.stringify(vendorTotals.slice(0, 2), null, 2));
    }
    const totalItems = vendorTotals.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = vendorTotals.slice(startIndex, endIndex);

    // Calculate summary statistics
    const totalAmount = vendorTotals.reduce((sum, record) => sum + record.totalAmount, 0);
    const vendorCount = vendorTotals.length;

    // Find top vendor
    const topVendor = vendorTotals.length > 0 ? vendorTotals[0] : undefined;

    // Collect all available years
    let availableYears = new Set<string>();
    if (typeof vendors[0]?.n === 'string') {
      // Year-specific format: list all years for which a vendors_{year}.json file exists
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'src/data');
      const files = fs.readdirSync(dataDir);
      files.forEach(file => {
        const match = file.match(/^vendors_(\d{4})\.json$/);
        if (match) availableYears.add(match[1]);
      });
    } else {
      // All-vendors format: collect years from nested structure
      vendors.forEach(vendor => {
        if (Array.isArray(vendor.n)) {
          vendor.n.forEach(nameEntry => {
            if (Array.isArray(nameEntry.fy)) {
              nameEntry.fy.forEach(fiscalYear => {
                if (fiscalYear.y) availableYears.add(fiscalYear.y);
              });
            }
          });
        }
      });
    }

    // Prepare response
    const response: TopVendorsResponse = {
      vendors: paginatedRecords,
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
        vendorCount,
        year: parseInt(year),
        availableYears: Array.from(availableYears)
      }
    };

    console.log('Top Vendors API response summary:', {
      year,
      totalVendors: vendorCount,
      totalAmount: totalAmount.toFixed(2),
      paginatedCount: paginatedRecords.length,
      topVendor: topVendor?.name,
      topAmount: topVendor?.totalAmount,
      filter,
      availableYears: Array.from(availableYears)
    });

    return NextResponse.json(response);

  } catch (err) {
    console.error('Top Vendors API error:', err);
    return NextResponse.json({ error: String(err), vendors: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 100, hasNextPage: false, hasPrevPage: false }, summary: { totalAmount: 0, vendorCount: 0, year: '', availableYears: [] } }, { status: 500 });
  }
} 