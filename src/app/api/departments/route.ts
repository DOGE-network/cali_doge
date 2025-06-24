import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
// import { getDepartmentSlugs } from '@/lib/blog';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  try {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

    const supabase = getServiceSupabase();

    // Fetch all departments with workforce data from the materialized view
    const { data: departmentsWithWorkforce, error: deptError } = await supabase
      .from('departments_with_workforce')
      .select('*')
      .order('name');
    if (deptError) {
      console.error('Error fetching departments with workforce:', deptError);
      return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }
  
    // Transform the data to match the expected format
    const transformedDepartments = departmentsWithWorkforce?.map(dept => {
      // Parse workforce data from JSONB
      const workforce = dept.workforce_yearly || {};
      const distributions = dept.distributions_yearly || {};
      
      // Extract headcount and wages by year
      const headCount = { yearly: {} };
      const wages = { yearly: {} };
      
      Object.entries(workforce).forEach(([year, data]: [string, any]) => {
        if (data.headCount !== null && data.headCount !== undefined) {
          headCount.yearly[year] = data.headCount;
        }
        if (data.wages !== null && data.wages !== undefined) {
          wages.yearly[year] = data.wages;
        }
      });
      
      // Extract distributions by type and year
      const tenureDistribution = { yearly: {} };
      const salaryDistribution = { yearly: {} };
      const ageDistribution = { yearly: {} };
      
      // Process distributions based on the database structure
      // The distributions are stored as: { "salary": { "yearly": { "2010": [...], "2011": [...] } } }
      const distributionsObj = distributions as any;
      if (distributionsObj.salary && distributionsObj.salary.yearly) {
        Object.entries(distributionsObj.salary.yearly).forEach(([year, data]: [string, any]) => {
          salaryDistribution.yearly[year] = data;
        });
      }
      
      if (distributionsObj.age && distributionsObj.age.yearly) {
        Object.entries(distributionsObj.age.yearly).forEach(([year, data]: [string, any]) => {
          ageDistribution.yearly[year] = data;
        });
      }
      
      if (distributionsObj.tenure && distributionsObj.tenure.yearly) {
        Object.entries(distributionsObj.tenure.yearly).forEach(([year, data]: [string, any]) => {
          tenureDistribution.yearly[year] = data;
        });
      }

    return {
        id: dept.id,
        name: dept.name,
        canonicalName: dept.canonical_name || dept.name,
        aliases: dept.aliases || [],
        description: dept.description,
        entityCode: dept.entity_code,
        orgLevel: dept.org_level || 0,
        budget_status: dept.budget_status || 'active',
        keyFunctions: dept.key_functions,
        abbreviation: dept.abbreviation || '',
        parent_agency: dept.parent_agency || '',
        note: dept.note,
        organizationalCode: dept.organizational_code,
        headCount,
        wages,
        tenureDistribution,
        salaryDistribution,
        ageDistribution,
        hasWorkforceData: Object.keys(workforce).length > 0
      };
    }) || [];

    // Add California State Government root department if it doesn't exist
    const hasRootDepartment = transformedDepartments.some(d => d.name === 'California State Government');
    if (!hasRootDepartment) {
      const rootDepartment = {
        id: 'root',
        name: 'California State Government',
        canonicalName: 'California State Government',
        aliases: [],
        description: 'Root department representing the entire California State Government',
        entityCode: null,
        orgLevel: 0,
        budget_status: 'active' as const,
        keyFunctions: 'State Government',
        abbreviation: 'CA',
        parent_agency: '',
        note: null,
        organizationalCode: null,
        headCount: { yearly: {} },
        wages: { yearly: {} },
        tenureDistribution: { yearly: {} },
        salaryDistribution: { yearly: {} },
        ageDistribution: { yearly: {} },
        hasWorkforceData: false
      };
      transformedDepartments.unshift(rootDepartment);
    }

    console.log('Total departments from API:', transformedDepartments.length);
    console.log('Active departments:', transformedDepartments.filter(d => d.budget_status?.toLowerCase() === 'active').length);
    console.log('Departments with any workforce data:', transformedDepartments.filter(d => d.hasWorkforceData).length);

  // Log departments by level
    const levelCounts = transformedDepartments.reduce((acc, dept) => {
    const level = dept.orgLevel;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  console.log('Departments by level:', levelCounts);

  // Log parent agency distribution
    const parentAgencyCounts = transformedDepartments.reduce((acc, dept) => {
    const parent = dept.parent_agency || 'NO_PARENT';
    acc[parent] = (acc[parent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('Departments by parent agency:', parentAgencyCounts);

    // Debug: Log departments with 2023 headcount
    const deptsWith2023 = transformedDepartments.filter(d => d.headCount.yearly["2023"] != null && d.headCount.yearly["2023"] > 0);
    console.log('Departments with 2023 headcount:', deptsWith2023.length);

  // Return format based on query parameter
  if (format === 'departments') {
      return NextResponse.json({
        departments: transformedDepartments
      }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });
  }

    // Return the full structure by default
  return NextResponse.json({
      departments: transformedDepartments,
      budgetSummary: {},
      revenueSources: [],
      totalRevenue: {},
      sources: []
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
    }
  });

  } catch (error) {
    console.error('Error in departments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 