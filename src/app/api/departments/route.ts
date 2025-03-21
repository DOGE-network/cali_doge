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
      budget_status: dept.budget_status || 'active',
      aliases: dept.aliases || []
    };

    // Fix reporting structure based on data
    if (normalized.parent_agency === 'California State Government') {
      normalized.orgLevel = 1;
      normalized.budget_status = 'active';
    }

    if (normalized.orgLevel === 1) {
      normalized.parent_agency = 'California State Government';
      normalized.budget_status = 'active';
    }
    
    // Ensure workforce data exists and normalize its structure
    if (!normalized.workforce) {
      normalized.workforce = {
        headCount: { yearly: {} },
        wages: { yearly: {} },
        yearlyHeadCount: [],
        yearlyWages: [],
        averageTenureYears: null,
        averageSalary: null,
        averageAge: null
      };
    } else {
      // Initialize arrays if they don't exist
      normalized.workforce.yearlyHeadCount = normalized.workforce.yearlyHeadCount || [];
      normalized.workforce.yearlyWages = normalized.workforce.yearlyWages || [];

      // If we have headCount.yearly data but no yearlyHeadCount array, create it
      if (normalized.workforce.headCount?.yearly && Object.keys(normalized.workforce.headCount.yearly).length > 0) {
        const yearlyEntries = Object.entries(normalized.workforce.headCount.yearly)
          .filter(([_, value]) => value !== null && value !== undefined)
          .map(([year, headCount]) => ({
            year,
            headCount: headCount as number // Safe to cast since we filtered out null/undefined
          }));
        normalized.workforce.yearlyHeadCount = yearlyEntries;
      }

      // If we have wages.yearly data but no yearlyWages array, create it
      if (normalized.workforce.wages?.yearly && Object.keys(normalized.workforce.wages.yearly).length > 0) {
        const yearlyEntries = Object.entries(normalized.workforce.wages.yearly)
          .filter(([_, value]) => value !== null && value !== undefined)
          .map(([year, wages]) => ({
            year,
            wages: wages as number // Safe to cast since we filtered out null/undefined
          }));
        normalized.workforce.yearlyWages = yearlyEntries;
      }

      // Ensure all required properties exist
      normalized.workforce = {
        ...normalized.workforce,
        headCount: normalized.workforce.headCount || { yearly: {} },
        wages: normalized.workforce.wages || { yearly: {} },
        averageTenureYears: normalized.workforce.averageTenureYears || null,
        averageSalary: normalized.workforce.averageSalary || null,
        averageAge: normalized.workforce.averageAge || null
      };
    }
    
    return normalized;
  });

  return NextResponse.json(departments);
} 