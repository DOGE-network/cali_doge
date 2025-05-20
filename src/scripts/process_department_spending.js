/**
 * Budget Data Text File Processing Script
 * 
 * This script processes budget text files to:
 * 1. Extract department data including organizational codes
 * 2. Update programs.json with program descriptions and relationships
 * 3. Update budgets.json with detailed budget allocations
 * 4. Match department organizational codes across different data sources
 * 
 * Processing steps:
 * 1. Initial Setup
 *    a. Load departments.json, programs.json, and budgets.json
 *    b. Setup logging
 * 
 * 2. Text File Processing
 *    a. Read and parse text files
 *    b. Extract fiscal year from filename
 *    c. Find all department sections in text file
 *    d. For each department section:
 *       - Extract org code and name
 *       - Match to departments.json record
 *       - Extract program descriptions for programs.json
 *       - Extract detailed budget allocations for budgets.json
 * 
 * 3. Results Summary
 *    a. Count updated departments, programs and budgets
 *    b. Log final statistics
 * 
 * Output Files:
 * - programs.json: Updated with program descriptions and relationships
 * - budgets.json: Updated with detailed budget allocations by:
 *   - Organization code
 *   - Project code
 *   - Fund code
 *   - Fiscal year
 *   - Funding type (State Operations/Local Assistance)
 * 
 * Usage:
 * ```bash
 * npm run process-spending
 * ```
 * 
 * Dependencies:
 * - src/lib/departmentMatching.js for department name matching
 * - src/data/departments.json as the department data source
 * - src/data/programs.json as the program data source
 * - src/data/budgets.json as the budget data source
 * - src/data/budget/text/*.txt budget text files to process
 */

const fs = require('fs');
const path = require('path');

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
const PROGRAMS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/programs.json');
const BUDGETS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/budgets.json');
const BUDGET_DATA_DIR = path.join(PROJECT_ROOT, 'src/data/budget/text');
const LOG_DIR = path.join(PROJECT_ROOT, 'src/logs');

// Type validation helpers
//const isValidYear = (year) => {
//  const numYear = parseInt(year);
//  return Number.isInteger(numYear) && numYear >= 1900 && numYear <= 2030;
//};

// Setup logging with enhanced formatting and step tracking
const setupLogging = () => {
  // Get script name without extension
  const scriptName = path.basename(__filename, '.js');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `${scriptName}_${timestamp}.log`);
  
  // Ensure logs directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  let currentStep = 0;
  let currentSubStep = 0;
  
  const log = (message, type = 'info', isStep = false, isSubStep = false) => {
    const timestamp = new Date().toISOString();
    const logType = typeof type === 'string' ? type.toUpperCase() : 'INFO';
    
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
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  };

  // Add data timestamp to log file header
  const header = [
    '='.repeat(80),
    `Budget Data Processing Log`,
    `Script: ${scriptName}`,
    `Started: ${new Date().toISOString()}`,
    `Data Source: ${BUDGET_DATA_DIR}`,
    `Data Timestamp: ${new Date().toISOString()}`,
    '='.repeat(80),
    ''
  ].join('\n');
  
  fs.writeFileSync(logFile, header);
  
  return { logFile, log };
};

// Function to extract year from filename
const extractYearFromFilename = (filename) => {
  const yearMatch = filename.match(/_(\d{4})_/);
  return yearMatch ? parseInt(yearMatch[1]) : null;
};

// Function to find all department sections in text file
const findDepartmentSections = (fileContent) => {
  const sections = [];
  const lines = fileContent.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for lines that start with 4 digits followed by department name
    const match = line.match(/^(\d{4})\s+(.+)$/);
    if (match) {
      const orgCode = parseInt(match[1]);
      const deptName = match[2].trim();
      
      // Find the end of this section (next department or end of file)
      let endIndex = i + 1;
      while (endIndex < lines.length) {
        const nextLine = lines[endIndex].trim();
        if (nextLine.match(/^\d{4}\s+/)) {
          break;
        }
        endIndex++;
      }
      
      // Extract the section content
      const sectionContent = lines.slice(i, endIndex).join('\n');
      sections.push({
        orgCode,
        deptName,
        content: sectionContent,
        startLine: i,
        endLine: endIndex
      });
      
      i = endIndex - 1; // Skip to end of section
    }
  }
  
  return sections;
};

// Main function to process the budget file
const parseBudgetFile = async (filePath, log, departmentsData) => {
  try {
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);
    
    // Extract fiscal year from filename
    const fiscalYear = extractYearFromFilename(filePath);
    if (!fiscalYear) {
      log('Could not extract fiscal year from filename', 'error', false, true);
      return false;
    }
    
    // Find all department sections
    const departmentSections = findDepartmentSections(content);
    if (!departmentSections.length) {
      log('No department sections found in file', 'error', false, true);
      return false;
    }
    
    log(`Found ${departmentSections.length} department sections`, 'info', false, true);
    
    // Process each department section
    for (const section of departmentSections) {
      const { orgCode, deptName, content: sectionContent } = section;
      
      // Match department to departments.json
      const department = departmentsData.departments.find(d => {
        const deptCode = typeof d.organizationalCode === 'string' 
          ? parseInt(d.organizationalCode) 
          : d.organizationalCode;
        return deptCode === orgCode;
      });

      if (!department) {
        log(`No matching department found for org code ${orgCode}`, 'warn', false, true);
        continue;
      }
      
      log(`Processing department: ${deptName} (${orgCode})`, 'info', false, true);
      
      // Extract program descriptions
      const programDescriptions = extractProgramDescriptions(sectionContent, log);
  if (programDescriptions.length > 0) {
        log(`Found ${programDescriptions.length} program descriptions`, 'info', false, true);
        updateProgramsJson(programDescriptions, orgCode, log, filename);
      }
      
      // Extract budget allocations
      const allocations = extractBudgetAllocations(sectionContent, log, fiscalYear, orgCode);
      if (allocations.length > 0) {
        log(`Found ${allocations.length} budget allocations`, 'info', false, true);
        updateBudgetsJson(allocations, log);
      }
    }
    
    return true;
  } catch (error) {
    log(`Error processing budget file: ${error.message}`, 'error', false, true);
    return false;
  }
};

// Function to extract program descriptions from section content
const extractProgramDescriptions = (sectionContent, log) => {
  const descriptions = [];
  
  // Look for the program descriptions section
  const programSectionMatch = sectionContent.match(/PROGRAM\s+DESCRIPTIONS/i);
  if (!programSectionMatch) {
    log(`No "PROGRAM DESCRIPTIONS" section found`, 'warn', false, true);
    return descriptions;
  }
  
  // Extract the program descriptions section
  const startIndex = programSectionMatch.index;
  const nextSectionMatch = sectionContent.substring(startIndex + 20).match(/\n\s*[A-Z][A-Z\s]{5,}\n/);
  const endIndex = nextSectionMatch ? startIndex + 20 + nextSectionMatch.index : sectionContent.length;
  
  const programSection = sectionContent.substring(startIndex, endIndex);
  const lines = programSection.split('\n');
  
  let currentProgram = null;
  let currentDescription = '';
  
  // Process lines to extract program names and descriptions
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Look for program headers (usually all caps or starting with numbers)
    if (/^[0-9]+\.?\s+[A-Z]/.test(trimmedLine) || /^[A-Z][A-Z\s]{5,}$/.test(trimmedLine)) {
      // If we were collecting a program description, save it
      if (currentProgram) {
        descriptions.push({
          program: currentProgram,
          description: currentDescription.trim()
        });
      }
      
      // Start a new program
      currentProgram = trimmedLine;
      currentDescription = '';
    } else if (currentProgram) {
      // Add to current description
      currentDescription += ' ' + trimmedLine;
    }
  }
  
  // Add the last program if there is one
  if (currentProgram) {
    descriptions.push({
      program: currentProgram,
      description: currentDescription.trim()
    });
  }
  
  return descriptions;
};

// Function to extract detailed budget allocations
const extractBudgetAllocations = (sectionContent, log, fiscalYear, orgCode) => {
  const allocations = [];
  
  // Look for the detailed expenditures section
  const expenditureMatch = sectionContent.match(/DETAILED\s+EXPENDITURES\s+BY\s+PROGRAM/i);
  if (!expenditureMatch) {
    log(`No "DETAILED EXPENDITURES BY PROGRAM" section found`, 'warn', false, true);
    return allocations;
  }

  const startIndex = expenditureMatch.index;
  const sectionText = sectionContent.substring(startIndex);
  const lines = sectionText.split('\n');
  
  let currentProjectCode = null;
  let currentFundingType = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Look for project code headers
    const projectMatch = trimmedLine.match(/^(\d{7})\s+(.+)$/);
    if (projectMatch) {
      currentProjectCode = projectMatch[1];
      continue;
    }
    
    // Look for funding type headers
    if (trimmedLine.includes('State Operations:')) {
      currentFundingType = 0;
      continue;
    } else if (trimmedLine.includes('Local Assistance:')) {
      currentFundingType = 1;
      continue;
    }
    
    // Look for fund allocations
    const fundMatch = trimmedLine.match(/^(\d{4})\s+(\d+)\s+\$?([\d,]+(\.\d{2})?)/);
    if (fundMatch && currentProjectCode !== null && currentFundingType !== null) {
      const [_, fundCode, count, amount] = fundMatch;
      allocations.push({
        organizationCode: orgCode,
        projectCode: currentProjectCode,
        fundCode: parseInt(fundCode),
        fiscalYear,
        fundingType: currentFundingType,
        count: parseInt(count),
        amount: parseFloat(amount.replace(/,/g, '')) * 1000 // Convert to dollars
      });
    }
  }
  
  return allocations;
};

// Function to update programs.json
const updateProgramsJson = (programDescriptions, orgCode, log, filename) => {
  try {
    // Load existing programs.json
    const programsData = JSON.parse(fs.readFileSync(PROGRAMS_JSON_PATH, 'utf8'));
    
    // Update or add program descriptions
    for (const desc of programDescriptions) {
      const existingProgram = programsData.programs.find(p => p.projectCode === desc.program);
      
      if (existingProgram) {
        // Add new description if not already present
        const descriptionExists = existingProgram.programDescriptions.some(
          d => d.description === desc.description
        );
        
        if (!descriptionExists) {
          existingProgram.programDescriptions.push({
            description: desc.description,
            source: filename
          });
        }
      } else {
        // Add new program
        programsData.programs.push({
          projectCode: desc.program,
          name: desc.program,
          programDescriptions: [{
            description: desc.description,
            source: filename
          }]
        });
      }
    }
    
    // Save updated programs.json
    fs.writeFileSync(PROGRAMS_JSON_PATH, JSON.stringify(programsData, null, 2));
    log(`Updated programs.json with ${programDescriptions.length} program descriptions`, 'info', false, true);
    
    return true;
  } catch (error) {
    log(`Error updating programs.json: ${error.message}`, 'error', false, true);
    return false;
  }
};

// Function to update budgets.json
const updateBudgetsJson = (allocations, log) => {
  try {
    // Load existing budgets.json
    const budgetsData = JSON.parse(fs.readFileSync(BUDGETS_JSON_PATH, 'utf8'));
    
    // Process each allocation
    for (const alloc of allocations) {
      // Find or create organization budget
      let orgBudget = budgetsData.budget.find(b => b.code === alloc.organizationCode);
      if (!orgBudget) {
        orgBudget = {
          code: alloc.organizationCode,
          fiscalYear: []
        };
        budgetsData.budget.push(orgBudget);
      }
      
      // Find or create fiscal year data
      let fiscalYearData = orgBudget.fiscalYear.find(fy => fy.year === alloc.fiscalYear);
      if (!fiscalYearData) {
        fiscalYearData = {
          year: alloc.fiscalYear,
          projectCode: []
        };
        orgBudget.fiscalYear.push(fiscalYearData);
      }
      
      // Find or create project code data
      let projectData = fiscalYearData.projectCode.find(p => p.code === alloc.projectCode);
      if (!projectData) {
        projectData = {
          code: alloc.projectCode,
          organizationCode: []
        };
        fiscalYearData.projectCode.push(projectData);
      }
      
      // Find or create organization code data
      let orgCodeData = projectData.organizationCode.find(o => o.code === alloc.organizationCode);
      if (!orgCodeData) {
        orgCodeData = {
          code: alloc.organizationCode,
          fundingType: []
        };
        projectData.organizationCode.push(orgCodeData);
      }
      
      // Find or create funding type data
      let fundingTypeData = orgCodeData.fundingType.find(ft => ft.type === alloc.fundingType);
      if (!fundingTypeData) {
        fundingTypeData = {
          type: alloc.fundingType,
          fundCode: []
        };
        orgCodeData.fundingType.push(fundingTypeData);
      }
      
      // Add fund allocation
      fundingTypeData.fundCode.push({
        code: alloc.fundCode,
        count: alloc.count,
        amount: alloc.amount
      });
    }
    
    // Save updated budgets.json
    fs.writeFileSync(BUDGETS_JSON_PATH, JSON.stringify(budgetsData, null, 2));
    log(`Updated budgets.json with ${allocations.length} budget allocations`, 'info', false, true);
    
    return true;
  } catch (error) {
    log(`Error updating budgets.json: ${error.message}`, 'error', false, true);
    return false;
  }
};

// Main function
const main = async () => {
  const { log, logFile } = setupLogging();
  log(`Budget data processing started`, 'info', true);
  
  try {
    // Step 1: Load departments.json
    log(`Loading departments.json`, 'info', true);
    
    if (!fs.existsSync(DEPARTMENTS_JSON_PATH)) {
      log(`ERROR: departments.json not found at ${DEPARTMENTS_JSON_PATH}`, 'error', false, true);
      return;
    }
    
    const departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8'));
    log(`Loaded ${departmentsData.departments.length} departments`, 'info', false, true);
    
    // Step 2: Get list of budget text files
    log(`Scanning budget data directory`, 'info', true);
    const budgetFiles = fs.readdirSync(BUDGET_DATA_DIR)
      .filter(file => file.endsWith('.txt'))
      .map(file => path.join(BUDGET_DATA_DIR, file));
    
    log(`Found ${budgetFiles.length} budget text files`, 'info', false, true);
    
    if (budgetFiles.length === 0) {
      log(`No budget text files found in ${BUDGET_DATA_DIR}`, 'warn', false, true);
      return;
    }
    
    // Step 3: Process each budget file
    log(`Processing budget files`, 'info', true);
    
    let processedCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const filePath of budgetFiles) {
      try {
        log(`\nProcessing ${path.basename(filePath)}`, 'info', false, true);
        
        // Parse the budget file
        const success = await parseBudgetFile(filePath, log, departmentsData);
        
        if (success) {
          processedCount++;
        } else {
          log(`Could not process ${path.basename(filePath)}`, 'warn', false, true);
          skipCount++;
        }
      } catch (error) {
        log(`Error processing ${path.basename(filePath)}: ${error.message}`, 'error', false, true);
        errorCount++;
      }
    }
    
    // Step 4: Summary
    log(`\nBudget data processing summary`, 'info', true);
    log(`Total budget files processed: ${budgetFiles.length}`, 'info', false, true);
    log(`Files successfully processed: ${processedCount}`, 'info', false, true);
    log(`Files skipped: ${skipCount}`, 'info', false, true);
    log(`Errors encountered: ${errorCount}`, 'info', false, true);
    log(`Log file: ${logFile}`, 'info', false, true);

  } catch (error) {
    log(`Critical error: ${error.message}`, 'error', true);
    log(`Stack trace: ${error.stack}`, 'error', false, true);
  }
};

// Run the script
main();