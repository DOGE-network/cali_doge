// Type definitions for spending data

export type FiscalYear = string; // 'FY2017' | 'FY2018' | 'FY2019' | 'FY2020' | 'FY2021' | 'FY2022' | 'FY2023' | 'FY2024' | 'FY2025';

export interface AgencySpending {
  name: string;
  rank: string;
  spending: Record<FiscalYear, string>;
  stateOperations?: Record<FiscalYear, string>;
  majorPrograms?: Array<{
    code: string;
    name: string;
  }>;
  fundingSources?: Array<{
    code: string;
    name: string;
  }>;
}

export interface BudgetSummary {
  totalSpending: Record<FiscalYear, string>;
  deficit: Record<FiscalYear, string>;
  revenue: Record<FiscalYear, string>;
}

export interface RevenueSource {
  source: string;
  amounts: Record<FiscalYear, string>;
}

export interface TotalRevenueData extends Record<FiscalYear, string> {
  percentChange: string;
}

export interface SpendingData {
  fiscalYears: FiscalYear[];
  agencies: AgencySpending[];
  budgetSummary: BudgetSummary;
  revenueSources: RevenueSource[];
  totalRevenue: TotalRevenueData;
  federalDeficit: Record<FiscalYear, string>;
  sources: Array<{
    name: string;
    url: string;
  }>;
} 