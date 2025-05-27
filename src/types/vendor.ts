// Main vendor transaction record structure with optimized field names
export interface VendorTransaction {
  n: string;  // vendor_name
  fy: Array<{
    y: string;  // year
    d: Array<{
      n: string;  // name
      oc: number;  // organizationCode
      at: Array<{
        t: string;  // type
        ac: Array<{
          c: string;  // category
          asc: Array<{
            sc: string;  // subCategory
            ad: Array<{
              d: string;  // description
              pd: Array<{
                p: string;  // program
                spd: Array<{
                  sp: string;  // subProgram
                  ct: number;  // count
                  a: number;  // amount
                }>;
              }>;
            }>;
          }>;
        }>;
      }>;
    }>;
  }>;
}

// CSV record structure (used for importing data)
export interface VendorTransactionsCSV {
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

// Department data structure
export interface DepartmentData {
  name: string;
  count: number;
  amount: number;
}

// Fiscal year data structure
export interface FiscalYearData {
  year: string;
  data: DepartmentData[];
}

// Vendor department structure (used in API responses)
export interface VendorDepartment {
  n: string;  // vendor_name
  fy: FiscalYearData[];
}

// Vendor data structure
export interface VendorData {
  n: string;  // name
  ct: number;  // count
  a: number;  // amount
}

// Department fiscal year structure
export interface DepartmentFiscalYear {
  y: string;  // year
  vn: VendorData[];  // vendor_name
}

// Department vendor structure (used in API responses)
export interface DepartmentVendor {
  n: string;  // department_name
  fy: DepartmentFiscalYear[];
}

// Account vendor structure (used in API responses)
export interface AccountVendor {
  t: string;  // account_type
  fy: DepartmentFiscalYear[];
}

// Program vendor structure (used in API responses)
export interface ProgramVendor {
  pd: string;  // program_description
  fy: DepartmentFiscalYear[];
}

// Pagination info structure
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// File structure types (used for API file reading)
export interface VendorTransactionFile {
  transactions: VendorTransaction[];
}

export interface VendorDepartmentFile {
  vendors: VendorDepartment[];
}

export interface DepartmentVendorFile {
  departments: DepartmentVendor[];
}

export interface AccountVendorFile {
  accounts: AccountVendor[];
}

export interface ProgramVendorFile {
  programs: ProgramVendor[];
}

// Transaction type for payment records (used in legacy structures)
export interface Transaction {
  id: string;
  date: string;
  department: string;
  category: string;
  amount: number;
  fiscalYear: string;
}

// Optimized vendor structure with shortened field names (current format)
export interface OptimizedFundCode {
  c: number;    // code
  ct: number;   // count
  a: number;    // amount
}

export interface OptimizedOrgCode {
  c: number;    // code
  fc: OptimizedFundCode[];
}

export interface OptimizedProjectCode {
  c: string;    // code
  oc: OptimizedOrgCode[];
}

export interface OptimizedFiscalYear {
  y: number;    // year
  pc: OptimizedProjectCode[];
}

export interface OptimizedVendor {
  n: string;    // name
  e?: string;   // ein (optional)
  fy: OptimizedFiscalYear[];
}

export interface OptimizedVendorsJSON {
  vendors: OptimizedVendor[];
}

// EIN resolution metadata (used in processing scripts)
export interface EINMetadata {
  source: string;
  acquiredDate: string;
  confidence: number;
  verifiedBy?: string;
  verificationDate?: string;
}
  