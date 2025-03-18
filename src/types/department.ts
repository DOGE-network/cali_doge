/**
 * Type definitions for department data
 */

/**
 * Structure of a department in departments.json
 */
export interface DepartmentData {
  name: string;
  slug: string;
  canonicalName: string;
  aliases: string[];
  code?: string;
  spending?: {
    yearly: Record<string, string>;
    stateOperations: Record<string, string>;
  };
  workforce?: {
    yearlyHeadCount: Array<{ year: string; headCount: number }>;
    yearlyWages: Array<{ year: string; wages: number }>;
    averageTenureYears?: number;
    averageSalary?: number;
    averageAge?: number;
    tenureDistribution?: { [key: string]: number };
    salaryDistribution?: { [key: string]: number };
    ageDistribution?: { [key: string]: number };
  };
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