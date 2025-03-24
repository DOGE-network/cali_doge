 /**
 * Type definitions for vendor transaction data from open.fiscal.ca.gov
 */

import { FiscalYearKey, ValidSlug, NonNegativeNumber, NonNegativeInteger } from './department';

/**
 * Raw vendor transaction record structure from CSV
 */
export interface VendorTransactionRecord {
  business_unit: string;
  agency_name: string;
  department_name: string;
  document_id: string;
  related_document: string;
  accounting_date: string;
  fiscal_year_begin: string;
  accounting_period: string;
  VENDOR_NAME: string;
  account: string;
  account_type: string;
  account_category: string;
  account_sub_category: string;
  account_description: string;
  fund_code: string;
  fund_group: string;
  fund_description: string;
  program_code: string;
  program_description: string;
  sub_program_description: string;
  budget_reference: string;
  budget_reference_category: string;
  budget_reference_sub_category: string;
  budget_reference_description: string;
  year_of_enactment: string;
  monetary_amount: string;
}

/**
 * Transaction amount ranges for distribution analysis
 */
export interface TransactionRange {
  range: [0, 9999] | [10000, 49999] | [50000, 99999] | [100000, 499999] | [500000, 999999] |
         [1000000, 4999999] | [5000000, 9999999] | [10000000, 49999999] | [50000000, 99999999] | [100000000, 1000000000];
  count: NonNegativeInteger;
}

/**
 * Account categories from the transaction data
 */
export type AccountCategory = 
  'Operating Expense & Equipment' |
  'Special Items of Expense' |
  'Personal Services' |
  'Staff Benefits' |
  'Other';

/**
 * Processed vendor data structure
 */
export interface VendorData {
  name: string;
  slug: ValidSlug;
  canonicalName: string;
  aliases: string[];
  transactions: {
    yearly: Record<FiscalYearKey, number>;
    transactionCount: Record<FiscalYearKey, number>;
    byDepartment: Record<string, {
      yearly: Record<FiscalYearKey, number>;
      transactionCount: Record<FiscalYearKey, number>;
    }>;
    byCategory: Record<AccountCategory, {
      yearly: Record<FiscalYearKey, number>;
      transactionCount: Record<FiscalYearKey, number>;
    }>;
    averageTransaction?: NonNegativeNumber;
    transactionDistribution?: TransactionRange[];
    _note?: string;
  };
  departments: string[];
  categories: AccountCategory[];
  status: 'active' | 'inactive';
}

/**
 * Structure of the vendors.json file
 */
export interface VendorsJSON {
  vendors: VendorData[];
  sources: Array<{
    name: string;
    url: string;
    lastUpdated: string;
  }>;
  _note?: string;
}

/**
 * Simplified vendor mapping used throughout the application
 */
export interface VendorMapping {
  slug: string;           // The slug used in vendor URLs
  name: string;           // The vendor name
  canonicalName: string;  // The full official/canonical name
  aliases?: string[];     // Alternative names for the vendor
  departments: string[];  // Associated department slugs
  categories: AccountCategory[];  // Business categories
} 