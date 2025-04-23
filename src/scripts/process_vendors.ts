/**
 * Vendor Data Processing Script
 * 
 * This script processes vendor transaction data from CSV files and creates individual JSON files
 * for each vendor in the vendor_json directory. The process follows these steps:
 * 
 * 1. Initialization
 *    1.1 Setup logging with step tracking
 *    1.2 Create required directories (vendor_json, logs)
 *    1.3 Initialize configuration and constants
 * 
 * 2. CSV File Processing
 *    2.1 Read and parse CSV files from the vendors directory
 *    2.2 Process each record
 *    2.3 Extract vendor information and transaction details
 *    2.4 Update vendor data structure
 * 
 * 3. Data Management
 *    3.1 Create individual JSON files for each vendor
 *    3.2 Track transaction counts and spending totals
 *    3.3 Maintain vendor relationships
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { 
  VendorTransaction, 
  VendorDepartment, 
  DepartmentVendor, 
  AccountVendor, 
  ProgramVendor 
} from '../types/vendor';

// Configuration
const VENDORS_DIR = path.join(__dirname, '../data/vendors');
const VENDOR_TRANSACTION_PATH = path.join(__dirname, '../data/vendor_transaction.json');
const VENDOR_DEPARTMENT_PATH = path.join(__dirname, '../data/vendors_department.json');
const DEPARTMENT_VENDOR_PATH = path.join(__dirname, '../data/department_vendors.json');
const VENDOR_ACCOUNTS_PATH = path.join(__dirname, '../data/vendor_accounts.json');
const VENDOR_PROGRAMS_PATH = path.join(__dirname, '../data/vendor_programs.json');
const LOG_DIR = path.join(__dirname, '../logs');
const _VERSION = '1.0.0';
const PROGRESS_INTERVAL = 10000; // Log progress every 10,000 records

interface LogMessage {
  message: string;
  type?: 'info' | 'error' | 'warn';
  isStep?: boolean;
  isSubStep?: boolean;
}

interface _ProcessingResult {
  success: boolean;
  message: string;
  data?: any;
}

// Setup logging with step tracking
function setupLogging() {
  ensureDirectoryExists(LOG_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `process_vendors_${timestamp}.log`);
  
  let currentStep = 0;
  let currentSubStep = 0;
  
  const log = ({ message, type = 'info', isStep = false, isSubStep = false }: LogMessage) => {
    const timestamp = new Date().toISOString();
    const logType = type.toUpperCase();
    
    if (isStep) {
      currentStep++;
      currentSubStep = 0;
    }
    if (isSubStep) {
      currentSubStep++;
    }
    
    const stepInfo = isStep ? `[STEP ${currentStep}]` : 
                     isSubStep ? `[STEP ${currentStep}.${currentSubStep}]` : '';
    
    const logMessage = `[${timestamp}] [${logType}] ${stepInfo} ${message}`;
    fs.appendFileSync(logFile, logMessage + '\n');
    console.log(message);
  };
  
  return log;
}

// Initialize logger
const log = setupLogging();

// Ensure directories exist
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log({ message: `Created directory: ${dirPath}` });
  }
}

// Create necessary directories
log({ message: 'Creating required directories...', isStep: true });
ensureDirectoryExists(path.dirname(VENDOR_TRANSACTION_PATH));
ensureDirectoryExists(path.dirname(VENDOR_DEPARTMENT_PATH));
ensureDirectoryExists(path.dirname(DEPARTMENT_VENDOR_PATH));
ensureDirectoryExists(path.dirname(VENDOR_ACCOUNTS_PATH));
ensureDirectoryExists(path.dirname(VENDOR_PROGRAMS_PATH));
ensureDirectoryExists(LOG_DIR);

// Helper function to safely parse amount
function parseAmount(amountStr: string | undefined): number {
  if (!amountStr || typeof amountStr !== 'string') {
    return 0;
  }
  try {
    return parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
  } catch (error) {
    return 0;
  }
}

// Helper function to format memory usage
function formatMemoryUsage(): Record<string, string> {
  const used = process.memoryUsage();
  return {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`
  };
}

// Helper function to create safe filename from vendor name
const _createSafeFilename = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Helper function to write vendor data
function writeVendorData(data: any, filePath: string): void {
  try {
    const dirPath = path.dirname(filePath);
    ensureDirectoryExists(dirPath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    log({ message: `Error writing vendor data: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    throw error;
  }
}

// Process a single CSV file
async function processVendorFile(file: string, vendorData: any): Promise<void> {
  const startTime = Date.now();
  log({ message: `Starting processing of ${file}...`, isStep: true });
  const filePath = path.join(VENDORS_DIR, file);
  
  try {
    // Read and parse CSV file
    log({ message: 'Reading and parsing CSV file...', isSubStep: true });
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    if (!Array.isArray(records) || records.length === 0) {
      log({ message: `No valid records found in ${file}`, type: 'error' });
      return;
    }
    
    log({ message: `Found ${records.length} records in CSV file` });
    
    let recordCount = 0;
    
    // Process each record
    for (const record of records) {
      recordCount++;
      
      // Log progress periodically
      if (recordCount % PROGRESS_INTERVAL === 0) {
        const memory = formatMemoryUsage();
        log({ message: `Processing record ${recordCount} - Memory: ${JSON.stringify(memory)}` });
      }
      
      const vendorName = record.VENDOR_NAME || 'Unknown Vendor';
      const fiscalYear = record.fiscal_year_begin;
      const department = record.department_name;
      const accountType = record.account_type;
      const accountCategory = record.account_category;
      const accountSubCategory = record.account_sub_category;
      const accountDescription = record.account_description;
      const programDescription = record.program_description;
      const subProgramDescription = record.sub_program_description;
      const amount = parseAmount(record.monetary_amount);

      // Process vendor transaction data
      let vendor = vendorData.vendors[vendorName];
      if (!vendor) {
        vendor = {
          vendor_name: vendorName,
          fiscalYear: []
        };
        vendorData.vendors[vendorName] = vendor;
      }

      // Process vendor department data
      let vendorDept = vendorData.vendorDepartments[vendorName];
      if (!vendorDept) {
        vendorDept = {
          vendor_name: vendorName,
          fiscalYear: []
        };
        vendorData.vendorDepartments[vendorName] = vendorDept;
      }

      // Process department vendor data
      let deptVendor = vendorData.departmentVendors[department];
      if (!deptVendor) {
        deptVendor = {
          department_name: department,
          fiscalYear: []
        };
        vendorData.departmentVendors[department] = deptVendor;
      }

      // Process account vendor data
      let accountVendor = vendorData.accountVendors[accountType];
      if (!accountVendor) {
        accountVendor = {
          account_type: accountType,
          fiscalYear: []
        };
        vendorData.accountVendors[accountType] = accountVendor;
      }

      // Process program vendor data
      let programVendor = vendorData.programVendors[programDescription];
      if (!programVendor) {
        programVendor = {
          program_description: programDescription,
          fiscalYear: []
        };
        vendorData.programVendors[programDescription] = programVendor;
      }

      // Helper function to find or create fiscal year entry
      const findOrCreateFiscalYear = (data: any) => {
        let fiscalYearEntry = data.fiscalYear.find((fy: { year: string }) => fy.year === fiscalYear);
        if (!fiscalYearEntry) {
          fiscalYearEntry = { year: fiscalYear, data: [] };
          data.fiscalYear.push(fiscalYearEntry);
        }
        return fiscalYearEntry;
      };

      // Update vendor transaction data
      const vendorFiscalYear = findOrCreateFiscalYear(vendor);
      // Find or create department
      let departmentEntry = vendorFiscalYear.data.find((dept: { name: string }) => dept.name === department);
      if (!departmentEntry) {
        departmentEntry = {
          name: department,
          account_type: []
        };
        vendorFiscalYear.data.push(departmentEntry);
      }
      
      // Find or create account type
      let accountTypeEntry = departmentEntry.account_type.find((type: { type: string }) => type.type === accountType);
      if (!accountTypeEntry) {
        accountTypeEntry = {
          type: accountType,
          account_category: []
        };
        departmentEntry.account_type.push(accountTypeEntry);
      }
      
      // Find or create account category
      let categoryEntry = accountTypeEntry.account_category.find((cat: { category: string }) => cat.category === accountCategory);
      if (!categoryEntry) {
        categoryEntry = {
          category: accountCategory,
          account_sub_category: []
        };
        accountTypeEntry.account_category.push(categoryEntry);
      }
      
      // Find or create account sub category
      let subCategoryEntry = categoryEntry.account_sub_category.find((sub: { subCategory: string }) => sub.subCategory === accountSubCategory);
      if (!subCategoryEntry) {
        subCategoryEntry = {
          subCategory: accountSubCategory,
          account_description: []
        };
        categoryEntry.account_sub_category.push(subCategoryEntry);
      }
      
      // Find or create account description
      let descriptionEntry = subCategoryEntry.account_description.find((desc: { description: string }) => desc.description === accountDescription);
      if (!descriptionEntry) {
        descriptionEntry = {
          description: accountDescription,
          program_description: []
        };
        subCategoryEntry.account_description.push(descriptionEntry);
      }
      
      // Find or create program description
      let programEntry = descriptionEntry.program_description.find((prog: { program: string }) => prog.program === programDescription);
      if (!programEntry) {
        programEntry = {
          program: programDescription,
          sub_program_description: []
        };
        descriptionEntry.program_description.push(programEntry);
      }
      
      // Find or create sub program description
      let subProgramEntry = programEntry.sub_program_description.find((sub: { subProgram: string }) => sub.subProgram === subProgramDescription);
      if (!subProgramEntry) {
        subProgramEntry = {
          subProgram: subProgramDescription,
          count: 0,
          amount: 0
        };
        programEntry.sub_program_description.push(subProgramEntry);
      }
      
      // Update count and amount
      subProgramEntry.count++;
      subProgramEntry.amount += amount;

      // Update vendor department data
      const vendorDeptFiscalYear = findOrCreateFiscalYear(vendorDept);
      let deptEntry = vendorDeptFiscalYear.data.find((d: { name: string }) => d.name === department);
      if (!deptEntry) {
        deptEntry = { name: department, count: 0, amount: 0 };
        vendorDeptFiscalYear.data.push(deptEntry);
      }
      deptEntry.count++;
      deptEntry.amount += amount;

      // Update department vendor data
      const deptVendorFiscalYear = findOrCreateFiscalYear(deptVendor);
      let vendorEntry = deptVendorFiscalYear.data.find((v: { name: string }) => v.name === vendorName);
      if (!vendorEntry) {
        vendorEntry = { name: vendorName, count: 0, amount: 0 };
        deptVendorFiscalYear.data.push(vendorEntry);
      }
      vendorEntry.count++;
      vendorEntry.amount += amount;

      // Update account vendor data
      const accountVendorFiscalYear = findOrCreateFiscalYear(accountVendor);
      let accountVendorEntry = accountVendorFiscalYear.data.find((v: { name: string }) => v.name === vendorName);
      if (!accountVendorEntry) {
        accountVendorEntry = { name: vendorName, count: 0, amount: 0 };
        accountVendorFiscalYear.data.push(accountVendorEntry);
      }
      accountVendorEntry.count++;
      accountVendorEntry.amount += amount;

      // Update program vendor data
      const programVendorFiscalYear = findOrCreateFiscalYear(programVendor);
      let programVendorEntry = programVendorFiscalYear.data.find((v: { name: string }) => v.name === vendorName);
      if (!programVendorEntry) {
        programVendorEntry = { name: vendorName, count: 0, amount: 0 };
        programVendorFiscalYear.data.push(programVendorEntry);
      }
      programVendorEntry.count++;
      programVendorEntry.amount += amount;
    }
    
    // Write incremental updates after processing each file
    log({ message: 'Writing incremental updates...', isSubStep: true });
    writeVendorData({ transactions: Object.values(vendorData.vendors) }, VENDOR_TRANSACTION_PATH);
    writeVendorData({ vendors: Object.values(vendorData.vendorDepartments) }, VENDOR_DEPARTMENT_PATH);
    writeVendorData({ departments: Object.values(vendorData.departmentVendors) }, DEPARTMENT_VENDOR_PATH);
    writeVendorData({ accounts: Object.values(vendorData.accountVendors) }, VENDOR_ACCOUNTS_PATH);
    writeVendorData({ programs: Object.values(vendorData.programVendors) }, VENDOR_PROGRAMS_PATH);
    
    const processingTime = (Date.now() - startTime) / 1000;
    log({ message: `Completed processing ${file} in ${processingTime.toFixed(2)} seconds` });
    
  } catch (error) {
    log({ message: `Error processing ${file}: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    throw error;
  }
}

// Main function
async function main(): Promise<void> {
  try {
    log({ message: 'Starting vendor data processing...', isStep: true });
    const startTime = Date.now();
    
    // Initialize data structures
    const vendorData = {
      vendors: {} as { [key: string]: VendorTransaction },
      vendorDepartments: {} as { [key: string]: VendorDepartment },
      departmentVendors: {} as { [key: string]: DepartmentVendor },
      accountVendors: {} as { [key: string]: AccountVendor },
      programVendors: {} as { [key: string]: ProgramVendor }
    };
    
    // Try to load existing data if available
    try {
      if (fs.existsSync(VENDOR_TRANSACTION_PATH)) {
        const existingData = JSON.parse(fs.readFileSync(VENDOR_TRANSACTION_PATH, 'utf8'));
        vendorData.vendors = existingData.transactions;
        log({ message: 'Loaded existing vendor transaction data' });
      }
    } catch (error) {
      log({ message: 'Could not load existing vendor transaction data, starting fresh', type: 'warn' });
    }

    // Get list of CSV files
    log({ message: 'Reading vendor CSV files...', isSubStep: true });
    const vendorFiles = fs.readdirSync(VENDORS_DIR).filter(file => file.endsWith('.csv'));
    
    if (vendorFiles.length === 0) {
      log({ message: `No vendor CSV files found in ${VENDORS_DIR}`, type: 'warn' });
      return;
    }
    
    log({ message: `Found ${vendorFiles.length} CSV files to process` });
    
    // Process each CSV file
    for (const file of vendorFiles) {
      try {
        log({ message: `\nStarting to process file: ${file}`, isStep: true });
        await processVendorFile(file, vendorData);
      } catch (error) {
        log({ message: `Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
        // Continue with next file
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    const memory = formatMemoryUsage();
    
    log({ message: 'Vendor data processing completed successfully', isStep: true });
    log({ message: `Total processing time: ${totalTime.toFixed(2)} seconds` });
    log({ message: `Final memory usage: ${JSON.stringify(memory)}` });
    log({ message: `Total vendors processed: ${Object.keys(vendorData.vendors).length}` });
    
  } catch (error) {
    log({ message: `Error in main process: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    process.exit(1);
  }
}

// Run the script
main();