import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper functions for filtering and matching
export function parseFilterValue(value: string): { terms: string[], operator: 'AND' | 'OR' } {
  const normalizedValue = value.replace(/,/g, ' AND ');
  const hasOr = normalizedValue.toUpperCase().includes(' OR ');
  const terms = hasOr 
    ? normalizedValue.split(/\s+OR\s+/i)
    : normalizedValue.split(/\s+AND\s+/i);
  const cleanedTerms = terms.map(term => {
    term = term.trim();
    if (term.startsWith('"') && term.endsWith('"')) {
      return term.slice(1, -1);
    }
    return term;
  }).filter(term => term.length > 0);
  return {
    terms: cleanedTerms,
    operator: hasOr ? 'OR' : 'AND'
  };
}

export function matchesFilter(value: string, filterTerms: { terms: string[], operator: 'AND' | 'OR' }): boolean {
  const searchValue = value.toLowerCase();
  if (filterTerms.operator === 'OR') {
    return filterTerms.terms.some(term => searchValue.includes(term.toLowerCase()));
  } else {
    return filterTerms.terms.every(term => searchValue.includes(term.toLowerCase()));
  }
}

// Program code to name mapping (DEPRECATED: use API/database in data access layer)
export function getProgramName(programCode: string): string {
  // TODO: Implement lookup via API/database if needed
  return programCode;
}

export function mapProgramCodesToNames(programCodes: string[]): string[] {
  // TODO: Implement lookup via API/database if needed
  return programCodes;
}

// Fund code to name mapping (DEPRECATED: use API/database in data access layer)
export function getFundName(fundCode: string): string {
  // TODO: Implement lookup via API/database if needed
  return fundCode;
}

export function mapFundCodesToNames(fundCodes: string[]): string[] {
  // TODO: Implement lookup via API/database if needed
  return fundCodes;
} 