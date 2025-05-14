import { NextResponse } from 'next/server';
import departmentsData from '@/data/departments.json';
import type { DepartmentData, DepartmentsJSON } from '@/types/department';
import { getDepartmentSlugs } from '@/lib/blog';

// Remove Edge runtime since we need file system access
// export const runtime = 'edge';
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  // Get the URL and search params
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  // Type-safe cast of departments data
  const typedData = departmentsData as unknown as DepartmentsJSON;
  
  //console.log('Raw departments from JSON:', typedData.departments.length);
  
  // Get all valid department slugs from markdown files
  const validSlugs = await getDepartmentSlugs();
  console.log('Valid markdown slugs:', validSlugs.length);
  
  const departments = typedData.departments.map((dept: DepartmentData) => {
    // Find the matching markdown filename
    const markdownSlug = validSlugs.find(slug => {
      const [organizationalCode] = slug.split('_');
      // Pad the organizational code to match the format in markdown filenames
      const paddedorganizationalCode = String(dept.organizationalCode).padStart(4, '0');
      
      // If organizational codes match, we have a match
      if (paddedorganizationalCode === organizationalCode) return true;
      
      // If organizational codes don't match, try name matching
      const normalizedDeptName = dept.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedSlugName = slug.split('_')[1].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      return normalizedDeptName === normalizedSlugName;
    });
    
    // Return the department data with the full markdown filename as the slug
    return {
      ...dept,
      id: dept.slug,
      date: new Date().toISOString(),
      excerpt: dept.keyFunctions || '',
      workforceName: dept.name,
      hasWorkforceData: Boolean(dept && (
        (dept.headCount?.yearly && Object.keys(dept.headCount.yearly).length > 0) ||
        (dept.wages?.yearly && Object.keys(dept.wages.yearly).length > 0) ||
        dept.averageTenureYears !== null ||
        dept.averageSalary !== null ||
        dept.averageAge !== null ||
        (dept.tenureDistribution?.yearly && Object.keys(dept.tenureDistribution.yearly).length > 0) ||
        (dept.salaryDistribution?.yearly && Object.keys(dept.salaryDistribution.yearly).length > 0) ||
        (dept.ageDistribution?.yearly && Object.keys(dept.ageDistribution.yearly).length > 0)
      )),
      hasPage: Boolean(markdownSlug),
      pageSlug: markdownSlug || null // Use the full markdown filename
      // verify function with curl "http://localhost:3000/api/departments" | jq '.departments[] | select(.pageSlug != null) | {name: .name, pageSlug: .pageSlug}'
    };
  });

  console.log('Total departments from API:', departments.length);
  console.log('Active departments:', departments.filter(d => d.budget_status?.toLowerCase() === 'active').length);
  console.log('Departments with any workforce data:', departments.filter(d => d.hasWorkforceData).length);

  // Log departments by level
  const levelCounts = departments.reduce((acc, dept) => {
    const level = dept.orgLevel;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  console.log('Departments by level:', levelCounts);

  // Log parent agency distribution
  const parentAgencyCounts = departments.reduce((acc, dept) => {
    const parent = dept.parent_agency || 'NO_PARENT';
    acc[parent] = (acc[parent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('Departments by parent agency:', parentAgencyCounts);

  // Return format based on query parameter
  if (format === 'departments') {
    return NextResponse.json(departments, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });
  }

  // Return the full DepartmentsJSON structure by default
  return NextResponse.json({
    departments,
    budgetSummary: typedData.budgetSummary,
    revenueSources: typedData.revenueSources,
    totalRevenue: typedData.totalRevenue,
    sources: typedData.sources
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
    }
  });
} 