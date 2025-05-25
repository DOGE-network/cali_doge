/**
 * Budget Data Text File Processing Script
 * from plan datastructureandlayout.md, 2. Data Processing Scripts Update, Update Process Budgets Script
 * General rule for if budget organization code and name is a department. It must have headcount to be a department and added to the workforce hierarchy.
 * Each budget txt file has multiple department sections and each with two subsections
 * Section: for each with 4 digit organizational code and department name on a line followed by department description as paragraphs, and then followed by expenditure markers like "3-YR EXPENDITURES AND POSITIONS" or "3-YEAR EXPENDITURES POSITIONS". Until another group of text matches this, consider all of the text as part of the current section. Match 4 digit org code and or department name to a single record in departments.json using src/lib/departmentMatching.js, 
 * e.g. "0110    Senate
 *
 * The Legislature ... Assembly. 
 * 
 * 3-YR EXPENDITURES AND POSITIONS "
 * 
 * NOTE: any text line that has "- Continued" is not a section, just a source file footer comment, e.g. "0110    Senate - Continued"
 * 
 * Subsection one: find "PROGRAM DESCRIPTIONS" text which has programs and subprograms following it.
 * Note that each 4 digit program code is always has 3 zeros added to the end to make it a 7 digits project code. 7 digit subprogram codes are used as is for a project code.
 * Match the 4 digit program code or 7 digit subprogram code as projectCode, program name on a single line followed by the program description with programs.json records, 
 * e.g. "3500 - MOBILE SOURCE 
 *
 * The Mobile Source Program works."
 * Use the same program json update logic as the process vendors script.
 * 
 * Subsection two: find "DETAILED EXPENDITURES BY PROGRAM" text which has budget data following it.
 * Look for a group of 4 lines of text: 3 lines of year formatted dates followed by a line of text "PROGRAM REQUIREMENTS" OR "SUBPROGRAM REQUIREMENTS"
 * The rest of this subsection are program and subprogram codes, followed by the name, fund type, fund name, fund code, and the 3 years of amounts budgeted,
 * e.g." 2015-16*
* 2016-17*
* 2017-18*
* PROGRAM REQUIREMENTS
* 0130
* SUPREME COURT
* State Operations:
* 0001
* General Fund
* $42,554
* $46,772
* $47,443"
 *  For each program and subprogram in subsubsection one, there must be budget data for 3 years.
 * 
 * File Processing and Data Overwrite Logic:
 * - Budget text files contain data for the current year and 2 previous years
 * - The 2 previous years data should be updated/more accurate than what was in previous budget text documents
 * - When processing a budget file, if budgets.json org code and year match the budget file org code and year, 
 *   then overwrite the existing project code, funding type, fund code data from the budget text file
 * - Track processed files in budgets.json.processedFiles to avoid duplicate processing
 * - Skip files already in processedFiles record unless force reprocessing is enabled
 * - Log overwrite operations in both console and log file for transparency
 * 
 * Processing steps:
 * 1. Initial Setup
 *    a. Load departments.json, programs.json, and budgets.json
 *    b. Setup logging and statistics tracking
 *    c. Check for force reprocessing flag and clear processedFiles if needed
 * 
 * 2. Budget Text File Scanning and Section Identification
 *    a. Scan budget data directory for text files
 *    b. For each file:
 *       i. Skip if file already in budgets.json.processedFiles (unless force reprocessing)
 *       ii. Read and parse file content
 *       iii. Extract document year from filename (the year the budget document was published)
 *       iv. Find all department sections by:
 *           - Identifying lines with 4-digit organizational codes followed by department names
 *           - Skipping lines with "- Continued" as these are footer comments
 *           - Including all content until the next department section begins
 *           - Each section contains an expenditure marker like "3-YR EXPENDITURES AND POSITIONS" or "3-YEAR EXPENDITURES POSITIONS"
 * 
 * 3. Processing Department Sections (with two-stage user approval for each section)
 *    a. For each department section:
 *       i. Extract department information:
 *          - 4-digit organizational code
 *          - Department name
 *          - Department description (text between header and expenditure marker)
 *       ii. Match department with departments.json using departmentMatching.js
 *           - Direct match by organizational code (if available)
 *           - Name-based matching with confidence scoring
 *           - Handle unmatched departments with user prompts for new record creation
 *       iii. Compare department descriptions:
 *           - Check if description is missing, empty, or significantly different
 *           - Mark for update if needed (consolidated into approval stage)
 * 
 * 4. Processing Subsections Within Each Department Section
 *    a. Subsection One - Program Descriptions:
 *       i. Find "PROGRAM DESCRIPTIONS" text
 *       ii. Extract program/subprogram information:
 *           - Convert 4-digit program codes to 7-digit project codes (append "000")
 *           - Use 7-digit subprogram codes as-is for project codes
 *           - Extract program/subprogram names and descriptions
 *       iii. Update programs.json with extracted data (source = budget filename)
 * 
 *    b. Subsection Two - Detailed Expenditures with Overwrite Logic:
 *       i. Find "DETAILED EXPENDITURES BY PROGRAM" section
 *       ii. Locate fiscal years and "PROGRAM REQUIREMENTS"/"SUBPROGRAM REQUIREMENTS"
 *       iii. Extract budget allocations:
 *           - Program/subprogram codes
 *           - Program/subprogram names
 *           - Fund types (State Operations/Local Assistance)
 *           - Fund codes and names
 *           - Budget amounts for each fiscal year
 *       iv. For matching org code and year combinations, overwrite existing data
 *       v. Log overwrite operations for transparency
 *       vi. Update budgets.json using budget.ts types
 * 
 * 5. Two-Stage User Approval and Data Persistence
 *    a. Stage 1 - Department Changes Approval (departments.json):
 *       - Present department matching results and confidence scores
 *       - Show description changes with similarity analysis
 *       - Options: update/add description, keep existing, or skip
 *       - Save departments.json immediately when approved
 *    b. Stage 2 - Program & Budget Changes Approval (programs.json, budgets.json):
 *       - Present program descriptions found
 *       - Show budget allocations breakdown (NEW vs OVERWRITE)
 *       - Save programs.json and budgets.json when approved
 *    c. Handle special cases for unmatched departments:
 *       - Option to create new department with budget_status = active (has headcount)
 *       - Option to create new department with budget_status = inactive (no headcount)
 *       - Display general rule about headcount requirements for departments
 * 
 * 6. Results Summary and Final Data Persistence
 *    a. Data is saved incrementally after each approved section to prevent data loss
 *    b. Update budgets.json.processedFiles with processed file name
 *    c. Generate processing statistics:
 *       i. Total files processed
 *       ii. Departments found and matched
 *       iii. Programs/subprograms found and updated
 *       iv. Budget allocations added vs overwritten
 *    d. Write comprehensive summary to log file
 * 
 * Dependencies / Input files:
 * - departments.json: Department data
 * - programs.json: Program data
 * - budgets.json: Budget data (with processedFiles tracking)
 * - budget/text/*.txt: Budget text files to process
 * - src/lib/departmentMatching.js: Department name matching logic
 * - src/types/budget.ts: Budget data types
 * 
* Output Files:
 * - programs.json: Updated with project codes, program names, and descriptions (source = budget filename)
 * - budgets.json: Updated with detailed budget allocations (with overwrite logic for existing data)
 * - departments.json: Updated with department data and descriptions
 * - src/logs/process_budgets-<transactionId>.log using the same format as the vendor script
 * 
 * Key Features:
 * - Two-stage approval process for granular control
 * - Consolidated description update prompts
 * - Filename-based program description sources
 * - Overwrite logic for budget allocations when org code and year match
 * - ProcessedFiles tracking to prevent duplicate processing
 * - Incremental data saving to prevent loss
 * - Comprehensive logging and statistics
 * 
 * Usage:
 * ```bash
 * npm run process-budgets
 * npm run process-budgets --force  # Force reprocess all files
 * ```
 * 
 */

import * as fs from 'fs';
import * as path from 'path';
import { findDepartmentMatches } from '../lib/departmentMatching';
import { DepartmentData, DepartmentsJSON, organizationalCode, ValidSlug, OrgLevel, BudgetStatus, AnnualYear, RequiredDepartmentJSONFields, FiscalYearKey, TenureRange, SalaryRange, AgeRange } from '../types/department';
import { ProgramsJSON } from '../types/program';
import { 
  BudgetsJSON, 
  FundingType
} from '../types/budget';
import promptSync from 'prompt-sync';
import { generateTransactionId } from '../lib/logging';

// Main configuration
const DATA_DIRECTORY = path.join(process.cwd(), 'src/data');
const BUDGET_TEXT_DIR = path.join(DATA_DIRECTORY, 'budget/text');
const DEPARTMENTS_FILE = path.join(DATA_DIRECTORY, 'departments.json');
const PROGRAMS_FILE = path.join(DATA_DIRECTORY, 'programs.json');
const BUDGETS_FILE = path.join(DATA_DIRECTORY, 'budgets.json');

// Generate a transaction ID for this processing session
const TRANSACTION_ID = generateTransactionId();

// Create log file for this processing session
const LOG_DIR = path.join(process.cwd(), 'src/logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
const LOG_FILE = path.join(LOG_DIR, `process_budgets_${TRANSACTION_ID}.log`);

// Initialize log file
fs.writeFileSync(LOG_FILE, `Process Budgets Log - ${new Date().toISOString()}\n`, 'utf8');

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  const maxLength = Math.max(str1.length, str2.length);
  const distance = matrix[str2.length][str1.length];
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

// Logging function that writes ONLY to log file (not console)
function log(message: string, isSubStep = false, isError = false): void {
  const timestamp = new Date().toISOString();
  const level = isError ? 'ERROR' : 'INFO';
  const prefix = isSubStep ? '  - ' : '• ';
  const logEntry = `[${level}] [${timestamp}] ${prefix}${message}\n`;
  
  // Write only to log file, not console
  fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
}

// User interaction logging - also only to log file
function logUser(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[USER] [${timestamp}] ${message}\n`;
  
  // Write only to log file, not console
  fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
}

// Console output function for user prompts and interaction (console only)
function consoleOutput(message: string): void {
  console.log(message);
}

// Statistics tracking
interface ProcessingStats {
  totalFiles: number;
  successfulFiles: number;
  skippedFiles: number;
  errorFiles: number;
  departmentsFound: number;
  departmentsMatched: number;
  programsFound: number;
  programsUpdated: number;
  budgetAllocationsAdded: number;
  budgetAllocationsOverwritten: number;
}

const stats: ProcessingStats = {
  totalFiles: 0,
  successfulFiles: 0,
  skippedFiles: 0,
  errorFiles: 0,
  departmentsFound: 0,
  departmentsMatched: 0,
  programsFound: 0,
  programsUpdated: 0,
  budgetAllocationsAdded: 0,
  budgetAllocationsOverwritten: 0
};

// Import prompt-sync
const promptUser = promptSync({ sigint: true });

/**
 * Main function to orchestrate the budget text processing
 */
async function main() {
  try {
    // Step 1: Initial Setup
    log('1. Initial Setup');
    
    // Check for force reprocessing flag
    const forceReprocess = process.argv.includes('--force');
    if (forceReprocess) {
      log('Force reprocessing flag detected. Will reprocess all files.', true);
    }
    
    // Step 1a: Load JSON files
    log('1a. Loading data files', true);
    const departmentsData = await loadJsonFile<DepartmentsJSON>(DEPARTMENTS_FILE);
    const programsData = await loadJsonFile<ProgramsJSON>(PROGRAMS_FILE);
    const budgetsData = await loadJsonFile<BudgetsJSON>(BUDGETS_FILE);
    
    // Initialize processedFiles tracking if not present
    if (!budgetsData.processedFiles) {
      budgetsData.processedFiles = [];
    }
    if (!budgetsData.lastProcessedFile) {
      budgetsData.lastProcessedFile = null;
    }
    if (!budgetsData.lastProcessedTimestamp) {
      budgetsData.lastProcessedTimestamp = null;
    }
    
    // Step 1c: Check for force reprocessing and clear processedFiles if needed
    if (forceReprocess) {
      log('1c. Clearing processed files history for force reprocessing', true);
      budgetsData.processedFiles = [];
      budgetsData.lastProcessedFile = null;
      budgetsData.lastProcessedTimestamp = null;
    }
    
    log(`Loaded departments.json with ${departmentsData.departments.length} departments`, true);
    log(`Loaded programs.json with ${programsData.programs.length} programs`, true);
    log(`Loaded budgets.json with ${budgetsData.budget.length} organizational budgets`, true);
    log(`Previously processed files: ${budgetsData.processedFiles.length}`, true);
    
    // Step 1b: Setup logging and statistics tracking
    log('1b. Logging and statistics tracking setup complete', true);
    
    // Step 2: Budget Text File Scanning and Section Identification
    log('2. Budget Text File Scanning and Section Identification');
    
    // Step 2a: Scan budget data directory
    log('2a. Scanning budget text files', true);
    const textFiles = await scanBudgetTextDirectory();
    log(`Found ${textFiles.length} budget text files to process`, true);
    
    // Filter out already processed files unless force reprocessing
    const filesToProcess = textFiles.filter(file => {
      const fileName = path.basename(file);
      if (!forceReprocess && budgetsData.processedFiles && budgetsData.processedFiles.includes(fileName)) {
        log(`Skipping ${fileName} - already processed`, true);
        return false;
      }
      return true;
    });
    
    log(`Files to process: ${filesToProcess.length} (${textFiles.length - filesToProcess.length} skipped)`, true);
    
    // Step 2b: Process each budget file
    log('2b. Processing budget text files', true);
    for (const file of filesToProcess) {
      await processBudgetFile(file, departmentsData, programsData, budgetsData);
    }
    
    // Step 6: Results Summary and Final Data Persistence
    log('6. Results Summary and Final Data Persistence');
    
    // Step 6a: Save updated data
    log('6a. Saving updated JSON files', true);
    await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
    await saveJsonFile(PROGRAMS_FILE, programsData);
    await saveJsonFile(BUDGETS_FILE, budgetsData);
    
    // Step 6b: Processing statistics
    log('6b. Processing Statistics:', true);
    log(`   - Total files: ${stats.totalFiles}`, true);
    log(`   - Successfully processed: ${stats.successfulFiles}`, true);
    log(`   - Skipped: ${stats.skippedFiles}`, true);
    log(`   - Errors: ${stats.errorFiles}`, true);
    log(`   - Departments found: ${stats.departmentsFound}`, true);
    log(`   - Departments matched: ${stats.departmentsMatched}`, true);
    log(`   - Programs found: ${stats.programsFound}`, true);
    log(`   - Programs updated: ${stats.programsUpdated}`, true);
    log(`   - Budget allocations added: ${stats.budgetAllocationsAdded}`, true);
    log(`   - Budget allocations overwritten: ${stats.budgetAllocationsOverwritten}`, true);
    
    // Step 6c: Log file location
    log(`6c. Log file: ${TRANSACTION_ID}.log`, true);
    log('Processing completed successfully');
    
  } catch (error: any) {
    log(`Critical error: ${error.message}`, false, true);
    log(error.stack, true, true);
    throw error;
  }
}

/**
 * Load JSON file and parse its content
 */
async function loadJsonFile<T>(filePath: string): Promise<T> {
  try {
    log(`Loading file: ${filePath}`, true);
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error: any) {
    log(`Error loading file ${filePath}: ${error.message}`, true, true);
    throw error;
  }
}

/**
 * Save JSON file with formatted output
 */
async function saveJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    log(`Saving file: ${filePath}`, true);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    log(`File saved successfully: ${filePath}`, true);
  } catch (error: any) {
    log(`Error saving file ${filePath}: ${error.message}`, true, true);
    throw error;
  }
}

/**
 * Scan the budget text directory for text files
 */
async function scanBudgetTextDirectory(): Promise<string[]> {
  try {
    const files = await fs.promises.readdir(BUDGET_TEXT_DIR);
    // Filter for .txt files
    return files
      .filter(file => file.endsWith('.txt'))
      .map(file => path.join(BUDGET_TEXT_DIR, file));
  } catch (error: any) {
    log(`Error scanning budget text directory: ${error.message}`, true, true);
    throw error;
  }
}

/**
 * Process a single budget text file
 */
async function processBudgetFile(
  filePath: string, 
  departmentsData: DepartmentsJSON,
  programsData: ProgramsJSON,
  budgetsData: BudgetsJSON
): Promise<void> {
  const fileName = path.basename(filePath);
  stats.totalFiles++;
  
  try {
    log(`Processing file: ${fileName}`);
    
    // Step 2b.i: Read and parse file content
    log('2b.i: Reading and parsing file content', true);
    
    // Step 2b.ii: Extract document year from filename
    log('2b.ii: Extracting document year from filename', true);
    // Expected format: XXXX_Department_Name_YYYY_budget.txt
    const documentYearMatch = fileName.match(/(\d{4})_budget\.txt$/);
    if (!documentYearMatch) {
      log(`Unable to extract document year from filename: ${fileName}`, true, true);
      stats.skippedFiles++;
      return;
    }
    
    const documentYear = parseInt(documentYearMatch[1], 10);
    log(`Extracted document year: ${documentYear}`, true);
    
    // Read file content
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    log(`File read: ${fileName} (${fileContent.length} bytes)`, true);
    
    // Step 2b.iii: Find all department sections
    log('2b.iii: Finding department sections by identifying expenditure markers', true);
    const departmentSections = findDepartmentSections(fileContent);
    log(`Found ${departmentSections.length} department sections`, true);
    
    // Step 3: Process each department section (with two-stage user approval for each section)
    log('3: Processing Department Sections (with two-stage user approval for each section)', true);
    let sectionNumber = 1;
    for (const section of departmentSections) {
      await processDepartmentSection(
        section, 
        documentYear, 
        departmentsData, 
        programsData, 
        budgetsData,
        sectionNumber,
        fileName
      );
      sectionNumber++;
    }
    
    // Mark file as processed
    if (!budgetsData.processedFiles) {
      budgetsData.processedFiles = [];
    }
    if (!budgetsData.processedFiles.includes(fileName)) {
      budgetsData.processedFiles.push(fileName);
    }
    budgetsData.lastProcessedFile = fileName;
    budgetsData.lastProcessedTimestamp = new Date().toISOString();
    
    log(`Successfully processed file: ${fileName}`, true);
    stats.successfulFiles++;
  } catch (error: any) {
    log(`Error processing file ${fileName}: ${error.message}`, true, true);
    log(error.stack, true, true);
    stats.errorFiles++;
  }
}

/**
 * Find all department sections in a budget text file
 */
function findDepartmentSections(fileContent: string): string[] {
  const sections: string[] = [];
  
  try {
    // Normalize line endings to \n to handle different file formats
    const normalizedContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split the file content by lines
    const lines = normalizedContent.split('\n');
    
    log(`Scanning ${lines.length} lines in file`, true);
    
    // Find all occurrences of expenditure markers - our reliable anchor points
    const expendituresMarkerIndices: number[] = [];
    const markerVariations: {[key: string]: number} = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match various forms of the expenditures marker
      if (
        line === '3-YR EXPENDITURES AND POSITIONS' || 
        line === '3-YEAR EXPENDITURES POSITIONS' ||
        line === '3-YEAR EXPENDITURES AND POSITIONS' ||
        line === '3-YR EXPENDITURES POSITIONS' ||
        line.match(/^3[\s\-](?:YR|YEAR)(?:\s+)EXPENDITURES(?:\s+(?:AND)?)?(?:\s+)POSITIONS$/)
      ) {
        expendituresMarkerIndices.push(i);
        markerVariations[line] = (markerVariations[line] || 0) + 1;
      }
    }
    
    // Log found marker variations
    log(`Found ${expendituresMarkerIndices.length} total expenditure marker occurrences:`, true);
    Object.entries(markerVariations).forEach(([variant, count]) => {
      log(`  - "${variant}": ${count} occurrences`, true);
    });
    
    // Extract sections based on markers
    for (let i = 0; i < expendituresMarkerIndices.length; i++) {
      const currentMarkerIndex = expendituresMarkerIndices[i];
      
      // Find department header by scanning backwards
      let startIndex = Math.max(0, currentMarkerIndex - 300);
      for (let j = currentMarkerIndex - 1; j >= startIndex; j--) {
        const line = lines[j].trim();
        const headerMatch = line.match(/^(\d{4})\s+(.*?)$/);
        if (headerMatch && !line.includes('- Continued')) {
          startIndex = j;
            break;
          }
        }
        
      // Determine end index
      const endIndex = i < expendituresMarkerIndices.length - 1 ?
        expendituresMarkerIndices[i + 1] : lines.length;
      
      const sectionLines = lines.slice(startIndex, endIndex);
      sections.push(sectionLines.join('\n'));
    }
    
    log(`Extracted ${sections.length} department sections total`, true);
    
    return sections;
  } catch (error: any) {
    log(`Error in findDepartmentSections: ${error.message}`, true, true);
    return sections;
  }
}

/**
 * Process a single department section with improved messaging and skip logic
 */
async function processDepartmentSection(
  sectionContent: string, 
  documentYear: number,
  departmentsData: DepartmentsJSON,
  programsData: ProgramsJSON,
  budgetsData: BudgetsJSON,
  sectionNumber: number = 0,
  fileName: string = ""
): Promise<void> {
  try {
    // Normalize line endings
    const normalizedContent = sectionContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Extract basic department information first (for header display)
    const orgCodeMatch = normalizedContent.match(/^\s*(\d{4})\s+(.*?)(?:\n)/);
    if (!orgCodeMatch) {
      log('Could not extract organization code and department name from section', true, true);
      return;
    }
    
    const orgCode = orgCodeMatch[1];
    const departmentName = orgCodeMatch[2].trim();
    
    // Display section header first
    consoleOutput('\n' + '='.repeat(80));
    consoleOutput(`FILE: ${fileName} | SECTION ${sectionNumber}`);
    consoleOutput('='.repeat(80));
    consoleOutput(`DEPARTMENT: ${departmentName} (${orgCode})`);
    
    // Log the section processing to file
    logUser(`Processing section ${sectionNumber}: ${departmentName} (${orgCode}) from file ${fileName}`);
    
    // Now start the detailed processing with proper logging
    log(`Processing section ${sectionNumber}`, true);
    
    // Step 3.a.i: Extract department information
    log('3.a.i: Extracting department information', true);
    
    // Extract department description (text between header and expenditure marker)
    const expenditureMarkerIndex = normalizedContent.search(/3[\s\-](?:YR|YEAR)[\s\-]*EXPENDITURES[\s\-]*(?:AND[\s\-]*)?POSITIONS/);
    let departmentDescription = '';
    
    if (expenditureMarkerIndex !== -1) {
      const headerEndIndex = normalizedContent.indexOf('\n');
      if (headerEndIndex !== -1 && headerEndIndex < expenditureMarkerIndex) {
        departmentDescription = normalizedContent
          .substring(headerEndIndex + 1, expenditureMarkerIndex)
          .trim()
          .replace(/\n{3,}/g, '\n\n')
          .replace(/[ \t]+/g, ' ');
      }
    }
    
    log(`Processing department: ${departmentName} (Org Code: ${orgCode})`, true);
    if (departmentDescription) {
      log(`Department description extracted: ${departmentDescription.substring(0, 100)}...`, true);
    }
    stats.departmentsFound++;
    
    // Step 3.a.ii: Match department with departments.json
    log('3.a.ii: Matching department with departments.json', true);
    
    let matchedDepartment = departmentsData.departments.find(
      d => d.organizationalCode === orgCode
    );
    
    let matchConfidence = 0;
    let newDepartmentCreated = false;
    let descriptionUpdated = false;
    
    if (!matchedDepartment) {
      log(`No direct match by org code for ${orgCode}, trying name matching`, true);
      const matchResult = findDepartmentMatches(departmentName, departmentsData.departments, orgCode);
      
      if (matchResult.bestMatch && matchResult.bestMatch.score >= 90) {
        matchedDepartment = matchResult.bestMatch.department;
        matchConfidence = matchResult.bestMatch.score;
        log(`Matched department: ${matchedDepartment.name} (${matchConfidence}% confidence)`, true);
        stats.departmentsMatched++;
      } else {
        // Handle new department creation
        log(`No reliable match found for department "${departmentName}" (Org Code: ${orgCode})`, true);
        
        consoleOutput('\n' + '='.repeat(80));
        consoleOutput(`NEW DEPARTMENT FOUND`);
        consoleOutput('='.repeat(80));
        consoleOutput(`DEPARTMENT: ${departmentName} (${orgCode})`);
        consoleOutput(`FILE: ${fileName} | SECTION ${sectionNumber}`);
        consoleOutput('\nGeneral rule: Departments must have headcount to be added to the workforce hierarchy.');
        consoleOutput('- budget_status = "active" means the department has headcount');
        consoleOutput('- budget_status = "inactive" means the department has no headcount');
        consoleOutput('\nOptions:');
        consoleOutput('a) Create new department with budget_status = "active" (has headcount)');
        consoleOutput('b) Create new department with budget_status = "inactive" (no headcount)');
        consoleOutput('s) Skip this department');
        consoleOutput('\n' + '-'.repeat(80));
        
        const newDeptChoice = promptUser('Choose option (a/b/s): ').toLowerCase();
        logUser(`User selected new department option: ${newDeptChoice}`);
        
        if (newDeptChoice === 's') {
          consoleOutput('Skipping new department creation...');
          logUser('User chose to skip new department creation');
          return;
        } else if (newDeptChoice === 'a' || newDeptChoice === 'b') {
          const budgetStatus: BudgetStatus = newDeptChoice === 'a' ? 'active' : 'inactive';
          
          // Ask for parent_agency
          consoleOutput('\nPlease enter the parent agency for this department:');
          const parentAgency = promptUser('Parent agency: ').trim();
          logUser(`User entered parent agency: ${parentAgency}`);
          
          if (!parentAgency) {
            consoleOutput('Parent agency is required. Skipping department creation...');
            logUser('User did not provide parent agency - skipping department creation');
            return;
          }
          
          // Create new department record using RequiredDepartmentJSONFields interface
          const newDepartment: RequiredDepartmentJSONFields = {
            name: departmentName,
            canonicalName: departmentName,
            _slug: departmentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') as ValidSlug,
            aliases: [],
            keyFunctions: '', // Empty string as required by interface
            abbreviation: '',
            orgLevel: 2 as OrgLevel,
            parent_agency: parentAgency,
            budget_status: budgetStatus,
            organizationalCode: orgCode as organizationalCode,
            entityCode: null,
            spending: { yearly: {} as Record<FiscalYearKey, number | {}> },
            headCount: { yearly: {} as Record<AnnualYear, number | {}> },
            wages: { yearly: {} as Record<AnnualYear, number | {}> },
            _averageTenureYears: null,
            _averageSalary: null,
            _averageAge: null,
            tenureDistribution: { yearly: {} as Record<AnnualYear, TenureRange[]> },
            salaryDistribution: { yearly: {} as Record<AnnualYear, SalaryRange[]> },
            ageDistribution: { yearly: {} as Record<AnnualYear, AgeRange[]> },
            description: departmentDescription
          };
          
          departmentsData.departments.push(newDepartment as DepartmentData);
          matchedDepartment = newDepartment as DepartmentData;
          matchConfidence = 100;
          newDepartmentCreated = true;
          
          consoleOutput(`\n✓ Created new department: ${departmentName} (budget_status: ${budgetStatus}, parent_agency: ${parentAgency})`);
          log(`Created new department: ${departmentName} with budget_status: ${budgetStatus}, parent_agency: ${parentAgency}`, true);
          stats.departmentsMatched++;
          
          // Save the new department immediately
          await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
          log('Saved new department to departments.json', true);
        } else {
          consoleOutput('Invalid choice, skipping department...');
          return;
        }
      }
    } else {
      log(`Direct match by organizational code: ${matchedDepartment.name}`, true);
      stats.departmentsMatched++;
      matchConfidence = 100;
      
      // Step 3.a.iii: Compare descriptions and prompt for update if different
      if (departmentDescription) {
        log('3.a.iii: Comparing department descriptions', true);
        
        // Check if existing description is missing, empty, or blank
        const existingDesc = matchedDepartment.description || '';
        const hasExistingDescription = existingDesc.trim().length > 0;
        
        if (!hasExistingDescription) {
          // No existing description or it's empty/blank - mark for update
          log('No existing description found or description is empty/blank - will prompt in approval section', true);
          descriptionUpdated = true;
        } else {
          // Existing description exists - compare for differences
          // Normalize descriptions for comparison (remove extra whitespace, newlines)
          const normalizedExisting = existingDesc.replace(/\s+/g, ' ').trim();
          const normalizedExtracted = departmentDescription.replace(/\s+/g, ' ').trim();
          
          // Check if descriptions are significantly different (not just minor formatting)
          const similarity = calculateStringSimilarity(normalizedExisting, normalizedExtracted);
          log(`Description similarity: ${similarity}%`, true);
          
          if (similarity < 85) { // If less than 85% similar, mark for update
            log(`Significant difference in descriptions detected (${similarity}% similarity) - will prompt in approval section`, true);
            descriptionUpdated = true;
          } else {
            log('Descriptions are sufficiently similar, no update needed', true);
          }
        }
      }
    }
    
    // Extract program and budget data
    log('4.a: Extracting program descriptions', true);
    const programDescriptions = extractProgramDescriptions(normalizedContent);
    log(`Found ${programDescriptions.length} program descriptions`, true);
    
    log('4.b: Extracting budget allocations', true);
    const budgetData = extractBudgetAllocations(normalizedContent, orgCode);
    log(`Found ${budgetData ? budgetData.length : 0} budget allocations`, true);
    
    // Analyze budget allocations for new vs overwrite
    let budgetAnalysis = { newAllocations: 0, overwriteAllocations: 0, overwriteDetails: [] as string[] };
    if (budgetData && budgetData.length > 0) {
      budgetAnalysis = analyzeBudgetAllocations(budgetData, budgetsData);
    }
    
    // Check if there are any changes needed
    const hasDepartmentChanges = newDepartmentCreated || descriptionUpdated;
    const hasProgramBudgetChanges = programDescriptions.length > 0 || budgetData.length > 0;
    const hasAnyChanges = hasDepartmentChanges || hasProgramBudgetChanges;
    
    // Display results summary
    consoleOutput(`  Matched to: ${matchedDepartment.name} (${matchConfidence}% confidence)`);
    consoleOutput(`  Programs: ${programDescriptions.length} found`);
    
    // Show detailed budget allocation counts
    if (budgetData && budgetData.length > 0) {
      if (budgetAnalysis.overwriteAllocations > 0) {
        consoleOutput(`  Budget allocations: ${budgetAnalysis.newAllocations} new, ${budgetAnalysis.overwriteAllocations} will overwrite existing`);
      } else {
        consoleOutput(`  Budget allocations: ${budgetAnalysis.newAllocations} new`);
      }
    } else {
      consoleOutput(`  Budget allocations: none found`);
    }
    
    if (!hasAnyChanges) {
      consoleOutput('\n  ✓ Department already exists and is up-to-date');
      consoleOutput('  → No changes needed - skipping approval and moving to next section');
      log('No changes needed - skipping approval and moving to next section');
      return;
    }
    
    // FIRST APPROVAL: Department changes (departments.json)
    if (hasDepartmentChanges) {
      consoleOutput('\n' + '='.repeat(80));
      consoleOutput('DEPARTMENT CHANGES APPROVAL - Will update: departments.json');
      consoleOutput('='.repeat(80));
      if (newDepartmentCreated) {
        consoleOutput(`  ✓ Created new department: ${departmentName}`);
      }
      if (descriptionUpdated) {
        const existingDesc = matchedDepartment.description || '';
        const hasExistingDescription = existingDesc.trim().length > 0;
        
        if (!hasExistingDescription) {
          consoleOutput(`  - Add department description (currently missing/empty)`);
        } else {
          const normalizedExisting = existingDesc.replace(/\s+/g, ' ').trim();
          const normalizedExtracted = departmentDescription.replace(/\s+/g, ' ').trim();
          const similarity = calculateStringSimilarity(normalizedExisting, normalizedExtracted);
          consoleOutput(`  - Update department description (${similarity}% similarity with existing)`);
        }
        
        consoleOutput('\nEXISTING DESCRIPTION:');
        consoleOutput(`"${existingDesc || '(empty or missing)'}"`);
        consoleOutput('\nEXTRACTED DESCRIPTION:');
        consoleOutput(`"${departmentDescription}"`);
      }
      consoleOutput('\n' + '-'.repeat(80));
      
      let deptApproval = '';
      if (descriptionUpdated && !newDepartmentCreated) {
        // Only description update - provide more options
        deptApproval = promptUser('Approve department changes? (u=update description, k=keep existing, s=skip file): ').toLowerCase();
      } else {
        // New department or multiple changes - simpler approval
        deptApproval = promptUser('Approve department changes? (y/n/s) - y=yes, n=no, s=skip file: ').toLowerCase();
      }
      logUser(`User department approval response: ${deptApproval}`);
      
      if (deptApproval === 's') {
        logUser('User requested to skip file processing');
        throw new Error('User requested to skip file processing');
      } else if (deptApproval === 'n' || deptApproval === 'k') {
        if (deptApproval === 'k') {
          consoleOutput('Keeping existing description...');
          logUser('User chose to keep existing description');
          descriptionUpdated = false; // Reset the flag
        } else {
          consoleOutput('Skipping department changes...');
          logUser('User chose not to approve department changes');
        }
        // Continue to check for program/budget changes
      } else if (deptApproval === 'y' || deptApproval === 'u') {
        // Apply department changes
        if (descriptionUpdated) {
          matchedDepartment.description = departmentDescription;
        }
        consoleOutput('Saving department changes to departments.json...');
        await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
        consoleOutput('✓ Department changes saved');
        log('Department changes applied and saved', true);
      } else {
        consoleOutput('Invalid choice, skipping department changes...');
        logUser('User provided invalid choice for department changes');
      }
    }
    
    // SECOND APPROVAL: Program and budget changes (programs.json and budgets.json)
    if (hasProgramBudgetChanges) {
      consoleOutput('\n' + '='.repeat(80));
      consoleOutput('PROGRAM & BUDGET CHANGES APPROVAL - Will update: programs.json, budgets.json');
      consoleOutput('='.repeat(80));
      if (programDescriptions.length > 0) {
        consoleOutput(`  - Add ${programDescriptions.length} program descriptions to programs.json`);
      }
      if (budgetData && budgetData.length > 0) {
        if (budgetAnalysis.newAllocations > 0) {
          consoleOutput(`  - Add ${budgetAnalysis.newAllocations} new budget allocations to budgets.json`);
        }
        if (budgetAnalysis.overwriteAllocations > 0) {
          consoleOutput(`  - Overwrite ${budgetAnalysis.overwriteAllocations} existing budget allocations in budgets.json`);
          if (budgetAnalysis.overwriteDetails.length > 0) {
            consoleOutput('\n  OVERWRITE DETAILS:');
            budgetAnalysis.overwriteDetails.slice(0, 5).forEach(detail => {
              consoleOutput(`    ${detail}`);
            });
            if (budgetAnalysis.overwriteDetails.length > 5) {
              consoleOutput(`    ... and ${budgetAnalysis.overwriteDetails.length - 5} more`);
            }
          }
        }
      }
      consoleOutput('\n' + '-'.repeat(80));
      
      const progBudgetApproval = promptUser('Approve program & budget changes? (y/n/s) - y=yes, n=no, s=skip file: ').toLowerCase();
      logUser(`User program/budget approval response: ${progBudgetApproval}`);
      
      if (progBudgetApproval === 's') {
        logUser('User requested to skip file processing');
        throw new Error('User requested to skip file processing');
      } else if (progBudgetApproval !== 'y') {
        consoleOutput('Skipping program & budget changes...');
        logUser('User chose not to approve program/budget changes');
      } else {
        // Apply program and budget changes
        consoleOutput('Processing program & budget changes...');
        
        // Process programs
        if (programDescriptions.length > 0) {
          stats.programsFound += programDescriptions.length;
          for (const progDesc of programDescriptions) {
            updateProgramData(progDesc, programsData, fileName);
          }
          consoleOutput('✓ Program descriptions processed');
        }
        
        // Process budget data
        if (budgetData && budgetData.length > 0) {
          updateBudgetData(budgetData, budgetsData);
          consoleOutput('✓ Budget allocations processed');
        }
        
        // Save program and budget data
        consoleOutput('Saving changes to programs.json and budgets.json...');
        await saveJsonFile(PROGRAMS_FILE, programsData);
        await saveJsonFile(BUDGETS_FILE, budgetsData);
        consoleOutput('✓ Program & budget changes saved');
        log('Program and budget changes applied and saved', true);
      }
    }
    
    consoleOutput('Section processing complete\n');
    
  } catch (error: any) {
    log(`Error processing department section: ${error.message}`, true, true);
    if (error.message.includes('skip file')) {
      throw error;
    }
  }
}

/**
 * Extract program descriptions from section content
 */
function extractProgramDescriptions(sectionContent: string): Array<{ projectCode: string, name: string, description: string }> {
  const programs: Array<{ projectCode: string, name: string, description: string }> = [];
  
  try {
    const programDescriptionsIndex = sectionContent.indexOf('PROGRAM DESCRIPTIONS');
    if (programDescriptionsIndex === -1) {
      log('No "PROGRAM DESCRIPTIONS" section found', true);
      return programs;
    }
    
    const detailedExpendituresIndex = sectionContent.indexOf('DETAILED EXPENDITURES BY PROGRAM');
    if (detailedExpendituresIndex === -1) {
      log('No "DETAILED EXPENDITURES BY PROGRAM" section found', true);
      return programs;
    }
    
    log(`Found PROGRAM DESCRIPTIONS at index ${programDescriptionsIndex}`, true);
    log(`Found DETAILED EXPENDITURES BY PROGRAM at index ${detailedExpendituresIndex}`, true);
    
    const programDescriptionsText = sectionContent.substring(
      programDescriptionsIndex + 'PROGRAM DESCRIPTIONS'.length,
      detailedExpendituresIndex
    ).trim();
    
    // Simple extraction logic - can be enhanced later
    const programRegex = /\n(?=\d{4}(?:\d{3})?\s*[\s\-]+\s*[A-Z])/g;
    const programSections = programDescriptionsText.split(programRegex);
    
    for (let section of programSections) {
      section = section.trim();
      if (!section) continue;
      
      // Try to match program codes
      let match = section.match(/^(\d{4})\s*[\s\-]+\s*([^\n]+)/);
      let projectCode = '';
      let programName = '';
      
      if (match) {
        projectCode = match[1] + '000'; // Convert 4-digit to 7-digit
        programName = match[2].trim();
      } else {
        match = section.match(/^(\d{7})\s*[\s\-]+\s*([^\n]+)/);
        if (match) {
          projectCode = match[1];
          programName = match[2].trim();
        } else {
          continue;
        }
      }
      
      const headerEndIndex = section.indexOf('\n');
      if (headerEndIndex === -1) continue;
      
      let description = section.substring(headerEndIndex).trim();
      description = description.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
      
      if (projectCode && programName && description) {
        programs.push({ projectCode, name: programName, description });
      }
    }
    
    return programs;
  } catch (error: any) {
    log(`Error extracting program descriptions: ${error.message}`, true, true);
    return programs;
  }
}

/**
 * Extract budget allocations from section content
 */
function extractBudgetAllocations(
  sectionContent: string, 
  orgCode: string
): Array<{
  projectCode: string,
  organizationCode: string,
  fundingType: FundingType,
  fundCode: string,
  fundName: string,
  amount: number,
  fiscalYear: string
}> {
  const results: Array<{
    projectCode: string,
    organizationCode: string,
    fundingType: FundingType,
    fundCode: string,
    fundName: string,
    amount: number,
    fiscalYear: string
  }> = [];
  
  try {
    const detailedExpendituresIndex = sectionContent.indexOf('DETAILED EXPENDITURES BY PROGRAM');
    if (detailedExpendituresIndex === -1) {
      log('No "DETAILED EXPENDITURES BY PROGRAM" section found in budget extraction', true);
      return results;
    }
    
    log(`Found DETAILED EXPENDITURES BY PROGRAM at index ${detailedExpendituresIndex} in budget extraction`, true);
    
    const expendituresText = sectionContent.substring(detailedExpendituresIndex);
    
    // Find fiscal years pattern
    const fiscalYearsMatch = expendituresText.match(/(\d{4}-\d{2})[*\s\n]+(\d{4}-\d{2})[*\s\n]+(\d{4}-\d{2})/);
    if (!fiscalYearsMatch) {
      log('No fiscal years pattern found in expenditures section', true);
      // Add debug: show the first 500 characters to understand the format
      log(`Expenditures text preview: ${expendituresText.substring(0, 500)}`, true);
      return results;
    }
    
    const fiscalYears = [fiscalYearsMatch[1], fiscalYearsMatch[2], fiscalYearsMatch[3]];
    log(`Found fiscal years: ${fiscalYears.join(', ')}`, true);
    
    // Find requirements section
    const requirementsIndex = expendituresText.indexOf('PROGRAM REQUIREMENTS', fiscalYearsMatch.index);
    const subrequirementsIndex = expendituresText.indexOf('SUBPROGRAM REQUIREMENTS', fiscalYearsMatch.index);
    
    let requirementsSectionStart = -1;
    if (requirementsIndex !== -1) {
      requirementsSectionStart = requirementsIndex + 'PROGRAM REQUIREMENTS'.length;
      log(`Found PROGRAM REQUIREMENTS at index ${requirementsIndex}`, true);
    } else if (subrequirementsIndex !== -1) {
      requirementsSectionStart = subrequirementsIndex + 'SUBPROGRAM REQUIREMENTS'.length;
      log(`Found SUBPROGRAM REQUIREMENTS at index ${subrequirementsIndex}`, true);
    } else {
      log('No PROGRAM REQUIREMENTS or SUBPROGRAM REQUIREMENTS found', true);
      return results;
    }
    
    const budgetDataText = expendituresText.substring(requirementsSectionStart).trim();
    log(`Budget data text preview (first 500 chars): ${budgetDataText.substring(0, 500)}`, true);
    const lines = budgetDataText.split('\n');
    log(`Budget data has ${lines.length} lines to process`, true);
    
    let currentProjectCode = '';
    let currentFundingType: FundingType | null = null;
    let currentFundCode = '';
    let currentFundName = '';
    let amounts: number[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      log(`Processing line ${i}: "${line}"`, true);
      
      // Check for funding type
      if (line === 'State Operations:') {
        currentFundingType = 0;
        log(`Found funding type: State Operations (0)`, true);
        continue;
      } else if (line === 'Local Assistance:') {
        currentFundingType = 1;
        log(`Found funding type: Local Assistance (1)`, true);
        continue;
      }
      
      // Check for fund code FIRST when funding type is set (prioritize over program code)
      if (currentFundingType !== null) {
        const fundCodeMatch = line.match(/^(\d{4,5})$/);
        if (fundCodeMatch && currentProjectCode && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !nextLine.match(/^\d+$/) && !nextLine.match(/^\$/) && nextLine.match(/[A-Za-z]/)) {
            currentFundCode = fundCodeMatch[1];
            currentFundName = nextLine;
            log(`Found fund code: ${currentFundCode}, fund name: ${currentFundName}`, true);
            i++; // Skip the fund name line
            amounts = [];
            continue;
          }
        }
      }
      
      // Check for program code (only when no funding type set, or when we couldn't match as fund code)
      if (!currentFundingType) {
        const programMatch = line.match(/^(\d{4})$/);
        if (programMatch && i + 1 < lines.length) {
          const programNameLine = lines[i + 1].trim();
          if (programNameLine && !programNameLine.match(/^\d+$/)) {
            currentProjectCode = programMatch[1] + '000';
            log(`Found program code: ${programMatch[1]} -> project code: ${currentProjectCode}`, true);
            i++; // Skip the name line
            continue;
          }
        }
        
        const subprogramMatch = line.match(/^(\d{7})$/);
        if (subprogramMatch && i + 1 < lines.length) {
          const subprogramNameLine = lines[i + 1].trim();
          if (subprogramNameLine && !subprogramNameLine.match(/^\d+$/)) {
            currentProjectCode = subprogramMatch[1];
            log(`Found subprogram code: ${subprogramMatch[1]}`, true);
            i++; // Skip the name line
            continue;
          }
        }
      }
      
      // Check for amounts
      const amountMatch = line.match(/^\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)$/);
      if (amountMatch && currentProjectCode && currentFundingType !== null && currentFundCode) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        
        if (!isNaN(amount)) {
          amounts.push(amount);
          log(`Found amount: $${amount} (total amounts so far: ${amounts.length})`, true);
          
          if (amounts.length === 3) {
            log(`Processing 3 amounts for project ${currentProjectCode}, fund ${currentFundCode}`, true);
            for (let j = 0; j < 3; j++) {
              results.push({
                projectCode: currentProjectCode,
                organizationCode: orgCode,
                fundingType: currentFundingType,
                fundCode: currentFundCode,
                fundName: currentFundName,
                amount: amounts[j],
                fiscalYear: fiscalYears[j]
              });
              
              log(`Added allocation: ${currentProjectCode}, ${fiscalYears[j]}, $${amounts[j]}`, true);
            }
            
            amounts = [];
            currentFundCode = '';
            currentFundName = '';
          }
        }
      }
    }
    
    log(`Total budget allocations extracted: ${results.length}`, true);
    return results;
  } catch (error: any) {
    log(`Error extracting budget allocations: ${error.message}`, true, true);
    return results;
  }
}

/**
 * Update program data in programs.json
 */
function updateProgramData(
  programData: { projectCode: string, name: string, description: string },
  programsData: ProgramsJSON,
  fileName: string
): void {
  let program = programsData.programs.find(p => p.projectCode === programData.projectCode);
  
  if (!program) {
    program = {
      projectCode: programData.projectCode,
      name: programData.name,
      programDescriptions: []
    };
    programsData.programs.push(program);
    log(`Added new program: ${program.name} (${program.projectCode})`, true);
  }
  
  const existingDescIndex = program.programDescriptions.findIndex(
    desc => desc.description === programData.description
  );
  
  if (existingDescIndex === -1) {
    program.programDescriptions.push({
      description: programData.description,
      source: fileName
    });
    log(`Added new description for program: ${program.name}`, true);
    stats.programsUpdated++;
  }
  
  if (program.name !== programData.name) {
    log(`Updating program name from "${program.name}" to "${programData.name}"`, true);
    program.name = programData.name;
  }
}

/**
 * Update budget data in budgets.json with overwrite logic
 */
function updateBudgetData(
  budgetAllocations: Array<{
    projectCode: string,
    organizationCode: string,
    fundingType: FundingType,
    fundCode: string,
    fundName: string,
    amount: number,
    fiscalYear: string
  }>,
  budgetsData: BudgetsJSON
): void {
  for (const allocation of budgetAllocations) {
    const fiscalYear = parseInt(allocation.fiscalYear.split('-')[0], 10);
    
    let orgBudget = budgetsData.budget.find(b => b.code === allocation.organizationCode);
    
    if (!orgBudget) {
      orgBudget = {
        code: allocation.organizationCode,
        fiscalYear: []
      };
      budgetsData.budget.push(orgBudget);
      log(`Created new organizational budget for ${allocation.organizationCode}`, true);
    }
    
    let fiscalYearData = orgBudget.fiscalYear.find(fy => fy.year === fiscalYear);
    
    if (!fiscalYearData) {
      fiscalYearData = {
        year: fiscalYear,
        projectCode: []
      };
      orgBudget.fiscalYear.push(fiscalYearData);
      log(`Created new fiscal year ${fiscalYear} for org ${allocation.organizationCode}`, true);
    }
    
    let projectCodeData = fiscalYearData.projectCode.find(pc => pc.code === allocation.projectCode);
    
    if (!projectCodeData) {
      projectCodeData = {
        code: allocation.projectCode,
        fundingType: []
      };
      fiscalYearData.projectCode.push(projectCodeData);
      log(`Created new project code ${allocation.projectCode} for org ${allocation.organizationCode}, year ${fiscalYear}`, true);
    }
    
    let fundingTypeData = projectCodeData.fundingType.find(ft => ft.type === allocation.fundingType);
    
    if (!fundingTypeData) {
      fundingTypeData = {
        type: allocation.fundingType,
        fundCode: []
      };
      projectCodeData.fundingType.push(fundingTypeData);
      log(`Created new funding type ${allocation.fundingType} for project ${allocation.projectCode}`, true);
    }
    
    let fundAllocation = fundingTypeData.fundCode.find(fc => fc.code === allocation.fundCode);
    
    if (!fundAllocation) {
      // New fund allocation
      fundAllocation = {
        code: allocation.fundCode,
        count: 1,
        amount: allocation.amount
      };
      fundingTypeData.fundCode.push(fundAllocation);
      stats.budgetAllocationsAdded++;
      log(`Added new fund allocation for ${allocation.organizationCode}-${allocation.projectCode}-${allocation.fundCode}: $${allocation.amount}`, true);
    } else {
      // Existing fund allocation - overwrite with new data
      const oldAmount = fundAllocation.amount;
      const oldCount = fundAllocation.count;
      
      fundAllocation.amount = allocation.amount;
      fundAllocation.count = 1; // Reset count to 1 for the new data
      
      stats.budgetAllocationsOverwritten++;
      
      const overwriteMessage = `Overwritten fund allocation for ${allocation.organizationCode}-${allocation.projectCode}-${allocation.fundCode}: $${oldAmount} (count: ${oldCount}) → $${allocation.amount} (count: 1)`;
      log(overwriteMessage, true);
      consoleOutput(`  ⚠️  ${overwriteMessage}`);
    }
  }
}

/**
 * Analyze budget allocations to determine which will be new vs overwritten
 */
function analyzeBudgetAllocations(
  budgetAllocations: Array<{
    projectCode: string,
    organizationCode: string,
    fundingType: FundingType,
    fundCode: string,
    fundName: string,
    amount: number,
    fiscalYear: string
  }>,
  budgetsData: BudgetsJSON
): { newAllocations: number; overwriteAllocations: number; overwriteDetails: string[] } {
  let newAllocations = 0;
  let overwriteAllocations = 0;
  const overwriteDetails: string[] = [];
  
  for (const allocation of budgetAllocations) {
    const fiscalYear = parseInt(allocation.fiscalYear.split('-')[0], 10);
    
    const orgBudget = budgetsData.budget.find(b => b.code === allocation.organizationCode);
    if (!orgBudget) {
      newAllocations++;
      continue;
    }
    
    const fiscalYearData = orgBudget.fiscalYear.find(fy => fy.year === fiscalYear);
    if (!fiscalYearData) {
      newAllocations++;
      continue;
    }
    
    const projectCodeData = fiscalYearData.projectCode.find(pc => pc.code === allocation.projectCode);
    if (!projectCodeData) {
      newAllocations++;
      continue;
    }
    
    const fundingTypeData = projectCodeData.fundingType.find(ft => ft.type === allocation.fundingType);
    if (!fundingTypeData) {
      newAllocations++;
      continue;
    }
    
    const fundAllocation = fundingTypeData.fundCode.find(fc => fc.code === allocation.fundCode);
    if (!fundAllocation) {
      newAllocations++;
    } else {
      overwriteAllocations++;
      overwriteDetails.push(
        `${allocation.organizationCode}-${allocation.projectCode}-${allocation.fundCode} (${allocation.fiscalYear}): $${fundAllocation.amount} → $${allocation.amount}`
      );
    }
  }
  
  return { newAllocations, overwriteAllocations, overwriteDetails };
}

// Start the script execution
main().then(() => {
  const finalMessage = `Processing completed successfully - logs written to: ${LOG_FILE}`;
  consoleOutput(finalMessage);
  log('Processing completed successfully');
}).catch((error: any) => {
  const errorMessage = `Error: ${error.message}`;
  consoleOutput(errorMessage);
  log(`Unhandled error: ${error.message}`, false, true);
  log(error.stack, true, true);
  process.exit(1);
});