/**
 * Type definitions for budget data
 */

/**
 * FundingType type alias
 * - 0 = "State Operations": Funding for regular state agency operations
 * - 1 = "Local Assistance": Funding distributed to local governments and entities
 */
export type FundingType = 0 | 1;

/**
 * Represents a fund allocation within a budget
 */
export interface FundAllocation {
  code: string;  // 4-digit fund code as string to preserve leading zeros
  count: number;
  amount: number;
}

/**
 * Represents funding type data with fund allocations
 */
export interface FundingTypeData {
  type: FundingType;
  fundCode: FundAllocation[];
}

/**
 * Represents organization code data with funding types
 */
export interface OrganizationCodeData {
  code: number;
  fundingType: FundingTypeData[];
}

/**
 * Represents project code data with organization codes
 */
export interface ProjectCodeData {
  code: string;
  organizationCode: OrganizationCodeData[];
}

/**
 * Represents fiscal year data with project codes
 */
export interface FiscalYearData {
  year: number;
  projectCode: ProjectCodeData[];
}

/**
 * Represents an organizational budget with fiscal years
 */
export interface OrganizationalBudget {
  code: number;
  fiscalYear: FiscalYearData[];
}

/**
 * Represents the structure of budgets.json
 */
export interface BudgetsJSON {
  budget: OrganizationalBudget[];
  sources?: Array<{
    name: string;
    url: string;
  }>;
  lastUpdated?: string;
} 