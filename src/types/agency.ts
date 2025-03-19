/**
 * Type definitions for agency data
 */

/**
 * Agency interface represents governmental organizations in the workforce hierarchy
 */
export interface Agency {
  name: string;
  org_level?: number;
  budget_code?: string;
  budget_level?: string;
  budget_status?: 'active' | 'inactive';
  abbreviation?: string;
  description?: string;
  website?: string;
  subAgencies?: Agency[];
  subordinateOffices?: number;
  // Legacy fields for backwards compatibility
  tenureDistribution?: { [key: string]: number };
  salaryDistribution?: { [key: string]: number };
  ageDistribution?: { [key: string]: number };
  yearlyHeadCount?: Array<{ year: string; headCount: number }>;
  yearlyWages?: Array<{ year: string; wages: number }>;
  averageTenureYears?: number;
  averageSalary?: number;
  averageAge?: number;
  // New structure using departments.json
  employeeData?: {
    headCount?: Array<{ year: string; count: number }>;
    wages?: Array<{ year: string; amount: number }>;
    averageTenure?: number;
    averageSalary?: number;
    averageAge?: number;
    tenureDistribution?: { [key: string]: number };
    salaryDistribution?: { [key: string]: number };
    ageDistribution?: { [key: string]: number };
  };
  workforce?: {
    headCount: {
      yearly: Record<string, number>;
    };
    wages: {
      yearly: Record<string, number>;
    };
    averageTenureYears?: number;
    averageSalary?: number;
    averageAge?: number;
    tenureDistribution?: { [key: string]: number };
    salaryDistribution?: { [key: string]: number };
    ageDistribution?: { [key: string]: number };
  };
}

/**
 * Agency data structure used in the workforce visualizations
 */
export interface AgencyData {
  departments: Array<{
    name: string;
    yearlyHeadCount?: Array<{ year: string; headCount: number }>;
    yearlyWages?: Array<{ year: string; wages: number }>;
    tenureDistribution?: { [key: string]: number };
    salaryDistribution?: { [key: string]: number };
    ageDistribution?: { [key: string]: number };
    averageTenureYears?: number;
    averageSalary?: number;
    averageAge?: number;
  }>;
  sources?: Array<{
    name: string;
    url: string;
  }>;
} 