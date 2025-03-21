/**
 * Type definitions for department data
 */

/**
 * Structure of a department in departments.json
 */
export interface WorkforceData {
  yearlyHeadCount?: Array<{
    year: string;
    headCount: number;
  }>;
  yearlyWages?: Array<{
    year: string;
    wages: number;
  }>;
  averageTenureYears?: number | null;
  averageSalary?: number | null;
  averageAge?: number | null;
  tenureDistribution?: Record<string, number>;
  salaryDistribution?: Record<string, number>;
  ageDistribution?: Record<string, number>;
  _note?: string;
  headCount?: {
    yearly: Record<string, number | null>;
  };
  wages?: {
    yearly: Record<string, number | null>;
  };
}

export interface DepartmentData {
  name: string;
  slug: string;
  canonicalName: string;
  aliases: string[];
  workforce?: WorkforceData;
  spending?: {
    yearly: Record<string, string>;
  };
  code?: string;
  orgLevel: number;
  budget_status: string;
  keyFunctions: string;
  abbreviation: string;
  parent_agency: string;
}

/**
 * Extended interface for department hierarchy visualization
 */
export interface DepartmentHierarchy extends DepartmentData {
  subDepartments?: DepartmentHierarchy[];
  subordinateOffices?: number;
}

/**
 * Structure of the departments.json file
 */
export interface DepartmentsJSON {
  departments: DepartmentData[];
  budgetSummary?: {
    totalSpending: Record<string, string>;
    revenue: Record<string, string>;
    deficit: Record<string, string>;
  };
  revenueSources?: Array<{
    source: string;
    amounts: Record<string, string>;
  }>;
  totalRevenue?: Record<string, string> & {
    percentChange?: string;
  };
  sources?: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * Simplified department mapping used throughout the application
 */
export interface DepartmentMapping {
  slug: string;           // The slug used in department URLs
  name: string;           // The department name
  canonicalName: string;  // The full official/canonical name
  code: string;           // The department code (e.g., "3900")
  fullName?: string;      // The full department name (for display)
  spendingName?: string;  // The name used in spending data
  workforceName?: string; // The name used in workforce data
  aliases?: string[];     // Alternative names for the department
}

/**
 * Result of department data verification
 */
export interface VerificationResult {
  success: boolean;
  messages: string[];
  missingSpendingData: string[];
  missingWorkforceData: string[];
  dataMismatches: string[];
} 