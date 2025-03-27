#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import type { 
  DepartmentData, 
  WorkforceData, 
  ValidYear,
  FiscalYearKey,
  AnnualYear,
  ValidSlug,
  BudgetStatus,
  NonNegativeNumber,
  NonNegativeInteger,
  OrgLevel,
  DistributionCount,
  SalaryRange,
  TenureRange,
  AgeRange
} from '@/types/department';

const prompt = require('prompt-sync')({ sigint: true });

// Read departments.json
const departmentsPath = path.join(__dirname, '../data/departments.json');
const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));

// Validation helper functions
function isValidYear(year: number): year is ValidYear {
  return Number.isInteger(year) && year >= 1900 && year <= 2030;
}

// Validation statistics
interface ValidationStats {
  total: number;
  valid: number;
  invalid: number;
  details: {
    budget_status: { valid: number; invalid: number; empty: number; found: string[] };
    fiscal_years: { valid: number; invalid: number; empty: number; found: string[] };
    annual_years: { valid: number; invalid: number; empty: number; found: string[] };
    salary_ranges: { valid: number; invalid: number; empty: number; found: string[] };
    tenure_ranges: { valid: number; invalid: number; empty: number; found: string[] };
    age_ranges: { valid: number; invalid: number; empty: number; found: string[] };
    fields: Record<string, { valid: number; invalid: number; empty: number }>;
  };
}

const stats: ValidationStats = {
  total: 0,
  valid: 0,
  invalid: 0,
  details: {
    budget_status: { valid: 0, invalid: 0, empty: 0, found: [] },
    fiscal_years: { valid: 0, invalid: 0, empty: 0, found: [] },
    annual_years: { valid: 0, invalid: 0, empty: 0, found: [] },
    salary_ranges: { valid: 0, invalid: 0, empty: 0, found: [] },
    tenure_ranges: { valid: 0, invalid: 0, empty: 0, found: [] },
    age_ranges: { valid: 0, invalid: 0, empty: 0, found: [] },
    fields: {}
  }
};

function isValidFiscalYearFormat(str: string): boolean | FiscalYearKey {
  // Track unique formats
  if (!stats.details.fiscal_years.found.includes(str)) {
    stats.details.fiscal_years.found.push(str);
  }

  // Convert FY2023 to FY2023-FY2024
  if (/^FY\d{4}$/.test(str)) {
    const year = parseInt(str.slice(2));
    if (isValidYear(year)) {
      const nextYear = year + 1;
      if (isValidYear(nextYear)) {
        const newFormat = `${str}-FY${nextYear}` as FiscalYearKey;
        stats.details.fiscal_years.invalid++;
        console.log(`Converting ${str} to ${newFormat}`);
        return newFormat;
      }
    }
    stats.details.fiscal_years.invalid++;
    return false;
  }
  
  if (!/^FY\d{4}-FY\d{4}$/.test(str)) {
    stats.details.fiscal_years.invalid++;
    return false;
  }
  
  const firstYear = parseInt(str.slice(2, 6));
  const secondYear = parseInt(str.slice(9, 13));
  
  if (!isValidYear(firstYear) || !isValidYear(secondYear) || secondYear !== firstYear + 1) {
    stats.details.fiscal_years.invalid++;
    return false;
  }

  stats.details.fiscal_years.valid++;
  return true;
}

function isValidAnnualYear(val: string | number | null | undefined): val is AnnualYear {
  // Handle null/undefined/empty values
  if (val === null || val === undefined || val === '') {
    return false;
  }
  
  const str = val.toString();
  if (!/^\d{4}$/.test(str)) {
    if (!stats.details.annual_years.found.includes(str)) {
      stats.details.annual_years.found.push(str);
    }
    stats.details.annual_years.invalid++;
    console.log(`Warning: Invalid annual year format: ${str}, expected yyyy`);
    return false;
  }
  const year = parseInt(str);
  if (!isValidYear(year)) {
    return false;
  }
  stats.details.annual_years.valid++;
  return true;
}

function isValidSlug(str: string): str is ValidSlug {
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(str);
}

function isNonNegativeNumber(val: number): val is NonNegativeNumber {
  return !isNaN(val) && val >= 0;
}

function isNonNegativeInteger(val: number): val is NonNegativeInteger {
  return isNonNegativeNumber(val) && Number.isInteger(val);
}

function isValidAliasesArray(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.every(item => typeof item === 'string' && item.trim().length > 0);
}

function isValidOrgLevel(num: number): num is OrgLevel {
  return isNonNegativeInteger(num);
}

function isValidBudgetStatus(val: string): val is BudgetStatus {
  const status = val.toLowerCase();
  if (status !== 'active' && status !== 'inactive') {
    stats.details.budget_status.invalid++;
    if (!stats.details.budget_status.found.includes(val)) {
      stats.details.budget_status.found.push(val);
    }
    console.log(`Warning: Invalid budget status: ${val}, expected 'active' or 'inactive'`);
    return false;
  }
  stats.details.budget_status.valid++;
  return true;
}

function isValidDistributionCount(val: number): val is DistributionCount {
  return isNonNegativeInteger(val);
}

type ValidTenureRange = [0, 1] | [1, 2] | [3, 4] | [5, 9] | [10, 14] | [15, 19] | [20, 24] | [25, 29] | [30, 34] | [35, 39] | [40, 100];
type ValidSalaryRange = [0, 19999] | [20000, 29999] | [30000, 39999] | [40000, 49999] | [50000, 59999] | 
                       [60000, 69999] | [70000, 79999] | [80000, 89999] | [90000, 99999] | [100000, 109999] |
                       [110000, 119999] | [120000, 129999] | [130000, 139999] | [140000, 149999] | [150000, 159999] |
                       [160000, 169999] | [170000, 179999] | [180000, 189999] | [190000, 199999] | [200000, 249999] |
                       [250000, 299999] | [300000, 349999] | [350000, 399999] | [400000, 449999] | [450000, 499999] | 
                       [500000, 999999] | [1000000, 10000000];
type ValidAgeRange = [0, 20] | [20, 24] | [25, 29] | [30, 34] | [35, 39] | [40, 44] | [45, 49] | [50, 54] | [55, 59] | [60, 64] | [65, 100];

type RangeWithCount<T> = {
  range: T;
  count: number;
};

type TenureRangeWithCount = RangeWithCount<ValidTenureRange>;
type SalaryRangeWithCount = RangeWithCount<ValidSalaryRange>;
type AgeRangeWithCount = RangeWithCount<ValidAgeRange>;

function isValidSalaryRangeValue(range: unknown): range is ValidSalaryRange {
  if (!Array.isArray(range) || range.length !== 2) return false;
  const validRanges = [
    [0, 19999], [20000, 29999], [30000, 39999], [40000, 49999], [50000, 59999],
    [60000, 69999], [70000, 79999], [80000, 89999], [90000, 99999], [100000, 109999],
    [110000, 119999], [120000, 129999], [130000, 139999], [140000, 149999], [150000, 159999],
    [160000, 169999], [170000, 179999], [180000, 189999], [190000, 199999], [200000, 249999],
    [250000, 299999], [300000, 349999], [350000, 399999], [400000, 449999], [450000, 499999],
    [500000, 999999], [1000000, 10000000]
  ] as ValidSalaryRange[];

  return validRanges.some(([min, max]) => range[0] === min && range[1] === max);
}

function isValidTenureRangeValue(range: unknown): range is ValidTenureRange {
  if (!Array.isArray(range) || range.length !== 2) return false;
  const validRanges = [
    [0, 1], [1, 2], [3, 4], [5, 9], [10, 14], [15, 19], [20, 24],
    [25, 29], [30, 34], [35, 39], [40, 100]
  ] as ValidTenureRange[];

  return validRanges.some(([min, max]) => range[0] === min && range[1] === max);
}

function isValidAgeRangeValue(range: unknown): range is ValidAgeRange {
  if (!Array.isArray(range) || range.length !== 2) return false;
  const validRanges = [
    [0, 20], [20, 24], [25, 29], [30, 34], [35, 39], [40, 44],
    [45, 49], [50, 54], [55, 59], [60, 64], [65, 100]
  ] as ValidAgeRange[];

  return validRanges.some(([min, max]) => range[0] === min && range[1] === max);
}

function _isValidSalaryRange(range: unknown): range is SalaryRangeWithCount {
  if (!range || typeof range !== 'object') return false;
  const r = range as { range?: [number, number]; count?: number };
  if (!Array.isArray(r.range) || r.range.length !== 2 || typeof r.count !== 'number') return false;

  const rangeStr = `[${r.range[0]},${r.range[1]}]`;
  if (!isValidSalaryRangeValue(r.range)) {
    if (!stats.details.salary_ranges.found.includes(rangeStr)) {
      stats.details.salary_ranges.found.push(rangeStr);
    }
    stats.details.salary_ranges.invalid++;
    console.log(`Warning: Invalid salary range: ${rangeStr}`);
    return false;
  }
  stats.details.salary_ranges.valid++;
  return true;
}

function _isValidTenureRange(range: unknown): range is TenureRangeWithCount {
  if (!range || typeof range !== 'object') return false;
  const r = range as { range?: [number, number]; count?: number };
  if (!Array.isArray(r.range) || r.range.length !== 2 || typeof r.count !== 'number') return false;

  const rangeStr = `[${r.range[0]},${r.range[1]}]`;
  if (!isValidTenureRangeValue(r.range)) {
    if (!stats.details.tenure_ranges.found.includes(rangeStr)) {
      stats.details.tenure_ranges.found.push(rangeStr);
    }
    stats.details.tenure_ranges.invalid++;
    console.log(`Warning: Invalid tenure range: ${rangeStr}`);
    return false;
  }
  stats.details.tenure_ranges.valid++;
  return true;
}

function _isValidAgeRange(range: unknown): range is AgeRangeWithCount {
  if (!range || typeof range !== 'object') return false;
  const r = range as { range?: [number, number]; count?: number };
  if (!Array.isArray(r.range) || r.range.length !== 2 || typeof r.count !== 'number') return false;

  const rangeStr = `[${r.range[0]},${r.range[1]}]`;
  if (!isValidAgeRangeValue(r.range)) {
    if (!stats.details.age_ranges.found.includes(rangeStr)) {
      stats.details.age_ranges.found.push(rangeStr);
    }
    stats.details.age_ranges.invalid++;
    console.log(`Warning: Invalid age range: ${rangeStr}`);
    return false;
  }
  stats.details.age_ranges.valid++;
  return true;
}

function isValidDistributionItem<T extends [number, number]>(
  item: unknown,
  rangeValidator: (range: unknown) => range is T
): item is { range: T; count: DistributionCount } {
  if (!item || typeof item !== 'object') return false;
  const { range, count } = item as { range: unknown; count: unknown };
  return rangeValidator(range) && isValidDistributionCount(count as number);
}

function isValidDistributionArray<T extends [number, number]>(
  arr: unknown,
  rangeValidator: (range: unknown) => range is T
): arr is { range: T; count: DistributionCount }[] | [] {
  // Allow empty array as placeholder
  if (Array.isArray(arr) && arr.length === 0) return true;
  
  // If not empty, validate each item
  return Array.isArray(arr) && arr.every(item => isValidDistributionItem<T>(item, rangeValidator));
}

interface ValidationResult {
  departmentName: string;
  field: string;
  currentValue: any;
  proposedFix: YearlyValue | WorkforceYearlyRecord | SpendingYearlyRecord | any[] | string | null;
  reason: string;
}

function _isValidWorkforceData(data: unknown): data is WorkforceData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Initialize empty records for headCount and wages if missing
  const workforceData = data as WorkforceData;
  
  // Initialize empty arrays for distributions if missing
  workforceData.salaryDistribution = workforceData.salaryDistribution || {
    yearly: {} as Record<AnnualYear, SalaryRange[]>
  };
  workforceData.tenureDistribution = workforceData.tenureDistribution || {
    yearly: {} as Record<AnnualYear, TenureRange[]>
  };
  workforceData.ageDistribution = workforceData.ageDistribution || {
    yearly: {} as Record<AnnualYear, AgeRange[]>
  };

  // Initialize headCount and wages with empty records if missing
  if (!workforceData.headCount?.yearly) {
    workforceData.headCount = { yearly: {} as Record<AnnualYear, number | {}> };
  }
  if (!workforceData.wages?.yearly) {
    workforceData.wages = { yearly: {} as Record<AnnualYear, number | {}> };
  }

  // Clean up invalid yearly records
  if (workforceData.headCount.yearly) {
    const cleanYearly = {} as Record<AnnualYear, number | {}>;
    for (const [year, value] of Object.entries(workforceData.headCount.yearly)) {
      if (year && /^\d{4}$/.test(year)) {
        cleanYearly[year as AnnualYear] = typeof value === 'number' ? value : {};
      }
    }
    workforceData.headCount.yearly = cleanYearly;
  }

  if (workforceData.wages.yearly) {
    const cleanYearly = {} as Record<AnnualYear, number | {}>;
    for (const [year, value] of Object.entries(workforceData.wages.yearly)) {
      if (year && /^\d{4}$/.test(year)) {
        cleanYearly[year as AnnualYear] = typeof value === 'number' ? value : {};
      }
    }
    workforceData.wages.yearly = cleanYearly;
  }
  
  return true;
}

function _isValidDepartmentData(data: unknown): data is DepartmentData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const departmentData = data as DepartmentData;

  // Validate required fields
  if (!departmentData.name || typeof departmentData.name !== 'string') {
    console.warn(`Invalid department name: ${departmentData.name}`);
    return false;
  }

  if (!departmentData.slug || typeof departmentData.slug !== 'string') {
    console.warn(`Invalid department slug: ${departmentData.slug}`);
    return false;
  }

  // Initialize workforce data if missing
  if (!departmentData.workforce) {
    departmentData.workforce = {
      headCount: { yearly: {} as Record<AnnualYear, number | {}> },
      wages: { yearly: {} as Record<AnnualYear, number | {}> },
      averageTenureYears: null,
      averageSalary: null,
      averageAge: null,
      salaryDistribution: { yearly: {} as Record<AnnualYear, SalaryRange[]> },
      tenureDistribution: { yearly: {} as Record<AnnualYear, TenureRange[]> },
      ageDistribution: { yearly: {} as Record<AnnualYear, AgeRange[]> }
    };
  }

  // Initialize spending data if missing
  if (!departmentData.spending) {
    departmentData.spending = {
      yearly: {} as Record<FiscalYearKey, number | {}>
    };
  }

  // Normalize budget_status to uppercase if it's a valid status
  if (departmentData.budget_status) {
    const normalizedStatus = departmentData.budget_status.charAt(0).toUpperCase() + departmentData.budget_status.slice(1);
    if (normalizedStatus === 'Active' || normalizedStatus === 'Inactive') {
      departmentData.budget_status = normalizedStatus as BudgetStatus;
    }
  }

  // Ensure keyFunctions is never empty
  if (departmentData.keyFunctions === '') {
    departmentData.keyFunctions = 'No key functions specified';
  }

  return true;
}

type YearlyValue = number | Record<string, never>;
type WorkforceYearlyRecord = Record<AnnualYear, YearlyValue>;
type SpendingYearlyRecord = Record<FiscalYearKey, YearlyValue>;

function isValidYearlyValue(value: unknown): value is YearlyValue {
  if (typeof value === 'number') return true;
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length === 0;
  }
  return false;
}

function isValidYearlyRecord(value: unknown, type: 'workforce' | 'spending'): value is WorkforceYearlyRecord | SpendingYearlyRecord {
  if (!value || typeof value !== 'object') return false;
  
  // Empty object is valid
  if (Object.keys(value).length === 0) return true;
  
  // Check each year entry
  return Object.entries(value).every(([year, val]) => {
    if (!isValidYearlyValue(val)) return false;
    
    if (type === 'workforce') {
      return isValidAnnualYear(year);
    } else {
      return isValidFiscalYearFormat(year);
    }
  });
}

// Define field groups in type definition order
const FIELD_GROUPS = {
  'Required Fields': [
    'name',
    'slug',
    'canonicalName',
    'aliases',
    'code',
    'orgLevel',
    'budget_status',
    'keyFunctions',
    'abbreviation',
    'parent_agency'
  ],
  'Workforce Data': [
    'workforce.headCount.yearly',
    'workforce.wages.yearly',
    'workforce.averageSalary',
    'workforce.averageTenureYears',
    'workforce.averageAge'
  ],
  'Distribution Data': [
    'workforce.salaryDistribution',
    'workforce.tenureDistribution',
    'workforce.ageDistribution'
  ],
  'Spending Data': ['spending.yearly']
};

function validateAllDepartments(departments: any[]): Map<string, ValidationResult[]> {
  // Reset statistics for each validation run
  stats.total = departments.length;
  stats.valid = 0;
  stats.invalid = 0;
  stats.details = {
    budget_status: { valid: 0, invalid: 0, empty: 0, found: [] },
    fiscal_years: { valid: 0, invalid: 0, empty: 0, found: [] },
    annual_years: { valid: 0, invalid: 0, empty: 0, found: [] },
    salary_ranges: { valid: 0, invalid: 0, empty: 0, found: [] },
    tenure_ranges: { valid: 0, invalid: 0, empty: 0, found: [] },
    age_ranges: { valid: 0, invalid: 0, empty: 0, found: [] },
    fields: {}
  };

  const validationsByField = new Map<string, ValidationResult[]>();
  
  // Initialize all field groups
  for (const groupFields of Object.values(FIELD_GROUPS)) {
    for (const field of groupFields) {
      validationsByField.set(field, []);
    }
  }

  // Initialize field stats
  for (const groupFields of Object.values(FIELD_GROUPS)) {
    for (const field of groupFields) {
      stats.details.fields[field] = { valid: 0, invalid: 0, empty: 0 };
    }
  }

  for (const dept of departments) {
    let deptValid = true;
    console.log(`\nScanning department: ${dept.name}`);
    
    // Required fields validation
    for (const [fields] of Object.entries(FIELD_GROUPS)) {
      for (const field of fields) {
        let value = dept;
        const path = field.split('.');
        for (const part of path) {
          value = value?.[part];
        }

        // Track empty values
        if (value === undefined || value === null || 
            (typeof value === 'object' && Object.keys(value).length === 0)) {
          stats.details.fields[field].empty++;
          continue;
        }

        // Basic field validations first
        if (field === 'name') {
          if (typeof value === 'string' && value.trim().length > 0) {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name || 'Unknown',
              field,
              currentValue: value,
              proposedFix: 'Unknown Department',
              reason: 'Invalid or missing name'
            });
          }
        } else if (field === 'canonicalName') {
          if (typeof value === 'string' && value.trim().length > 0) {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: dept.name,
              reason: 'Invalid or missing canonical name'
            });
          }
        } else if (field === 'keyFunctions') {
          if (typeof value === 'string') {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: 'No key functions specified',
              reason: 'Invalid key functions format'
            });
          }
        } else if (field === 'abbreviation') {
          if (typeof value === 'string') {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: '',
              reason: 'Invalid abbreviation format'
            });
          }
        } else if (field === 'parent_agency') {
          if (typeof value === 'string') {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: '',
              reason: 'Invalid parent agency format'
            });
          }
        } else if (field === 'code') {
          if (value === null || (typeof value === 'string' && value.trim().length > 0)) {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: null,
              reason: 'Invalid code format'
            });
          }
        }

        // Rest of the existing validation logic for other fields...
        else if (field === 'spending.yearly') {
          if (typeof value === 'object' && value !== null) {
            // Empty object is valid
            if (Object.keys(value).length === 0) {
              stats.details.fields[field].valid++;
            } else {
              const cleanYearly = {} as Record<FiscalYearKey, number | {}>;
              let hasInvalid = false;
              let needsUpdate = false;

              for (const [year, val] of Object.entries(value)) {
                // Parse numeric value if it's a string
                const numericValue = typeof val === 'string' ? parseFloat(val) : val;
                
                const validYear = isValidFiscalYearFormat(year);
                if (typeof validYear === 'string') {
                  // Handle converted single year format (e.g., FY2023 -> FY2023-FY2024)
                  cleanYearly[validYear] = typeof numericValue === 'number' && !isNaN(numericValue) ? numericValue : {};
                  needsUpdate = true;
                } else if (validYear === true) {
                  // Handle already correct format
                  cleanYearly[year as FiscalYearKey] = typeof numericValue === 'number' && !isNaN(numericValue) ? numericValue : {};
                } else {
                  hasInvalid = true;
                }
              }

              if (hasInvalid) {
                stats.details.fields[field].invalid++;
                validationsByField.get(field)?.push({
                  departmentName: dept.name,
                  field,
                  currentValue: value,
                  proposedFix: cleanYearly,
                  reason: 'Invalid spending yearly record format'
                });
              } else {
                stats.details.fields[field].valid++;
                if (needsUpdate) {
                  validationsByField.get(field)?.push({
                    departmentName: dept.name,
                    field,
                    currentValue: value,
                    proposedFix: cleanYearly,
                    reason: 'Update fiscal year format to FYyyyy-FYyyyy'
                  });
                }
              }
            }
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: {},
              reason: 'Spending yearly must be an object'
            });
          }
        } else if (field === 'slug') {
          if (!isValidSlug(value)) {
            stats.details.fields[field].invalid++;
            const proposedSlug = dept.name.toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '');
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: proposedSlug,
              reason: 'Invalid slug format'
            });
          } else {
            stats.details.fields[field].valid++;
          }
        } else if (field === 'workforce.headCount.yearly' || field === 'workforce.wages.yearly') {
          if (typeof value === 'object' && value !== null) {
            // Empty object is valid
            if (Object.keys(value).length === 0) {
              stats.details.fields[field].valid++;
            } else if (isValidYearlyRecord(value, 'workforce')) {
              stats.details.fields[field].valid++;
            } else {
              stats.details.fields[field].invalid++;
              validationsByField.get(field)?.push({
                departmentName: dept.name,
                field,
                currentValue: value,
                proposedFix: {},
                reason: `Invalid yearly record format for ${field}`
              });
            }
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: {},
              reason: `${field} must be an object`
            });
          }
        } else if (field === 'workforce.salaryDistribution') {
          if (Array.isArray(value)) {
            if (value.length === 0) {
              stats.details.fields[field].valid++;
            } else if (isValidDistributionArray<ValidSalaryRange>(value, isValidSalaryRangeValue)) {
              stats.details.fields[field].valid++;
            } else {
              stats.details.fields[field].invalid++;
              validationsByField.get(field)?.push({
                departmentName: dept.name,
                field,
                currentValue: value,
                proposedFix: [],
                reason: 'Invalid salary distribution format'
              });
            }
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: [],
              reason: 'Salary distribution must be an array'
            });
          }
        } else if (field === 'workforce.tenureDistribution') {
          if (Array.isArray(value)) {
            if (value.length === 0) {
              stats.details.fields[field].valid++;
            } else if (isValidDistributionArray<ValidTenureRange>(value, isValidTenureRangeValue)) {
              stats.details.fields[field].valid++;
            } else {
              stats.details.fields[field].invalid++;
              validationsByField.get(field)?.push({
                departmentName: dept.name,
                field,
                currentValue: value,
                proposedFix: [],
                reason: 'Invalid tenure distribution format'
              });
            }
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: [],
              reason: 'Tenure distribution must be an array'
            });
          }
        } else if (field === 'workforce.ageDistribution') {
          if (Array.isArray(value)) {
            if (value.length === 0) {
              stats.details.fields[field].valid++;
            } else if (isValidDistributionArray<ValidAgeRange>(value, isValidAgeRangeValue)) {
              stats.details.fields[field].valid++;
            } else {
              stats.details.fields[field].invalid++;
              validationsByField.get(field)?.push({
                departmentName: dept.name,
                field,
                currentValue: value,
                proposedFix: [],
                reason: 'Invalid age distribution format'
              });
            }
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: [],
              reason: 'Age distribution must be an array'
            });
          }
        } else if (field === 'workforce.averageSalary' || field === 'workforce.averageTenureYears' || field === 'workforce.averageAge') {
          if (value === null || isNonNegativeNumber(value)) {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: null,
              reason: `Invalid ${field} format - must be null or non-negative number`
            });
          }
        } else if (field === 'budget_status') {
          if (isValidBudgetStatus(value)) {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: 'active',
              reason: 'Invalid budget status - must be "active" or "inactive"'
            });
          }
        } else if (field === 'orgLevel') {
          if (isValidOrgLevel(value)) {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: 0,
              reason: 'Invalid org level - must be non-negative integer'
            });
          }
        } else if (field === 'aliases') {
          if (isValidAliasesArray(value)) {
            stats.details.fields[field].valid++;
          } else {
            stats.details.fields[field].invalid++;
            validationsByField.get(field)?.push({
              departmentName: dept.name,
              field,
              currentValue: value,
              proposedFix: [dept.name.toLowerCase()],
              reason: 'Invalid aliases format - must be array of strings'
            });
          }
        }
      }
    }

    if (deptValid) {
      stats.valid++;
    } else {
      stats.invalid++;
    }
  }

  return validationsByField;
}

// Update main function to properly apply and save changes
const main = async () => {
  try {
    console.log('Scanning all departments for validation issues...\n');
    
    const validationsByField = validateAllDepartments(departmentsData.departments);
    let changes = false;
    
    // Show results in type definition order
    for (const [groupName, fields] of Object.entries(FIELD_GROUPS)) {
      console.log(`\n${groupName}`);
      console.log('='.repeat(groupName.length));
      
      for (const field of fields) {
        const validations = validationsByField.get(field) || [];
        if (validations.length === 0) {
          console.log(`\n✓ ${field}: All valid`);
          continue;
        }
        
        console.log(`\nField: ${field} (${validations.length} issues)`);
        console.log('-'.repeat(50));
        
        // Group similar issues
        const issueGroups = new Map<string, ValidationResult[]>();
        for (const validation of validations) {
          const key = validation.reason;
          if (!issueGroups.has(key)) {
            issueGroups.set(key, []);
          }
          issueGroups.get(key)?.push(validation);
        }
        
        // Display grouped issues
        for (const [reason, issues] of issueGroups.entries()) {
          console.log(`\nIssue: ${reason}`);
          console.log(`Affected departments (${issues.length}):`);
          
          // Show sample
          const sample = issues[0];
          console.log('Example:');
          console.log(`  Current: ${JSON.stringify(sample.currentValue)}`);
          console.log(`  Proposed: ${JSON.stringify(sample.proposedFix)}`);
          
          // List departments in columns
          const deptNames = issues.map(v => v.departmentName);
          console.log('\nAffected Departments:');
          const columns = process.stdout.columns || 80;
          const maxNameLength = Math.max(...deptNames.map(n => n.length));
          const colWidth = Math.min(maxNameLength + 2, 40);
          const numCols = Math.max(1, Math.floor(columns / colWidth));
          
          for (let i = 0; i < deptNames.length; i += numCols) {
            const row = deptNames.slice(i, i + numCols)
              .map(name => name.padEnd(colWidth))
              .join('');
            console.log(row);
          }
        }
        
        const approve = prompt(`\nApply all fixes for ${field}? (y/n): `).toLowerCase();
        if (approve === 'y') {
          for (const validation of validations) {
            const deptIndex = departmentsData.departments.findIndex((d: DepartmentData) => d.name === validation.departmentName);
            if (deptIndex !== -1) {
              const dept = departmentsData.departments[deptIndex];
              const path = validation.field.split('.');
              let target = dept;
              
              // Create nested objects if they don't exist
              for (let i = 0; i < path.length - 1; i++) {
                if (!target[path[i]]) {
                  target[path[i]] = {};
                }
                target = target[path[i]];
              }
              
              // Apply the fix
              target[path[path.length - 1]] = validation.proposedFix;
              
              // Update the department in the array
              departmentsData.departments[deptIndex] = dept;
              changes = true;
            }
          }
          console.log(`Applied ${validations.length} fixes for ${field}\n`);
          
          // Save changes immediately after each field is fixed
          if (changes) {
            fs.writeFileSync(departmentsPath, JSON.stringify(departmentsData, null, 2));
            console.log(`Saved changes for ${field} to departments.json\n`);
          }
        } else {
          console.log(`Skipped fixes for ${field}\n`);
        }
      }
    }
    
    printValidationStats();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

// After processing all departments, print statistics
function printValidationStats() {
  console.log('\nValidation Statistics:');
  console.log('=====================');
  console.log(`Total Departments: ${stats.total}`);
  console.log(`Valid: ${stats.valid}`);
  console.log(`Invalid: ${stats.invalid}`);
  
  console.log('\nField-Level Statistics:');
  console.log('=====================');
  
  for (const [groupName, fields] of Object.entries(FIELD_GROUPS)) {
    console.log(`\n${groupName}:`);
    for (const field of fields) {
      const fieldStats = stats.details.fields[field];
      if (fieldStats) {
        const total = fieldStats.valid + fieldStats.invalid + fieldStats.empty;
        console.log(`${field}:`);
        console.log(`  Valid: ${fieldStats.valid}`);
        console.log(`  Invalid: ${fieldStats.invalid}`);
        console.log(`  Empty: ${fieldStats.empty}`);
        console.log(`  Total: ${total} (should match total departments: ${stats.total})`);
      }
    }
  }

  console.log('\nDetailed Format Issues:');
  
  console.log('\nBudget Status:');
  console.log(`Valid: ${stats.details.budget_status.valid}`);
  console.log(`Invalid: ${stats.details.budget_status.invalid}`);
  console.log('Found formats:', stats.details.budget_status.found);
  
  console.log('\nFiscal Years:');
  console.log(`Valid: ${stats.details.fiscal_years.valid}`);
  console.log(`Invalid: ${stats.details.fiscal_years.invalid}`);
  console.log('Found formats:', stats.details.fiscal_years.found);
  
  console.log('\nAnnual Years:');
  console.log(`Valid: ${stats.details.annual_years.valid}`);
  console.log(`Invalid: ${stats.details.annual_years.invalid}`);
  console.log('Found formats:', stats.details.annual_years.found);
  
  console.log('\nSalary Ranges:');
  console.log(`Valid: ${stats.details.salary_ranges.valid}`);
  console.log(`Invalid: ${stats.details.salary_ranges.invalid}`);
  console.log('Found formats:', stats.details.salary_ranges.found);
  
  console.log('\nTenure Ranges:');
  console.log(`Valid: ${stats.details.tenure_ranges.valid}`);
  console.log(`Invalid: ${stats.details.tenure_ranges.invalid}`);
  console.log('Found formats:', stats.details.tenure_ranges.found);
  
  console.log('\nAge Ranges:');
  console.log(`Valid: ${stats.details.age_ranges.valid}`);
  console.log(`Invalid: ${stats.details.age_ranges.invalid}`);
  console.log('Found formats:', stats.details.age_ranges.found);
} 