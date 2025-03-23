import { NextResponse } from 'next/server';
import departmentsData from '@/data/departments.json';
import type { DepartmentData, DepartmentsJSON, NonNegativeInteger, AnnualYear } from '@/types/department';

export async function GET() {
  // Type-safe cast of departments data
  const typedData = departmentsData as unknown as DepartmentsJSON;
  
  console.log('Raw departments from JSON:', typedData.departments.length);
  
  const departments = typedData.departments.map((dept: DepartmentData) => {
    // Normalize the department data
    const normalized = {
      ...dept,
      id: dept.slug,
      date: new Date().toISOString(), // Use current date as fallback
      excerpt: dept.keyFunctions || '',
      workforceName: dept.name, // Just use the name as workforceName since DepartmentData doesn't have workforceName
      hasWorkforceData: Boolean(dept.workforce && (
        (dept.workforce.headCount?.yearly && Object.keys(dept.workforce.headCount.yearly).length > 0) ||
        (dept.workforce.wages?.yearly && Object.keys(dept.workforce.wages.yearly).length > 0) ||
        dept.workforce.averageTenureYears !== null ||
        dept.workforce.averageSalary !== null ||
        dept.workforce.averageAge !== null ||
        (dept.workforce.tenureDistribution && Object.keys(dept.workforce.tenureDistribution).length > 0) ||
        (dept.workforce.salaryDistribution && Object.keys(dept.workforce.salaryDistribution).length > 0) ||
        (dept.workforce.ageDistribution && Object.keys(dept.workforce.ageDistribution).length > 0)
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
    if (!normalized.workforce) {
      normalized.workforce = {
        headCount: { yearly: {} as Record<AnnualYear, number | {}> },
        wages: { yearly: {} as Record<AnnualYear, number | {}> },
        averageTenureYears: null,
        averageSalary: null,
        averageAge: null,
        tenureDistribution: [],
        salaryDistribution: [],
        ageDistribution: []
      };
    } else {
      // Ensure all required properties exist with defaults
      normalized.workforce = {
        ...normalized.workforce,
        headCount: normalized.workforce.headCount || { yearly: {} as Record<AnnualYear, number | {}> },
        wages: normalized.workforce.wages || { yearly: {} as Record<AnnualYear, number | {}> },
        averageTenureYears: normalized.workforce.averageTenureYears || null,
        averageSalary: normalized.workforce.averageSalary || null,
        averageAge: normalized.workforce.averageAge || null,
        tenureDistribution: normalized.workforce.tenureDistribution || [],
        salaryDistribution: normalized.workforce.salaryDistribution || [],
        ageDistribution: normalized.workforce.ageDistribution || []
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

  return NextResponse.json(departments);
} 