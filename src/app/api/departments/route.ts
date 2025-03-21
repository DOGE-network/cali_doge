import { NextResponse } from 'next/server';
import departmentsData from '@/data/departments.json';
import type { DepartmentData, DepartmentsJSON } from '@/types/department';

export async function GET() {
  // Type-safe cast of departments data
  const typedData = departmentsData as unknown as DepartmentsJSON;
  
  const departments = typedData.departments.map((dept: DepartmentData) => {
    // Normalize the department data
    const normalized: DepartmentData = {
      ...dept,
      parent_agency: dept.parent_agency || '',
      orgLevel: dept.orgLevel || 999,
      budget_status: dept.budget_status || 'Active',
      aliases: dept.aliases || []
    };
    
    // Ensure workforce data exists
    if (!normalized.workforce) {
      normalized.workforce = {
        headCount: { yearly: {} },
        yearlyHeadCount: [],
        yearlyWages: [],
        averageTenureYears: undefined,
        averageSalary: undefined,
        averageAge: undefined
      };
    }
    
    return normalized;
  });

  return NextResponse.json(departments);
} 