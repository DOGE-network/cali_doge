/**
 * Vendor Data Processing Script
 * 
 * This script processes vendor transaction data from CSV files and creates multiple JSON files:
 * - vendor_transaction_YYYY.json: Contains detailed transaction data for each fiscal year
 * - vendors.json: Contains vendor information with EIN and structured transaction data
 * 
 * Program Description Handling:
 * - The program's 'name' field uses the 'program_description' from the CSV
 * - The program's 'programDescriptions' array uses the 'sub_program_description' from the CSV
 * - Both fields can be null if their corresponding CSV fields are empty or not present
 * - Each program description entry includes the source CSV file name
 * 
 * The process follows these steps:
 * 
 * 1. Initialization
 *    1.1 Setup logging with step tracking
 *    1.2 Create required directories
 *    1.3 Initialize configuration and constants
 * 
 * 2. CSV File Processing
 *    2.1 Read and parse CSV files from the vendors directory
 *    2.2 Extract fiscal year information and organize data by year
 *    2.3 Process each record into year-specific data structures
 *    2.4 Extract vendor information and transaction details
 *    2.5 Update vendor transaction and enhanced vendor structures simultaneously
 * 
 * 3. EIN Resolution
 *    3.1 Attempt to look up EINs for all vendors
 *    3.2 Store EIN data with metadata about the source
 *    3.3 Record EIN resolution statistics
 * 
 * 4. Data Structure Generation
 *    4.1 Create yearly vendor_transaction_YYYY.json files with transaction details
 *    4.2 Create enhanced vendors.json with EIN data
 *    4.3 Validate both data structures
 * 
 * 5. Results Summary
 *    5.1 Log processing statistics
 *    5.2 Log EIN resolution statistics
 *    5.3 Log validation results
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
// import * as einResolution from '../lib/einResolution';
const dataValidation = require('../lib/dataValidation');

// Setup __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VENDORS_DIR = path.join(__dirname, '../data/vendors');
const DATA_DIR = path.join(__dirname, '../data');
const ENHANCED_VENDORS_PATH = path.join(__dirname, '../data/vendors.json');
const VENDOR_DEPARTMENT_PATH = path.join(__dirname, '../data/vendors_department.json');
const DEPARTMENT_VENDOR_PATH = path.join(__dirname, '../data/department_vendors.json');
const VENDOR_ACCOUNTS_PATH = path.join(__dirname, '../data/vendor_accounts.json');
const VENDOR_PROGRAMS_PATH = path.join(__dirname, '../data/vendor_programs.json');
const DEPARTMENTS_JSON_PATH = path.join(__dirname, '../data/departments.json');
const FUNDS_JSON_PATH = path.join(__dirname, '../data/funds.json');
const PROGRAMS_JSON_PATH = path.join(__dirname, '../data/programs.json');
const LOG_DIR = path.join(__dirname, '../logs');
const _VERSION = '1.0.1';
const PROGRESS_INTERVAL = 10000; // Log progress every 10,000 records

// Interface definitions
interface LogMessage {
  message: string;
  type?: 'info' | 'error' | 'warn';
}

interface _ProcessingResult {
  success: boolean;
  message: string;
  data?: any;
}

// Interface for year-based transaction data
interface YearlyTransactionData {
  [year: string]: {
    transactions: Array<{
      vendor_name: string;
      department_name: Array<{
        name: string;
        organizationCode: number;
        account_type: Array<{
          type: string;
          account_category: Array<{
            category: string;
            account_sub_category: Array<{
              subCategory: string;
              account_description: Array<{
                description: string;
                program_code: string;
                fund_code: string;
                amount: number;
                count: number;
              }>;
            }>;
          }>;
        }>;
      }>;
    }>;
    processedFiles: string[];
    lastProcessedFile: string | null;
    lastProcessedTimestamp: string | null;
  }
}

// Setup logging with step tracking
function setupLogging() {
  ensureDirectoryExists(LOG_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `process_vendors_${timestamp}.log`);
  
  const log = ({ message, type = 'info' }: LogMessage) => {
    const timestamp = new Date().toISOString();
    const logType = type.toUpperCase();
    
    const logMessage = `[${timestamp}] [${logType}] ${message}`;
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

// Create required directories
function createRequiredDirectories(): void {
  ensureDirectoryExists(DATA_DIR);
  ensureDirectoryExists(path.dirname(ENHANCED_VENDORS_PATH));
  ensureDirectoryExists(path.dirname(VENDOR_DEPARTMENT_PATH));
  ensureDirectoryExists(path.dirname(DEPARTMENT_VENDOR_PATH));
  ensureDirectoryExists(path.dirname(VENDOR_ACCOUNTS_PATH));
  ensureDirectoryExists(path.dirname(VENDOR_PROGRAMS_PATH));
  ensureDirectoryExists(LOG_DIR);
}

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
    log({ message: `Successfully wrote data to ${filePath}` });
  } catch (error) {
    log({ message: `Error writing vendor data to ${filePath}: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    throw error;
  }
}

// Gets the vendor transaction file path for a specific year
function getVendorTransactionPath(year: string): string {
  return path.join(DATA_DIR, `vendor_transaction_${year}.json`);
}

// Function to validate that a fund code is 4 digits
function validateFundCode(fundCode: string | number): string {
  try {
    // Convert to string if it's a number
    const fundCodeStr = typeof fundCode === 'number' ? fundCode.toString() : fundCode;
    
    // Remove any non-digit characters
    const digitsOnly = fundCodeStr.replace(/\D/g, '');
    
    // Pad with leading zeros if necessary
    const paddedFundCode = digitsOnly.padStart(4, '0');
    
    // If longer than 4 digits, truncate to last 4
    const formattedCode = paddedFundCode.length > 4 
      ? paddedFundCode.slice(-4) 
      : paddedFundCode;
    
    // Ensure it's exactly 4 digits
    if (!/^\d{4}$/.test(formattedCode)) {
      throw new Error(`Invalid fund code: ${fundCode}. Fund codes must be 4 digits.`);
    }
    
    return formattedCode;
  } catch (error) {
    log({ message: `Fund code validation error: ${error instanceof Error ? error.message : String(error)}`, type: 'warn' });
    // Return a fallback 4-digit code if validation fails
    return '0000';
  }
}

// Function to read and parse funds.json
function readFundsJson(): any {
  try {
    if (fs.existsSync(FUNDS_JSON_PATH)) {
      log({ message: `Reading funds data from ${FUNDS_JSON_PATH}` });
      const fileContent = fs.readFileSync(FUNDS_JSON_PATH, 'utf8');
      const fundsData = JSON.parse(fileContent);
      
      // Ensure it has the correct structure
      if (!fundsData.funds) {
        fundsData.funds = [];
      }
      if (!fundsData.lastUpdated) {
        fundsData.lastUpdated = new Date().toISOString();
      }
      
      return fundsData;
    } else {
      // Create a new funds.json with empty structure
      const newFundsData = {
        funds: [],
        lastUpdated: new Date().toISOString()
      };
      
      writeVendorData(newFundsData, FUNDS_JSON_PATH);
      return newFundsData;
    }
  } catch (error) {
    log({ message: `Error reading funds data: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    return { funds: [], lastUpdated: new Date().toISOString() };
  }
}

// Function to verify fund exists and add it if it doesn't
function verifyOrAddFund(fundCode: string | number, record: any, fundsData: any): { fundCode: string; isNew: boolean; isUpdated: boolean } {
  try {
    // Validate and format the fund code
    const validatedFundCode = validateFundCode(fundCode);
    
    // Check if the fund already exists
    const existingFund = fundsData.funds.find((fund: any) => fund.fundCode === validatedFundCode);
    
    // Extract fund data from the record
    const fundName = record.fund_description || `Fund ${validatedFundCode}`;
    const fundGroup = determineFundGroup(record.fund_type || '');
    const fundDescription = record.fund_description || '';
    
    if (existingFund) {
      // Check if we need to update the existing fund with new information
      let updated = false;
      
      // Update if we have new information that's not empty and different from existing
      if (fundName && fundName !== `Fund ${validatedFundCode}` && fundName !== existingFund.fundName) {
        existingFund.fundName = fundName;
        updated = true;
      }
      
      if (fundDescription && fundDescription !== existingFund.fundDescription) {
        existingFund.fundDescription = fundDescription;
        updated = true;
      }
      
      // Only update fund group if the new one is not "Other Funds" (default)
      // or if existing one is "Other Funds" and we have a more specific one
      if (fundGroup !== "Other Funds" && fundGroup !== existingFund.fundGroup) {
        existingFund.fundGroup = fundGroup;
        updated = true;
      }
      
      return { fundCode: validatedFundCode, isNew: false, isUpdated: updated };
    }
    
    // Fund doesn't exist, create a new one
    const newFund = {
      fundCode: validatedFundCode,
      fundName,
      fundGroup,
      fundDescription
    };
    
    // Add to the funds array
    fundsData.funds.push(newFund);
    
    return { fundCode: validatedFundCode, isNew: true, isUpdated: false };
  } catch (error) {
    log({ message: `Error verifying fund: ${error instanceof Error ? error.message : String(error)}`, type: 'warn' });
    return { fundCode: fundCode.toString(), isNew: false, isUpdated: false };
  }
}

// Helper function to determine fund group from fund type
function determineFundGroup(fundType: string): string {
  // Maps CSV fund_type to our Fund Group types
  const typeMap: Record<string, string> = {
    "general": "Governmental Cost Funds",
    "special": "Special Revenue Funds",
    "transportation": "Transportation Funds",
    "bond": "Bond Funds",
    "federal": "Federal Funds"
  };
  
  // Convert to lowercase for case-insensitive matching
  const lcFundType = fundType.toLowerCase().trim();
  
  // Return the mapped fund group or default to "Other Funds"
  return typeMap[lcFundType] || "Other Funds";
}

// Helper function to read existing vendor data
function readExistingVendorData(filePath: string, defaultData: any): any {
  try {
    if (fs.existsSync(filePath)) {
      log({ message: `Reading existing data from ${filePath}` });
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    log({ message: `Error reading existing data from ${filePath}: ${error instanceof Error ? error.message : String(error)}`, type: 'warn' });
  }
  return defaultData;
}

// Function to read and parse programs.json
function readProgramsJson(): any {
  try {
    if (fs.existsSync(PROGRAMS_JSON_PATH)) {
      log({ message: `Reading programs data from ${PROGRAMS_JSON_PATH}` });
      const fileContent = fs.readFileSync(PROGRAMS_JSON_PATH, 'utf8');
      const programsData = JSON.parse(fileContent);
      
      // Ensure it has the correct structure
      if (!programsData.programs) {
        programsData.programs = [];
      }
      if (!programsData.lastUpdated) {
        programsData.lastUpdated = new Date().toISOString();
      }
      
      return programsData;
    } else {
      // Create a new programs.json with empty structure
      const newProgramsData = {
        programs: [],
        lastUpdated: new Date().toISOString()
      };
      
      writeVendorData(newProgramsData, PROGRAMS_JSON_PATH);
      return newProgramsData;
    }
  } catch (error) {
    log({ message: `Error reading programs data: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    return { programs: [], lastUpdated: new Date().toISOString() };
  }
}

// Helper function to validate program code format
function validateProgramCode(programCode: string | undefined): boolean {
  if (!programCode || typeof programCode !== 'string') {
    return false;
  }
  
  // Program codes should be at least 7 digits
  const digitsOnly = programCode.trim().replace(/\D/g, '');
  return digitsOnly.length >= 7;
}

// Helper function to format program code to 7 digits
function formatProgramCode(programCode: string): string {
  // Remove any non-digit characters
  const digitsOnly = programCode.trim().replace(/\D/g, '');
  
  // If less than 7 digits, pad with leading zeros
  if (digitsOnly.length < 7) {
    return digitsOnly.padStart(7, '0');
  }
  
  // If more than 7 digits, take first 7 digits
  return digitsOnly.slice(0, 7);
}

// Function to verify program exists and add it if it doesn't
function verifyOrAddProgram(programCode: string, record: any, programsData: any, sourceFile: string): { newPrograms: number; updatedPrograms: number; newDescriptions: number; updatedSources: number; needsWrite: boolean } {
  const stats = {
    newPrograms: 0,
    updatedPrograms: 0,
    newDescriptions: 0,
    updatedSources: 0,
    needsWrite: false
  };

  try {
    if (!validateProgramCode(programCode)) {
      return stats; // Skip if program code is invalid
    }
    
    // Clean up program code and format to 7 digits
    const cleanProgramCode = formatProgramCode(programCode);
    
    // Check if the program already exists
    const existingProgram = programsData.programs.find((program: any) => 
      program.projectCode === cleanProgramCode
    );
    
    // Extract program data from the record
    const programName = record.program_description || null;
    const subProgramDescription = record.sub_program_description || null;
    
    if (existingProgram) {
      // Check if we need to add a new program description that doesn't already exist
      const existingDescription = existingProgram.programDescriptions.find(
        (desc: any) => desc.description === subProgramDescription
      );
      
      if (subProgramDescription) {
        if (!existingDescription) {
          // Add new description with source
          existingProgram.programDescriptions.push({
            description: subProgramDescription,
            source: sourceFile
          });
          stats.newDescriptions++;
          stats.needsWrite = true;
        } else if (!existingDescription.source.includes(sourceFile)) {
          // Update source for existing description
          existingDescription.source = Array.isArray(existingDescription.source) 
            ? [...existingDescription.source, sourceFile]
            : [existingDescription.source, sourceFile];
          stats.updatedSources++;
          stats.needsWrite = true;
        }
      }
      
      // Update name if current one is null and we have a better one
      if (!existingProgram.name && programName) {
        existingProgram.name = programName;
        stats.updatedPrograms++;
        stats.needsWrite = true;
      }
      
      return stats;
    }
    
    // Program doesn't exist, create a new one
    const newProgram = {
      projectCode: cleanProgramCode,
      name: programName,
      programDescriptions: subProgramDescription ? [{
        description: subProgramDescription,
        source: sourceFile
      }] : []
    };
    
    // Add to the programs array
    programsData.programs.push(newProgram);
    stats.newPrograms++;
    if (subProgramDescription) {
      stats.newDescriptions++;
    }
    stats.needsWrite = true;
    
    return stats;
  } catch (error) {
    log({ message: `Error verifying program: ${error instanceof Error ? error.message : String(error)}`, type: 'warn' });
    return stats;
  }
}

// Process a CSV file for both vendor transaction and enhanced vendor structures in a single pass
async function processVendorFile(file: string, yearlyTransactionData: YearlyTransactionData, enhancedVendorData: any, fundsData: any, programsData: any): Promise<void> {
  const startTime = Date.now();
  log({ message: `Starting processing of ${file}...` });
  const filePath = path.join(VENDORS_DIR, file);
  
  // Track statistics
  const stats = {
    newPrograms: 0,
    updatedPrograms: 0,
    newDescriptions: 0,
    updatedSources: 0,
    newFunds: 0,
    updatedFunds: 0,
    newVendors: 0,
    updatedVendors: 0
  };
  
  try {
    // Step 2.1: Read and parse CSV file
    log({ message: `2.1 Reading and parsing CSV file: ${file}` });
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
    
    // Track processed years for this file
    const processedYears = new Set<string>();
    let recordCount = 0;
    
    // Step 2.2: Process each record
    log({ message: `2.2 Processing records from ${file}` });
    
    // Process each record for both data structures at once
    for (const record of records) {
      recordCount++;
      
      // Log progress periodically
      if (recordCount % PROGRESS_INTERVAL === 0) {
        const memory = formatMemoryUsage();
        log({ message: `Processing record ${recordCount} - Memory: ${JSON.stringify(memory)}` });
      }
      
      // Step 2.3: Extract vendor information and transaction details
      const vendorName = record.VENDOR_NAME || 'Unknown Vendor';
      const fiscalYear = record.fiscal_year_begin;
      
      // Skip records with invalid fiscal year
      if (!fiscalYear) {
        log({ message: `Skipping record with missing fiscal year: ${JSON.stringify(record)}`, type: 'warn' });
        continue;
      }
      
      // Initialize year data structure if it doesn't exist
      if (!yearlyTransactionData[fiscalYear]) {
        yearlyTransactionData[fiscalYear] = {
          transactions: [],
          processedFiles: [],
          lastProcessedFile: null,
          lastProcessedTimestamp: null
        };
      }
      
      // Check if this file has already been processed for this year
      if (yearlyTransactionData[fiscalYear].processedFiles && 
          yearlyTransactionData[fiscalYear].processedFiles.includes(file)) {
        continue; // Skip this record as the file has been processed for this year
      }
      
      processedYears.add(fiscalYear);
      
      const department = record.department_name;
      const accountType = record.account_type;
      const accountCategory = record.account_category;
      const accountSubCategory = record.account_sub_category;
      const accountDescription = record.account_description;
      const amount = parseAmount(record.monetary_amount);
      const organizationCode = parseInt(record.business_unit.trim(), 10) || 0;
      let rawFundCode = record.fund_code.trim();
      
      // Validate fund code and ensure it exists in funds.json
      try {
        const fundResult = verifyOrAddFund(rawFundCode, record, fundsData);
        if (fundResult.isNew) {
          stats.newFunds++;
        } else if (fundResult.isUpdated) {
          stats.updatedFunds++;
        }
        // Keep fund code as string to preserve leading zeros for 4-digit format
        const fundCode = fundResult.fundCode;
        
        // Verify program code and ensure it exists in programs.json
        try {
          const programStats = verifyOrAddProgram(record.program_code, record, programsData, file);
          stats.newPrograms += programStats.newPrograms;
          stats.updatedPrograms += programStats.updatedPrograms;
          stats.newDescriptions += programStats.newDescriptions;
          stats.updatedSources += programStats.updatedSources;
          
          // If any changes were made, update the lastUpdated timestamp
          if (programStats.needsWrite) {
            programsData.lastUpdated = new Date().toISOString();
          }
        } catch (error) {
          log({ message: `Program code validation error: ${error instanceof Error ? error.message : String(error)}`, type: 'warn' });
        }
        
        // Format program code to 7 digits for vendors.json
        const programCode = formatProgramCode(record.program_code || '');
        
        // Get year-specific transaction data
        const vendorTransactionData = yearlyTransactionData[fiscalYear];
        
        // Update transaction structure
        if (!vendorTransactionData.transactions) {
          vendorTransactionData.transactions = [];
        }
        
        const findOrCreateVendorTransaction = () => {
          let vendor = vendorTransactionData.transactions.find(
            (v: any) => v.vendor_name === vendorName
          );
          
          if (!vendor) {
            vendor = { 
              vendor_name: vendorName, 
              department_name: [] 
            };
            vendorTransactionData.transactions.push(vendor);
          }
          
          return vendor;
        };
        
        const vendorTransaction = findOrCreateVendorTransaction();
        
        // Process transaction structure (hierarchy of nested objects)
        const findOrCreateDepartment = (data: any) => {
          let dept = data.department_name.find((d: any) => d.name === department);
          if (!dept) {
            dept = { 
              name: department, 
              organizationCode: organizationCode,
              account_type: []
            };
            data.department_name.push(dept);
          }
          return dept;
        };
        
        const dept = findOrCreateDepartment(vendorTransaction);
        
        // Continue building transaction hierarchy
        const findOrCreateAccountType = (data: any) => {
          let acct = data.account_type.find((a: any) => a.type === accountType);
          if (!acct) {
            acct = { 
              type: accountType, 
              account_category: [] 
            };
            data.account_type.push(acct);
          }
          return acct;
        };
        
        const acct = findOrCreateAccountType(dept);
        
        // Continue with account category
        const findOrCreateAccountCategory = (data: any) => {
          let cat = data.account_category.find((c: any) => c.category === accountCategory);
          if (!cat) {
            cat = { category: accountCategory, account_sub_category: [] };
            data.account_category.push(cat);
          }
          return cat;
        };
        
        const cat = findOrCreateAccountCategory(acct);
        
        // Continue with sub category
        const findOrCreateSubCategory = (data: any) => {
          let subCat = data.account_sub_category.find((s: any) => s.subCategory === accountSubCategory);
          if (!subCat) {
            subCat = { subCategory: accountSubCategory, account_description: [] };
            data.account_sub_category.push(subCat);
          }
          return subCat;
        };
        
        const subCat = findOrCreateSubCategory(cat);
        
        // Find or create account description with program and fund codes
        const findOrCreateAccountDescription = (data: any) => {
          let desc = data.account_description.find((d: any) => 
            d.description === accountDescription && 
            d.program_code === programCode && 
            d.fund_code === fundCode
          );
          
          if (!desc) {
            desc = {
              description: accountDescription,
              program_code: programCode,
              fund_code: fundCode,
              amount: 0,
              count: 0
            };
            data.account_description.push(desc);
          }
          
          return desc;
        };
        
        const desc = findOrCreateAccountDescription(subCat);
        
        // Update amount and count
        desc.amount += amount;
        desc.count += 1;
        
        // Update enhanced vendor structure
        // Check if this vendor exists already
        let enhancedVendor = enhancedVendorData.vendors.find((v: any) => 
          v.vendorName.some((n: any) => n.name === vendorName)
        );
        
        // If no existing vendor, create a new one with null EIN (will be resolved later)
        if (!enhancedVendor) {
          enhancedVendor = {
            ein: null,
            vendorName: [{
              name: vendorName,
              fiscalYear: []
            }]
          };
          enhancedVendorData.vendors.push(enhancedVendor);
          stats.newVendors++;
        }
        
        // Find or create vendor name entry
        let nameEntry = enhancedVendor.vendorName.find((n: any) => n.name === vendorName);
        if (!nameEntry) {
          nameEntry = {
            name: vendorName,
            fiscalYear: []
          };
          enhancedVendor.vendorName.push(nameEntry);
        }
        
        // Find or create fiscal year
        let yearEntry = nameEntry.fiscalYear.find((y: any) => y.year === fiscalYear);
        if (!yearEntry) {
          yearEntry = {
            year: fiscalYear,
            projectCode: []
          };
          nameEntry.fiscalYear.push(yearEntry);
        }
        
        // Find or create project code
        let projectEntry = yearEntry.projectCode.find((p: any) => p.code === programCode);
        if (!projectEntry) {
          projectEntry = {
            code: programCode,
            organizationCode: []
          };
          yearEntry.projectCode.push(projectEntry);
        }
        
        // Find or create organization code
        let orgEntry = projectEntry.organizationCode.find((o: any) => o.code === organizationCode);
        if (!orgEntry) {
          orgEntry = {
            code: organizationCode,
            fundCode: []
          };
          projectEntry.organizationCode.push(orgEntry);
        }
        
        // Find or create fund code allocation - using string fund code to preserve 4 digits
        let fundEntry = orgEntry.fundCode.find((f: any) => f.code === fundCode);
        if (!fundEntry) {
          fundEntry = {
            code: fundCode,
            count: 0,
            amount: 0
          };
          orgEntry.fundCode.push(fundEntry);
        }
        
        // Update count and amount for enhanced structure
        fundEntry.count += 1;
        fundEntry.amount += amount;
      } catch (error) {
        log({ message: `Fund code validation error: ${error instanceof Error ? error.message : String(error)}`, type: 'warn' });
      }
    }
    
    log({ message: `Completed processing ${recordCount} records from ${file}` });
    log({ message: `Processing time: ${(Date.now() - startTime) / 1000}s` });
    
    // Mark file as processed for each year
    for (const year of Array.from(processedYears)) {
      if (!yearlyTransactionData[year].processedFiles) {
        yearlyTransactionData[year].processedFiles = [];
      }
      if (!yearlyTransactionData[year].processedFiles.includes(file)) {
        yearlyTransactionData[year].processedFiles.push(file);
      }
      
      // Update the last processed file and timestamp for each year
      yearlyTransactionData[year].lastProcessedFile = file;
      yearlyTransactionData[year].lastProcessedTimestamp = new Date().toISOString();
      
      // Write year-specific transaction data
      const yearFilePath = getVendorTransactionPath(year);
      log({ message: `4.1 Writing vendor transaction data for year ${year} after processing ${file}` });
      writeVendorData(yearlyTransactionData[year], yearFilePath);
    }
    
    // Add the file to the enhanced vendor processed files list
    if (!enhancedVendorData.processedFiles) {
      enhancedVendorData.processedFiles = [];
    }
    if (!enhancedVendorData.processedFiles.includes(file)) {
      enhancedVendorData.processedFiles.push(file);
    }
    
    // Update enhanced vendor data
    enhancedVendorData.lastProcessedFile = file;
    enhancedVendorData.lastProcessedTimestamp = new Date().toISOString();
    
    // Ensure we have the required structure before writing
    if (!enhancedVendorData.vendors) {
      enhancedVendorData.vendors = [];
    }
    if (!enhancedVendorData.sources) {
      enhancedVendorData.sources = [
        { name: 'California Fiscal Data Portal', url: 'https://fiscal.ca.gov/' }
      ];
    }
    if (!enhancedVendorData.lastUpdated) {
      enhancedVendorData.lastUpdated = new Date().toISOString();
    }
    
    log({ message: `4.2 Writing enhanced vendor data after processing ${file}` });
    writeVendorData(enhancedVendorData, ENHANCED_VENDORS_PATH);
    
    // Write data files only if there were changes
    let hasChanges = false;
    
    // Check if we need to write funds data
    if (stats.newFunds > 0 || stats.updatedFunds > 0) {
      fundsData.lastUpdated = new Date().toISOString();
      writeVendorData(fundsData, FUNDS_JSON_PATH);
      hasChanges = true;
    }
    
    // Check if we need to write programs data
    if (stats.newPrograms > 0 || stats.updatedPrograms > 0 || 
        stats.newDescriptions > 0 || stats.updatedSources > 0) {
      writeVendorData(programsData, PROGRAMS_JSON_PATH);
      hasChanges = true;
    }
    
    // Log summary statistics if there were any changes
    if (hasChanges) {
      log({ 
        message: `Summary for ${file}:\n` +
                `  Funds: ${stats.newFunds} new, ${stats.updatedFunds} updated\n` +
                `  Programs: ${stats.newPrograms} new, ${stats.updatedPrograms} updated\n` +
                `  Program Descriptions: ${stats.newDescriptions} new, ${stats.updatedSources} updated\n` +
                `  Vendors: ${stats.newVendors} new, ${stats.updatedVendors} updated`
      });
    }
    
  } catch (error) {
    log({ message: `Error processing file ${file}: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    throw error;
  }
}

// Function to validate fund codes in the vendor data structure
function validateFundCodesInVendorData(vendorData: any): { isValid: boolean; invalidCodes: string[] } {
  const invalidCodes: string[] = [];
  let isValid = true;
  
  try {
    // Check enhanced vendor data
    if (vendorData.vendors && Array.isArray(vendorData.vendors)) {
      // Iterate through the nested structure to find all fund codes
      vendorData.vendors.forEach((vendor: any) => {
        if (vendor.vendorName && Array.isArray(vendor.vendorName)) {
          vendor.vendorName.forEach((nameEntry: any) => {
            if (nameEntry.fiscalYear && Array.isArray(nameEntry.fiscalYear)) {
              nameEntry.fiscalYear.forEach((yearEntry: any) => {
                if (yearEntry.projectCode && Array.isArray(yearEntry.projectCode)) {
                  yearEntry.projectCode.forEach((projectEntry: any) => {
                    if (projectEntry.organizationCode && Array.isArray(projectEntry.organizationCode)) {
                      projectEntry.organizationCode.forEach((orgEntry: any) => {
                        if (orgEntry.fundCode && Array.isArray(orgEntry.fundCode)) {
                          orgEntry.fundCode.forEach((fundEntry: any) => {
                            const fundCode = fundEntry.code;
                            if (typeof fundCode !== 'string' || !/^\d{4}$/.test(fundCode)) {
                              invalidCodes.push(String(fundCode));
                              isValid = false;
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
    
    // Deduplicate invalid codes
    const uniqueCodes = Array.from(new Set(invalidCodes));
    return { isValid, invalidCodes: uniqueCodes };
  } catch (error) {
    log({ message: `Error validating fund codes: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    return { isValid: false, invalidCodes: ['Error validating fund codes'] };
  }
}

// Function to validate program codes in vendor data structure
function validateProgramCodesInVendorData(vendorData: any): { isValid: boolean; invalidCodes: string[] } {
  const invalidCodes: string[] = [];
  let isValid = true;
  
  try {
    // Iterate through the nested structure to check all program codes
    if (vendorData.vendors && Array.isArray(vendorData.vendors)) {
      vendorData.vendors.forEach((vendor: any) => {
        if (vendor.vendorName && Array.isArray(vendor.vendorName)) {
          vendor.vendorName.forEach((nameEntry: any) => {
            if (nameEntry.fiscalYear && Array.isArray(nameEntry.fiscalYear)) {
              nameEntry.fiscalYear.forEach((yearEntry: any) => {
                if (yearEntry.projectCode && Array.isArray(yearEntry.projectCode)) {
                  yearEntry.projectCode.forEach((projectEntry: any) => {
                    const programCode = projectEntry.code;
                    if (!validateProgramCode(programCode)) {
                      invalidCodes.push(String(programCode));
                      isValid = false;
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
    
    // Deduplicate invalid codes
    const uniqueCodes = Array.from(new Set(invalidCodes));
    return { isValid, invalidCodes: uniqueCodes };
  } catch (error) {
    log({ message: `Error validating program codes: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    return { isValid: false, invalidCodes: ['Error validating program codes'] };
  }
}

async function main(): Promise<void> {
  try {
    // Check for specific command-line argument for EIN resolution only
    // const einResolutionOnly = process.argv.includes('--ein-resolution-only');
    
    // if (einResolutionOnly) {
    //   log({ message: 'Running EIN resolution only mode' });
    //   
    //   // Load existing enhanced vendor data
    //   const enhancedVendorData = readExistingVendorData(ENHANCED_VENDORS_PATH, {
    //     vendors: [],
    //     processedFiles: [],
    //     lastProcessedFile: null,
    //     lastProcessedTimestamp: null,
    //     sources: [
    //       { name: 'California Fiscal Data Portal', url: 'https://fiscal.ca.gov/' }
    //     ],
    //     lastUpdated: new Date().toISOString()
    //   });
    //   
    //   // Resolve EINs
    //   // await resolveVendorEINs(enhancedVendorData);
    //   
    //   // Write the final enhanced vendor data
    //   log({ message: 'Writing final enhanced vendor data with EINs' });
    //   writeVendorData(enhancedVendorData, ENHANCED_VENDORS_PATH);
    //   
    //   log({ message: 'EIN resolution only mode completed' });
    //   return;
    // }
    
    // Step 1: Initialization
    log({ message: 'STEP 1. Initialization' });
    
    // Step 1.1: Setup logging (already done by setupLogging function)
    log({ message: '1.1 Logging setup completed' });
    
    // Check for force reprocessing flag
    const forceReprocess = process.argv.includes('--force');
    if (forceReprocess) {
      log({ message: 'Force reprocessing flag detected. Will reprocess all files.' });
    }
    
    // Step 1.2: Create required directories
    log({ message: '1.2 Creating required directories' });
    createRequiredDirectories();
    
    // Step 1.3: Initialize configuration and constants
    log({ message: '1.3 Initializing configuration and data structures' });
    
    // Initialize yearly transaction data structure
    const yearlyTransactionData: YearlyTransactionData = {};
    
    // Read existing year-specific transaction data files
    const dataFiles = fs.readdirSync(DATA_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.match(/^vendor_transaction_\d{4}\.json$/))
      .map(dirent => dirent.name);
    
    // Load existing yearly data
    for (const dataFile of dataFiles) {
      const yearMatch = dataFile.match(/vendor_transaction_(\d{4})\.json/);
      if (yearMatch && yearMatch[1]) {
        const year = yearMatch[1];
        const filePath = path.join(DATA_DIR, dataFile);
        
        const defaultYearData = {
          transactions: [],
          processedFiles: [],
          lastProcessedFile: null,
          lastProcessedTimestamp: null
        };
        
        yearlyTransactionData[year] = readExistingVendorData(filePath, defaultYearData);
        log({ message: `Loaded existing transaction data for year ${year}` });
      }
    }
    
    const defaultEnhancedData = {
      vendors: [],
      processedFiles: [],
      lastProcessedFile: null,
      lastProcessedTimestamp: null,
      sources: [
        { name: 'California Fiscal Data Portal', url: 'https://fiscal.ca.gov/' }
      ],
      lastUpdated: new Date().toISOString()
    };
    
    // Read existing enhanced vendor data
    const enhancedVendorData = readExistingVendorData(ENHANCED_VENDORS_PATH, defaultEnhancedData);
    
    // Load funds data for validation
    log({ message: '1.4 Loading funds data for validation' });
    const fundsData = readFundsJson();
    
    // Load programs data for validation and updates
    log({ message: '1.5 Loading programs data for validation and updates' });
    const programsData = readProgramsJson();
    
    // If force reprocessing, clear the processed files arrays
    if (forceReprocess) {
      // Clear all yearly transaction data
      Object.keys(yearlyTransactionData).forEach(year => {
        yearlyTransactionData[year].processedFiles = [];
      });
      
      enhancedVendorData.processedFiles = [];
      log({ message: 'Cleared processed files history for force reprocessing' });
    }
    
    // Always update the lastUpdated timestamp
    if (enhancedVendorData.lastUpdated) {
      enhancedVendorData.lastUpdated = new Date().toISOString();
    }

    // Step 2: CSV File Processing
    log({ message: 'STEP 2. CSV File Processing' });
    
    // Step 2.1: Read CSV files from the vendors directory
    log({ message: '2.1 Reading vendor CSV files from directory' });
    
    // Get list of vendor CSV files
    const files = fs.readdirSync(VENDORS_DIR)
      .filter(file => file.endsWith('.csv'))
      .sort((a, b) => {
        // Sort by modified time, most recent first
        return fs.statSync(path.join(VENDORS_DIR, b)).mtime.getTime() -
               fs.statSync(path.join(VENDORS_DIR, a)).mtime.getTime();
      });

    if (files.length === 0) {
      log({ message: 'No CSV files found in vendors directory', type: 'error' });
      return;
    }

    log({ message: `Found ${files.length} vendor CSV files` });
    
    // Process each file
    for (const file of files) {
      // Skip files that have been processed for all years (unless force reprocessing)
      if (!forceReprocess && enhancedVendorData.processedFiles && enhancedVendorData.processedFiles.includes(file)) {
        log({ message: `Skipping ${file} - already processed for all years` });
        continue;
      }
      
      await processVendorFile(file, yearlyTransactionData, enhancedVendorData, fundsData, programsData);
    }
    
    // Step 3: EIN Resolution
    log({ message: 'STEP 3. EIN Resolution' });
    
    // Step 3.1: Attempt to look up EINs for all vendors
    log({ message: '3.1 Looking up EINs for vendors' });
    
    // Step 3.2 and 3.3: Store EIN data and record statistics
    // await resolveVendorEINs(enhancedVendorData);
    
    // Final write after EIN resolution
    log({ message: 'STEP 4. Writing final enhanced vendor data with EINs' });
    writeVendorData(enhancedVendorData, ENHANCED_VENDORS_PATH);

    // Detailed validation against departments
    log({ message: '4.3 Validating vendor data against departments' });
    try {
      const validationResult = await dataValidation.validateVendorsDepartments(
        ENHANCED_VENDORS_PATH,
        DEPARTMENTS_JSON_PATH
      );
      
      if (!validationResult.isValid) {
        log({ 
          message: `Validation found ${validationResult.errors.length} issues: ${JSON.stringify(validationResult.errors.slice(0, 5))}${validationResult.errors.length > 5 ? '...' : ''}`, 
          type: 'warn'
        });
      } else {
        log({ message: 'Validation successful!' });
      }
    } catch (error) {
      log({ 
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`, 
        type: 'error'
      });
    }
    
    // Step 5: Results Summary
    log({ message: 'STEP 5. Results Summary' });
    
    // Step 5.1: Log processing statistics
    log({ message: '5.1 Processing statistics' });
    
    const vendorCount = enhancedVendorData.vendors.length;
    const processedFileCount = enhancedVendorData.processedFiles ? enhancedVendorData.processedFiles.length : 0;
    const yearsProcessed = Object.keys(yearlyTransactionData).length;
    
    log({ message: `Total vendors processed: ${vendorCount}` });
    log({ message: `CSV files processed: ${processedFileCount}` });
    log({ message: `Years processed: ${yearsProcessed} (${Object.keys(yearlyTransactionData).join(', ')})`});
    
    // Log transaction file paths created
    Object.keys(yearlyTransactionData).forEach(year => {
      log({ message: `Vendor transaction data for ${year} written to: ${getVendorTransactionPath(year)}` });
    });
    
    log({ message: `Enhanced vendor data written to: ${ENHANCED_VENDORS_PATH}` });
    
    // Step 5.2: Log EIN resolution statistics
    log({ message: '5.2 EIN resolution statistics' });
    const einCount = enhancedVendorData.vendors.filter((v: any) => v.ein).length;
    log({ message: `Vendors with EINs: ${einCount} (${Math.round(einCount/vendorCount*100)}%)` });
    
    // Step 5.3: Log validation results
    log({ message: '5.3 Validation results' });
    log({ message: 'Vendor data processing complete' });
    
    // Log fund statistics
    log({ message: '5.4 Fund statistics' });
    const fundCount = fundsData.funds.length;
    log({ message: `Total funds in database: ${fundCount}` });
    
    // Validate fund codes in the vendor data structure
    const fundValidationResult = validateFundCodesInVendorData(enhancedVendorData);
    if (!fundValidationResult.isValid) {
      log({ 
        message: `Validation found ${fundValidationResult.invalidCodes.length} invalid fund codes: ${JSON.stringify(fundValidationResult.invalidCodes.slice(0, 5))}${fundValidationResult.invalidCodes.length > 5 ? '...' : ''}`, 
        type: 'warn'
      });
    } else {
      log({ message: 'All fund codes are valid!' });
    }
    
    // Log program statistics
    log({ message: '5.5 Program statistics' });
    const programCount = programsData.programs.length;
    log({ message: `Total programs in database: ${programCount}` });
    
    // Validate program codes in the vendor data structure
    const programValidationResult = validateProgramCodesInVendorData(enhancedVendorData);
    if (!programValidationResult.isValid) {
      log({ 
        message: `Validation found ${programValidationResult.invalidCodes.length} invalid program codes: ${JSON.stringify(programValidationResult.invalidCodes.slice(0, 5))}${programValidationResult.invalidCodes.length > 5 ? '...' : ''}`, 
        type: 'warn'
      });
    } else {
      log({ message: 'All program codes are valid!' });
    }
    
  } catch (error) {
    log({ message: `Error in main process: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
});