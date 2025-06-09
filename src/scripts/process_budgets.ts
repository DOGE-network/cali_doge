/**
 * Budget Data Text File Processing Script
 * from plan datastructureandlayout.md, step 2. Data Processing Scripts Update, Update Process Budgets Script
 * 
 * Steps:
 * 1. Setup
 *    1.1 load JSON files
 *    1.2 Scan budget text files
 *    1.3 Read and parse file content, calls step 2
 * 
 * 2. Section Detection, calls step 3:
 *    2.1. Find expenditure markers ("3-YEAR EXPENDITURES AND POSITIONS")
 *    2.2. Track continuation headers ((4-digit org code + department name) followed by "- Continued") 
 *    2.3. Extract section content between beginning of section (section header) and end of section (just before next section header) for sections with continuation headers
 *        2.3.a. Process sections using known markers and continuation headers
 *        2.3.b. If section header not found between lines, prompt user to help identify the section header line
 *    2.4. Validate section boundaries and content
 *    call step 3
 * 
 * 3. Process Department Section, calls steps 4 - 5:
 *    3.1. Extract department data
 *    3.2. Compare department descriptions with existing departments.json
 *    3.3  Prompt to update departments.json if different or new
 *    call step 4 - 5
 * 
 * 4. Program Compare with Existing:
 *    4.1. Extract department description
 *    4.2. Compare Program descriptions with existing programs.json
 *    4.3. Update programs.json without prompt
 * 
 * 5. Budget by Program Compare with Existing:
 *    5.1. Extract DETAILED EXPENDITURES BY PROGRAM program codes and descriptions
 *    5.2  Compare budget data
 *    5.3. Compare fund data
 *    5.4. Prompt to update budgets.json if different or new
 *    5.5. Update funds.json
 *
 * Section Structure:
 * Each section follows this structure:
 * 1. Section Header (4-digit org code + department name) [100% of the time one per section]
 * 2. Department Description [99% of the time one per section]
 * 3. 3-YEAR EXPENDITURES AND POSITIONS marker [99% of the time one per section]
 * 4. Continuation headers (95% of the times section header text (4-digit org code + department name) followed by "- Continued")
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
import { Program, ProgramsJSON } from '../types/program';
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

// eslint-disable-next-line no-unused-vars
interface BudgetAllocation {
  projectCode: string;
  organizationCode: string;
  fundingType: FundingType;
  fundCode: string;
  fundName: string;
  amount: number;
  fiscalYear: string;
  // eslint-disable-next-line no-unused-vars
  programName?: string;
}

interface Section {
  orgCode: string;
  departmentName: string;
  content: string;
  startLine: number;
}

interface ReviewSection {
  markerLine: number;
  expectedHeader: string;
  searchStartLine: number;
  searchEndLine: number;
  fileName: string;
  previousSectionHeader: string | null;
  previousSectionEndLine: number | null;
  nextSectionHeader: string | null;
  nextSectionStartLine: number | null;
}

interface ContinuationHeaderGroup {
  baseText: string;  // The header text without "- Continued"
  headers: Array<{lineNum: number, text: string}>;
  lastVerifiedLineNum: number | null;
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

function parseAmount(text: string): number {
  if (text.trim() === '-') return 0;
  return parseFloat(text.replace(/[\$,]/g, '')) || 0;
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
const logger = new (FileLogger as any)(LOG_DIR, `process_budgets_${TRANSACTION_ID}`);

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
    // ## Step 1: Setup #########################################################
    log(`## Step 1: Setup  #########################################################`, true);
    
    // Check for force reprocessing flag and specific file argument
    const forceReprocess = process.argv.includes('--force');
    const specificFile = process.argv[2];
    if (forceReprocess) {
      log('Force reprocessing flag detected. Will reprocess all files.', true);
    }
    if (specificFile && !specificFile.startsWith('--')) {
      log(`Processing specific file: ${specificFile}`, true);
    }
    
    // ## Step 1.1: Load JSON files #########################################################
    log(`## Step 1.1 Load JSON files #########################################################`, true);
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
    
    // ## Check for force reprocessing and clear processedFiles if needed #########################################################
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
    
    // ## Step 1.2 Scan budget text files #########################################################
    log(`## Step 1.2 Scan budget text files #########################################################`, true);
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
    
    // ## Step 1.3: Read and parse file content, calls steps 2 - 5 #########################################################
    log('## Step 1.3. Read and parse file content, calls steps 2 - 5', true);
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
    
    // ## Step 6: Results Summary and Final Data Persistence #########################################################
    log('6. Results Summary and Final Data Persistence');
    
    // ## Step 6a: Save updated data #########################################################
    log('6a. Saving updated JSON files', true);
    await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
    await saveJsonFile(PROGRAMS_FILE, programsData);
    await saveJsonFile(BUDGETS_FILE, budgetsData);
    await saveJsonFile(FUNDS_FILE, fundsData);
    
    // ## Step 6b: Processing statistics #########################################################
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

// ## Step 1.1 Load JSON files #########################################################
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

// ## Step 1.2 Scan budget text files #########################################################
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

// ## Step 1.3 Read and parse file content #########################################################
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
    
  // ## Step 2 Section Detection #########################################################
    const { sections, expenditureMarkers, continuationHeaderGroups } = await findDepartmentSections(filePath);
    
    if (sections.length === 0) {
      log(`No sections found in file ${fileName} - skipping`, true);
      stats.skippedFiles++;
      return;
    }
    
    log(`Found ${sections.length} department sections`, true);
    
    // Prompt user to review step 2 findings with detailed section summary
    logUser(`\nReview of Step 2 findings for ${fileName}:`);
    logUser(`Found ${sections.length} department sections`);
    
    // ## Step 2.4 Section verification #########################################################
    log('Step 2.4: Verifying section boundaries and content', true);

    logUser('\nSection Verification Summary:');
    logUser('----------------------------');
    
    sections.forEach((section, idx) => {
      const nextSection = sections[idx + 1];
      const endLine = nextSection ? nextSection.startLine - 1 : fileContent.split('\n').length - 1;
      
      // Count markers and headers within this section's line range
      const markersInSection = expenditureMarkers.filter(m => 
        m.index >= section.startLine && m.index < endLine
      );
      
      const headersInSection = continuationHeaderGroups
        .flatMap(g => g.headers)
        .filter(h => h.lineNum >= section.startLine && h.lineNum < endLine);
      
      // Display section summary
      logUser(`\nSection ${idx + 1}: ${section.orgCode} - ${section.departmentName}`);
      logUser(`Content Lines: ${section.startLine + 1} - ${endLine + 1}`);
      logUser(`Expenditure Markers: ${markersInSection.length}`);
      logUser(`Continuation Headers: ${headersInSection.length}`);
      
      // Display marker details if any exist
      if (markersInSection.length > 0) {
        logUser('\nExpenditure Marker Details:');
        markersInSection.forEach(marker => {
          logUser(`  Line ${marker.index + 1}: ${marker.line.trim()}`);
        });
      }

      // Display Continuation header details if any exist
      if (headersInSection.length > 0) {
        logUser('\nContinuation Header Details:');
        headersInSection.forEach(header => {
          logUser(`  Line ${header.lineNum + 1}: ${header.text.trim()}`);
        });
      }
      
      logUser('----------------------------');
    });
    
    logUser('\nDo you want to proceed with processing this file? (y/n)');
    
    const response = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim().toLowerCase());
      });
    });
    
    if (response !== 'y') {
      log(`File ${fileName} was not approved for processing - skipping`, true);
      stats.skippedFiles++;
      return;
    }
    
    // ## Step 3: Description Compare with Existing #########################################################
    let sectionNumber = 1;
    for (const section of sections) {
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

// ## Step 2: Section Detection #########################################################
async function findDepartmentSections(
  filePath: string
): Promise<{ sections: Section[], expenditureMarkers: Array<{index: number, line: string}>, continuationHeaderGroups: ContinuationHeaderGroup[] }> {
  const sections: Section[] = [];
  const expenditureMarkers: Array<{index: number, line: string}> = [];
  const continuationHeaderGroups: ContinuationHeaderGroup[] = [];
  
  interface SectionHeader {
    lineNum: number;
    orgCode: string;
    departmentName: string;
  }

  interface Section {
    orgCode: string;
    departmentName: string;
    content: string;
    startLine: number;
  }

  interface ReviewSection {
    markerLine: number;
    expectedHeader: string;
    searchStartLine: number;
    searchEndLine: number;
    fileName: string;
    previousSectionHeader: string | null;
    previousSectionEndLine: number | null;
    nextSectionHeader: string | null;
    nextSectionStartLine: number | null;
  }

  interface ContinuationHeaderGroup {
    baseText: string;  // The header text without "- Continued"
    headers: Array<{lineNum: number, text: string}>;
    lastVerifiedLineNum: number | null;
  }
  
  try {
    // Read file content
    log('Extracting x,y coordinates from text file', true);
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const lines = fileContent.split('\n');
    log(`Extracted coordinates from ${lines.length} lines`, true);
    
    // Define patterns for section components
    const patterns = {
      sectionHeader: /^\[[\d:,]+\]\s*(\d{4})\s+([^-]+)$/,
      // Pattern for complete continuation header on one line
      continuationHeader: /^\[[\d:,]+\]\s*(\d{4})\s+(.+?)\s*-\s*Continued\s*$/,
      // Pattern for just the org code and department name
      headerPrefix: /^\[[\d:,]+\]\s*(\d{4})\s+([^\n]+)$/,
      // Pattern for just the "Continued" part
      continuedSuffix: /^\[[\d:,]+\]\s*(?:-\s*)?Continued\s*$/,
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

    // ## Step 2.1: Find expenditure headers #########################################################
    log('Step 2.1: Scanning for EXPENDITURES markers', true);
    const expenditurePattern = /\[[\d:,]+\]\s*(?:3|THREE)[\s\-]*(?:YR|YEAR|Years?)[\s\-]*EXPENDITURES?(?:[\s\-]*AND[\s\-]*POSITIONS?)?/i;
    const expenditureLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => expenditurePattern.test(line));
    
    // Store expenditure markers
    expenditureMarkers.push(...expenditureLines);
    
    log(`Step 2.1: Found ${expenditureLines.length} potential markers`, true);

    log('\n' + '#'.repeat(80));

    // ## Step 2.2: Finding continuation headers #########################################################
    log('Step 2.2: Finding continuation headers');
    log('#'.repeat(80) + '\n');

    // Track all continuation headers found
    const continuationHeaders: Array<{lineNum: number, text: string}> = [];

    // Scan through file looking for continuation headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // First try to match complete continuation header on one line
      const fullMatch = line.match(patterns.continuationHeader);
      if (fullMatch) {
        log(`Step 2.2: Found complete continuation header at line ${i + 1}:`, true);
        log(`         "${line}"`, true);
        continuationHeaders.push({lineNum: i, text: line});
        continue;
      }

      // If we find just "Continued", look back 3-5 lines for the header prefix
      const continuedMatch = line.match(patterns.continuedSuffix);
      if (continuedMatch) {
        log(`Step 2.2: Found split continuation header ending at line ${i + 1}`, true);
        log(`         Suffix: "${line}"`, true);
        
        // Look back 3-5 lines for the header prefix
        let headerFound = false;
        for (let j = Math.max(0, i - 5); j < i; j++) {
          const prevLine = lines[j].trim();
          const headerMatch = prevLine.match(patterns.headerPrefix);
          if (headerMatch) {
            const reconstructedHeader = `${prevLine} - Continued`;
            log(`Step 2.2: Found matching prefix at line ${j + 1}:`, true);
            log(`         "${prevLine}"`, true);
            log(`Step 2.2: Reconstructed full header:`, true);
            log(`         "${reconstructedHeader}"`, true);
            continuationHeaders.push({lineNum: j, text: reconstructedHeader});
            headerFound = true;
            break;
          }
        }
        
        if (!headerFound) {
          log(`Step 2.2: WARNING - Could not find matching header prefix within 5 lines before "Continued" at line ${i + 1}`, true, true);
          log(`Step 2.2: Context of failed match:`, true);
          for (let j = Math.max(0, i - 5); j <= i; j++) {
            log(`         Line ${j + 1}: "${lines[j].trim()}"`, true);
          }
        }
      }
    }

    log(`\nStep 2.2: Found ${continuationHeaders.length} continuation headers total`);
    log('#'.repeat(80) + '\n');

    // Step 2.3: Processing sections using known markers
    log('\nStep 2.3: PROCESSING SECTIONS USING KNOWN MARKERS:', true);

    const processSections = async (
        expenditureMarkers: Array<{index: number, line: string}>,
        continuationHeaders: Array<{lineNum: number, text: string}>,
      lines: string[],
      filePath: string
    ): Promise<Section[]> => {
        const sections: Section[] = [];
      const reviewSections: ReviewSection[] = [];
        
        // ## Step 2.3 section identification #########################################################
      // 99% of the time each section has one expenditureMarkers number
      // 95% of the time each section has have one or more continuationHeaders
      // group continuationHeaders by similar text (count will be equal or less then the number of expenditureMarkers)
      // example with expenditureMarkers Two (assuming continuationHeader in section One)
      // for each expenditureMarker
      //    use continuationHeaders group Two text (minus one or more dash and "Continued")  
      //    read for text in the budget text file starting from the largest line number of the last verifed continuationHeader group in a section to the line number of expenditureMarker Two
      //    if you find the text, then save that line number as the start of a section Two and the section header AND advance continuationHeader group
      //    else save ReviewSection as values expenditureMarkers Two line number, largest line number of the last verifed continuationHeader group in a section, and the previous section.
      // Repeat
      // Note: that expenditureMarker array index position continuationHeader group array index position will stay in sync if each section has an continuationHeader, otherwise continuationHeader group array index position will be one or more behind the expenditureMarker array index position

        log(`\nStep 2.3: Starting with ${expenditureMarkers.length} expenditure markers and ${continuationHeaders.length} continuation headers`, true);

      // Log all markers and continuation headers for analysis
      log('\nStep 2.3: EXPENDITURE MARKERS:', true);
      expenditureMarkers.forEach((marker, idx) => {
        log(`  ${idx + 1}. Line ${marker.index + 1}: "${marker.line.trim()}"`, true);
      });

      log('\nStep 2.3: CONTINUATION HEADERS:', true);
      continuationHeaders.forEach((header, idx) => {
        const headerText = header.text.replace(/\\[\\d+:\\d+:\\d+,\\d+\\]\\s*/, '').trim();
        log(`  ${idx + 1}. Line ${header.lineNum + 1}: "${headerText}"`, true);
      });

      // Group continuation headers by similar text
      const sortedHeaders = [...continuationHeaders].sort((a, b) => a.lineNum - b.lineNum);
      
      for (const header of sortedHeaders) {
        log(`\nProcessing continuation header: "${header.text}"`, true);
        
        const baseText = header.text
          .replace(/\[\d+:\d+:\d+,\d+\]\s*/, '')  // Remove PDF coordinates
          .replace(/\s*-\s*Continued\s*$/, '')    // Remove "- Continued"
          .trim();
        
        log(`  After removing coordinates: "${header.text.replace(/\[\d+:\d+:\d+,\d+\]\s*/, '')}"`, true);
        log(`  After removing - Continued: "${header.text.replace(/\[\d+:\d+:\d+,\d+\]\s*/, '').replace(/\s*-\s*Continued\s*$/, '')}"`, true);
        log(`  Final baseText: "${baseText}"`, true);
        
        const existingGroup = continuationHeaderGroups.find(g => g.baseText === baseText);
        if (existingGroup) {
          existingGroup.headers.push(header);
          // Update lastVerifiedLineNum to the highest line number in this group
          existingGroup.lastVerifiedLineNum = Math.max(existingGroup.lastVerifiedLineNum || 0, header.lineNum);
          log(`  Added to existing group: "${continuationHeaderGroups.indexOf(existingGroup) + 1}/${continuationHeaderGroups.length}: "${existingGroup.baseText}"`, true);
        } else {
          continuationHeaderGroups.push({
            baseText,
            headers: [header],
            lastVerifiedLineNum: header.lineNum  // Initialize with this header's line number
          });
          log(`  Created new group with baseText: "${baseText}"`, true);
        }
      }

      log('\nStep 2.3: GROUPED CONTINUATION HEADERS:', true);
      continuationHeaderGroups.forEach((group, idx) => {
        log(`  Group ${idx + 1}: "${group.baseText}"`, true);
        group.headers.forEach(header => {
          log(`    Line ${header.lineNum + 1}: "${header.text.trim()}"`, true);
        });
      });

      // Sort markers by line number
      // const sortedMarkers = [...expenditureMarkers].sort((a, b) => a.index - b.index);
      let currentContinuationHeaderGroupIndex = 0;
      let previousSection: SectionHeader | null = null;

      // Process each section
      for (let i = 0; i < expenditureMarkers.length; i++) {
        const currentMarker = expenditureMarkers[i];
        const nextMarker = i < expenditureMarkers.length - 1 ? expenditureMarkers[i + 1] : null;

        log(`\nProcessing section ${i + 1}/${expenditureMarkers.length} at line ${currentMarker.index + 1}:`, true);
        
        // Get current continuation header group
        const currentGroup = continuationHeaderGroups[currentContinuationHeaderGroupIndex];
        if (!currentGroup) {
          log(`  No more continuation header groups available, skipping marker`, true);
          continue;
        }

        log(`  Using continuation header group ${currentContinuationHeaderGroupIndex + 1}/${continuationHeaderGroups.length}: "${currentGroup.baseText}"`, true);
        
        // Calculate search range - use last verified line number from previous group
        const searchStartLine = currentContinuationHeaderGroupIndex > 0 ? 
          (continuationHeaderGroups[currentContinuationHeaderGroupIndex - 1].lastVerifiedLineNum || 1) : 1;
        log(`  Searching between lines ${searchStartLine} and ${currentMarker.index + 1}`, true);

        // CRITICAL: Search start line MUST be based on the last verified continuation header line number
        // NOT the previous expenditure marker. This is because:
        // 1. Continuation headers mark the actual section boundaries
        // 2. Expenditure markers can appear anywhere within a section
        // 3. The last verified continuation header (e.g. line 284 for group 1) is the true end of the previous section
        // 4. Using the previous expenditure marker would miss headers that appear after the marker
        // Example: For processing marker 2, search should start at group 1's last verified line (284)
        // NOT at marker 1's line number, as this would miss headers between marker 1 and line 284
        log(`  Search start line ${searchStartLine} is based on last verified continuation header from group ${currentContinuationHeaderGroupIndex}`, true);

        // Search for section header
        let sectionHeader: SectionHeader | null = null;
        for (let j = searchStartLine; j <= currentMarker.index - 1; j++) {
          const line = lines[j].trim();
          const strippedLine = line.replace(/\[\d+:\d+:\d+,\d+\]\s*/, '').trim();
          
          if (strippedLine === currentGroup.baseText) {
            const match = strippedLine.match(/^(\d{4})\s+(.+)$/);
            if (match) {
              const [, orgCode, departmentName] = match;
              sectionHeader = {
                lineNum: j,
                orgCode,
                departmentName: departmentName.trim()
              };
              log(`  Found section header at line ${j + 1}: "${strippedLine}"`, true);
              break;
            }
          }
        }

        if (sectionHeader) {
          // Found valid section header
          sections.push({
            orgCode: sectionHeader.orgCode,
            departmentName: sectionHeader.departmentName,
            content: lines.slice(sectionHeader.lineNum, nextMarker ? nextMarker.index : lines.length).join('\n'),
            startLine: sectionHeader.lineNum
          });
          // if expenditureMarkers at end of array and continuationHeaderGroups not at end of array, then run loop Process each section loop again
          if (i === expenditureMarkers.length - 1 && 
              currentContinuationHeaderGroupIndex < continuationHeaderGroups.length - 1) {
            // We're at the last expenditure marker but have more continuation headers
            // Decrement i to process the current marker again
            i--; // Will process the current marker again in the next iteration
            log(`  Reached last expenditure marker but have more continuation headers. Processing current marker again.`, true);
          }

          // Update tracking variables
          previousSection = sectionHeader;
          // DO NOT update lastVerifiedLineNum here - it should only be updated when finding continuation headers
          log(`  Found section header at line ${sectionHeader.lineNum + 1}`, true);

          // Advance to next group immediately after finding a section header
          currentContinuationHeaderGroupIndex++;
          log(`  Advanced to continuation header group ${currentContinuationHeaderGroupIndex + 1}/${continuationHeaderGroups.length}`, true);
        } else {
          // Section header not found - track review section
          reviewSections.push({
            markerLine: currentMarker.index + 1,
            expectedHeader: currentGroup.baseText,
            searchStartLine: searchStartLine,
            searchEndLine: currentMarker.index + 1,
            fileName: path.basename(filePath),
            previousSectionHeader: previousSection ? `${previousSection.orgCode} ${previousSection.departmentName}` : null,
            previousSectionEndLine: currentGroup.lastVerifiedLineNum,
            nextSectionHeader: null, // Will be filled in later
            nextSectionStartLine: null // Will be filled in later
          });
          log(`  ⚠️ REVIEW SECTION: Unable to find header "${currentGroup.baseText}" between lines ${searchStartLine}-${currentMarker.index + 1}`, true);
          
          // Step 2.3.b: Process skipped section immediately
          log('\nStep 2.3.b: Processing skipped section immediately...', true);
          const recoveredSections = await processReviewSections([reviewSections[reviewSections.length - 1]], lines);
          if (recoveredSections.length > 0) {
            sections.push(...recoveredSections);
            log(`  ✓ Recovered section with header at line ${recoveredSections[0].startLine}`, true);
            
            // Update tracking variables
            previousSection = {
              lineNum: recoveredSections[0].startLine,
              orgCode: recoveredSections[0].orgCode,
              departmentName: recoveredSections[0].departmentName
            };
            currentGroup.lastVerifiedLineNum = currentMarker.index;
            currentContinuationHeaderGroupIndex++;
          }
        }
      }

      return sections;
    };

    const sections = await processSections(expenditureMarkers, continuationHeaders, lines, filePath);

    return { sections, expenditureMarkers, continuationHeaderGroups };

  } catch (error: any) {
    log(`Step 2.4: Error in findDepartmentSections: ${error.message}`, true, true);
    return { sections, expenditureMarkers, continuationHeaderGroups };
  }
}

// ## Step 3: Process Department Section #########################################################
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
    log('\n' + '='.repeat(80));
    log(`FILE: ${fileName} | SECTION ${sectionNumber}`);
    log('='.repeat(80));
    log(`DEPARTMENT: ${departmentName} (${orgCode})`);
    
    // Log the section processing to file
    logUser(`Processing section ${sectionNumber}: ${departmentName} (${orgCode}) from file ${fileName}`);
    
    // Now start the detailed processing with proper logging
    log(`Processing section ${sectionNumber}`, true);
    
    // ## Step 3.1: Extract department description #########################################################
    log('3.1: Extract department description', true);
    
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
    
    // ## Step 3.2: Compare department descriptions with existing departments.json #########################################################
    log('## Step 3.2: Compare department descriptions with existing departments.json #########################################################', true);
    
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
          log(`⚠️  WARNING: Matched department "${matchedDepartment.name}" has organizational code ${matchedDepartment.organizationalCode}, but budget section has ${orgCode}`);
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
            log(`⚠️  WARNING: Matched department "${matchedDepartment.name}" has organizational code ${matchedDepartment.organizationalCode}, but budget section has ${orgCode}`);
            matchConfidence = 60; // Lower confidence due to org code mismatch
          }
          
          stats.departmentsMatched++;
        }
      }
      
      if (!matchedDepartment) {
        // Handle new department creation
        log(`No reliable match found for department "${departmentName}" (Org Code: ${orgCode})`, true);
        
        log('\n' + '='.repeat(80));
        log(`NEW DEPARTMENT FOUND`);
        log('='.repeat(80));
        log(`DEPARTMENT: ${departmentName} (${orgCode})`);
        log(`FILE: ${fileName} | SECTION ${sectionNumber}`);
        log('\nGeneral rule: Departments must have headcount to be added to the workforce hierarchy.');
        log('- budget_status = "active" means the department has headcount');
        log('- budget_status = "inactive" means the department has no headcount');
        log('\nOptions:');
        log('a) Create new department with budget_status = "active" (has headcount)');
        log('b) Create new department with budget_status = "inactive" (no headcount)');
        log('s) Skip this department');
        log('\n' + '-'.repeat(80));
        
        const newDeptChoice = promptUser('Choose option (a/b/s): ').toLowerCase();
        logUser(`User selected new department option: ${newDeptChoice}`);
        
        if (newDeptChoice === 's') {
          logUser('User chose to skip new department creation');
          return;
        } else if (newDeptChoice === 'a' || newDeptChoice === 'b') {
          const budgetStatus: BudgetStatus = newDeptChoice === 'a' ? 'active' : 'inactive';
          
          // Ask for parent_agency
          log('\nPlease enter the parent agency for this department:');
          const parentAgency = promptUser('Parent agency: ').trim();
          logUser(`User entered parent agency: ${parentAgency}`);
          
          if (!parentAgency) {
            logUser('Parent agency is required. Skipping department creation...');
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
          
          log(`Created new department: ${departmentName} with budget_status: ${budgetStatus}, parent_agency: ${parentAgency}`, true);
          stats.departmentsMatched++;
          
          // Save the new department immediately
          await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
          log('Saved new department to departments.json', true);
        } else {
          logUser('Invalid choice, skipping department...');
          return;
        }
      }
    } else {
      log(`Direct match by organizational code: ${matchedDepartment.organizationalCode}`, true);
      stats.departmentsMatched++;
      matchConfidence = 100;
      
      // ## Step 3.3  Prompt to update departments.json if different or new #########################################################
      if (departmentDescription) {
        log('Step 3.3  Prompt to update departments.json if different or new #########################################################', true);
        
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
    
    // ## Step 4.1: Program Extract #########################################################
    let programDescriptions = extractProgramDescriptions(normalizedContent);
    log(`Found ${programDescriptions.length} program descriptions`, true);
    
    // ## Step 5.1: Budget Extract #########################################################
    const budgetData = extractBudgetAllocations(normalizedContent, orgCode);
    log(`Found ${budgetData ? budgetData.length : 0} budget allocations`, true);
    
    // If no program descriptions found, use budget allocations
    if (programDescriptions.length === 0 && budgetData && budgetData.length > 0) {
      // Get unique project codes from budget allocations
      const uniqueProjectCodes = Array.from(new Set(budgetData.map(a => a.projectCode)));
      
      programDescriptions = uniqueProjectCodes.map(projectCode => {
        const allocations = budgetData.filter(a => a.projectCode === projectCode);
        const programName = allocations[0]?.programName || `Program ${projectCode}`;
        log(`Found program code: ${projectCode} -> project code: ${projectCode}000, program name: ${programName}`, true);
        return {
          projectCode: `${projectCode}000`,
          name: programName,
          description: '' // Empty description since we're using budget data
        };
      });
      
      log(`Created ${programDescriptions.length} program entries from budget allocations`, true);
    }
    
    // ## Step 4.2: Program Compare #########################################################
    let programAnalysis = { newPrograms: 0, updatedPrograms: 0 };
    if (programDescriptions.length > 0) {
      programAnalysis = analyzeProgramDescriptions(programDescriptions, programsData, fileName);
      // Update program data after analysis
      for (const progDesc of programDescriptions) {
        updateProgramData(progDesc, programsData, fileName);
      }
    }
    
    // ## Step 5.2: Budget Compare  #########################################################
    let budgetAnalysis = { newAllocations: 0, overwriteAllocations: 0, overwriteDetails: [] as string[] };
    if (budgetData && budgetData.length > 0) {
      budgetAnalysis = analyzeBudgetAllocations(budgetData, budgetsData);
    }
    
    // ## Step 5.3: Fund Compare #########################################################
    let fundAnalysis = { newFunds: 0, updatedFunds: 0, fundDetails: [] as Array<{fundCode: string, fundName: string, status: 'new' | 'updated' | 'existing'}> };
    if (budgetData && budgetData.length > 0) {
      fundAnalysis = analyzeFundData(budgetData, fundsData);
      // log(`Fund analysis: ${fundAnalysis.newFunds} new, ${fundAnalysis.updatedFunds} updated, ${fundAnalysis.fundDetails.length} total unique funds`, true);
    }
    
    // Check if there are any changes needed
    const hasDepartmentChanges = newDepartmentCreated || descriptionUpdated;
    const hasProgramBudgetChanges = programDescriptions.length > 0 || budgetData.length > 0;
    const hasFundChanges = fundAnalysis.newFunds > 0 || fundAnalysis.updatedFunds > 0;
    const hasAnyChanges = hasDepartmentChanges || hasProgramBudgetChanges || hasFundChanges;
    
    // Display results summary
    log(`  Matched to: ${matchedDepartment.name} (${matchConfidence}% confidence)`);
    
    // Show description status
    if (departmentDescription) {
      const existingDesc = matchedDepartment.description || '';
      const hasExistingDescription = existingDesc.trim().length > 0;
      
      if (!hasExistingDescription) {
        log(`  Description: missing/empty → will add new description`);
      } else if (descriptionUpdated) {
        const normalizedExisting = existingDesc.replace(/\s+/g, ' ').trim();
        const normalizedExtracted = departmentDescription.replace(/\s+/g, ' ').trim();
        const similarity = calculateStringSimilarity(normalizedExisting, normalizedExtracted);
        log(`  Description: ${similarity}% similarity → will update`);
      } else {
        log(`  Description: matches existing (no update needed)`);
      }
    } else {
      log(`  Description: none found in budget file`);
    }
    

    
    // Show program analysis
    if (programDescriptions.length > 0) {
      const source = programDescriptions[0].description ? 'program descriptions' : 'budget allocations';
      if (programAnalysis.newPrograms > 0 && programAnalysis.updatedPrograms > 0) {
        log(`  Programs: ${programDescriptions.length} found from ${source} (${programAnalysis.newPrograms} new, ${programAnalysis.updatedPrograms} updated)`);
      } else if (programAnalysis.newPrograms > 0) {
        log(`  Programs: ${programDescriptions.length} found from ${source} (${programAnalysis.newPrograms} new)`);
      } else if (programAnalysis.updatedPrograms > 0) {
        log(`  Programs: ${programDescriptions.length} found from ${source} (${programAnalysis.updatedPrograms} updated)`);
      } else {
        log(`  Programs: ${programDescriptions.length} found from ${source} (all already exist with same descriptions)`);
      }
    } else {
      log(`  Programs: no program descriptions found`);
    }
    
    // Show detailed budget allocation counts
    if (budgetData && budgetData.length > 0) {
      if (budgetAnalysis.overwriteAllocations > 0) {
        log(`  Budget allocations: ${budgetAnalysis.newAllocations} new, ${budgetAnalysis.overwriteAllocations} will overwrite existing`);
      } else {
        log(`  Budget allocations: ${budgetAnalysis.newAllocations} new`);
      }
    } else {
      log(`  Budget allocations: none found`);
    }
    
    // Show fund analysis
    if (fundAnalysis.fundDetails.length > 0) {
      if (fundAnalysis.newFunds > 0 && fundAnalysis.updatedFunds > 0) {
        log(`  Funds: ${fundAnalysis.fundDetails.length} found (${fundAnalysis.newFunds} new, ${fundAnalysis.updatedFunds} updated)`);
      } else if (fundAnalysis.newFunds > 0) {
        log(`  Funds: ${fundAnalysis.fundDetails.length} found (${fundAnalysis.newFunds} new)`);
      } else if (fundAnalysis.updatedFunds > 0) {
        log(`  Funds: ${fundAnalysis.fundDetails.length} found (${fundAnalysis.updatedFunds} updated)`);
      } else {
        log(`  Funds: ${fundAnalysis.fundDetails.length} found (all already exist with same names)`);
      }
    } else {
      log(`  Funds: none found`);
    }
    
    if (!hasAnyChanges) {
      log('\n  ✓ Department already exists and is up-to-date');
      log('  → No changes needed - skipping approval and moving to next section');
      log('No changes needed - skipping approval and moving to next section');
      return;
    }
    
    // ## Step 3.3 Prompt to update departments.json if different or new #########################################################
    if (hasDepartmentChanges && !newDepartmentCreated) {
      log('\n' + '='.repeat(80));
      log('DEPARTMENT CHANGES APPROVAL - Will update: departments.json');
      log('='.repeat(80));
      if (descriptionUpdated) {
        const existingDesc = matchedDepartment.description || '';
        const hasExistingDescription = existingDesc.trim().length > 0;
        
        if (!hasExistingDescription) {
          log(`  - Add department description (currently missing/empty)`);
        } else {
          const normalizedExisting = existingDesc.replace(/\s+/g, ' ').trim();
          const normalizedExtracted = departmentDescription.replace(/\s+/g, ' ').trim();
          const similarity = calculateStringSimilarity(normalizedExisting, normalizedExtracted);
          log(`  - Update department description (${similarity}% similarity with existing)`);
        }
        
        log('\nEXISTING DESCRIPTION:');
        log(`"${existingDesc || '(empty or missing)'}"`);
        log('\nEXTRACTED DESCRIPTION WITH LINE NUMBERS:');
        
        // Show extracted description with line numbers
        const descriptionLines = departmentDescription.split('\n');
        descriptionLines.forEach((line, index) => {
          log(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
        });
      }
      log('\n' + '-'.repeat(80));
      
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
          logUser('Keeping existing description...');
          logUser('User chose to keep existing description');
          descriptionUpdated = false; // Reset the flag
        } else {
          logUser('Skipping department changes...');
          logUser('User chose not to approve department changes');
        }
        // Continue to check for program/budget changes
      } else if (deptApproval === 'y' || deptApproval === 'u') {
        // Apply department changes
        if (descriptionUpdated) {
          matchedDepartment.description = departmentDescription;
        }
        log('Saving department changes to departments.json...');
        await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
        log('✓ Department changes saved');
        log('Department changes applied and saved', true);
      } else if (deptApproval === 'c') {
        // Crop and update description
        if (descriptionUpdated) {
          const descriptionLines = departmentDescription.split('\n');
          log(`\nDescription has ${descriptionLines.length} lines. Specify which lines to keep:`);
          log('Examples: "1-10" (keep lines 1 through 10), "1-5,8-12" (keep lines 1-5 and 8-12)');
          
          const cropInput = promptUser('Lines to keep (or "all" to keep everything): ').trim();
          logUser(`User crop input: ${cropInput}`);
          
          if (cropInput.toLowerCase() === 'all') {
            matchedDepartment.description = departmentDescription;
            log('Keeping all lines...');
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
              
              log(`\nCropped description (${croppedLines.length} lines):`);
              log(`"${croppedDescription}"`);
              
              log(`Description cropped to ${croppedLines.length} lines`, true);
            } catch (error: any) {
              log(`Error parsing crop input: ${error.message}`);
              log('Using full description instead...');
              matchedDepartment.description = departmentDescription;
            }
          }
        }
        log('Saving department changes to departments.json...');
        await saveJsonFile(DEPARTMENTS_FILE, departmentsData);
        log('✓ Department changes saved');
        log('Department changes applied and saved', true);
      } else {
        logUser('User provided invalid choice for department changes');
      }
    } else if (newDepartmentCreated) {
      // New department was already created and saved during interactive process
      log('New department already created and saved during interactive process - skipping approval', true);
    }
    
    // ## Step 5.5 Prompt to update budgets.json if different or new #########################################################
    if (hasProgramBudgetChanges || hasFundChanges) {
      log('='.repeat(80));
      log('PROGRAM, BUDGET & FUND CHANGES APPROVAL');

      if (programAnalysis.newPrograms > 0 && programAnalysis.updatedPrograms > 0) {
        log(`  - Add ${programAnalysis.newPrograms} new programs and update ${programAnalysis.updatedPrograms} existing programs in programs.json`);
      } else if (programAnalysis.newPrograms > 0) {
        log(`  - Add ${programAnalysis.newPrograms} new programs in programs.json`);
      } else if (programAnalysis.updatedPrograms > 0) {
        log(`  - Update ${programAnalysis.updatedPrograms} existing programs in programs.json`);
      }
      if (budgetData && budgetData.length > 0) {
        if (budgetAnalysis.newAllocations > 0) {
          log(`  - Process ${budgetAnalysis.newAllocations} new budget allocations`);
        }
        if (budgetAnalysis.overwriteAllocations > 0) {
          log(`  - Process ${budgetAnalysis.overwriteAllocations} budget allocation overwrites`);
          if (budgetAnalysis.overwriteDetails.length > 0) {
            log('OVERWRITE DETAILS:');
            budgetAnalysis.overwriteDetails.slice(0, 5).forEach(detail => {
              log(`    ${detail}`);
            });
            if (budgetAnalysis.overwriteDetails.length > 5) {
              log(`    ... and ${budgetAnalysis.overwriteDetails.length - 5} more`);
            }
          }
        }
      }
      if (fundAnalysis.newFunds > 0 || fundAnalysis.updatedFunds > 0) {
        if (fundAnalysis.newFunds > 0) {
          log(`  - Add ${fundAnalysis.newFunds} new funds to funds.json`);
        }
        if (fundAnalysis.updatedFunds > 0) {
          log(`  - Update ${fundAnalysis.updatedFunds} existing fund names in funds.json`);
        }
        if (fundAnalysis.fundDetails.length > 0) {
          log('\n  FUND DETAILS:');
          fundAnalysis.fundDetails.slice(0, 10).forEach(fund => {
            const statusIcon = fund.status === 'new' ? '+ NEW' : fund.status === 'updated' ? '~ UPD' : '= SAME';
            log(`    ${statusIcon}: ${fund.fundCode} - ${fund.fundName}`);
          });
          if (fundAnalysis.fundDetails.length > 10) {
            log(`    ... and ${fundAnalysis.fundDetails.length - 10} more`);
          }
        }
      }
      log('-'.repeat(80));
      
      const progBudgetApproval = promptUser('Approve program, budget & fund changes? (y/n/s) - y=yes, n=no, s=skip file: ').toLowerCase();
      logUser(`User program/budget/fund approval response: ${progBudgetApproval}`);
      
      if (progBudgetApproval === 's') {
        logUser('User requested to skip file processing');
        throw new Error('User requested to skip file processing');
      } else if (progBudgetApproval !== 'y') {
        logUser('User chose not to approve program/budget/fund changes');
      } else {
        // Apply program, budget, and fund changes
        log('Processing program, budget & fund changes...');
        
        // ## Step 4.3: Program Update without prompt #########################################################
        if (programDescriptions.length > 0) {
          stats.programsFound += programDescriptions.length;
          for (const progDesc of programDescriptions) {
            updateProgramData(progDesc, programsData, fileName);
          }
          log('✓ Program descriptions processed');
        }
        
        // ## Step 5.4: Budget Update  #########################################################
        if (budgetData && budgetData.length > 0) {
          updateBudgetData(budgetData, budgetsData);
          log('✓ Budget allocations processed');
        }
        
        // ## Step 5.5: Funds Update  #########################################################
        if (budgetData && budgetData.length > 0 && (fundAnalysis.newFunds > 0 || fundAnalysis.updatedFunds > 0)) {
          updateFundData(budgetData, fundsData);
          log('✓ Fund data processed');
        }
        
        // Save program, budget, and fund data
        log('Saving changes to programs.json, budgets.json, and funds.json...');
        await saveJsonFile(PROGRAMS_FILE, programsData);
        await saveJsonFile(BUDGETS_FILE, budgetsData);
        await saveJsonFile(FUNDS_FILE, fundsData);
        log('✓ Program, budget & fund changes saved');
        log('Program, budget, and fund changes applied and saved', true);
      }
    }
    
    log('Section processing complete\n');
    
  } catch (error: any) {
    log(`Error processing department section: ${error.message}`, true, true);
    if (error.message.includes('skip file')) {
      throw error;
    }
  }
}

// ## Step 4.1: Program Extract #########################################################
function extractProgramDescriptions(sectionContent: string): Array<{ projectCode: string, name: string, description: string }> {
  const programs: Array<{ projectCode: string, name: string, description: string }> = [];
  
  log('Step 4.1: Program Extract #########################################################', true);
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
      line.text.trim() === 'PROGRAM DESCRIPTIONS'
    );

    // ## Step 4.1: No program descriptions section found #########################################################

    if (programDescIndex === -1) {
      log('Step 4.1: No program descriptions section found', true);
      return programs;
    }
    
    // Find end of program descriptions - look for any of these section headers
    const endSectionHeaders = [
      'DETAILED EXPENDITURES BY PROGRAM',
      'EXPENDITURES BY CATEGORY',
      'DETAIL OF APPROPRIATIONS AND ADJUSTMENTS',
      'CHANGES IN AUTHORIZED POSITIONS'
    ];
    
    const endIndices = endSectionHeaders.map(header => 
      processedLines.findIndex((line, idx) => 
        idx > programDescIndex && line.text.trim() === header
      )
    ).filter(idx => idx !== -1);
    
    const endIndex = endIndices.length > 0 ? Math.min(...endIndices) : processedLines.length;

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
    if (headerXArray.length === 0) {
      log('Step 4.1: No program headers found', true);
      return programs;
    }
    
    const mainHeaderX = headerXArray[0]; // Leftmost x-coordinate is main program header
    log(`Step 4.1: Found program header x-coordinate at ${mainHeaderX}`, true);

    // Second pass: extract programs and descriptions
    log('Step 4.1: Extracting program descriptions', true);
    for (let i = programDescIndex + 1; i < endIndex; i++) {
      const line = processedLines[i];
      const text = line.text.trim();

      if (!text) continue;

      // Skip continuation headers
      if (text.match(/^.*\s*-\s*Continued\s*$/)) {
        continue;
      }

      // Check for program headers using x-coordinate and pattern
      if (line.x === mainHeaderX && isProjectCode(text)) {
        // Save previous program if exists
        if (currentProgram) {
          const description = currentProgram.description
            .join('\n')
            .trim()
            .replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double newline
          
          // Always add the program, even if it doesn't have a description
          programs.push({
            projectCode: currentProgram.projectCode,
            name: currentProgram.name,
            description: description
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

        // Look for program name on next lines
        let j = i + 1;
        let nameLines: string[] = [];
        while (j < endIndex) {
          const nextLine = processedLines[j];
          if (!nextLine || !nextLine.text.trim() || isProjectCode(nextLine.text.trim())) {
            break;
          }
          // Name should be at same x-coordinate or slightly indented
          if (nextLine.x >= line.x && nextLine.x < line.x + 50) {
            nameLines.push(nextLine.text.trim());
            j++;
          } else {
            break;
          }
        }
        
        if (nameLines.length > 0) {
          currentProgram.name = nameLines.join(' ').trim();
          i = j - 1; // Skip processed name lines
        }
        continue;
      }

      // Add to description if we have a current program and line is indented
      if (currentProgram && line.x > mainHeaderX) {
        // Skip lines that look like amounts or page numbers
        if (!text.match(/^[\d,\.\$\-]+$/) && !text.match(/^Page \d+$/)) {
          currentProgram.description.push(text);
        }
      }
    }

    // Add final program if exists
    if (currentProgram) {
      const description = currentProgram.description
        .join('\n')
        .trim()
        .replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double newline
      
      // Always add the program, even if it doesn't have a description
      programs.push({
        projectCode: currentProgram.projectCode,
        name: currentProgram.name,
        description: description
      });
    }

    // Validate results
    if (programs.length > 0) {
      log(`Step 4.1: Extracted ${programs.length} program descriptions`, true);
      programs.forEach(prog => {
        log(`Step 4.1: Found program ${prog.projectCode} - ${prog.name}`, true);
      });
    }

    return programs;

  } catch (error: any) {
    log(`Error in program description extraction: ${error.message}`, true, true);
    return programs;
  }
}

// ## Step 4.2: Program Compare  #########################################################
function analyzeProgramDescriptions(
  programDescriptions: Array<{ projectCode: string, name: string, description: string }>,
  programsData: ProgramsJSON,
  fileName: string
): { newPrograms: number; updatedPrograms: number } {
  let newPrograms = 0;
  let updatedPrograms = 0;
  
  log('## Step 4.2: Program Compare  #########################################################', true);
  for (const progDesc of programDescriptions) {
    log(`Checking program ${progDesc.projectCode} - ${progDesc.name} in programs.json`, true);
    const existingProgram = programsData.programs.find(p => p.projectCode === progDesc.projectCode) as Program | undefined;
    
    if (!existingProgram) {
      log(`Program ${progDesc.projectCode} not found in programs.json`, true);
      newPrograms++;
    } else {
      log(`Found existing program ${progDesc.projectCode} in programs.json`, true);
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

// ## Step 5.1: Budget Extract  #########################################################
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
  fiscalYear: string,
  programName?: string
}> {
  const results: Array<{
    projectCode: string,
    organizationCode: string,
    fundingType: FundingType,
    fundCode: string,
    fundName: string,
    amount: number,
    fiscalYear: string,
    programName?: string
  }> = [];
  
  log('## Step 5.1: Budget Extract  #########################################################', true);
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
      line.text.trim() === 'DETAILED EXPENDITURES BY PROGRAM'
    );

    if (detailedExpIndex === -1) {
      log('No detailed expenditures section found', true);
      return results;
    }
    
    log(`Found DETAILED EXPENDITURES BY PROGRAM at line ${detailedExpIndex + 1}`, true);

    // Find end of budget section (Totals, Expenditures)
    const expByCategoryIndex = processedLines.findIndex((line, idx) => 
      idx > detailedExpIndex && 
      line.text.trim()
        .replace(/\s+/g, ' ')  // normalize spaces
        .match(/^Totals[.,\s]*Expenditures\b/)
    );

    if (expByCategoryIndex === -1) {
      log('Warning - No Totals, Expenditures marker found, will process until end', true);
    }
    
    const sectionEndIndex = expByCategoryIndex !== -1 ? expByCategoryIndex + 1 : processedLines.length;
    log(`Budget section ends at line ${sectionEndIndex}`, true);

    const fiscalYears: string[] = [];
    let yearStartIndex = -1;

    // Debug: Show first 5 and last 5 lines around the budget section
    log('First 5 lines after section header:', true);
    for (let i = detailedExpIndex + 1; i < Math.min(detailedExpIndex + 6, processedLines.length); i++) {
      const line = processedLines[i];
      log(`Line ${i + 1}: "${line.text}" (x: ${line.x}, y: ${line.y})`, true);
    }

    log('Last 5 lines before section end:', true);
    const startLastFive = Math.max(detailedExpIndex + 1, sectionEndIndex - 5);
    for (let i = startLastFive; i < sectionEndIndex; i++) {
      const line = processedLines[i];
      log(`Line ${i + 1}: "${line.text}" (x: ${line.x}, y: ${line.y})`, true);
    }

    // Look for fiscal years after DETAILED EXPENDITURES
    log('Scanning for fiscal year headers', true);
    // Look for fiscal year pattern
    for (let i = detailedExpIndex + 1; i < Math.min(detailedExpIndex + 10, processedLines.length); i++) {
      const line = processedLines[i];
      const text = line.text.trim();
      
      // First try to match multiple years on one line
      const multiYearMatches = text.match(/(\d{4}-\d{2})[*\s]+(\d{4}-\d{2})[*\s]+(\d{4}-\d{2})[*\s]*/);
      if (multiYearMatches) {
        log(`Found multiple fiscal years on line ${i + 1}: "${text}"`, true);
        const years = [multiYearMatches[1], multiYearMatches[2], multiYearMatches[3]];
        
        // Validate each year
        let allValid = true;
        years.forEach(year => {
          const [fullYear, shortYear] = year.split('-').map(y => parseInt(y));
          if (shortYear !== (fullYear + 1) % 100) {
            log(`Invalid fiscal year format: ${year}`, true);
            allValid = false;
          }
        });
        
        if (allValid) {
          fiscalYears.push(...years);
          yearStartIndex = i;
          log(`Validated fiscal years: ${years.join(', ')}`, true);
          break;
        }
      }
    }

    if (fiscalYears.length !== 3) {
      log(`Failed to find all three fiscal years. Found: ${fiscalYears.join(', ')}`, true);
      return results;
    }

    let currentProjectCode = '';
    let currentFundingType: FundingType | null = null;
    let currentFundCode = '';
    let continuedLine = '';
    let currentProgramName = '';
    
    // Track funds within current funding type group
    let currentFundGroup: Array<{
      fundCode: string,
      fundName: string,
      amounts: number[]
    }> = [];
    
    // Process lines after fiscal years until section end
    for (let i = yearStartIndex + 1; i < sectionEndIndex; i++) {
      const line = processedLines[i];
      const text = line.text.trim();

      // Skip empty lines
      if (!text) continue;

      // Check for program requirements section
      const programType = text.match(/^(?:PROGRAM|SUBPROGRAM)\s+REQUIREMENTS$/);
      if (programType) {
        // Reset program code and fund group - we expect a new one
        currentProjectCode = '';
        currentFundGroup = [];
        log(`Found: ${text}`, true);
        continue;
      }

      // Processing funding type markers    
      if (text === 'State Operations:' || text === 'Local Assistance:') {
        // Process any remaining funds in current group before switching funding type
        if (currentFundGroup.length > 0 && currentFundingType !== null) {
          for (const fund of currentFundGroup) {
            for (let j = 0; j < 3; j++) {
              results.push({
                projectCode: currentProjectCode || orgCode + '000',
                organizationCode: orgCode,
                fundingType: currentFundingType,
                fundCode: fund.fundCode,
                fundName: fund.fundName,
                amount: fund.amounts[j],
                fiscalYear: fiscalYears[j],
                programName: currentProgramName || undefined
              });
            }
          }
          currentFundGroup = [];
        }

        currentFundingType = text === 'State Operations:' ? 0 : 1;
        log(`Processing funding type: ${text} line ${i + 1}`, true);
        continue;
      }

      // Check for totals line
      if (text.match(/^Totals[.,\s]*[^$]+$/)) {
        // Process any remaining funds in current group
        if (currentFundGroup.length > 0 && currentFundingType !== null) {
          for (const fund of currentFundGroup) {
            for (let j = 0; j < 3; j++) {
              results.push({
                projectCode: currentProjectCode || orgCode + '000',
                organizationCode: orgCode,
                fundingType: currentFundingType,
                fundCode: fund.fundCode,
                fundName: fund.fundName,
                amount: fund.amounts[j],
                fiscalYear: fiscalYears[j],
                programName: currentProgramName || undefined
              });
            }
          }
          currentFundGroup = [];
        }
        continue;
      }

      // If we're in a funding type group, prioritize fund detection
      if (currentFundingType !== null && line.x < 100) {
        log(`Checking line ${i + 1}: "${text}"`, true);
        
        // Parse fund code, name and amounts all on one line
        const fundAmountMatch = text.match(/^(\d{4})\s+(.*?)\s+([\$\d,\-]+)\s+([\$\d,\-]+)\s+([\$\d,\-]+)$/);
        if (fundAmountMatch) {
          const fundCode = fundAmountMatch[1];
          const fundName = fundAmountMatch[2].trim();
          const lineAmounts = [
            parseAmount(fundAmountMatch[3]),
            parseAmount(fundAmountMatch[4]), 
            parseAmount(fundAmountMatch[5])
          ];
          
          log(`✓ Parsed fund line ${i + 1}:`, true);
          log(`   Fund: ${fundCode} - ${fundName}`, true);
          log(`   Amounts: ${lineAmounts.join(', ')}`, true);

          // Add to current fund group
          currentFundGroup.push({
            fundCode,
            fundName,
            amounts: lineAmounts
          });

          log(`Added fund ${fundCode} to current group`, true);
          continue;
        }

        // Check for multi-line fund entries
        // First line: fund code and start of name
        const fundStartMatch = text.match(/^(\d{4})\s+(.+)$/);
        if (fundStartMatch && !fundAmountMatch) {
          currentFundCode = fundStartMatch[1];
          continuedLine = fundStartMatch[2];
          log(`Found potential multi-line fund entry starting at line ${i + 1}:`, true);
          log(`   Fund code: ${currentFundCode}`, true);
          log(`   Initial text: ${continuedLine}`, true);
          continue;
        }

        // Continuation line with amounts
        if (currentFundCode && continuedLine) {
          // Try to match amounts at the end of this line
          const amountMatch = text.match(/(.*?)\s+([\$\d,\-]+)\s+([\$\d,\-]+)\s+([\$\d,\-]+)$/);
          if (amountMatch) {
            // Check if this is a totals line
            if (text.trim().startsWith('Totals')) {
              log(`Found totals line, stopping fund processing`, true);
              // Process any remaining funds in current group
              if (currentFundGroup.length > 0 && currentFundingType !== null) {
                for (const fund of currentFundGroup) {
                  for (let j = 0; j < 3; j++) {
                    results.push({
                      projectCode: currentProjectCode || orgCode + '000',
                      organizationCode: orgCode,
                      fundingType: currentFundingType,
                      fundCode: fund.fundCode,
                      fundName: fund.fundName,
                      amount: fund.amounts[j],
                      fiscalYear: fiscalYears[j],
                      programName: currentProgramName || undefined
                    });
                  }
                }
                currentFundGroup = [];
              }
              // Reset continuation tracking
              continuedLine = '';
              currentFundCode = '';
              continue;
            }

            const fundName = (continuedLine + ' ' + amountMatch[1]).trim();
            const lineAmounts = [
              parseAmount(amountMatch[2]),
              parseAmount(amountMatch[3]),
              parseAmount(amountMatch[4])
            ];

            log(` ✓ Parsed fund multi-line line ${i + 1}:`, true);
            log(`   Fund: ${currentFundCode} - ${fundName}`, true);
            log(`   Amounts: ${lineAmounts.join(', ')}`, true);

            // Add to current fund group
            currentFundGroup.push({
              fundCode: currentFundCode,
              fundName,
              amounts: lineAmounts
            });

            log(`Added fund ${currentFundCode} to current group`, true);
            
            // Reset continuation tracking
            continuedLine = '';
            currentFundCode = '';
          }
        }

        // If we get here and we're in a funding type group, this line might be a fund
        // that doesn't match our patterns - log it for debugging
        log(`Potential fund line not matched: "${text}"`, true);
        continue;
      }

      // Only check for program codes if we're not in a funding type group
      if (!currentFundingType) {
        // Check for program code and name
        const programMatch = text.match(/^(\d{4})\s+([^$]+)$/);
        if (line.x < 100 && programMatch) {
          const [_, code, name] = programMatch;
          currentProjectCode = code + '000';
          currentProgramName = name.trim();  // Set the program name
          log(`Found program code: ${code} -> project code: ${currentProjectCode}, program name: ${currentProgramName}`, true);
          
          // Process any remaining funds in current group before resetting
          if (currentFundGroup.length > 0 && currentFundingType !== null) {
            for (const fund of currentFundGroup) {
              for (let j = 0; j < 3; j++) {
                results.push({
                  projectCode: currentProjectCode || orgCode + '000',
                  organizationCode: orgCode,
                  fundingType: currentFundingType,
                  fundCode: fund.fundCode,
                  fundName: fund.fundName,
                  amount: fund.amounts[j],
                  fiscalYear: fiscalYears[j],
                  programName: currentProgramName || undefined
                });
              }
            }
            currentFundGroup = [];
          }

          currentProjectCode = programMatch[1] + '000';  // Convert 4-digit to 7-digit
          let programName = programMatch[2].trim();
                  
          // Check next non-blank line for continuation
          let nextLineIndex = i + 1;
          while (nextLineIndex < processedLines.length && !processedLines[nextLineIndex].text.trim()) {
            nextLineIndex++;
          }
          if (nextLineIndex < processedLines.length) {
            const nextLine = processedLines[nextLineIndex];          
            if (nextLine.x < 100 && 
                !nextLine.text.match(/^(State Operations|Local Assistance|Totals[.,\s]*)/)) {
              // eslint-disable-next-line no-unused-vars
                  programName += ' ' + nextLine.text.trim();
              i = nextLineIndex + 1; // Skip to the line after the continuation
            }
          }
        }

        // Check for subprogram code and name
        const subprogramMatch = text.match(/^\d{7}\s+([^$]+)$/);
        if (line.x < 100 && subprogramMatch) {
          // Process any remaining funds in current group before resetting
          if (currentFundGroup.length > 0 && currentFundingType !== null) {
            for (const fund of currentFundGroup) {
              for (let j = 0; j < 3; j++) {
                results.push({
                  projectCode: currentProjectCode || orgCode + '000',
                  organizationCode: orgCode,
                  fundingType: currentFundingType,
                  fundCode: fund.fundCode,
                  fundName: fund.fundName,
                  amount: fund.amounts[j],
                  fiscalYear: fiscalYears[j],
                  programName: currentProgramName || undefined
                });
              }
            }
            currentFundGroup = [];
          }

          currentProjectCode = subprogramMatch[1];  // Use full 7-digit code
          log(`Found subprogram code: ${currentProjectCode} program name: ${subprogramMatch[2].trim()}`, true);
          continue;
        }
      }
    }

    // Process any remaining funds in the last group
    if (currentFundGroup.length > 0 && currentFundingType !== null) {
      for (const fund of currentFundGroup) {
        for (let j = 0; j < 3; j++) {
          results.push({
            projectCode: currentProjectCode || orgCode + '000',
            organizationCode: orgCode,
            fundingType: currentFundingType,
            fundCode: fund.fundCode,
            fundName: fund.fundName,
            amount: fund.amounts[j],
            fiscalYear: fiscalYears[j],
            programName: currentProgramName || undefined
          });
        }
      }
    }

    log(`Processed ${results.length / 3} budget allocations`, true);
    return results;

  } catch (error: any) {
    log(`Error extracting budget allocations: ${error.message}`, true, true);
    return results;
  }
}

// ## Step 4.3: Program Update without prompt #########################################################
function updateProgramData(
  programData: { projectCode: string, name: string, description: string },
  programsData: ProgramsJSON,
  fileName: string
): void {
  let program = programsData.programs.find(p => p.projectCode === programData.projectCode);
  
  log('## Step 4.3: Program Update without prompt #########################################################', true);
  if (!program) {
    program = {
      projectCode: programData.projectCode,
      name: programData.name,
      programDescriptions: []
    };
    programsData.programs.push(program);
    log(`Adding new program: ${program.name} ${program.projectCode}`, true);
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

// ## Step 5.4: Budget Update  #########################################################
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
  
  log('## Step 5.4: Budget Update  #########################################################', true);
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
      log(`  ✓ ${newAllocationMessage}`);
    } else {
      // Existing fund allocation - overwrite with new data
      const oldAmount = fundAllocation.amount;
      const oldCount = fundAllocation.count;
      
      fundAllocation.amount = allocation.amount;
      fundAllocation.count = 1; // Reset count to 1 for the new data
      
      stats.budgetAllocationsOverwritten++;
      
      const overwriteMessage = `Overwritten fund allocation for ${allocation.organizationCode}-${allocation.projectCode}-${allocation.fundCode} (${allocation.fiscalYear}): $${oldAmount} (count: ${oldCount}) → $${allocation.amount} (count: 1)`;
      log(overwriteMessage, true);
      log(`  ⚠️  ${overwriteMessage}`);
    }
  }
}

// ## Step 5.2: Budget Compare  #########################################################
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
  
  log('## Step 5.2: Budget Compare  #########################################################', true);
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

// ## Step 5.3: Fund Compare  #########################################################
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
  
  log('## Step 5.3: Fund Compare  #########################################################', true);
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

// ## Step 5.5: Fund Update  #########################################################
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
  
  log('## Step 5.5: Fund Update  #########################################################', true);
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

// ## Step 2.3.b Review Sections  #########################################################
const processReviewSections = async (
  reviewSections: ReviewSection[],
  lines: string[]
): Promise<Section[]> => {
  const sections: Section[] = [];
  const prompt = promptSync({ sigint: true });

  log('\nStep 2.3.b Review Sections  #########################################################', true);
  log(`Found ${reviewSections.length} sections to process`, true);

  for (let i = 0; i < reviewSections.length; i++) {
    const skipped = reviewSections[i];
    log(`\nProcessing skipped section ${i + 1}/${reviewSections.length}:`, true);
    log(`Search range: lines ${skipped.searchStartLine}-${skipped.markerLine}`, true);

    // Display summary of previous section
    if (skipped.previousSectionHeader) {
      log('\nPrevious Section Summary:', true);
      log(`  Header: ${skipped.previousSectionHeader}`, true);
      log(`  Ended at line: ${skipped.previousSectionEndLine}`, true);
    }

    // Display text between previous marker and current marker
    log('\nText between markers:', true);
    log('-------------------', true);
    
    // Find all continuation headers in the range
    const continuationHeadersInRange: Array<{
      lineNum: number,
      text: string,
      group: string,
      isPreviousSection: boolean
    }> = [];

    // Add previous section's continuation headers
    if (skipped.previousSectionHeader) {
      for (let j = skipped.searchStartLine - 1; j < skipped.markerLine; j++) {
        const line = lines[j].trim();
        const strippedLine = line.replace(/\[\d+:\d+:\d+,\d+\]\s*/, '').trim();
        if (strippedLine.includes('- Continued')) {
          continuationHeadersInRange.push({
            lineNum: j + 1,
            text: strippedLine,
            group: skipped.previousSectionHeader,
            isPreviousSection: true
          });
        }
      }
    }

    // Add other continuation headers
    for (let j = skipped.searchStartLine - 1; j < skipped.markerLine; j++) {
      const line = lines[j].trim();
      const strippedLine = line.replace(/\[\d+:\d+:\d+,\d+\]\s*/, '').trim();
      if (strippedLine.includes('- Continued') && 
          !continuationHeadersInRange.some(h => h.lineNum === j + 1)) {
        continuationHeadersInRange.push({
          lineNum: j + 1,
          text: strippedLine,
          group: 'Other Section',
          isPreviousSection: false
        });
      }
    }

    // Display text with highlighted markers
    for (let j = skipped.searchStartLine - 1; j < skipped.markerLine; j++) {
      const line = lines[j].trim();
      const strippedLine = line.replace(/\[\d+:\d+:\d+,\d+\]\s*/, '').trim();
      
      // Skip blank lines
      if (!strippedLine) continue;
      
      // Check if this line is a continuation header
      const continuationHeader = continuationHeadersInRange.find(h => h.lineNum === j + 1);
      if (continuationHeader) {
        const markerType = continuationHeader.isPreviousSection ? 'Previous Section' : 'Other Section';
        log(`  [${markerType}] Line ${j + 1}: "${strippedLine}"`, true);
      } else {
        log(`  Line ${j + 1}: "${strippedLine}"`, true);
      }
    }

    // Display potential section headers
    const potentialHeaders: Array<{lineNum: number, text: string}> = [];
    log('\nPotential section headers found:', true);
    
    for (let j = skipped.searchStartLine - 1; j < skipped.markerLine; j++) {
      const line = lines[j].trim();
      const strippedLine = line.replace(/\[\d+:\d+:\d+,\d+\]\s*/, '').trim();
      
      // Look for lines starting with 4 digits followed by text
      if (strippedLine.match(/^\d{4}\s+[^-]/)) {
        potentialHeaders.push({
          lineNum: j + 1,
          text: strippedLine
        });
        log(`  ${potentialHeaders.length}. Line ${j + 1}: "${strippedLine}"`, true);
      }
    }

    if (potentialHeaders.length === 0) {
      log('No potential headers found in this range.', true);
      continue;
    }

    // Ask user to select the correct header
    log('\nPlease select the correct section header by number (or press Enter to skip):', true);
    const selection = prompt('Selection: ').trim();

    if (!selection) {
      log('Skipping this section.', true);
      continue;
    }

    const selectedIndex = parseInt(selection) - 1;
    if (selectedIndex < 0 || selectedIndex >= potentialHeaders.length) {
      log('Invalid selection, skipping this section.', true);
      continue;
    }

    const selectedHeader = potentialHeaders[selectedIndex];
    const match = selectedHeader.text.match(/^(\d{4})\s+(.+)$/);
    
    if (match) {
      const [, orgCode, departmentName] = match;
      log(`Selected header: ${orgCode} - ${departmentName}`, true);

      // Create new section
      sections.push({
        orgCode,
        departmentName: departmentName.trim(),
        content: lines.slice(selectedHeader.lineNum - 1, skipped.markerLine).join('\n'),
        startLine: selectedHeader.lineNum
      });

      log(`✓ Section created with header at line ${selectedHeader.lineNum}`, true);
    }
  }

  return sections;
};

// Start the script execution
main().then(() => {
  const finalMessage = `Processing completed successfully - logs written to: ${logger.getLogFile()}`;
  log(finalMessage);
  logger.log('Processing completed successfully');
}).catch((error: any) => {
  const errorMessage = `Error: ${error.message}`;
  log(errorMessage);
  logger.error(`Unhandled error: ${error.message}`);
  logger.error(error.stack || '');
  process.exit(1);
});