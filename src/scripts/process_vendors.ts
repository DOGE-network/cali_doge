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
 *    2.6 update vendors.json.processedFiles with the processed file name so we do not double count by processing the same file twice
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
    t: Array<{
      n: string;  // vendor_name
      d: Array<{
        n: string;  // department_name
        oc: number;  // organizationCode, business_unit
        pa: string;  // agency_name, parent_agency
        at: Array<{
          t: string;  // type
          ac: Array<{
            c: string;  // category
            asc: Array<{
              sc: string;  // subCategory
              ad: Array<{
                d: string;  // description
                pc: string;  // program_code
                fc: string;  // fund_code
                a: number;  // amount
                ct: number;  // count
              }>;
            }>;
          }>;
        }>;
      }>;
    }>;
    pf: string[];  // processedFiles
    lpf: string | null;  // lastProcessedFile
    lpt: string | null;  // lastProcessedTimestamp
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
  return path.join(DATA_DIR, `vendors_${year}.json`);
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
      const departmentName = record.department_name;
      const organizationCode = record.business_unit; // keep as string or number as in CSV
      const agencyName = record.agency_name;
      
      // Skip records with invalid fiscal year
      if (!fiscalYear) {
        log({ message: `Skipping record with missing fiscal year: ${JSON.stringify(record)}`, type: 'warn' });
        continue;
      }
      
      // Initialize year data structure if it doesn't exist
      if (!yearlyTransactionData[fiscalYear]) {
        yearlyTransactionData[fiscalYear] = {
          t: [],
          pf: [],
          lpf: null,
          lpt: null
        };
      }
      
      // Check if this file has already been processed for this year
      if (yearlyTransactionData[fiscalYear].pf && 
          yearlyTransactionData[fiscalYear].pf.includes(file)) {
        continue; // Skip this record as the file has been processed for this year
      }
      
      processedYears.add(fiscalYear);
      
      // --- Build yearly transaction data ---
      const vendorTransactionData = yearlyTransactionData[fiscalYear];
      if (!vendorTransactionData.t) vendorTransactionData.t = [];

      let vendor = vendorTransactionData.t.find((v: any) => v.n === vendorName);
      if (!vendor) {
        vendor = { n: vendorName, d: [] };
        vendorTransactionData.t.push(vendor);
      }

      let dept = vendor.d.find((d: any) => d.n === departmentName && d.oc === organizationCode && d.pa === agencyName);
      if (!dept) {
        dept = {
          n: departmentName,
          oc: organizationCode,
          pa: agencyName,
          at: []
        };
        vendor.d.push(dept);
      }

      // Continue with account type/category/subcategory/description as before
      const accountType = record.account_type;
      const accountCategory = record.account_category;
      const accountSubCategory = record.account_sub_category;
      const accountDescription = record.account_description;
      const amount = parseAmount(record.monetary_amount);
      let rawFundCode = record.fund_code.trim();
      
      // Validate fund code and ensure it exists in funds.json
      let fundCode = rawFundCode;
      try {
        const fundResult = verifyOrAddFund(rawFundCode, record, fundsData);
        if (fundResult.isNew) {
          stats.newFunds++;
        } else if (fundResult.isUpdated) {
          stats.updatedFunds++;
        }
        // Keep fund code as string to preserve leading zeros for 4-digit format
        fundCode = fundResult.fundCode;
      } catch (error) {
        log({ message: `Fund code validation error: ${error instanceof Error ? error.message : String(error)}`, type: 'warn' });
      }
      
      // Verify program code and ensure it exists in programs.json (independent of fund validation)
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

      let acct = dept.at.find((a: any) => a.t === accountType);
      if (!acct) {
        acct = { t: accountType, ac: [] };
        dept.at.push(acct);
      }
      let cat = acct.ac.find((c: any) => c.c === accountCategory);
      if (!cat) {
        cat = { c: accountCategory, asc: [] };
        acct.ac.push(cat);
      }
      let subCat = cat.asc.find((s: any) => s.sc === accountSubCategory);
      if (!subCat) {
        subCat = { sc: accountSubCategory, ad: [] };
        cat.asc.push(subCat);
      }
      let desc = subCat.ad.find((d: any) => d.d === accountDescription && d.pc === programCode && d.fc === fundCode);
      if (!desc) {
        desc = {
          d: accountDescription,
          pc: programCode,
          fc: fundCode,
          a: 0,
          ct: 0
        };
        subCat.ad.push(desc);
      }
      desc.a += amount;
      desc.ct += 1;

      // --- Build enhanced vendor data ---
      let enhancedVendor = enhancedVendorData.v.find((v: any) => v.n.some((n: any) => n.n === vendorName));
      let isNewVendor = false;
      let isUpdatedVendor = false;
      
      if (!enhancedVendor) {
        enhancedVendor = {
          e: null,
          n: [{ n: vendorName, fy: [] }]
        };
        enhancedVendorData.v.push(enhancedVendor);
        isNewVendor = true;
        stats.newVendors++;
      }
      
      let nameEntry = enhancedVendor.n.find((n: any) => n.n === vendorName);
      if (!nameEntry) {
        nameEntry = { n: vendorName, fy: [] };
        enhancedVendor.n.push(nameEntry);
        isUpdatedVendor = true;
      }
      
      let yearEntry = nameEntry.fy.find((y: any) => y.y === fiscalYear);
      if (!yearEntry) {
        yearEntry = { y: fiscalYear, pc: [] };
        nameEntry.fy.push(yearEntry);
        isUpdatedVendor = true;
      }
      
      let projectEntry = yearEntry.pc.find((p: any) => p.c === programCode);
      if (!projectEntry) {
        projectEntry = { c: programCode, oc: [] };
        yearEntry.pc.push(projectEntry);
        isUpdatedVendor = true;
      }
      
      let orgEntry = projectEntry.oc.find((o: any) => o.c === organizationCode && o.n === departmentName && o.pa === agencyName);
      if (!orgEntry) {
        orgEntry = {
          c: organizationCode,
          n: departmentName,
          pa: agencyName,
          fc: []
        };
        projectEntry.oc.push(orgEntry);
        isUpdatedVendor = true;
      }
      
      let fundEntry = orgEntry.fc.find((f: any) => f.c === fundCode);
      if (!fundEntry) {
        fundEntry = { c: fundCode, ct: 0, a: 0 };
        orgEntry.fc.push(fundEntry);
        isUpdatedVendor = true;
      }
      
      // Track if this record adds new transaction data
      fundEntry.ct += 1;
      fundEntry.a += amount;
      
      // If this is an existing vendor and we added new data, mark as updated
      if (!isNewVendor && isUpdatedVendor) {
        stats.updatedVendors++;
      }
    }
    
    log({ message: `Completed processing ${recordCount} records from ${file}` });
    log({ message: `Processing time: ${(Date.now() - startTime) / 1000}s` });
    
    // Mark file as processed for each year
    for (const year of Array.from(processedYears)) {
      if (!yearlyTransactionData[year].pf) {
        yearlyTransactionData[year].pf = [];
      }
      if (!yearlyTransactionData[year].pf.includes(file)) {
        yearlyTransactionData[year].pf.push(file);
      }
      
      // Update the last processed file and timestamp for each year
      yearlyTransactionData[year].lpf = file;
      yearlyTransactionData[year].lpt = new Date().toISOString();
      
      // Write year-specific transaction data
      const yearFilePath = getVendorTransactionPath(year);
      log({ message: `4.1 Writing vendor transaction data for year ${year} after processing ${file}` });
      writeVendorData(yearlyTransactionData[year], yearFilePath);
    }
    
    // Add the file to the enhanced vendor processed files list
    if (!enhancedVendorData.pf) {
      enhancedVendorData.pf = [];
    }
    if (!enhancedVendorData.pf.includes(file)) {
      enhancedVendorData.pf.push(file);
    }
    
    // Update enhanced vendor data
    enhancedVendorData.lpf = file;
    enhancedVendorData.lpt = new Date().toISOString();
    
    // Ensure we have the required structure before writing
    if (!enhancedVendorData.v) {
      enhancedVendorData.v = [];
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
    if (vendorData.v && Array.isArray(vendorData.v)) {
      // Iterate through the nested structure to find all fund codes
      vendorData.v.forEach((vendor: any) => {
        if (vendor.n && Array.isArray(vendor.n)) {
          vendor.n.forEach((nameEntry: any) => {
            if (nameEntry.fy && Array.isArray(nameEntry.fy)) {
              nameEntry.fy.forEach((yearEntry: any) => {
                if (yearEntry.pc && Array.isArray(yearEntry.pc)) {
                  yearEntry.pc.forEach((projectEntry: any) => {
                    if (projectEntry.oc && Array.isArray(projectEntry.oc)) {
                      projectEntry.oc.forEach((orgEntry: any) => {
                        if (orgEntry.fc && Array.isArray(orgEntry.fc)) {
                          orgEntry.fc.forEach((fundEntry: any) => {
                            const fundCode = fundEntry.c;
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
    if (vendorData.v && Array.isArray(vendorData.v)) {
      vendorData.v.forEach((vendor: any) => {
        if (vendor.n && Array.isArray(vendor.n)) {
          vendor.n.forEach((nameEntry: any) => {
            if (nameEntry.fy && Array.isArray(nameEntry.fy)) {
              nameEntry.fy.forEach((yearEntry: any) => {
                if (yearEntry.pc && Array.isArray(yearEntry.pc)) {
                  yearEntry.pc.forEach((projectEntry: any) => {
                    const programCode = projectEntry.c;
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
          t: [],
          pf: [],
          lpf: null,
          lpt: null
        };
        
        yearlyTransactionData[year] = readExistingVendorData(filePath, defaultYearData);
        log({ message: `Loaded existing transaction data for year ${year}` });
      }
    }
    
    const defaultEnhancedData = {
      v: [],
      pf: [],
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
        yearlyTransactionData[year].pf = [];
      });
      
      enhancedVendorData.pf = [];
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
      if (!forceReprocess && enhancedVendorData.pf && enhancedVendorData.pf.includes(file)) {
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
    
    const vendorCount = enhancedVendorData.v.length;
    const processedFileCount = enhancedVendorData.pf ? enhancedVendorData.pf.length : 0;
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
    const einCount = enhancedVendorData.v.filter((v: any) => v.e).length;
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