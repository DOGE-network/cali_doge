/**
 * Type definitions for agency data
 */

/**
 * Agency interface represents governmental organizations in the workforce hierarchy
 */
export interface Agency {
  name: string;
  orgLevel?: number;
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
    headCount?: Array<{ year: string; count: number | null }>;
    wages?: Array<{ year: string; amount: number | null }>;
    averageTenure?: number | null;
    averageSalary?: number | null;
    averageAge?: number | null;
    tenureDistribution?: { [key: string]: number } | null;
    salaryDistribution?: { [key: string]: number } | null;
    ageDistribution?: { [key: string]: number } | null;
  };
  workforce?: {
    headCount: {
      yearly: Record<string, number | null>;
    };
    wages: {
      yearly: Record<string, number | null>;
    };
    averageTenureYears?: number | null;
    averageSalary?: number | null;
    averageAge?: number | null;
    tenureDistribution?: { [key: string]: number } | null;
    salaryDistribution?: { [key: string]: number } | null;
    ageDistribution?: { [key: string]: number } | null;
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