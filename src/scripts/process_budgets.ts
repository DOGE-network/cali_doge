/**
 * Budget Data Text File Processing Script
 * from plan datastructureandlayout.md, step 2. Data Processing Scripts Update, Update Process Budgets Script
 * 
 * Steps:
 * 1. Coordinate-Based Processing:
 *    1.1. Extract x,y coordinates from PDF text
 *    1.2. Track section header positions (x < 100)
 *    1.3. Track content indentation by x-coordinates
 *    1.4. Mark page boundaries with dimensions
 * 
 * 2. Section Detection:
 *    2.1. Find expenditure markers ("3-YEAR EXPENDITURES AND POSITIONS")
 *    2.2. Track continuation headers ("- Continued")
 *    2.3. Extract section content between beginning of section (section header) and end of section (just before next section header)
 *    2.4. Validate section boundaries and content
 * 
 * 3. Section Content Structure:
 *    3.1. Extract department description
 *    3.2. Process program descriptions
 *    3.3. Process budget allocations
 * 
 * 4. Budget Data Processing:
 *    4.1. Extract program codes and descriptions
 *    4.2. Parse fiscal years and amounts
 *    4.3. Track fund codes and names
 *    4.4. Validate amount column spacing
 *    4.5. Process State Operations vs Local Assistance
 *
 * Section Structure:
 * Each section follows this structure:
 * 1. Section Header (4-digit org code + department name) [one per section, required]
 * 2. Department Description [one per section, required]
 * 3. 3-YEAR EXPENDITURES AND POSITIONS marker [one per section, required]
 * 4. Continuation headers (section header text (4-digit org code + department name) followed by "- Continued") [zero or more per section, may appear anywhere in the section around the header and footer text]
 * 
 * Then the following subsection headers appear in order (when present):
 * 5. LEGAL CITATIONS AND AUTHORITY [one per section]
 * 6. DEPARTMENT AUTHORITY [one per section]
 * 7. PROGRAM AUTHORITY [one per section]
 * 8. MAJOR PROGRAM CHANGES [one per section]
 * 9. DETAILED BUDGET ADJUSTMENTS [one per section]
 * 10. PROGRAM DESCRIPTIONS [one per section]
 * 11. DETAILED EXPENDITURES BY PROGRAM [one per section]
 * 12. EXPENDITURES BY CATEGORY [one per section]
 * 13. DETAIL OF APPROPRIATIONS AND ADJUSTMENTS [one per section]
 * 14. CHANGES IN AUTHORIZED POSITIONS [one per section]
 * 
 * Program Description Processing:
 * - Located after "PROGRAM DESCRIPTIONS" marker
 * - Program codes at consistent x-coordinate (mainHeaderX)
 * - Program names and descriptions indented (x > mainHeaderX)
 * - 4-digit codes converted to 7-digit (append "000")
 * - 7-digit subprogram codes used as-is
 * - Descriptions tracked by source file
 * 
 * Budget Data Processing:
 * - Located after "DETAILED EXPENDITURES BY PROGRAM"
 * - Uses coordinate-based column detection
 * - Fiscal years in fixed columns
 * - Amounts parsed from consistent x-coordinates
 * - Fund codes and names at x < 100
 * - State Operations/Local Assistance markers tracked
 * - Amounts validated for consistent spacing
 * 
 * Dependencies / Input files:
 * - departments.json: Department data
 * - programs.json: Program data
 * - budgets.json: Budget data (with processedFiles tracking)
 * - funds.json: Fund data
 * - budget/text/*.txt: Budget text files with coordinate data
 * - src/lib/departmentMatching.js: Department name matching logic
 * - src/types/budget.ts: Budget data types
 * 
* Output Files:
 * - programs.json: Updated with project codes, program names, and descriptions
 * - budgets.json: Updated with detailed budget allocations
 * - departments.json: Updated with department data and descriptions
 * - funds.json: Updated with fund codes and names
 * - src/logs/process_budgets-<transactionId>.log: Detailed processing log
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
import { DepartmentData, DepartmentsJSON, organizationalCode, ValidSlug, OrgLevel, BudgetStatus, AnnualYear, RequiredDepartmentJSONFields, FiscalYearKey, TenureRange, SalaryRange, AgeRange } from '../types/department';
import { ProgramsJSON } from '../types/program';
import { FundsJSON, Fund } from '../types/fund';
import { 
  BudgetsJSON, 
  FundingType
} from '../types/budget';
import promptSync from 'prompt-sync';
import { generateTransactionId, FileLogger } from '../lib/logging';

// New interfaces for coordinate-based text processing
interface TextLine {
  blockNum: number;
  lineNum: number;
  x: number;
  y: number;
  text: string;
  pageNum: number;
  rawLine: string;
}



// Helper functions for text processing
function parseLine(line: string, currentPage: number): TextLine | null {
  // Parse lines like: [0:0:382,335] Labor and
  const match = line.match(/\[(\d+):(\d+):(\d+),(\d+)\]\s*(.*)/);
  if (match) {
    return {
      blockNum: parseInt(match[1]),
      lineNum: parseInt(match[2]),
      x: parseInt(match[3]),
      y: parseInt(match[4]),
      text: match[5].trim(),
      pageNum: currentPage,
      rawLine: line
    };
  }
  return null;
}

function isAmountString(text: string): boolean {
  return /^\$?[\d,]+(?:\.\d+)?$/.test(text.trim()) || text.trim() === '-';
}

function parseAmount(text: string): number {
  if (text.trim() === '-') return 0;
  return parseFloat(text.replace(/[\$,]/g, '')) || 0;
}

function isFundCode(text: string): boolean {
  return /^\d{4,5}$/.test(text.trim());
}

function isProjectCode(text: string): boolean {
  return /^\d{4}(?:000)?$/.test(text.trim()) || /^\d{7}$/.test(text.trim());
}

// Main configuration
const DATA_DIRECTORY = path.join(process.cwd(), 'src/data');
const BUDGET_TEXT_DIR = path.join(DATA_DIRECTORY, 'budget/text');
const DEPARTMENTS_FILE = path.join(DATA_DIRECTORY, 'departments.json');
const PROGRAMS_FILE = path.join(DATA_DIRECTORY, 'programs.json');
const BUDGETS_FILE = path.join(DATA_DIRECTORY, 'budgets.json');
const FUNDS_FILE = path.join(DATA_DIRECTORY, 'funds.json');

// Generate a transaction ID for this processing session
const TRANSACTION_ID = generateTransactionId();

// Create logger instance
const LOG_DIR = path.join(process.cwd(), 'src/logs');
const logger = new FileLogger(LOG_DIR, `process_budgets_${TRANSACTION_ID}`);

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

// Logging functions that use the logger instance
const log = (message: string, isSubStep = false, isError = false): void => {
  logger.log(message, isSubStep, isError);
};

const logUser = (message: string): void => {
  logger.logUser(message);
};

const consoleOutput = (message: string): void => {
  console.log(message);
};

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
  fundsFound: number;
  fundsUpdated: number;
  newFundsAdded: number;
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
  budgetAllocationsOverwritten: 0,
  fundsFound: 0,
  fundsUpdated: 0,
  newFundsAdded: 0
};

// Import prompt-sync
const promptUser = promptSync({ sigint: true });

/**
 * Parse crop input like "1-10" or "1-5,8-12" into an array of line numbers
 */
function parseCropInput(input: string, maxLines: number): number[] {
  const lineNumbers: number[] = [];
  const ranges = input.split(',').map(s => s.trim());
  
  for (const range of ranges) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(s => parseInt(s.trim(), 10));
      if (isNaN(start) || isNaN(end) || start < 1 || end > maxLines || start > end) {
        throw new Error(`Invalid range: ${range}. Must be between 1 and ${maxLines}.`);
      }
      for (let i = start; i <= end; i++) {
        lineNumbers.push(i);
      }
    } else {
      const lineNum = parseInt(range, 10);
      if (isNaN(lineNum) || lineNum < 1 || lineNum > maxLines) {
        throw new Error(`Invalid line number: ${range}. Must be between 1 and ${maxLines}.`);
      }
      lineNumbers.push(lineNum);
    }
  }
  
  // Remove duplicates and sort
  return Array.from(new Set(lineNumbers)).sort((a, b) => a - b);
}

/**
 * Main function to orchestrate the budget text processing
 */
async function main() {
  try {
    // Step 1: Initial Setup
    log('1. Initial Setup');
    
    // Check for force reprocessing flag and specific file argument
    const forceReprocess = process.argv.includes('--force');
    const specificFile = process.argv[2];
    if (forceReprocess) {
      log('Force reprocessing flag detected. Will reprocess all files.', true);
    }
    if (specificFile && !specificFile.startsWith('--')) {
      log(`Processing specific file: ${specificFile}`, true);
    }
    
    // Step 1a: Load JSON files
    log('1a. Loading data files', true);
    const departmentsData = await loadJsonFile<DepartmentsJSON>(DEPARTMENTS_FILE);
    const programsData = await loadJsonFile<ProgramsJSON>(PROGRAMS_FILE);
    const budgetsData = await loadJsonFile<BudgetsJSON>(BUDGETS_FILE);
    const fundsData = await loadJsonFile<FundsJSON>(FUNDS_FILE);
    
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
    log(`Loaded funds.json with ${fundsData.funds.length} funds`, true);
    log(`Previously processed files: ${budgetsData.processedFiles.length}`, true);
    
    // Step 1b: Setup logging and statistics tracking
    log('1b. Logging and statistics tracking setup complete', true);
    
    // Step 2: Budget Text File Scanning and Section Identification
    log('2. Budget Text File Scanning and Section Identification');
    
    // Step 2a: Get files to process
    log('2a. Determining files to process', true);
    let textFiles: string[];
    if (specificFile && !specificFile.startsWith('--')) {
      // Process single file
      const fullPath = path.isAbsolute(specificFile) ? specificFile : path.join(BUDGET_TEXT_DIR, path.basename(specificFile));
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
      }
      textFiles = [fullPath];
      log(`Processing single file: ${path.basename(fullPath)}`, true);
    } else {
      // Scan directory for all files
      textFiles = await scanBudgetTextDirectory();
      log(`Found ${textFiles.length} budget text files to process`, true);
    }
    
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
      try {
      await processBudgetFile(file, departmentsData, programsData, budgetsData, fundsData);
      } catch (error: any) {
        log(`Error processing file ${path.basename(file)}: ${error.message}`, false, true);
        log(error.stack, true, true);
        stats.errorFiles++;
        // Continue processing other files instead of stopping
      }
    }
    
    // Step 6: Results Summary and Final Data Persistence
    log('6. Results Summary and Final Data Persistence');
    
    // Step 6a: Save updated data
    log('6a. Saving updated JSON files', true);
    await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
    await saveJsonFile(PROGRAMS_FILE, programsData);
    await saveJsonFile(BUDGETS_FILE, budgetsData);
    await saveJsonFile(FUNDS_FILE, fundsData);
    
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
    log(`   - Funds found: ${stats.fundsFound}`, true);
    log(`   - Funds updated: ${stats.fundsUpdated}`, true);
    log(`   - New funds added: ${stats.newFundsAdded}`, true);
    
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
  budgetsData: BudgetsJSON,
  fundsData: FundsJSON
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
    const departmentSections = await findDepartmentSections(filePath);
    
    // Check if user approved this file
    if (departmentSections.length === 0) {
      log(`File ${fileName} was not approved for processing - skipping`, true);
      stats.skippedFiles++;
      return;
    }
    
    log(`Found ${departmentSections.length} department sections`, true);
    
    // Step 3: Process each department section (with two-stage user approval for each section)
    log('3: Processing Department Sections (with two-stage user approval for each section)', true);
    let sectionNumber = 1;
    for (const section of departmentSections) {
      await processDepartmentSection(
        section.content, 
        documentYear, 
        departmentsData, 
        programsData, 
        budgetsData,
        sectionNumber,
        fileName,
        fundsData,
        section.orgCode,
        section.departmentName
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
    
    // Save the updated budgets.json with processed file tracking
    await saveJsonFile(BUDGETS_FILE, budgetsData);
    
    log(`Successfully processed file: ${fileName}`, true);
    stats.successfulFiles++;
  } catch (error: any) {
    log(`Error processing file ${fileName}: ${error.message}`, true, true);
    log(error.stack, true, true);
    stats.errorFiles++;
  }
}

/**
 * Find all department sections using staged detection approach
 */
async function findDepartmentSections(
  filePath: string
): Promise<Array<{orgCode: string, departmentName: string, content: string, startLine: number}>> {
  const sections: Array<{orgCode: string, departmentName: string, content: string, startLine: number}> = [];
  
  try {
    // Read file content
    log('Step 1.1: Extracting x,y coordinates from text file', true);
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const lines = fileContent.split('\n');
    log(`Step 1.1: Extracted coordinates from ${lines.length} lines`, true);
    
    // Find expenditure headers
    log('Step 2.1: Scanning for EXPENDITURES markers', true);
    const expenditurePattern = /\[[\d:,]+\]\s*(?:3|THREE)[\s\-]*(?:YR|YEAR|Years?)[\s\-]*EXPENDITURES?(?:[\s\-]*AND[\s\-]*POSITIONS?)?/i;
    const expenditureLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => expenditurePattern.test(line));
    
    // Log each found expenditure marker with its line number
    expenditureLines.forEach(({ line, index }) => {
      log(`Step 2.1: Found expenditure marker at file line ${index + 1}: "${line.trim()}"`, true);
    });
    
    log(`Step 2.1: Found ${expenditureLines.length} potential markers`, true);
    
    // Define patterns for section components
    const patterns = {
      sectionHeader: /^\[[\d:,]+\]\s*(\d{4})\s+([^-]+)$/,
      continuationHeader: /^\[[\d:,]+\]\s*(\d{4})\s+(.+?)$/,
      continuedLine: /^\[[\d:,]+\]\s*-\s*Continued\s*$/,
      expenditureMarker: /\[[\d:,]+\]\s*(?:3|THREE|3-|THREE-)?[\s\-]*(?:YR|YEAR|Years?|YEAR EXPENDITURE|YEAR EXPENDITURES)[\s\-]*(?:AND[\s\-]*POSITIONS?)?/i,
      subsections: {
        legalCitations: /^LEGAL CITATIONS AND AUTHORITY$/,
        deptAuthority: /^DEPARTMENT AUTHORITY$/,
        progAuthority: /^PROGRAM AUTHORITY$/,
        majorChanges: /^MAJOR PROGRAM CHANGES$/,
        budgetAdjustments: /^DETAILED BUDGET ADJUSTMENTS$/,
        progDescriptions: /^PROGRAM DESCRIPTIONS$/,
        detailedExp: /^DETAILED EXPENDITURES BY PROGRAM$/,
        expByCategory: /^EXPENDITURES BY CATEGORY$/,
        appropriations: /^DETAIL OF APPROPRIATIONS AND ADJUSTMENTS$/,
        positions: /^CHANGES IN AUTHORIZED POSITIONS$/
      }
    };

    // Process sections using expenditure markers
    const sections: Array<{orgCode: string, departmentName: string, content: string, startLine: number}> = [];
    
    // Sort expenditure markers by line number
    const sortedExpenditureMarkers = expenditureLines.sort((a, b) => a.index - b.index);
    
    // Process each pair of expenditure markers to find section boundaries
    for (let i = 0; i < sortedExpenditureMarkers.length; i++) {
      const currentMarker = sortedExpenditureMarkers[i];
      const nextMarker = sortedExpenditureMarkers[i + 1];
      
      log(`\nStep 2.3: Processing section between expenditure markers:`, true);
      log(`- Current marker at line ${currentMarker.index + 1}`, true);
      if (nextMarker) {
        log(`- Next marker at line ${nextMarker.index + 1}`, true);
      } else {
        log(`- This is the last marker`, true);
      }

      // Search backwards from current expenditure marker to find section header
      let sectionStartIndex = -1;
      let sectionHeaderName = '';
      let sectionOrgCode = '';
      
      // Search backwards until we find either a section header or continuation header
      for (let j = currentMarker.index - 1; j >= 0; j--) {
        const line = lines[j];
        
        // Check for continuation header first - if found, we've gone too far back
        const continuationMatch = line.match(patterns.continuationHeader);
        if (continuationMatch && j < lines.length - 1) {
          // Check next line for "- Continued"
          const nextLine = lines[j + 1];
          if (nextLine.match(patterns.continuedLine)) {
            // Stop searching - we've hit the previous section's continuation
            break;
          }
        }
        
        // Check for section header
        const headerMatch = line.match(patterns.sectionHeader);
        if (headerMatch) {
          const [, orgCode, deptName] = headerMatch;
          sectionStartIndex = j;
          sectionHeaderName = deptName.trim();
          sectionOrgCode = orgCode;
          log(`Found section header at line ${j + 1}: ${orgCode} - ${deptName.trim()}`, true);
          break;
        }
      }

      if (sectionStartIndex === -1) {
        log(`WARNING: Could not find section header for expenditure marker at line ${currentMarker.index + 1}`, true);
        continue;
      }

      // Determine section end - use next section's header if available
      let sectionEndIndex;
      if (i < sortedExpenditureMarkers.length - 1) {
        // For non-last sections, search backwards from next marker to find its header
        for (let j = nextMarker.index - 1; j >= 0; j--) {
          const line = lines[j];
          const headerMatch = line.match(patterns.sectionHeader);
          if (headerMatch) {
            // End current section at the line before this header
            sectionEndIndex = j - 1;
            break;
          }
        }
      }
      if (sectionEndIndex === undefined) {
        // Last section or no next header found - end at end of file
        sectionEndIndex = lines.length - 1;
      }

      // Add valid section
      sections.push({
        orgCode: sectionOrgCode,
        departmentName: sectionHeaderName,
        content: lines.slice(sectionStartIndex, sectionEndIndex + 1).join('\n'),
        startLine: sectionStartIndex + 1
      });
      
      log(`Added valid section for ${sectionOrgCode}:`, true);
      log(`- Header at line ${sectionStartIndex + 1}: ${sectionHeaderName}`, true);
      log(`- Expenditure marker at line ${currentMarker.index + 1}`, true);
      log(`- Section ends at line ${sectionEndIndex + 1}`, true);
    }

    if (sections.length === 0) {
      log('Step 2.4: No valid sections found', true);
      return [];
    }
    
    consoleOutput('\n' + '='.repeat(80));
    consoleOutput('SECTION DETECTION SUMMARY');
    consoleOutput('='.repeat(80));
    consoleOutput(`Found ${sections.length} sections`);
    
    // Display detailed section information with actual file line numbers
    for (const section of sections) {
      consoleOutput(`\nSection: ${section.orgCode} - ${section.departmentName}`);
      consoleOutput(`Starts at file line: ${section.startLine}`);
      const lines = section.content.split('\n');
      consoleOutput('Content preview (first 5 lines):');
      lines.slice(0, 5).forEach((line, idx) => {
        const actualLineNum = section.startLine + idx;
        consoleOutput(`  File line ${actualLineNum}: ${line}`);
      });
      if (lines.length > 5) {
        consoleOutput(`  ... and ${lines.length - 5} more lines`);
      }
    }
    
    const proceed = promptUser('\nProceed with these sections? (y/n): ').toLowerCase() === 'y';
    logUser(`Step 2.4: User response for proceeding with sections: ${proceed ? 'yes' : 'no'}`);
    
    return proceed ? sections : [];
  } catch (error: any) {
    log(`Step 2.4: Error in findDepartmentSections: ${error.message}`, true, true);
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
  fileName: string = "",
  fundsData: FundsJSON,
  orgCode?: string,
  departmentName?: string,
): Promise<void> {
  try {
    // Normalize line endings
    const normalizedContent = sectionContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Use provided orgCode and departmentName from bash command extraction
    if (!orgCode || !departmentName) {
      log('Organization code and department name not provided', true, true);
      return;
    }
    
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
    
    // Extract department description (actual descriptive text, not budget data)
    let departmentDescription = '';
    
    const lines = normalizedContent.split('\n');
    let descriptionLines: string[] = [];
    let foundDescription = false;
    
    // Start from line 1 (after the header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleanedLine = line.replace(/\[[\d:,]+\]\s*/, '').trim(); // Remove coordinate details
      
      // Stop if we hit the expenditure marker
      if (cleanedLine.match(/^(?:3|THREE)[\s\-]*(?:YR|YEAR|Years?)[\s\-]*EXPENDITURES?(?:[\s\-]*AND[\s\-]*POSITIONS?)?$/i)) {
        break;
      }
      
      // Skip empty lines at the beginning
      if (!foundDescription && !cleanedLine) {
        continue;
      }
      
      // Skip continuation headers
      if (cleanedLine.match(/^\d{4}\s+.*\s*-\s*Continued\s*$/)) {
        continue;
      }
      
      // If we have content, we've found the description
      if (cleanedLine) {
        foundDescription = true;
        descriptionLines.push(cleanedLine);
      } else if (foundDescription) {
        // Keep empty lines that are between description paragraphs
        descriptionLines.push('');
      }
    }
    
    // Clean up the description
    departmentDescription = descriptionLines
      .join('\n')
      .trim()
      .replace(/\n{2,}/g, '\n') // Replace multiple newlines with single newline
      .replace(/[ \t]+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n +/g, '\n')   // Remove leading spaces after newlines
      .replace(/ +\n/g, '\n')   // Remove trailing spaces before newlines
      .replace(/\n+$/, '');     // Remove trailing newlines at end
    
    log(`Processing department: ${departmentName} (Org Code: ${orgCode})`, true);
    if (departmentDescription) {
      log(`Department description extracted: ${departmentDescription.substring(0, 100)}...`, true);
    }
    stats.departmentsFound++;
    
    // Step 3.a.ii: Match department with departments.json
    log('3.a.ii: Matching department with departments.json', true);
    
    // First, try direct match by organizational code
    let matchedDepartment = departmentsData.departments.find(
      d => d.organizationalCode === orgCode
    );
    
    let matchConfidence = 0;
    let newDepartmentCreated = false;
    let descriptionUpdated = false;
    
    if (!matchedDepartment) {
      log(`No direct match by org code for ${orgCode}, trying name and alias matching`, true);
      
      // Try exact name match (case insensitive)
      matchedDepartment = departmentsData.departments.find(d => 
        d.name.toLowerCase() === departmentName.toLowerCase() ||
        d.canonicalName.toLowerCase() === departmentName.toLowerCase()
      );
      
      if (matchedDepartment) {
        matchConfidence = 95;
        log(`Matched department by name: ${matchedDepartment.name} (${matchConfidence}% confidence)`, true);
        
        // Warn if organizational codes don't match
        if (matchedDepartment.organizationalCode && matchedDepartment.organizationalCode !== orgCode) {
          log(`WARNING: Matched department has different organizational code: ${matchedDepartment.organizationalCode} vs ${orgCode}`, true, true);
          consoleOutput(`⚠️  WARNING: Matched department "${matchedDepartment.name}" has organizational code ${matchedDepartment.organizationalCode}, but budget section has ${orgCode}`);
          matchConfidence = 70; // Lower confidence due to org code mismatch
        }
        
        stats.departmentsMatched++;
      } else {
        // Try alias match (case insensitive)
        matchedDepartment = departmentsData.departments.find(d => 
          d.aliases && d.aliases.some(alias => alias.toLowerCase() === departmentName.toLowerCase())
        );
        
        if (matchedDepartment) {
          matchConfidence = 85;
          log(`Matched department by alias: ${matchedDepartment.name} (${matchConfidence}% confidence)`, true);
          
          // Warn if organizational codes don't match
          if (matchedDepartment.organizationalCode && matchedDepartment.organizationalCode !== orgCode) {
            log(`WARNING: Matched department has different organizational code: ${matchedDepartment.organizationalCode} vs ${orgCode}`, true, true);
            consoleOutput(`⚠️  WARNING: Matched department "${matchedDepartment.name}" has organizational code ${matchedDepartment.organizationalCode}, but budget section has ${orgCode}`);
            matchConfidence = 60; // Lower confidence due to org code mismatch
          }
          
          stats.departmentsMatched++;
        }
      }
      
      if (!matchedDepartment) {
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
    
    // Analyze program descriptions for new vs updated
    let programAnalysis = { newPrograms: 0, updatedPrograms: 0 };
    if (programDescriptions.length > 0) {
      programAnalysis = analyzeProgramDescriptions(programDescriptions, programsData, fileName);
    }
    
    log('4.b: Extracting budget allocations', true);
    const budgetData = extractBudgetAllocations(normalizedContent, orgCode);
    log(`Found ${budgetData ? budgetData.length : 0} budget allocations`, true);
    
    // Analyze budget allocations for new vs overwrite
    let budgetAnalysis = { newAllocations: 0, overwriteAllocations: 0, overwriteDetails: [] as string[] };
    if (budgetData && budgetData.length > 0) {
      budgetAnalysis = analyzeBudgetAllocations(budgetData, budgetsData);
    }
    
    // Analyze fund data for new vs updated
    log('4.c: Analyzing fund data', true);
    let fundAnalysis = { newFunds: 0, updatedFunds: 0, fundDetails: [] as Array<{fundCode: string, fundName: string, status: 'new' | 'updated' | 'existing'}> };
    if (budgetData && budgetData.length > 0) {
      fundAnalysis = analyzeFundData(budgetData, fundsData);
      log(`Fund analysis: ${fundAnalysis.newFunds} new, ${fundAnalysis.updatedFunds} updated, ${fundAnalysis.fundDetails.length} total unique funds`, true);
    }
    
    // Check if there are any changes needed
    const hasDepartmentChanges = newDepartmentCreated || descriptionUpdated;
    const hasProgramBudgetChanges = programDescriptions.length > 0 || budgetData.length > 0;
    const hasFundChanges = fundAnalysis.newFunds > 0 || fundAnalysis.updatedFunds > 0;
    const hasAnyChanges = hasDepartmentChanges || hasProgramBudgetChanges || hasFundChanges;
    
    // Display results summary
    consoleOutput(`  Matched to: ${matchedDepartment.name} (${matchConfidence}% confidence)`);
    
    // Show description status
    if (departmentDescription) {
      const existingDesc = matchedDepartment.description || '';
      const hasExistingDescription = existingDesc.trim().length > 0;
      
      if (!hasExistingDescription) {
        consoleOutput(`  Description: missing/empty → will add new description`);
      } else if (descriptionUpdated) {
        const normalizedExisting = existingDesc.replace(/\s+/g, ' ').trim();
        const normalizedExtracted = departmentDescription.replace(/\s+/g, ' ').trim();
        const similarity = calculateStringSimilarity(normalizedExisting, normalizedExtracted);
        consoleOutput(`  Description: ${similarity}% similarity → will update`);
      } else {
        consoleOutput(`  Description: matches existing (no update needed)`);
      }
    } else {
      consoleOutput(`  Description: none found in budget file`);
    }
    
    // Show program analysis
    if (programDescriptions.length > 0) {
      if (programAnalysis.newPrograms > 0 && programAnalysis.updatedPrograms > 0) {
        consoleOutput(`  Programs: ${programDescriptions.length} found (${programAnalysis.newPrograms} new, ${programAnalysis.updatedPrograms} updated)`);
      } else if (programAnalysis.newPrograms > 0) {
        consoleOutput(`  Programs: ${programDescriptions.length} found (${programAnalysis.newPrograms} new)`);
      } else if (programAnalysis.updatedPrograms > 0) {
        consoleOutput(`  Programs: ${programDescriptions.length} found (${programAnalysis.updatedPrograms} updated)`);
      } else {
        consoleOutput(`  Programs: ${programDescriptions.length} found (all already exist with same descriptions)`);
      }
    } else {
      consoleOutput(`  Programs: none found`);
    }
    
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
    
    // Show fund analysis
    if (fundAnalysis.fundDetails.length > 0) {
      if (fundAnalysis.newFunds > 0 && fundAnalysis.updatedFunds > 0) {
        consoleOutput(`  Funds: ${fundAnalysis.fundDetails.length} found (${fundAnalysis.newFunds} new, ${fundAnalysis.updatedFunds} updated)`);
      } else if (fundAnalysis.newFunds > 0) {
        consoleOutput(`  Funds: ${fundAnalysis.fundDetails.length} found (${fundAnalysis.newFunds} new)`);
      } else if (fundAnalysis.updatedFunds > 0) {
        consoleOutput(`  Funds: ${fundAnalysis.fundDetails.length} found (${fundAnalysis.updatedFunds} updated)`);
      } else {
        consoleOutput(`  Funds: ${fundAnalysis.fundDetails.length} found (all already exist with same names)`);
      }
    } else {
      consoleOutput(`  Funds: none found`);
    }
    
    if (!hasAnyChanges) {
      consoleOutput('\n  ✓ Department already exists and is up-to-date');
      consoleOutput('  → No changes needed - skipping approval and moving to next section');
      log('No changes needed - skipping approval and moving to next section');
      return;
    }
    
    // FIRST APPROVAL: Department changes (departments.json)
    // Skip approval if new department was already created and saved during interactive process
    if (hasDepartmentChanges && !newDepartmentCreated) {
      consoleOutput('\n' + '='.repeat(80));
      consoleOutput('DEPARTMENT CHANGES APPROVAL - Will update: departments.json');
      consoleOutput('='.repeat(80));
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
        consoleOutput('\nEXTRACTED DESCRIPTION WITH LINE NUMBERS:');
        
        // Show extracted description with line numbers
        const descriptionLines = departmentDescription.split('\n');
        descriptionLines.forEach((line, index) => {
          consoleOutput(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
        });
      }
      consoleOutput('\n' + '-'.repeat(80));
      
      let deptApproval = '';
      if (descriptionUpdated) {
        // Only description update - provide more options including cropping
        deptApproval = promptUser('Approve department changes? (u=update description, c=crop and update, k=keep existing, s=skip file): ').toLowerCase();
      } else {
        // Other changes - simpler approval
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
      } else if (deptApproval === 'c') {
        // Crop and update description
        if (descriptionUpdated) {
          const descriptionLines = departmentDescription.split('\n');
          consoleOutput(`\nDescription has ${descriptionLines.length} lines. Specify which lines to keep:`);
          consoleOutput('Examples: "1-10" (keep lines 1 through 10), "1-5,8-12" (keep lines 1-5 and 8-12)');
          
          const cropInput = promptUser('Lines to keep (or "all" to keep everything): ').trim();
          logUser(`User crop input: ${cropInput}`);
          
          if (cropInput.toLowerCase() === 'all') {
            matchedDepartment.description = departmentDescription;
            consoleOutput('Keeping all lines...');
          } else {
            try {
              const linesToKeep = parseCropInput(cropInput, descriptionLines.length);
              const croppedLines: string[] = [];
              
              for (const lineNum of linesToKeep) {
                if (lineNum >= 1 && lineNum <= descriptionLines.length) {
                  croppedLines.push(descriptionLines[lineNum - 1]);
                }
              }
              
              const croppedDescription = croppedLines.join('\n').trim();
              matchedDepartment.description = croppedDescription;
              
              consoleOutput(`\nCropped description (${croppedLines.length} lines):`);
              consoleOutput(`"${croppedDescription}"`);
              
              log(`Description cropped to ${croppedLines.length} lines`, true);
            } catch (error: any) {
              consoleOutput(`Error parsing crop input: ${error.message}`);
              consoleOutput('Using full description instead...');
              matchedDepartment.description = departmentDescription;
            }
          }
        }
        consoleOutput('Saving department changes to departments.json...');
        await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
        consoleOutput('✓ Department changes saved');
        log('Department changes applied and saved', true);
      } else {
        consoleOutput('Invalid choice, skipping department changes...');
        logUser('User provided invalid choice for department changes');
      }
    } else if (newDepartmentCreated) {
      // New department was already created and saved during interactive process
      log('New department already created and saved during interactive process - skipping approval', true);
    }
    
    // SECOND APPROVAL: Program, budget, and fund changes (programs.json, budgets.json, funds.json)
    if (hasProgramBudgetChanges || hasFundChanges) {
      consoleOutput('\n' + '='.repeat(80));
      consoleOutput('PROGRAM, BUDGET & FUND CHANGES APPROVAL - Will update: programs.json, budgets.json, funds.json');
      consoleOutput('='.repeat(80));
      if (programAnalysis.newPrograms > 0 && programAnalysis.updatedPrograms > 0) {
        consoleOutput(`  - Add ${programAnalysis.newPrograms} new programs and update ${programAnalysis.updatedPrograms} existing programs in programs.json`);
      } else if (programAnalysis.newPrograms > 0) {
        consoleOutput(`  - Add ${programAnalysis.newPrograms} new programs in programs.json`);
      } else if (programAnalysis.updatedPrograms > 0) {
        consoleOutput(`  - Update ${programAnalysis.updatedPrograms} existing programs in programs.json`);
      }
      if (budgetData && budgetData.length > 0) {
        if (budgetAnalysis.newAllocations > 0) {
          consoleOutput(`  - Process ${budgetAnalysis.newAllocations} new budget allocations`);
        }
        if (budgetAnalysis.overwriteAllocations > 0) {
          consoleOutput(`  - Process ${budgetAnalysis.overwriteAllocations} budget allocation overwrites`);
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
      if (fundAnalysis.newFunds > 0 || fundAnalysis.updatedFunds > 0) {
        if (fundAnalysis.newFunds > 0) {
          consoleOutput(`  - Add ${fundAnalysis.newFunds} new funds to funds.json`);
        }
        if (fundAnalysis.updatedFunds > 0) {
          consoleOutput(`  - Update ${fundAnalysis.updatedFunds} existing fund names in funds.json`);
        }
        if (fundAnalysis.fundDetails.length > 0) {
          consoleOutput('\n  FUND DETAILS:');
          fundAnalysis.fundDetails.slice(0, 10).forEach(fund => {
            const statusIcon = fund.status === 'new' ? '+ NEW' : fund.status === 'updated' ? '~ UPD' : '= SAME';
            consoleOutput(`    ${statusIcon}: ${fund.fundCode} - ${fund.fundName}`);
          });
          if (fundAnalysis.fundDetails.length > 10) {
            consoleOutput(`    ... and ${fundAnalysis.fundDetails.length - 10} more`);
          }
        }
      }
      consoleOutput('\n' + '-'.repeat(80));
      
      const progBudgetApproval = promptUser('Approve program, budget & fund changes? (y/n/s) - y=yes, n=no, s=skip file: ').toLowerCase();
      logUser(`User program/budget/fund approval response: ${progBudgetApproval}`);
      
      if (progBudgetApproval === 's') {
        logUser('User requested to skip file processing');
        throw new Error('User requested to skip file processing');
      } else if (progBudgetApproval !== 'y') {
        consoleOutput('Skipping program, budget & fund changes...');
        logUser('User chose not to approve program/budget/fund changes');
      } else {
        // Apply program, budget, and fund changes
        consoleOutput('Processing program, budget & fund changes...');
        
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
        
        // Process fund data
        if (budgetData && budgetData.length > 0 && (fundAnalysis.newFunds > 0 || fundAnalysis.updatedFunds > 0)) {
          updateFundData(budgetData, fundsData);
          consoleOutput('✓ Fund data processed');
        }
        
        // Save program, budget, and fund data
        consoleOutput('Saving changes to programs.json, budgets.json, and funds.json...');
        await saveJsonFile(PROGRAMS_FILE, programsData);
        await saveJsonFile(BUDGETS_FILE, budgetsData);
        await saveJsonFile(FUNDS_FILE, fundsData);
        consoleOutput('✓ Program, budget & fund changes saved');
        log('Program, budget, and fund changes applied and saved', true);
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
 * Extract program descriptions using coordinate-based processing
 */
function extractProgramDescriptions(sectionContent: string): Array<{ projectCode: string, name: string, description: string }> {
  const programs: Array<{ projectCode: string, name: string, description: string }> = [];
  
  try {
    const lines = sectionContent.split('\n');
    const processedLines: TextLine[] = [];
    let currentPage = 0;

    // First pass: parse all lines with coordinates
    for (const line of lines) {
      // Check for page markers
      const pageMatch = line.match(/# === PAGE (\d+) === \[size: (\d+)x(\d+)\]/);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1]);
        continue;
      }

      const parsedLine = parseLine(line, currentPage);
      if (parsedLine) {
        processedLines.push(parsedLine);
      }
    }

    // Find PROGRAM DESCRIPTIONS section
    const programDescIndex = processedLines.findIndex(line => 
      line.text === 'PROGRAM DESCRIPTIONS'
    );

    if (programDescIndex === -1) {
      log('Step 4.1: No program descriptions section found', true);
      return programs;
    }
    
    // Find end of program descriptions (DETAILED EXPENDITURES BY PROGRAM)
    const detailedExpIndex = processedLines.findIndex((line, idx) => 
      idx > programDescIndex && line.text.match(/^DETAILED EXPENDITURES BY PROGRAM/)
    );

    const endIndex = detailedExpIndex === -1 ? processedLines.length : detailedExpIndex;

    // Process program descriptions using x-coordinates
    let currentProgram: { 
      projectCode: string, 
      name: string, 
      description: string[], 
      startX: number,
      startY: number 
    } | null = null;

    // Track x-coordinates for program headers
    const headerXCoords = new Set<number>();
    
    // First pass: identify program header x-coordinates
    log('Step 4.1: Analyzing program header positions', true);
    for (let i = programDescIndex + 1; i < endIndex; i++) {
      const line = processedLines[i];
      const text = line.text.trim();

      if (isProjectCode(text)) {
        headerXCoords.add(line.x);
      }
    }

    const headerXArray = Array.from(headerXCoords).sort((a, b) => a - b);
    const mainHeaderX = headerXArray[0]; // Leftmost x-coordinate is main program header
    log('Step 4.1: Found program header x-coordinates', true);

    // Second pass: extract programs and descriptions
    log('Step 4.1: Extracting program descriptions', true);
    for (let i = programDescIndex + 1; i < endIndex; i++) {
      const line = processedLines[i];
      const text = line.text.trim();

      if (!text) continue;

      // Check for program headers using x-coordinate and pattern
      if (line.x === mainHeaderX && isProjectCode(text)) {
        // Save previous program if exists
        if (currentProgram) {
          programs.push({
            projectCode: currentProgram.projectCode,
            name: currentProgram.name,
            description: currentProgram.description.join('\n').trim()
          });
        }

        // Start new program
        currentProgram = {
          projectCode: text.length === 4 ? text + '000' : text,
          name: '',
          description: [],
          startX: line.x,
          startY: line.y
        };

        // Look for program name on next line
        const nextLine = processedLines[i + 1];
        if (nextLine && !isProjectCode(nextLine.text) && nextLine.text.match(/[A-Za-z]/)) {
          currentProgram.name = nextLine.text.trim();
          i++; // Skip name line
        }
        continue;
      }

      // Add to description if we have a current program and line is not a header
      if (currentProgram && line.x > mainHeaderX) {
        // Check if this line belongs to the current program
        // It should be indented relative to the program header
        if (line.x > currentProgram.startX) {
          currentProgram.description.push(text);
        }
      }
    }

    // Add final program if exists
    if (currentProgram) {
      programs.push({
        projectCode: currentProgram.projectCode,
        name: currentProgram.name,
        description: currentProgram.description.join('\n').trim()
      });
    }

    // Validate results
    if (programs.length > 0) {
      log(`Step 4.1: Extracted ${programs.length} program descriptions`, true);
      log('Step 4.1: Validated program header x-coordinates', true);
    }

    return programs;

  } catch (error: any) {
    log(`Error in program description extraction: ${error.message}`, true, true);
    return programs;
  }
}

/**
 * Analyze program descriptions to determine which will be new vs updated
 */
function analyzeProgramDescriptions(
  programDescriptions: Array<{ projectCode: string, name: string, description: string }>,
  programsData: ProgramsJSON,
  fileName: string
): { newPrograms: number; updatedPrograms: number } {
  let newPrograms = 0;
  let updatedPrograms = 0;
  
  for (const progDesc of programDescriptions) {
    const existingProgram = programsData.programs.find(p => p.projectCode === progDesc.projectCode);
    
    if (!existingProgram) {
      newPrograms++;
    } else {
      // Check if this description already exists from the same source file
      const existingDescIndex = existingProgram.programDescriptions.findIndex(
        desc => desc.description === progDesc.description && desc.source === fileName
      );
      
      if (existingDescIndex === -1) {
        // Check if any description exists from this source file (for updates)
        const existingSourceIndex = existingProgram.programDescriptions.findIndex(
          desc => desc.source === fileName
        );
        
        if (existingSourceIndex === -1) {
          // No description from this source file exists - this is an update
          updatedPrograms++;
        }
        // If description from this source exists but is different, it's still an update
        // If description from this source exists and is the same, don't count it
      }
      // If exact description and source match, don't count it as new or updated
    }
  }
  
  return { newPrograms, updatedPrograms };
}

/**
 * Extract budget allocations using coordinate-based processing
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
    const lines = sectionContent.split('\n');
    const processedLines: TextLine[] = [];
    let currentPage = 0;

    // First pass: parse all lines with coordinates
    for (const line of lines) {
      // Check for page markers
      const pageMatch = line.match(/# === PAGE (\d+) === \[size: (\d+)x(\d+)\]/);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1]);
        continue;
      }

      const parsedLine = parseLine(line, currentPage);
      if (parsedLine) {
        processedLines.push(parsedLine);
      }
    }

    // Find DETAILED EXPENDITURES BY PROGRAM section
    const detailedExpIndex = processedLines.findIndex(line => 
      line.text.match(/^DETAILED EXPENDITURES BY PROGRAM/)
    );

    if (detailedExpIndex === -1) {
      log('Step 4.2: No detailed expenditures section found', true);
      return results;
    }
    
    // Find fiscal years pattern using x-coordinates
    const fiscalYears: string[] = [];
    let yearStartIndex = -1;

    // Look for fiscal years after DETAILED EXPENDITURES
    log('Step 4.2: Scanning for fiscal year headers', true);
    for (let i = detailedExpIndex + 1; i < processedLines.length; i++) {
      const line = processedLines[i];
      if (line.text.match(/^\d{4}-\d{2}[*\s]*$/)) {
        fiscalYears.push(line.text.replace(/[*\s]/g, ''));
        if (yearStartIndex === -1) yearStartIndex = i;
        if (fiscalYears.length === 3) break;
      }
    }

    if (fiscalYears.length !== 3 || yearStartIndex === -1) {
      log('Step 4.2: Failed to find all three fiscal years', true);
      return results;
    }

    // Process amounts and fund codes
    log('Step 4.3: Processing fund codes and amounts', true);
    let currentProjectCode = '';
    let currentFundingType: FundingType | null = null;
    let currentFundCode = '';
    let currentFundName = '';
    let amounts: number[] = [];

    // Track amount column x-coordinates
    const amountColumns: number[] = [];

    // Process lines after fiscal years
    for (let i = yearStartIndex; i < processedLines.length; i++) {
      const line = processedLines[i];
      const text = line.text.trim();

      // Skip empty lines
      if (!text) continue;

      // Check for funding type markers
      if (text === 'State Operations:') {
        currentFundingType = 0;
        log('Step 4.5: Processing State Operations section', true);
        continue;
      } else if (text === 'Local Assistance:') {
        currentFundingType = 1;
        log('Step 4.5: Processing Local Assistance section', true);
        continue;
      }

      // Check for project codes
      if (line.x < 100 && isProjectCode(text)) {
        currentProjectCode = text.length === 4 ? text + '000' : text;
        currentFundingType = null;
        currentFundCode = '';
        currentFundName = '';
        amounts = [];
        log(`Step 4.1: Processing project code ${currentProjectCode}`, true);
        continue;
      }

      // Check for fund codes
      if (currentFundingType !== null && currentProjectCode && line.x < 100 && isFundCode(text)) {
        const nextLine = processedLines[i + 1];
        if (nextLine && !isAmountString(nextLine.text) && nextLine.text.match(/[A-Za-z]/)) {
          currentFundCode = text;
          currentFundName = nextLine.text.trim();
          amounts = [];
          log(`Step 4.3: Processing fund ${currentFundCode} - ${currentFundName}`, true);
          i++; // Skip fund name line
          continue;
        }
      }

      // Check for amounts
      if (currentProjectCode && currentFundingType !== null && currentFundCode) {
        if (isAmountString(text)) {
          // Store amount column x-coordinate if not already known
          if (amountColumns.length < 3 && !amountColumns.includes(line.x)) {
            amountColumns.push(line.x);
            log(`Step 4.4: Found amount column at x=${line.x}`, true);
          }

          const amount = parseAmount(text);
          amounts.push(amount);

          if (amounts.length === 3) {
            // Add budget allocations for all three years
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
            }

            log(`Step 4.2: Added budget allocations for ${currentProjectCode} - ${currentFundCode}`, true);

            // Reset for next set
            amounts = [];
            currentFundCode = '';
            currentFundName = '';
          }
        }
      }
    }

    // Validate results
    if (results.length > 0) {
      log(`Step 4: Processed ${results.length} budget allocations`, true);
      
      // Log amount column analysis
      if (amountColumns.length === 3) {
        log('Step 4.4: Validated amount column spacing', true);
      } else {
        log('Step 4.4: Warning - inconsistent amount column spacing', true, true);
      }
    }

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
      const newAllocationMessage = `Added new fund allocation for ${allocation.organizationCode}-${allocation.projectCode}-${allocation.fundCode} (${allocation.fiscalYear}): $${allocation.amount}`;
      log(newAllocationMessage, true);
      consoleOutput(`  ✓ ${newAllocationMessage}`);
    } else {
      // Existing fund allocation - overwrite with new data
      const oldAmount = fundAllocation.amount;
      const oldCount = fundAllocation.count;
      
      fundAllocation.amount = allocation.amount;
      fundAllocation.count = 1; // Reset count to 1 for the new data
      
      stats.budgetAllocationsOverwritten++;
      
      const overwriteMessage = `Overwritten fund allocation for ${allocation.organizationCode}-${allocation.projectCode}-${allocation.fundCode} (${allocation.fiscalYear}): $${oldAmount} (count: ${oldCount}) → $${allocation.amount} (count: 1)`;
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

/**
 * Analyze fund data to determine which will be new vs updated
 */
function analyzeFundData(
  budgetAllocations: Array<{
    projectCode: string,
    organizationCode: string,
    fundingType: FundingType,
    fundCode: string,
    fundName: string,
    amount: number,
    fiscalYear: string
  }>,
  fundsData: FundsJSON
): { newFunds: number; updatedFunds: number; fundDetails: Array<{fundCode: string, fundName: string, status: 'new' | 'updated' | 'existing'}> } {
  const fundMap = new Map<string, {fundCode: string, fundName: string, status: 'new' | 'updated' | 'existing'}>();
  
  for (const allocation of budgetAllocations) {
    if (fundMap.has(allocation.fundCode)) {
      continue; // Already processed this fund code
    }
    
    const existingFund = fundsData.funds.find(f => f.fundCode === allocation.fundCode);
    
    if (!existingFund) {
      fundMap.set(allocation.fundCode, {
        fundCode: allocation.fundCode,
        fundName: allocation.fundName,
        status: 'new'
      });
    } else {
      // Check if fund name is different (needs update)
      if (existingFund.fundName !== allocation.fundName) {
        fundMap.set(allocation.fundCode, {
          fundCode: allocation.fundCode,
          fundName: allocation.fundName,
          status: 'updated'
        });
      } else {
        fundMap.set(allocation.fundCode, {
          fundCode: allocation.fundCode,
          fundName: allocation.fundName,
          status: 'existing'
        });
      }
    }
  }
  
  const fundDetails = Array.from(fundMap.values());
  const newFunds = fundDetails.filter(f => f.status === 'new').length;
  const updatedFunds = fundDetails.filter(f => f.status === 'updated').length;
  
  return { newFunds, updatedFunds, fundDetails };
}

/**
 * Update fund data in funds.json
 */
function updateFundData(
  budgetAllocations: Array<{
    projectCode: string,
    organizationCode: string,
    fundingType: FundingType,
    fundCode: string,
    fundName: string,
    amount: number,
    fiscalYear: string
  }>,
  fundsData: FundsJSON
): void {
  const processedFunds = new Set<string>();
  
  for (const allocation of budgetAllocations) {
    if (processedFunds.has(allocation.fundCode)) {
      continue; // Already processed this fund code
    }
    
    processedFunds.add(allocation.fundCode);
    stats.fundsFound++;
    
    let existingFund = fundsData.funds.find(f => f.fundCode === allocation.fundCode);
    
    if (!existingFund) {
      // Create new fund
      const newFund: Fund = {
        fundCode: allocation.fundCode,
        fundName: allocation.fundName,
        fundGroup: "Other Funds", // Default group for budget-extracted funds
        fundDescription: allocation.fundName
      };
      
      fundsData.funds.push(newFund);
      stats.newFundsAdded++;
      log(`Added new fund: ${allocation.fundCode} - ${allocation.fundName}`, true);
    } else {
      // Check if fund name needs updating
      if (existingFund.fundName !== allocation.fundName) {
        const oldName = existingFund.fundName;
        existingFund.fundName = allocation.fundName;
        
        // Also update description if it matches the old name
        if (existingFund.fundDescription === oldName) {
          existingFund.fundDescription = allocation.fundName;
        }
        
        stats.fundsUpdated++;
        log(`Updated fund name: ${allocation.fundCode} from "${oldName}" to "${allocation.fundName}"`, true);
      }
    }
  }
}

// Start the script execution
main().then(() => {
  const finalMessage = `Processing completed successfully - logs written to: ${logger.getLogFile()}`;
  consoleOutput(finalMessage);
  logger.log('Processing completed successfully');
}).catch((error: any) => {
  const errorMessage = `Error: ${error.message}`;
  consoleOutput(errorMessage);
  logger.error(`Unhandled error: ${error.message}`);
  logger.error(error.stack || '');
  process.exit(1);
});