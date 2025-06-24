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

// Program code to name mapping
let programCodeToNameMap: Map<string, string> | null = null;

export function getProgramName(programCode: string): string {
  if (!programCodeToNameMap) {
    // Initialize the map if it hasn't been loaded yet
    try {
      const programsData = require('@/data/programs.json');
      programCodeToNameMap = new Map();
      
      programsData.programs.forEach((program: any) => {
        if (program.projectCode && program.name) {
          programCodeToNameMap!.set(program.projectCode, program.name);
        }
      });
    } catch (error) {
      console.error('Error loading programs data:', error);
      programCodeToNameMap = new Map();
    }
  }
  
  return programCodeToNameMap.get(programCode) || programCode;
}

export function mapProgramCodesToNames(programCodes: string[]): string[] {
  return programCodes.map(code => getProgramName(code));
}

// Fund code to name mapping
let fundCodeToNameMap: Map<string, string> | null = null;

export function getFundName(fundCode: string): string {
  if (!fundCodeToNameMap) {
    // Initialize the map if it hasn't been loaded yet
    try {
      const fundsData = require('@/data/funds.json');
      fundCodeToNameMap = new Map();
      
      fundsData.funds.forEach((fund: any) => {
        if (fund.fundCode && fund.fundName) {
          fundCodeToNameMap!.set(fund.fundCode, fund.fundName);
        }
      });
    } catch (error) {
      console.error('Error loading funds data:', error);
      fundCodeToNameMap = new Map();
    }
  }
  
  return fundCodeToNameMap.get(fundCode) || fundCode;
}

export function mapFundCodesToNames(fundCodes: string[]): string[] {
  return fundCodes.map(code => getFundName(code));
} 