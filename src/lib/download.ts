/**
 * Download utility functions for exporting data
 */

// Import static data for name resolution
import programsData from '@/data/programs.json';
import fundsData from '@/data/funds.json';

export interface DownloadColumn {
  key: string;
  header: string;
  formatter?: (_value: any, _row?: any) => string;
}

/**
 * Convert data to TSV format
 */
export function convertToTSV(data: any[], columns: DownloadColumn[]): string {
  if (!data || data.length === 0) return '';

  // Create header row
  const headers = columns.map(col => col.header).join('\t');
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formattedValue = col.formatter ? col.formatter(value, row) : String(value || '');
      // Escape tabs and newlines in TSV
      return formattedValue.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
    }).join('\t');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Download data as TSV file
 */
export function downloadTSV(data: any[], filename: string, columns: DownloadColumn[]): void {
  const tsvContent = convertToTSV(data, columns);
  const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.tsv') ? filename : `${filename}.tsv`);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return num.toFixed(2);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Lookup program name from project code
 */
export function lookupProgramName(programCode: string): string {
  if (!programCode) return '';
  
  // Clean and normalize the program code
  const cleanCode = String(programCode).trim();
  
  // Find program by project code (exact match first)
  let program = programsData.programs.find(p => p.projectCode === cleanCode);
  
  // If not found and code is longer than 7 digits, try truncating to 7
  if (!program && cleanCode.length > 7) {
    const truncated = cleanCode.substring(0, 7);
    program = programsData.programs.find(p => p.projectCode === truncated);
  }
  
  // If not found and code is shorter than 7 digits, try padding with zeros
  if (!program && cleanCode.length < 7) {
    const padded = cleanCode.padEnd(7, '0');
    program = programsData.programs.find(p => p.projectCode === padded);
  }
  
  return program?.name || '';
}

/**
 * Lookup fund name from fund code
 */
export function lookupFundName(fundCode: string): string {
  if (!fundCode) return '';
  
  // Clean and normalize the fund code
  const cleanCode = String(fundCode).trim();
  
  // Find fund by fund code (exact match first)
  let fund = fundsData.funds.find(f => f.fundCode === cleanCode);
  
  // If not found, try padding with leading zeros (e.g., "1" -> "0001")
  if (!fund && cleanCode.length < 4) {
    const padded = cleanCode.padStart(4, '0');
    fund = fundsData.funds.find(f => f.fundCode === padded);
  }
  
  return fund?.fundName || '';
}

/**
 * Lookup fund group from fund code
 */
export function lookupFundGroup(fundCode: string): string {
  if (!fundCode) return '';
  
  // Clean and normalize the fund code
  const cleanCode = String(fundCode).trim();
  
  // Find fund by fund code (exact match first)
  let fund = fundsData.funds.find(f => f.fundCode === cleanCode);
  
  // If not found, try padding with leading zeros (e.g., "1" -> "0001")
  if (!fund && cleanCode.length < 4) {
    const padded = cleanCode.padStart(4, '0');
    fund = fundsData.funds.find(f => f.fundCode === padded);
  }
  
  return fund?.fundGroup || '';
}

/**
 * Get program description from project code
 */
export function lookupProgramDescription(programCode: string): string {
  if (!programCode) return '';
  
  // Clean and normalize the program code
  const cleanCode = String(programCode).trim();
  
  // Find program by project code (exact match first)
  let program = programsData.programs.find(p => p.projectCode === cleanCode);
  
  // If not found and code is longer than 7 digits, try truncating to 7
  if (!program && cleanCode.length > 7) {
    const truncated = cleanCode.substring(0, 7);
    program = programsData.programs.find(p => p.projectCode === truncated);
  }
  
  // If not found and code is shorter than 7 digits, try padding with zeros
  if (!program && cleanCode.length < 7) {
    const padded = cleanCode.padEnd(7, '0');
    program = programsData.programs.find(p => p.projectCode === padded);
  }
  
  if (!program?.programDescriptions?.length) return '';
  
  // Return the first description
  return program.programDescriptions[0]?.description || '';
}

/**
 * Predefined column configurations for common data types
 */
export const VENDOR_SPENDING_COLUMNS: DownloadColumn[] = [
  { key: 'fiscal_year', header: 'Fiscal Year' },
  { key: 'year', header: 'Year' },
  { key: 'department_name', header: 'Department Name' },
  { key: 'department', header: 'Department' },
  { key: 'department_code', header: 'Department Code' },
  { key: 'vendor_name', header: 'Vendor Name' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'vendor_ein', header: 'Vendor EIN' },
  { key: 'vendor_address', header: 'Vendor Address' },
  { key: 'vendor_city', header: 'Vendor City' },
  { key: 'vendor_state', header: 'Vendor State' },
  { key: 'vendor_zip', header: 'Vendor ZIP' },
  { key: 'program_code', header: 'Program Code' },
  { key: 'program', header: 'Program (Raw)' },
  { key: 'program_name', header: 'Program Name (API)' },
  { key: 'resolved_program_name', header: 'Program Name (Resolved)', formatter: (value: any, row: any) => lookupProgramName(row?.program_code || row?.program || '') },
  { key: 'program_description', header: 'Program Description (API)' },
  { key: 'resolved_program_description', header: 'Program Description (Resolved)', formatter: (value: any, row: any) => lookupProgramDescription(row?.program_code || row?.program || '') },
  { key: 'fund_code', header: 'Fund Code' },
  { key: 'fund', header: 'Fund (Raw)' },
  { key: 'fund_name', header: 'Fund Name (API)' },
  { key: 'resolved_fund_name', header: 'Fund Name (Resolved)', formatter: (value: any, row: any) => lookupFundName(row?.fund_code || row?.fund || '') },
  { key: 'fund_description', header: 'Fund Description' },
  { key: 'resolved_fund_group', header: 'Fund Group', formatter: (value: any, row: any) => lookupFundGroup(row?.fund_code || row?.fund || '') },
  { key: 'amount', header: 'Amount', formatter: formatCurrencyForExport },
  { key: 'transaction_date', header: 'Transaction Date', formatter: formatDateForExport },
  { key: 'payment_method', header: 'Payment Method' },
  { key: 'description', header: 'Description' },
  { key: 'contract_number', header: 'Contract Number' },
  { key: 'purchase_order', header: 'Purchase Order' },
  { key: 'invoice_number', header: 'Invoice Number' }
];

export const BUDGET_SPENDING_COLUMNS: DownloadColumn[] = [
  { key: 'fiscal_year', header: 'Fiscal Year' },
  { key: 'year', header: 'Year' },
  { key: 'department_name', header: 'Department Name' },
  { key: 'department', header: 'Department' },
  { key: 'department_code', header: 'Department Code' },
  { key: 'program_code', header: 'Program Code' },
  { key: 'program', header: 'Program (Raw)' },
  { key: 'program_name', header: 'Program Name (API)' },
  { key: 'resolved_program_name', header: 'Program Name (Resolved)', formatter: (value: any, row: any) => lookupProgramName(row?.program_code || row?.program || '') },
  { key: 'program_description', header: 'Program Description (API)' },
  { key: 'resolved_program_description', header: 'Program Description (Resolved)', formatter: (value: any, row: any) => lookupProgramDescription(row?.program_code || row?.program || '') },
  { key: 'fund_code', header: 'Fund Code' },
  { key: 'fund', header: 'Fund (Raw)' },
  { key: 'fund_name', header: 'Fund Name (API)' },
  { key: 'resolved_fund_name', header: 'Fund Name (Resolved)', formatter: (value: any, row: any) => lookupFundName(row?.fund_code || row?.fund || '') },
  { key: 'fund_description', header: 'Fund Description' },
  { key: 'resolved_fund_group', header: 'Fund Group', formatter: (value: any, row: any) => lookupFundGroup(row?.fund_code || row?.fund || '') },
  { key: 'budget_category', header: 'Budget Category' },
  { key: 'budget_subcategory', header: 'Budget Subcategory' },
  { key: 'amount', header: 'Amount', formatter: formatCurrencyForExport },
  { key: 'budget_type', header: 'Budget Type' },
  { key: 'appropriation_type', header: 'Appropriation Type' },
  { key: 'source', header: 'Source' },
  { key: 'description', header: 'Description' }
];

/**
 * Get available columns from data sample
 */
export function getAvailableColumns(data: any[], predefinedColumns: DownloadColumn[]): DownloadColumn[] {
  if (!data || data.length === 0) return predefinedColumns;
  
  // Get all unique keys from the data
  const allKeys = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });
  
  // Filter predefined columns to include:
  // 1. Columns that exist in the data
  // 2. Columns with formatters (virtual/computed columns)
  const availableColumns = predefinedColumns.filter(col => 
    allKeys.has(col.key) || col.formatter
  );
  
  // Add any additional columns not in predefined list
  const predefinedKeys = new Set(predefinedColumns.map(col => col.key));
  const additionalColumns = Array.from(allKeys)
    .filter(key => !predefinedKeys.has(key))
    .map(key => ({
      key,
      header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  
  return [...availableColumns, ...additionalColumns];
} 