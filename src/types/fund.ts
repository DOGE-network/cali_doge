/**
 * Type definitions for fund data
 */

/**
 * Represents a fund with its code, name, group and description
 */
export interface Fund {
  fundCode: string;  // 4-digit fund code as string to preserve leading zeros
  fundName: string;
  fundGroup: string;
  fundDescription: string;
}

/**
 * Fund group types
 */
export type FundGroup = 
  | "Governmental Cost Funds"
  | "Special Revenue Funds"
  | "Transportation Funds" 
  | "Bond Funds"
  | "Federal Funds"
  | "Other Funds";

/**
 * Represents the structure of funds.json
 */
export interface FundsJSON {
  funds: Fund[];
  sources?: Array<{
    name: string;
    url: string;
  }>;
  lastUpdated?: string;
} 