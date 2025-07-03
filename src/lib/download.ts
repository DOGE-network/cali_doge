/**
 * Download utility functions for exporting data
 */

export interface DownloadColumn {
  key: string;
  header: string;
  formatter?: (_value: any, _row?: any, _lookups?: LookupMaps) => string;
}

interface LookupMaps {
  programCodeToName: Record<string, string>;
  fundCodeToName: Record<string, string>;
}

/**
 * Convert data to TSV format, supporting lookups for resolved columns
 */
export function convertToTSVWithLookups(data: any[], columns: DownloadColumn[], lookups: LookupMaps): string {
  if (!data || data.length === 0) return '';

  // Create header row
  const headers = columns.map(col => col.header).join('\t');
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formattedValue = col.formatter ? col.formatter(value, row, lookups) : String(value || '');
      // Escape tabs and newlines in TSV
      return formattedValue.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
    }).join('\t');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Download data as TSV file, resolving program/fund codes to names using /api/search
 */
export async function downloadTSVWithLookups(data: any[], filename: string, columns: DownloadColumn[]): Promise<void> {
  // Fetch lookup tables from /api/search
  const searchResp = await fetch('/api/search?types=programs,funds&limit=10000');
  const searchData = await searchResp.json();

  // Build lookup maps
  const programCodeToName: Record<string, string> = {};
  const fundCodeToName: Record<string, string> = {};
  (searchData.programs || []).forEach((p: any) => {
    if (p.source_id && p.term) programCodeToName[p.source_id] = p.term;
  });
  (searchData.funds || []).forEach((f: any) => {
    if (f.source_id && f.term) fundCodeToName[f.source_id] = f.term;
  });
  const lookups: LookupMaps = { programCodeToName, fundCodeToName };

  // Generate TSV
  const tsvContent = convertToTSVWithLookups(data, columns, lookups);
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
 * Predefined column configurations for common data types
 * Includes resolved columns using lookup maps
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
  { key: 'program_name_resolved', header: 'Program Name (Resolved)', formatter: (_v, row, lookups) => lookups?.programCodeToName[row.program_code || row.program] || '' },
  { key: 'fund_code', header: 'Fund Code' },
  { key: 'fund', header: 'Fund (Raw)' },
  { key: 'fund_name', header: 'Fund Name (API)' },
  { key: 'fund_name_resolved', header: 'Fund Name (Resolved)', formatter: (_v, row, lookups) => lookups?.fundCodeToName[row.fund_code || row.fund] || '' },
  { key: 'amount', header: 'Amount', formatter: formatCurrencyForExport },
  { key: 'payment_method', header: 'Payment Method' },
  { key: 'description', header: 'Description' },
  { key: 'contract_number', header: 'Contract Number' },
  { key: 'purchase_order', header: 'Purchase Order' },
  { key: 'invoice_number', header: 'Invoice Number' },
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
  { key: 'program_name_resolved', header: 'Program Name (Resolved)', formatter: (_v, row, lookups) => lookups?.programCodeToName[row.program_code || row.program] || '' },
  { key: 'fund_code', header: 'Fund Code' },
  { key: 'fund', header: 'Fund (Raw)' },
  { key: 'fund_name', header: 'Fund Name (API)' },
  { key: 'fund_name_resolved', header: 'Fund Name (Resolved)', formatter: (_v, row, lookups) => lookups?.fundCodeToName[row.fund_code || row.fund] || '' },
  { key: 'amount', header: 'Amount', formatter: formatCurrencyForExport },
  { key: 'budget_type', header: 'Budget Type' },
  { key: 'appropriation_type', header: 'Appropriation Type' },
  { key: 'source', header: 'Source' },
  { key: 'description', header: 'Description' },
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
  // 2. Columns with formatters
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