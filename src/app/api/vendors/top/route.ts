import { NextResponse } from 'next/server';
const { getVendorsData, getProgramsData, getFundsData } = require('@/lib/api/dataAccess');
import type { OptimizedVendorsJSON } from '@/types/vendor';
import type { ProgramsJSON } from '@/types/program';
import type { FundsJSON } from '@/types/fund';
import { getDepartmentSlugs } from '@/lib/blog';
import departmentsData from '@/data/departments.json';
import type { DepartmentsJSON } from '@/types/department';

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
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const year = searchParams.get('year') || '2024';
    const sort = searchParams.get('sort') || 'totalAmount'; // vendor|totalAmount|transactionCount|primaryDepartment
    const order = searchParams.get('order') || 'desc'; // asc|desc
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    console.log('Top Vendors API request:', { year, sort, order, page, limit });

    // Load data from multiple sources
    const [vendorsData, programsData, fundsData, departmentSlugs] = await Promise.all([
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
    const vendors = (vendorsData as any).v || [];
    vendors.forEach((vendorGroup: any) => {
      const vendorNames = vendorGroup.n || [];
      vendorNames.forEach((vendor: any) => {
        const fiscalYears = vendor.fy || [];
        fiscalYears.forEach((fiscalYear: any) => {
          // Only process the requested year
          if (parseInt(fiscalYear.y) !== parseInt(year)) return;

          const projectCodes = fiscalYear.pc || [];
          projectCodes.forEach((projectCode: any) => {
            const orgCodes = projectCode.oc || [];
            orgCodes.forEach((orgCode: any) => {
              const fundCodes = orgCode.fc || [];
              fundCodes.forEach((fundCode: any) => {
                const deptName = departmentByOrgCode.get(String(orgCode.c).padStart(4, '0')) || 'Unknown Department';
                const progName = programMap.get(projectCode.c) || 'Unknown Program';
                const fundName = fundMap.get(String(fundCode.c)) || 'Unknown Fund';
                const amount = fundCode.a;

                // Get or create vendor aggregate
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
                aggregate.totalAmount += amount;
                aggregate.transactionCount += 1;
                aggregate.departments.add(deptName);
                aggregate.programs.add(progName);
                aggregate.funds.add(fundName);

                // Track department amounts to find primary department
                const currentDeptAmount = aggregate.departmentAmounts.get(deptName) || 0;
                aggregate.departmentAmounts.set(deptName, currentDeptAmount + amount);
              });
            });
          });
        });
      });
    });

    // Convert aggregates to TopVendorRecord array
    const topVendors: TopVendorRecord[] = [];
    vendorAggregates.forEach((aggregate, vendorName) => {
      // Find primary department (highest spending)
      let primaryDepartment = 'Unknown Department';
      let maxAmount = 0;
      aggregate.departmentAmounts.forEach((amount, dept) => {
        if (amount > maxAmount) {
          maxAmount = amount;
          primaryDepartment = dept;
        }
      });

      const primaryDepartmentSlug = departmentSlugMap.get(primaryDepartment);

      topVendors.push({
        year: parseInt(year),
        vendor: vendorName,
        totalAmount: aggregate.totalAmount,
        transactionCount: aggregate.transactionCount,
        departments: Array.from(aggregate.departments),
        programs: Array.from(aggregate.programs),
        funds: Array.from(aggregate.funds),
        primaryDepartment,
        primaryDepartmentSlug
      });
    });

    // Apply sorting
    topVendors.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort) {
        case 'vendor':
          aValue = a.vendor.toLowerCase();
          bValue = b.vendor.toLowerCase();
          break;
        case 'transactionCount':
          aValue = a.transactionCount;
          bValue = b.transactionCount;
          break;
        case 'primaryDepartment':
          aValue = a.primaryDepartment?.toLowerCase() || '';
          bValue = b.primaryDepartment?.toLowerCase() || '';
          break;
        case 'totalAmount':
        default:
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    // Calculate summary
    const totalAmount = topVendors.reduce((sum, vendor) => sum + vendor.totalAmount, 0);
    const vendorCount = topVendors.length;

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const totalPages = Math.ceil(vendorCount / limit);
    const paginatedVendors = topVendors.slice(startIndex, endIndex);

    const response: TopVendorsResponse = {
      vendors: paginatedVendors,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: vendorCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary: {
        totalAmount,
        vendorCount,
        year: parseInt(year)
      }
    };

    console.log('Top Vendors API response summary:', {
      year,
      totalVendors: vendorCount,
      totalAmount: totalAmount.toLocaleString(),
      paginatedCount: paginatedVendors.length,
      topVendor: paginatedVendors[0]?.vendor,
      topAmount: paginatedVendors[0]?.totalAmount?.toLocaleString()
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });

  } catch (error) {
    console.error('Error in Top Vendors API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch top vendors data',
        vendors: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 100,
          hasNextPage: false,
          hasPrevPage: false
        },
        summary: {
          totalAmount: 0,
          vendorCount: 0,
          year: 2024
        }
      },
      { status: 500 }
    );
  }
} 