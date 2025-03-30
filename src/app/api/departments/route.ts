import { NextResponse } from 'next/server';
import departmentsData from '@/data/departments.json';
import type { DepartmentData, DepartmentsJSON, NonNegativeInteger, AnnualYear, TenureRange, SalaryRange, AgeRange } from '@/types/department';

export const runtime = 'edge'; // Enable Edge Runtime
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  // Get the URL and search params
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  // Type-safe cast of departments data
  const typedData = departmentsData as unknown as DepartmentsJSON;
  
  console.log('Raw departments from JSON:', typedData.departments.length);
  
  const departments = typedData.departments.map((dept: DepartmentData) => {
    // Normalize the department data
    let normalized = {
      ...dept,
      id: dept.slug,
      date: new Date().toISOString(), // Use current date as fallback
      excerpt: dept.keyFunctions || '',
      workforceName: dept.name, // Just use the name as workforceName since DepartmentData doesn't have workforceName
      hasWorkforceData: Boolean(dept && (
        (dept.headCount?.yearly && Object.keys(dept.headCount.yearly).length > 0) ||
        (dept.wages?.yearly && Object.keys(dept.wages.yearly).length > 0) ||
        dept.averageTenureYears !== null ||
        dept.averageSalary !== null ||
        dept.averageAge !== null ||
        (dept.tenureDistribution?.yearly && Object.keys(dept.tenureDistribution.yearly).length > 0) ||
        (dept.salaryDistribution?.yearly && Object.keys(dept.salaryDistribution.yearly).length > 0) ||
        (dept.ageDistribution?.yearly && Object.keys(dept.ageDistribution.yearly).length > 0)
      ))
    };

    // Fix reporting structure based on data
    if (normalized.parent_agency === 'California State Government') {
      normalized.orgLevel = (1 as NonNegativeInteger);
      normalized.budget_status = 'active';
    }

    if (normalized.orgLevel === 1) {
      normalized.parent_agency = 'California State Government';
      normalized.budget_status = 'active';
    }
    
    // Ensure workforce data exists and normalize its structure
    if (normalized.hasWorkforceData) {
      // Ensure all required properties exist with defaults
      normalized = {
        ...normalized,
        headCount: normalized.headCount || { yearly: {} as Record<AnnualYear, number | {}> },
        wages: normalized.wages || { yearly: {} as Record<AnnualYear, number | {}> },
        averageTenureYears: normalized.averageTenureYears || null,
        averageSalary: normalized.averageSalary || null,
        averageAge: normalized.averageAge || null,
        tenureDistribution: normalized.tenureDistribution || { yearly: {} as Record<AnnualYear, TenureRange[]> },
        salaryDistribution: normalized.salaryDistribution || { yearly: {} as Record<AnnualYear, SalaryRange[]> },
        ageDistribution: normalized.ageDistribution || { yearly: {} as Record<AnnualYear, AgeRange[]> }
      };
    }
    
    return normalized;
  });

  console.log('Total departments from API:', departments.length);
  console.log('Active departments:', departments.filter(d => d.budget_status.toLowerCase() === 'active').length);
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