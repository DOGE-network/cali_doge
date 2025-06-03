/**
 * Budget Data Text File Processing Script
 * from plan datastructureandlayout.md, step 2. Data Processing Scripts Update, Update Process Budgets Script
 * 
 * Section Detection Rules:
 * 1. Coordinate-Based Processing:
 *    - Uses x,y coordinates from PDF text extraction
 *    - Section headers appear at x < 100
 *    - Content indentation tracked by x-coordinates
 *    - Page boundaries marked with dimensions
 * 
 * 2. Section Header Format:
 *    - Pattern: 4-digit organizational code followed by department name
 *    - Example: "7100   Employment Development Department"
 *    - Headers must appear at x < 100 coordinate
 *    - Continuation headers ("- Continued") used for validation
 *    - Excludes fund/account headers using pattern matching
 * 
 * 3. Section Content Structure:
 *    - Department description text appears at x > header x
 *    - Each section MUST contain expenditure marker
 *    - Expenditure marker: "3-YEAR EXPENDITURES AND POSITIONS" or variants
 *    - Continuation headers required for multi-page sections
 * 
 * 4. Subsection Layout:
 *    - Program descriptions and budget data use consistent x-coordinates
 *    - Program codes appear at leftmost x-coordinate
 *    - Descriptions/names appear indented (higher x-coordinate)
 *    - Budget amounts appear in fixed-width columns
 *    - Amount columns must be evenly spaced
 * 
 * Section Structure and Header Ordering:
 * Each section follows this mandatory structure with coordinate-based validation:
 * 0. Section Header (x < 100) - MANDATORY
 * 1. Department Description (x > header x) - MANDATORY  
 * 2. 3-YEAR EXPENDITURES AND POSITIONS (section start marker) - MANDATORY
 * 
 * Then the following subsection headers appear in order (when present):
 * 3. LEGAL CITATIONS AND AUTHORITY
 * 4. DEPARTMENT AUTHORITY
 * 5. PROGRAM AUTHORITY
 * 6. MAJOR PROGRAM CHANGES
 * 7. DETAILED BUDGET ADJUSTMENTS
 * 8. PROGRAM DESCRIPTIONS
 * 9. DETAILED EXPENDITURES BY PROGRAM
 * 10. EXPENDITURES BY CATEGORY
 * 11. DETAIL OF APPROPRIATIONS AND ADJUSTMENTS
 * 12. CHANGES IN AUTHORIZED POSITIONS
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
import { generateTransactionId } from '../lib/logging';

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
): Promise<Array<{orgCode: string, departmentName: string, content: string}>> {
  const sections: Array<{orgCode: string, departmentName: string, content: string}> = [];
  
  try {
    // Read file content
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const lines = fileContent.split('\n');
    log(`Read ${lines.length} lines from file`, true);
    
    // Stage 1: Find expenditure headers
    const expenditurePattern = /(?:3|THREE)[\s\-]*(?:YR|YEAR|Years?)[\s\-]*EXPENDITURES?(?:[\s\-]*AND[\s\-]*POSITIONS?)?/i;
    const expenditureLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => expenditurePattern.test(line));
    
    log(`Found ${expenditureLines.length} expenditure headers`, true);
    
    // Stage 2: Find continuation headers
    const continuationPattern = /^\[[\d:,]+\]\s*(\d{4})\s+(.+?)\s*-\s*Continued\s*$/;
    const continuedPattern = /^\[[\d:,]+\]\s*-\s*Continued\s*$/;
    const headerPattern = /^\[[\d:,]+\]\s*(\d{4})\s+(.+?)\s*$/;
    
    const continuationHeaders = lines
      .map((line, index) => {
        // First try single-line format
        const match = line.match(continuationPattern);
        if (match) {
          log(`Found continuation line at ${index + 1}: "${line.trim()}"`, true);
          return {
            orgCode: match[1],
            departmentName: match[2].trim(),
            index
          };
        }
        
        // Then try split format (header followed by "- Continued")
        const headerMatch = line.match(headerPattern);
        if (headerMatch && index < lines.length - 2) {
          const nextLine = lines[index + 1];
          const continuedLine = lines[index + 2];
          if (nextLine.trim() === '' && continuedPattern.test(continuedLine)) {
            log(`Found split continuation header at ${index + 1}: "${line.trim()} / ${continuedLine.trim()}"`, true);
            return {
              orgCode: headerMatch[1],
              departmentName: headerMatch[2].trim(),
              index
            };
          }
        }
        
        return null;
      })
      .filter((header): header is NonNullable<typeof header> => header !== null);
    
    log(`Found ${continuationHeaders.length} continuation headers`, true);
    
    // Group continuation headers by org code
    const sectionsByOrgCode = new Map<string, {
      orgCode: string,
      departmentName: string,
      indices: number[]
    }>();
    
    for (const header of continuationHeaders) {
      if (!sectionsByOrgCode.has(header.orgCode)) {
        sectionsByOrgCode.set(header.orgCode, {
          orgCode: header.orgCode,
          departmentName: header.departmentName,
          indices: []
        });
      }
      sectionsByOrgCode.get(header.orgCode)?.indices.push(header.index);
    }
    
    log(`Found ${sectionsByOrgCode.size} sections from ${continuationHeaders.length} continuation headers`, true);
    
    // If we have fewer sections than expenditure headers, look for missing ones
    if (sectionsByOrgCode.size < expenditureLines.length) {
      log(`Missing ${expenditureLines.length - sectionsByOrgCode.size} sections - searching near expenditure markers`, true);
      
      // Track which sections we already have
      const knownSections = new Set(sectionsByOrgCode.keys());
      
      // Look for headers near remaining expenditure markers
      for (const expHeader of expenditureLines) {
        // Look up to 20 lines before expenditure header
        for (let i = Math.max(0, expHeader.index - 20); i < expHeader.index; i++) {
          const line = lines[i];
          const match = line.match(/^\[[\d:,]+\]\s*(\d{4})\s+([^-]+)$/);
          if (match) {
            const orgCode = match[1];
            const departmentName = match[2].trim();
            
            // Skip if we already have this section
            if (knownSections.has(orgCode)) continue;
            
            // Found a potential new section
            log(`Found potential new section at line ${i + 1}: ${orgCode} - ${departmentName}`, true);
            
            // Ask user if this is a valid section header
            consoleOutput('\n' + '='.repeat(80));
            consoleOutput('POTENTIAL NEW SECTION FOUND');
            consoleOutput('='.repeat(80));
            consoleOutput(`At line ${i + 1}:`);
            // Show context
            for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 5); j++) {
              const prefix = j === i ? '>' : ' ';
              consoleOutput(`${prefix} ${j + 1}: ${lines[j]}`);
            }
            
            const isValid = promptUser('\nIs this a valid section header? (y/n): ').toLowerCase() === 'y';
            logUser(`User response for potential section at line ${i + 1}: ${isValid ? 'yes' : 'no'}`);
            
            if (isValid) {
              // Add to sections map
              sectionsByOrgCode.set(orgCode, {
                orgCode,
                departmentName,
                indices: [i]
              });
              knownSections.add(orgCode);
              log(`Added new section: ${orgCode} - ${departmentName}`, true);
              break;
            }
          }
        }
      }
    }
    
    // Now process all found sections
    for (const section of Array.from(sectionsByOrgCode.values())) {
      const firstIndex = Math.min(...section.indices);
      let startIndex = firstIndex;
      
      // Look backwards for main header
      for (let i = firstIndex - 1; i >= Math.max(0, firstIndex - 20); i--) {
        const line = lines[i];
        if (line.includes(section.orgCode) && !line.includes('Continued')) {
          startIndex = i;
          break;
        }
      }
      
      const lastIndex = Math.max(...section.indices);
      let endIndex = lastIndex;
      
      // Look forward for next section or end
      for (let i = lastIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (continuedPattern.test(line) || expenditurePattern.test(line)) {
          endIndex = i - 1;
          break;
        }
      }
      
      sections.push({
            orgCode: section.orgCode,
            departmentName: section.departmentName,
        content: lines.slice(startIndex, endIndex + 1).join('\n')
      });
      
      log(`Added section: ${section.orgCode} - ${section.departmentName}`, true);
      log(`  Content from line ${startIndex + 1} to ${endIndex + 1}`, true);
    }
    
    // Always ask user before returning sections
    if (sections.length === 0) {
      log('No sections found', true);
      return [];
    }
    
    consoleOutput('\n' + '='.repeat(80));
    consoleOutput('SECTION DETECTION SUMMARY');
    consoleOutput('='.repeat(80));
    consoleOutput(`Found ${sections.length} sections out of ${expenditureLines.length} expected`);
    for (const section of sections) {
      consoleOutput(`- ${section.orgCode}: ${section.departmentName}`);
    }
    
    const proceed = promptUser('\nProceed with these sections? (y/n): ').toLowerCase() === 'y';
    logUser(`User response for proceeding with sections: ${proceed ? 'yes' : 'no'}`);
    
    return proceed ? sections : [];
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
  fileName: string = "",
  fundsData: FundsJSON,
  orgCode?: string,
  departmentName?: string
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
      const line = lines[i].trim();
      
      // Stop if we hit the expenditure marker
      if (line.match(/3[\s\-](?:YR|YEAR)[\s\-]*EXPENDITURES[\s\-]*(?:AND[\s\-]*)?POSITIONS/)) {
        break;
      }
      
      // Stop if we hit budget data patterns (amounts, fund codes, etc.)
      if (line.match(/^\$[\d,]+$/) ||           // Dollar amounts like $160,139
          line.match(/^\d{1,3}(,\d{3})*$/) ||  // Numbers like 160,139
          line.match(/^\d{4}$/) ||              // 4-digit codes
          line === 'State Operations:' ||
          line === 'Local Assistance:' ||
          line.includes('PROGRAM REQUIREMENTS') ||
          line.includes('DETAILED EXPENDITURES') ||
          line.includes('Expenditure Adjustments:') ||
          line.includes('FUND BALANCE') ||
          line.includes('BEGINNING BALANCE') ||
          line.includes('Positions') && line.includes('Expenditures')) {
        break;
      }
      
      // Skip "- Continued" lines but continue reading description
      if (line.match(/^\d{4}\s+.*\s*-\s*Continued\s*$/)) {
        continue;
      }
      
      // Skip empty lines at the beginning
      if (!foundDescription && line === '') {
        continue;
      }
      
      // If we have content, we've found the description
      if (line !== '') {
        foundDescription = true;
      }
      
      // Add the line to description
      descriptionLines.push(line);
    }
    
    // Clean up the description
    departmentDescription = descriptionLines
      .join('\n')
      .trim()
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ');
    
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
      log('No "PROGRAM DESCRIPTIONS" section found', true);
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
    for (let i = programDescIndex + 1; i < endIndex; i++) {
      const line = processedLines[i];
      const text = line.text.trim();

      if (isProjectCode(text)) {
        headerXCoords.add(line.x);
      }
    }

    // Convert to array and sort for consistent comparison
    const headerXArray = Array.from(headerXCoords).sort((a, b) => a - b);
    const mainHeaderX = headerXArray[0]; // Leftmost x-coordinate is main program header

    // Second pass: extract programs and descriptions
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
      log(`Found ${programs.length} programs with descriptions`, true);
      
      // Log x-coordinate analysis
      log(`Program header x-coordinates: ${headerXArray.join(', ')}`, true);
      log(`Main program header x-coordinate: ${mainHeaderX}`, true);
    }
    
    return programs;

  } catch (error: any) {
    log(`Error extracting program descriptions: ${error.message}`, true, true);
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
      log('No "DETAILED EXPENDITURES BY PROGRAM" section found in budget extraction', true);
      return results;
    }
    
    // Find fiscal years pattern using x-coordinates
    const fiscalYears: string[] = [];
    let yearStartIndex = -1;

    // Look for fiscal years after DETAILED EXPENDITURES
    for (let i = detailedExpIndex + 1; i < processedLines.length; i++) {
      const line = processedLines[i];
      if (line.text.match(/^\d{4}-\d{2}[*\s]*$/)) {
        fiscalYears.push(line.text.replace(/[*\s]/g, ''));
        if (yearStartIndex === -1) yearStartIndex = i;
        if (fiscalYears.length === 3) break;
      }
    }

    if (fiscalYears.length !== 3 || yearStartIndex === -1) {
      log('Could not find all three fiscal years', true);
      return results;
    }
    
    // Find amount column x-coordinates using the first set of amounts
    const amountColumns: number[] = [];
    let currentProjectCode = '';
    let currentFundingType: FundingType | null = null;
    let currentFundCode = '';
    let currentFundName = '';
    let amounts: number[] = [];
    
    // Process lines after fiscal years
    for (let i = yearStartIndex; i < processedLines.length; i++) {
      const line = processedLines[i];
      const text = line.text.trim();

      // Skip empty lines
      if (!text) continue;

      // Check for funding type markers
      if (text === 'State Operations:') {
        currentFundingType = 0;
        continue;
      } else if (text === 'Local Assistance:') {
        currentFundingType = 1;
        continue;
      }
      
      // Check for project codes using x-coordinate and pattern
      if (line.x < 100 && isProjectCode(text)) {
        currentProjectCode = text.length === 4 ? text + '000' : text;
        currentFundingType = null;
          currentFundCode = '';
          currentFundName = '';
          amounts = [];
          continue;
      }

      // Check for fund codes using x-coordinate
      if (currentFundingType !== null && currentProjectCode && line.x < 100 && isFundCode(text)) {
        const nextLine = processedLines[i + 1];
        if (nextLine && !isAmountString(nextLine.text) && nextLine.text.match(/[A-Za-z]/)) {
        currentFundCode = text;
          currentFundName = nextLine.text.trim();
          amounts = [];
          i++; // Skip fund name line
          continue;
        }
      }
      
      // Check for amounts using x-coordinate patterns
      if (currentProjectCode && currentFundingType !== null && currentFundCode) {
        if (isAmountString(text)) {
          // Store amount column x-coordinate if not already known
          if (amountColumns.length < 3 && !amountColumns.includes(line.x)) {
            amountColumns.push(line.x);
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
      log(`Extracted ${results.length} budget allocations`, true);
      
      // Log amount column analysis
      if (amountColumns.length === 3) {
        log(`Found amount columns at x-coordinates: ${amountColumns.join(', ')}`, true);
      } else {
        log(`Warning: Expected 3 amount columns, found ${amountColumns.length}`, true, true);
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