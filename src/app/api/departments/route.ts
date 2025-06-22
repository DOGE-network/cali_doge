import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getDepartmentSlugs } from '@/lib/blog';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  try {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

    const supabase = getServiceSupabase();

    // Get all departments from the database
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (deptError) {
      console.error('Error fetching departments:', deptError);
      return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }
  
  // Get all valid department slugs from markdown files
  const validSlugs = await getDepartmentSlugs();
  console.log('Valid markdown slugs:', validSlugs.length);
  
    // Get workforce data for all departments
    const { data: workforceData, error: workforceError } = await supabase
      .from('department_workforce')
      .select(`
        *,
        departments!inner(id, name, organizational_code)
      `);

    if (workforceError) {
      console.error('Error fetching workforce data:', workforceError);
      return NextResponse.json({ error: 'Failed to fetch workforce data' }, { status: 500 });
    }

    // Get distribution data for all departments
    const { data: distributionData, error: distError } = await supabase
      .from('department_distributions')
      .select(`
        *,
        departments!inner(id, name, organizational_code)
      `);

    if (distError) {
      console.error('Error fetching distribution data:', distError);
      return NextResponse.json({ error: 'Failed to fetch distribution data' }, { status: 500 });
    }

    // --- JOIN departments and department_workforce by department_id ---
    // Build lookup map for departments by name
    const deptByName = new Map();
    departments?.forEach(dept => {
      deptByName.set(dept.name.trim().toLowerCase(), dept);
    });

    const workforceWithDeptName = (workforceData || []).map(wf => {
      // The workforce data now includes the department info via the join
      const dept = wf.departments;
      return {
        ...wf,
        department_name: dept ? dept.name : null,
        department_id: dept ? dept.id : null
      };
    });

    // Debug: Log the joined workforce data
    console.log('Total workforce records:', workforceData?.length || 0);
    console.log('Total departments:', departments?.length || 0);
    console.log('Workforce records with department names:', workforceWithDeptName.filter(wf => wf.department_name).length);
    console.log('Sample joined workforce records:', workforceWithDeptName.slice(0, 3).map(wf => ({
      department_name: wf.department_name,
      head_count: wf.head_count,
      fiscal_year: wf.fiscal_year
    })));

    // Create lookup maps for workforce and distribution data
    const workforceMap = new Map();
    const distributionMap = new Map();

    workforceWithDeptName?.forEach(record => {
      const key = `${record.department_name}_${record.fiscal_year}`;
      workforceMap.set(key, record);
    });

    distributionData?.forEach(record => {
      const key = `${record.distribution_type}_${record.fiscal_year}`;
      distributionMap.set(key, record);
    });

    // Build a lookup for workforce by department name and year
    const workforceByNameYear = new Map();
    workforceWithDeptName.forEach(wf => {
      if (wf.department_name && wf.fiscal_year) {
        workforceByNameYear.set(`${wf.department_name.trim().toLowerCase()}_${wf.fiscal_year}`, wf);
      }
    });

    // Build a map of children for each department
    const childrenMap = new Map();
    departments?.forEach(dept => {
      const parent = dept.parent_agency ? dept.parent_agency.trim().toLowerCase() : null;
      if (parent) {
        if (!childrenMap.has(parent)) childrenMap.set(parent, []);
        childrenMap.get(parent).push(dept);
      }
    });

    // Helper to get all descendants recursively
    const getAllDescendants = (dept) => {
      const children = childrenMap.get(dept.name.trim().toLowerCase()) || [];
      let all = [...children];
      for (const child of children) {
        all = all.concat(getAllDescendants(child));
      }
      return all;
    };

    // For each department, calculate own and children totals for each year
    const transformedDepartments = departments?.map(dept => {
      const allDepts = [dept, ...getAllDescendants(dept)];
      const headCount = {};
      const wages = {};
      
      for (let year = 2010; year <= 2025; year++) {
        let sumHead = 0;
        let sumWages = 0;
        
        for (const d of allDepts) {
          // Use department name for workforce lookup
          const wf = workforceByNameYear.get(`${d.name.trim().toLowerCase()}_${year}`);
          if (wf) {
            sumHead += Number(wf.head_count) || 0;
            sumWages += Number(wf.total_wages) || 0;
          }
        }
        
        headCount[year] = sumHead;
        wages[year] = sumWages;
      }

    // Find the matching markdown filename
    const markdownSlug = validSlugs.find(slug => {
      const normalizedDeptName = dept.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedSlugName = slug.split('_')[1].toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedDeptName === normalizedSlugName;
    });
    
      // Calculate averages from 2023 data (most recent)
      let averageSalary: number | null = null;
      if (headCount[2023] > 0) {
        averageSalary = wages[2023] / headCount[2023];
      }

    return {
        name: dept.name,
        _slug: dept.organizational_code || dept.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        canonicalName: dept.canonical_name || dept.name,
        aliases: dept.aliases || [],
        description: dept.description,
        organizationalCode: dept.organizational_code,
        entityCode: dept.entity_code,
        orgLevel: dept.org_level || 0,
        budget_status: dept.budget_status || 'active',
        keyFunctions: dept.key_functions,
        abbreviation: dept.abbreviation || '',
        parent_agency: dept.parent_agency || '',
        note: dept.note,
        headCount: { yearly: headCount },
        wages: { yearly: wages },
        _averageTenureYears: null,
        _averageSalary: averageSalary,
        _averageAge: null,
        tenureDistribution: { yearly: {} },
        salaryDistribution: { yearly: {} },
        ageDistribution: { yearly: {} },
        hasWorkforceData: headCount[2023] > 0,
      hasPage: Boolean(markdownSlug),
        pageSlug: markdownSlug || null
      };
    }) || [];

    // Add California State Government root department if it doesn't exist
    const hasRootDepartment = transformedDepartments.some(d => d.name === 'California State Government');
    if (!hasRootDepartment) {
      const rootDepartment = {
        name: 'California State Government',
        _slug: 'california_state_government',
        canonicalName: 'California State Government',
        aliases: [],
        description: 'Root department representing the entire California State Government',
        organizationalCode: null,
        entityCode: null,
        orgLevel: 0,
        budget_status: 'active' as const,
        keyFunctions: 'State Government',
        abbreviation: 'CA',
        parent_agency: '',
        note: null,
        headCount: { yearly: {} },
        wages: { yearly: {} },
        _averageTenureYears: null,
        _averageSalary: null,
        _averageAge: null,
        tenureDistribution: { yearly: {} },
        salaryDistribution: { yearly: {} },
        ageDistribution: { yearly: {} },
        hasWorkforceData: false,
        hasPage: false,
        pageSlug: null
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