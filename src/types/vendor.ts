// Main vendor transaction record structure
export interface VendorTransaction {
  vendor_name: string;
  fiscalYear: Array<{
    year: string;
    department_name: Array<{
      name: string;
      account_type: Array<{
        type: string;
        account_category: Array<{
          category: string;
          account_sub_category: Array<{
            subCategory: string;
            account_description: Array<{
              description: string;
              program_description: Array<{
                program: string;
                sub_program_description: Array<{
                  subProgram: string;
                  count: number;
                  amount: number;
                }>;
              }>;
            }>;
          }>;
        }>;
      }>;
    }>;
  }>;
}

// CSV record structure
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

export interface DepartmentData {
  name: string;
  count: number;
  amount: number;
}

export interface FiscalYearData {
  year: string;
  data: DepartmentData[];
}

export interface VendorDepartment {
  vendor_name: string;
  fiscalYear: FiscalYearData[];
}

export interface VendorData {
  name: string;
  count: number;
  amount: number;
}

export interface DepartmentFiscalYear {
  year: string;
  vendor_name: VendorData[];
}

export interface DepartmentVendor {
  department_name: string;
  fiscalYear: DepartmentFiscalYear[];
}

export interface AccountVendor {
  account_type: string;
  fiscalYear: DepartmentFiscalYear[];
}

export interface ProgramVendor {
  program_description: string;
  fiscalYear: DepartmentFiscalYear[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// File structure types
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

// Transaction type for payment records
export interface Transaction {
  id: string;
  date: string;
  department: string;
  category: string;
  amount: number;
  fiscalYear: string;
}

// Vendors data structure
export interface VendorsJSON {
  vendors: Array<{
    id: string;
    name: string;
    transactions: {
      allTransactions: Transaction[];
    };
  }>;
}
  