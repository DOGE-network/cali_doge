/**
 * Type definitions for budget data
 */

/**
 * Represents a fund allocation within a budget
 */
export interface FundAllocation {
  code: string;  // 4-digit fund code as string to preserve leading zeros
  count: number;
  amount: number;
}

/**
 * FundingType type alias
 * - 0 = "State Operations": Funding for regular state agency operations
 * - 1 = "Local Assistance": Funding distributed to local governments and entities
 */
export type FundingType = 0 | 1;

/**
 * Represents funding type data with fund allocations
 */
export interface FundingTypeData {
  type: FundingType;
  fundCode: FundAllocation[];
}

/**
 * Represents project code data with funding types
 */
export interface ProjectCodeData {
  code: string;  // 7-digit project code as string to preserve leading zeros
  fundingType: FundingTypeData[];
}

/**
 * Represents fiscal year data with project codes
 */
export interface FiscalYearData {
  year: number;
  projectCode: ProjectCodeData[];
}

/**
 * Represents an organizational budget with organization code and fiscal years
 */
export interface OrganizationalBudget {
  code: string;  // 4-digit organization code as string to preserve leading zeros
  fiscalYear: FiscalYearData[];
}

/**
 * Represents the structure of budgets.json
 */
export interface BudgetsJSON {
  budget: OrganizationalBudget[];
  processedFiles?: string[];
  lastProcessedFile?: string | null;
  lastProcessedTimestamp?: string | null;
  sources?: Array<{
    name: string;
    url: string;
  }>;
  lastUpdated?: string;
} 