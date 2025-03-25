/**
 * Type definitions for department data
 */
// slug: string;           // The slug used in department URLs, budgetCode_lower_case_name_with_underscores, remove spaces and special characters
// name: string;           // The department name as the canonicalName reordered with the text follow the comma move to the front of the name, and remove the comma
// canonicalName: string;  // The full official/canonical name as it appears in the CA.gov department https://www.ca.gov/departments/list/ 
// BudgetCode: // The department budget code (e.g., "3900") as it appears in the https://ebudget.ca.gov/budget/publication/#/e/2024-25/DepartmentIndex
// spendingName?: string;  // The name used in spending data
// workforceName?: string; // The name used in workforce data
// aliases?: string[];     // Alternative names for the department

// Valid years range from 1900 to 2030
export type ValidYear = 1900 | 1901 | 1902 | 1903 | 1904 | 1905 | 1906 | 1907 | 1908 | 1909 | 
                1910 | 1911 | 1912 | 1913 | 1914 | 1915 | 1916 | 1917 | 1918 | 1919 |
                1920 | 1921 | 1922 | 1923 | 1924 | 1925 | 1926 | 1927 | 1928 | 1929 |
                1930 | 1931 | 1932 | 1933 | 1934 | 1935 | 1936 | 1937 | 1938 | 1939 |
                1940 | 1941 | 1942 | 1943 | 1944 | 1945 | 1946 | 1947 | 1948 | 1949 |
                1950 | 1951 | 1952 | 1953 | 1954 | 1955 | 1956 | 1957 | 1958 | 1959 |
                1960 | 1961 | 1962 | 1963 | 1964 | 1965 | 1966 | 1967 | 1968 | 1969 |
                1970 | 1971 | 1972 | 1973 | 1974 | 1975 | 1976 | 1977 | 1978 | 1979 |
                1980 | 1981 | 1982 | 1983 | 1984 | 1985 | 1986 | 1987 | 1988 | 1989 |
                1990 | 1991 | 1992 | 1993 | 1994 | 1995 | 1996 | 1997 | 1998 | 1999 |
                2000 | 2001 | 2002 | 2003 | 2004 | 2005 | 2006 | 2007 | 2008 | 2009 |
                2010 | 2011 | 2012 | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 |
                2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | 2037 | 2038 | 2039 | 2040 | 2041 | 2042 | 2043 | 2044 | 2045 | 2046 | 2047 | 2048 | 2049 | 2050;

// Fiscal year format type - must be FYyyyy-FYyyyy where yyyy is a four digit year
export type FiscalYearKey = `FY${ValidYear}-FY${ValidYear}`;

// Annual year format - must be a four digit year between 1900 and 2030
export type AnnualYear = `${ValidYear}`;

// Slug format type - lowercase alphanumeric with underscores
export type ValidSlug = string & { 
  _brand: 'ValidSlug';
  _constraint: '[a-z0-9]+(?:_[a-z0-9]+)*';
};

// Budget status type - must be lowercase
export type BudgetStatus = 'active' | 'inactive';

// Non-negative number type
export type NonNegativeNumber = number & { _brand: 'NonNegativeNumber' };

// Non-negative integer type
export type NonNegativeInteger = number & { 
  _brand: 'NonNegativeInteger';
  _constraint: 'integer >= 0';
};

// Organization level type - must be non-negative integer
export type OrgLevel = NonNegativeInteger;

// budget code - must be non-negative integer
export type BudgetCode = NonNegativeInteger;

// Distribution count type - must be non-negative integer
export type DistributionCount = NonNegativeInteger;

/**
 * Structure of a department in departments.json
 */
// salary distribution array of strings as "0-19999": number
// , "20000-29999": number, "30000-39999": number, ..., "500000-999999": number, "1000000-10000000": number
// tenure distribution array as "0-1": number, "1-2": number, "3-4": number, "5-9": number, "10-14": number, "15-19": number, "20-24": number, "25-29": number,  "30-34": number, "35-40": number
// age distribution array as "0-20": number, "20-24": number, "25-29": number, "30-34": number, "35-39": number, "40-44": number, "45-49": number, "50-54": number, "55-59": number, "60-64": number, "65-100": number

// averageSalary, wages, salaryDistribution use the california state government definition of wages plus benefits, or as we define as total compensation in the code

// agencyVisualization.ts uses this data to create the agency visualization
// it is calculating averages or percentages when there is distribution data

export interface SalaryRange {
  range: [0, 19999] | [20000, 29999] | [30000, 39999] | [40000, 49999] | [50000, 59999] | 
         [60000, 69999] | [70000, 79999] | [80000, 89999] | [90000, 99999] | [100000, 109999] |
         [110000, 119999] | [120000, 129999] | [130000, 139999] | [140000, 149999] | [150000, 159999] |
         [160000, 169999] | [170000, 179999] | [180000, 189999] | [190000, 199999] | [200000, 249999] |
         [250000, 299999] | [300000, 349999] | [350000, 399999] | [400000, 449999] | [450000, 499999] | [500000, 10000000];
  count: DistributionCount;
}

export interface TenureRange {
  range: [0, 1] | [1, 2] | [3, 4] | [5, 9] | [10, 14] | [15, 19] | [20, 24] | [25, 29] | [30, 34] | [35, 39] | [40, 100];
  count: DistributionCount;
}

export interface AgeRange {
  range: [0, 20] | [20, 24] | [25, 29] | [30, 34] | [35, 39] | [40, 44] | [45, 49] | [50, 54] | [55, 59] | [60, 64] | [65, 100];
  count: DistributionCount;
}

export interface WorkforceData {
  headCount: {
    yearly: Record<AnnualYear, number | {}>;
  };
  wages: {
    yearly: Record<AnnualYear, number | {}>;
  };
  averageTenureYears?: NonNegativeNumber | null;
  averageSalary?: NonNegativeNumber | null;
  averageAge?: NonNegativeNumber | null;
  tenureDistribution?: TenureRange[] | [];
  salaryDistribution?: SalaryRange[] | [];
  ageDistribution?: AgeRange[] | [];
  _note?: string;
}
// plan on using range format for yearly string as FYyear-FYyear+1
export interface DepartmentData {
  name: string;
  slug: ValidSlug;
  canonicalName: string;
  aliases: string[];
  workforce?: WorkforceData;
  spending?: {
    yearly: Record<FiscalYearKey, number | {}>;
  };
  budgetCode?: BudgetCode;
  orgLevel: OrgLevel;
  budget_status: BudgetStatus;
  keyFunctions: string;
  abbreviation: string;
  parent_agency: string;
}

export interface RawDistributionItem {
  range: [number, number];
  count: number;
}

/**
 * Extended interface for department hierarchy visualization
 * this is deprecated and not used anymore
 */
export interface DepartmentHierarchy extends DepartmentData {
  subDepartments?: DepartmentHierarchy[];
  subordinateOffices: number;
  aggregatedDistributions?: {
    tenureDistribution: RawDistributionItem[];
    salaryDistribution: RawDistributionItem[];
    ageDistribution: RawDistributionItem[];
  };
}

export interface DepartmentsJSON {
  departments: DepartmentData[];
  budgetSummary?: {
    totalSpending: Record<string, string>;
    revenue: Record<string, string>;
    deficit: Record<string, string>;
  };
  revenueSources?: Array<{
    source: string;
    amounts: Record<string, string>;
  }>;
  totalRevenue?: Record<string, string> & {
    percentChange?: string;
  };
  sources?: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * Simplified department mapping used throughout the application
 */
export interface DepartmentMapping {
  slug: string;           
  name: string;           
  canonicalName: string; 
  budgetCode: BudgetCode; 
  spendingName?: string;  
  workforceName?: string; 
  aliases?: string[];     
}

export interface VerificationResult {
  success: boolean;
  messages: string[];
  missingSpendingData: string[];
  missingWorkforceData: string[];
  dataMismatches: string[];
}

export interface RequiredDepartmentJSONFields {
  name: string;
  canonicalName: string;
  slug: ValidSlug;
  aliases: string[]; 
  keyFunctions: string;
  abbreviation: string;
  orgLevel: OrgLevel;
  parent_agency?: string;  // Optional only for root node, required name of parent agency
  budget_status: BudgetStatus;
  budgetCode: BudgetCode | null;  // Required but can be null
  spending: {
    yearly: Record<FiscalYearKey, number| {}>;  // Empty object allowed
  };
  headCount: {
    yearly: Record<AnnualYear, number| {}>;  // Empty object allowed
  };
  wages: {
    yearly: Record<AnnualYear, number| {}>;  // Empty object allowed
  };
  averageTenureYears: NonNegativeNumber | null;  // Required but can be null
  averageSalary: NonNegativeNumber | null;  // Required but can be null
  averageAge: NonNegativeNumber | null;  // Required but can be null
  tenureDistribution: TenureRange[];      // Empty array allowed but field required
  salaryDistribution: SalaryRange[];      // Empty array allowed but field required
  ageDistribution: AgeRange[];            // Empty array allowed but field required
} 