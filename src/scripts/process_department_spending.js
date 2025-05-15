/**
 * Budget Data Text File Processing Script
 * 
 * This script processes budget text files and updates departments.json with budget data.
 * It handles:
 * - Budget data extraction from text files
 * - Department matching using name, aliases, and organizationalCode
 * - Data validation and type compliance
 * - Logging of operations and results
 * - using department type interface RequiredDepartmentJSONFields
 * 
 * 
 * Steps:
 * 1. Initial Setup
 *    a. Load departments.json
 *    b. Setup logging
 *    c. Count initial departments with budget data
 * 
 * 2. Text File Processing
 *    a. Read and parse text files
 *    b. match textfile organizational code to json department organizationalCode. if match then check if orgLevel>1 else skip
 *    c. match for next 3 rows are headcount  array years 2022, 2023, 2024, then next 3 rows are spending array years 2022, 2023, 2024
 *    d. create headcount and spending data arrays and log. use department type interface RequiredDepartmentJSONFields. 
 *    e. using record matched from step2b, show textfile organizational code and json (organizationalCode, name, aliases) so user can compare for matching, diff of headcount and spending arrays to fields of the record, log the differences.  Show headcount as info only, spending as will update. 
 *    f. if differences in spending or note, ask user if they want to update the record, else skip. 
 *    g. Save the note and or spending changes to departments.json. Match note with the text file name or append to the existing note
 *    h. Continue until all files are processed
 * 
 * 3. Results Summary
 *    a. Count updated json departments, skipped text files, unmatched departments
 *    b. Log final statistics
 *    c. Log differences between original and updated departments.json
 * 
 * Usage:
 * ```bash
 * node process_budget_data.js
 * ```
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
const BUDGET_DATA_DIR = path.join(PROJECT_ROOT, 'src/data/budget/text');
const LOG_DIR = path.join(PROJECT_ROOT, 'src/logs');

// Type validation helpers
const isValidYear = (year) => {
  const numYear = parseInt(year);
  return Number.isInteger(numYear) && numYear >= 1900 && numYear <= 2030;
};

const isValidFiscalYear = (year) => {
  // Format should be FYyyyy-FYyyyy
  if (!/^FY\d{4}-FY\d{4}$/.test(year)) return false;
  
  const [startYear, endYear] = year.split('-').map(y => parseInt(y.slice(2)));
  return isValidYear(startYear) && isValidYear(endYear) && endYear === startYear + 1;
};

const isValidAnnualYear = (year) => {
  return isValidYear(year);
};

// Convert YYYY-YY format to FYyyyy-FYyyyy format
const convertToFiscalYear = (yearStr) => {
  // Match YYYY-YY format
  const match = yearStr.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  
  const startYear = parseInt(match[1]);
  const endYear = parseInt(match[2]);
  
  // Validate the years
  if (!isValidYear(startYear)) return null;
  
  // Convert 2-digit end year to full year
  const fullEndYear = endYear < 50 ? 2000 + endYear : 1900 + endYear;
  
  // Validate the end year matches start year + 1
  if (fullEndYear !== startYear + 1) return null;
  
  return `FY${startYear}-FY${fullEndYear}`;
};

// Setup logging
const setupLogging = () => {
  // Get script name without extension
  const scriptName = path.basename(__filename, '.js');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `${scriptName}_${timestamp}.log`);
  
  // Ensure logs directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const logType = typeof type === 'string' ? type.toUpperCase() : 'INFO';
    const logMessage = `[${timestamp}] [${logType}] ${message}`;
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

// Function to normalize department data
const normalizeDepartmentData = (dept) => {
  if (!dept) return null;
  
  // Create a new object with the original structure
  const normalized = { ...dept };
  
  // Only normalize the data fields, not the identity fields
  if (normalized.headCount) {
    normalized.headCount = {
      yearly: normalized.headCount.yearly || {}
    };
  }
  
  if (normalized.spending) {
    normalized.spending = {
      yearly: normalized.spending.yearly || {}
    };
  }
  
  return normalized;
};

// Function to parse budget text file
const parseBudgetFile = async (filePath, log, departmentsData) => {
  const timestamp = new Date().toISOString();

  log(`[${timestamp}] === Step 2b: Match textfile organizational code to json department organizationalCode ===`);
  log(`[${timestamp}] Processing file: ${path.basename(filePath)}`);

  // Extract organizational code from filename
  const organizationalCode = parseInt(path.basename(filePath).split('_')[0]);
  log(`[${timestamp}] Extracted organizational code: ${organizationalCode}`);

  // First verify if we have a matching department by organizational code
  const matchingDepartment = departmentsData.departments.find(d => {
    const deptorganizationalCode = typeof d.organizationalCode === 'string' ? parseInt(d.organizationalCode) : d.organizationalCode;
    return deptorganizationalCode === organizationalCode;
  });

  if (!matchingDepartment) {
    log(`[${timestamp}] Error: No matching department found for organizational code ${organizationalCode}`, 'error');
    return null;
  }

  // Check if orgLevel is greater than 1
  if (!matchingDepartment.orgLevel || matchingDepartment.orgLevel <= 1) {
    log(`[${timestamp}] Skipping department ${matchingDepartment.name} - orgLevel must be greater than 1 (current: ${matchingDepartment.orgLevel || 'not set'})`, 'error');
    return null;
  }

  log(`[${timestamp}] Found matching department: ${matchingDepartment.name} (organizational code: ${matchingDepartment.organizationalCode}, orgLevel: ${matchingDepartment.orgLevel})`);

  log(`[${timestamp}] === Step 2b Complete ===\n`);

  return {
    organizationalCode: organizationalCode,
    department: matchingDepartment
  };
};

// Function to extract budget data from the specified rows after the totals section
const extractBudgetData = async (totalsSectionLines, log) => {
  let headCount = {};
  let spending = {};
  const timestamp = new Date().toISOString();

  log(`[${timestamp}] === Step 2c: Extracting Budget Data ===`);

  if (!totalsSectionLines || totalsSectionLines.length < 6) {
    log(`[${timestamp}] Error: Invalid totals section data. Expected at least 6 lines, got ${totalsSectionLines?.length || 0}`, 'error');
    return null;
  }

  // Process the first 3 lines for headcount data
  for (let i = 0; i < 3; i++) {
    const line = totalsSectionLines[i];
    if (!line) {
      log(`[${timestamp}] Error: Missing line ${i + 1} in totals section`, 'error');
      return null;
    }
    const match = line.match(/([\d,]+\.?\d*)/);
    if (match) {
      const value = Math.round(parseFloat(match[1].replace(/,/g, '')));
      const year = i === 0 ? '2022' : i === 1 ? '2023' : '2024';
      if (!isValidAnnualYear(year)) {
        log(`[${timestamp}] Error: Invalid annual year ${year}`, 'error');
        return null;
      }
      headCount[year] = value;
      log(`[${timestamp}] Extracted headcount data for ${year}: ${value}`);
    } else {
      log(`[${timestamp}] Warning: No match for headcount data in line: ${line}`);
      return null;
    }
  }
  
  // Process the next 3 lines for spending data
  for (let i = 3; i < 6; i++) {
    const line = totalsSectionLines[i];
    if (!line) {
      log(`[${timestamp}] Error: Missing line ${i + 1} in totals section`, 'error');
      return null;
    }
    const match = line.match(/([\d,]+\.?\d*)/);
    if (match) {
      const value = Math.round(parseFloat(match[1].replace(/,/g, '')));
      const yearStr = i === 3 ? '2022-23' : i === 4 ? '2023-24' : '2024-25';
      const fiscalYear = convertToFiscalYear(yearStr);
      if (!fiscalYear) {
        log(`[${timestamp}] Error: Invalid fiscal year format ${yearStr}`, 'error');
        return null;
      }
      spending[fiscalYear] = value;
      log(`[${timestamp}] Extracted spending data for ${fiscalYear}: ${value}`);
    } else {
      log(`[${timestamp}] Warning: No match for spending data in line: ${line}`);
      return null;
    }
  }

  // Verify we have all required data
  const requiredYears = ['2022', '2023', '2024'];
  const missingHeadCount = requiredYears.filter(year => !headCount[year]);
  const missingSpending = requiredYears.filter(year => !spending[`FY${year}-FY${parseInt(year) + 1}`]);

  if (missingHeadCount.length > 0 || missingSpending.length > 0) {
    log(`[${timestamp}] Error: Missing required data:`, 'error');
    if (missingHeadCount.length > 0) {
      log(`[${timestamp}] Missing headcount data for years: ${missingHeadCount.join(', ')}`);
    }
    if (missingSpending.length > 0) {
      log(`[${timestamp}] Missing spending data for years: ${missingSpending.join(', ')}`);
    }
    return null;
  }

  log(`[${timestamp}] === Step 2c Complete ===\n`);
  return {
    headCount,
    spending
  };
};

// Function to create budget arrays and validate types
const createBudgetArrays = (budgetDetails, log) => {
  const timestamp = new Date().toISOString();
  
  log(`\n[${timestamp}] === Step 2d: Creating Budget Arrays ===`);
  
  // Validate and create headcount array
  const headCountArray = {
    yearly: {}
  };
  
  Object.entries(budgetDetails.headCount).forEach(([year, value]) => {
    if (!isValidAnnualYear(year)) {
      log(`[${timestamp}] Error: Invalid annual year ${year} in headcount data`, 'error');
      return null;
    }
    headCountArray.yearly[year] = value;
  });
  
  // Validate and create spending array
  const spendingArray = {
    yearly: {}
  };
  
  Object.entries(budgetDetails.spending).forEach(([year, value]) => {
    if (!isValidFiscalYear(year)) {
      log(`[${timestamp}] Error: Invalid fiscal year ${year} in spending data`, 'error');
      return null;
    }
    spendingArray.yearly[year] = value;
  });
  
  // Log the arrays for verification
  log(`[${timestamp}] HeadCount Array:`);
  Object.entries(headCountArray.yearly).forEach(([year, value]) => {
    log(`[${timestamp}]   ${year}: ${value}`);
  });
  
  log(`[${timestamp}] Spending Array:`);
  Object.entries(spendingArray.yearly).forEach(([year, value]) => {
    log(`[${timestamp}]   ${year}: ${value}`);
  });
  
  log(`[${timestamp}] === Step 2d Complete ===\n`);
  
  return {
    headCount: headCountArray,
    spending: spendingArray
  };
};

// Function to compare department data and ask for user confirmation
const compareAndConfirmUpdate = (department, updateData, log) => {
  const timestamp = new Date().toISOString();
  
  log(`\n[${timestamp}] === Step 2e: Department Matching and Data Comparison ===`);
  
  // Show matching details
  log(`[${timestamp}] Text File Department:`);
  log(`[${timestamp}]   organizational code: ${updateData.organizationalCode}`);
  log(`[${timestamp}]   Name: ${updateData.name}`);
  
  log(`[${timestamp}] JSON Department:`);
  log(`[${timestamp}]   organizational code: ${department.organizationalCode}`);
  log(`[${timestamp}]   Name: ${department.name}`);
  log(`[${timestamp}]   Aliases: ${department.aliases?.join(', ') || 'None'}`);
  
  // Compare and show differences in data
  log(`\n[${timestamp}] Data Differences:`);
  
  // Compare headcount data (info only)
  log(`[${timestamp}] HeadCount Information (Not Updating):`);
  ['2022', '2023', '2024'].forEach(year => {
    const currentValue = department.headCount?.yearly?.[year];
    const newValue = updateData.headCount?.yearly?.[year];
    if (currentValue !== newValue) {
      log(`[${timestamp}]   ${year}: JSON: ${currentValue || 'Not set'} | Budget Textfile: ${newValue || 'Not set'}`);
    }
  });
  
  // Compare spending data (will update)
  log(`\n[${timestamp}] Spending Data (Will Update):`);
  ['2022', '2023', '2024'].forEach(year => {
    const fiscalYear = `FY${year}-FY${parseInt(year) + 1}`;
    const currentValue = department.spending?.yearly?.[fiscalYear];
    const newValue = updateData.spending?.yearly?.[fiscalYear];
    if (currentValue !== newValue) {
      log(`[${timestamp}]   ${fiscalYear}: ${currentValue || 'Not set'} -> ${newValue || 'Not set'}`);
    }
  });
  
  log(`[${timestamp}] === Step 2e Complete ===\n`);
  
  // Ask for user confirmation
};

// Main execution
const main = async () => {
  let log;
  let logFile;
  let departmentsData;
  let initialDepartmentsWithBudget;
  let totalUpdatedDepartments = 0;
  let totalSkippedDepartments = 0;
  let totalProcessedDepartments = 0;
  let unmatchedDepartments = new Set();
  let unmatchedFiles = new Set();
  const startTime = new Date().toISOString();
  
  try {
    // ============================================
    // STEP 1: Initial Setup
    // ============================================
    
    // Step 1a: Setup logging
    const loggingSetup = setupLogging();
    log = loggingSetup.log;
    logFile = loggingSetup.logFile;
    
    // Step 1b: Load departments.json
    log('Step 1b: Loading departments.json...');
    try {
      const data = fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8');
      departmentsData = JSON.parse(data);
      departmentsData.departments = departmentsData.departments.map(dept => normalizeDepartmentData(dept));
      log(`Successfully loaded departments.json with ${departmentsData?.departments?.length || 0} departments`);
    } catch (error) {
      log(`Error reading departments.json: ${error.message}`, 'error');
      process.exit(1);
    }
    
    // Step 1c: Count initial departments with budget data
    log('Step 1c: Counting initial departments with budget data...');
    initialDepartmentsWithBudget = departmentsData.departments.filter(d => 
      d.headCount?.yearly && Object.values(d.headCount.yearly).some(yearData => yearData.length > 0)
    ).length;
    log(`Found ${initialDepartmentsWithBudget} departments with budget data initially`);
    
    // ============================================
    // STEP 2: Text File Processing
    // ============================================
    
    // Step 2a: Read and parse text files
    const files = fs.readdirSync(BUDGET_DATA_DIR)
      .filter(file => file.endsWith('_2024_budget.txt'))
      .map(file => path.join(BUDGET_DATA_DIR, file));
    
    if (files.length === 0) {
      log('No budget text files found in budget/text directory', 'error');
      process.exit(1);
    }
    
    log(`Found ${files.length} budget text files: ${files.map(f => path.basename(f)).join(', ')}`);
    
    // Process each file
    for (const file of files) {
      const filename = path.basename(file);
      const organizationalCode = filename.split('_')[0];
      const timestamp = new Date().toISOString();
      
      log(`\n[${timestamp}] === Step 2a: Reading and Parsing Text File ===`);
      log(`[${timestamp}] Processing file: ${filename}`);
      log(`[${timestamp}] organizational code: ${organizationalCode}`);
      log(`[${timestamp}] Full path: ${file}`);
      
      // File validation
      try {
        const stats = fs.statSync(file);
        log(`[${timestamp}] File size: ${(stats.size / 1024).toFixed(2)} KB`);
        log(`[${timestamp}] Last modified: ${stats.mtime.toISOString()}`);
        fs.accessSync(file, fs.constants.R_OK);
        log(`[${timestamp}] File is readable`);
      } catch (error) {
        log(`[${timestamp}] Error accessing file: ${error.message}`, 'error');
        continue;
      }

      // Read file contents and collect data
      let firstFiveLines = [];
      let foundTotals = false;
      let totalsSectionLines = [];
      let departmentName = '';
      let previousLine = '';
      let lineCount = 0;

      try {
        const fileStream = fs.createReadStream(file);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });

        for await (const line of rl) {
          if (!line.trim()) continue;

          // Collect first 5 lines
          if (firstFiveLines.length < 5) {
            firstFiveLines.push(line.trim());
          }

          // Extract department name
          if (!departmentName && line.trim()) {
            // Extract department name from after the organizational code (4 digits at start)
            const match = line.trim().match(/^\d{4}\s+(.+)$/);
            if (match) {
              departmentName = match[1].trim();
              log(`[${timestamp}] Found department name: ${departmentName}`);
            }
          }

          // Find totals section
          const currentLine = line.trim();
          const combinedText = `${previousLine} ${currentLine}`.trim();
          
          if (currentLine.includes('TOTALS, POSITIONS AND EXPENDITURES (All Programs)') ||
              combinedText.includes('TOTALS, POSITIONS AND EXPENDITURES (All Programs)')) {
            foundTotals = true;
            log(`[${timestamp}] Found totals section - Starting data extraction`);
            log(`[${timestamp}] Found in: ${combinedText}`);
            previousLine = '';
            continue;
          }

          previousLine = currentLine;

          // Collect lines after totals section
          if (foundTotals) {
            lineCount++;
            if (lineCount <= 10) {
              totalsSectionLines.push(currentLine);
            }
          }
        }

        // Log file contents summary
        log(`\n[${timestamp}] === File Contents Summary ===`);
        log(`[${timestamp}] First 5 lines of file:`);
        firstFiveLines.forEach((line, index) => {
          log(`[${timestamp}] ${index + 1}. ${line}`);
        });
        
        log(`\n[${timestamp}] First 10 lines after totals section:`);
        totalsSectionLines.forEach((line, index) => {
          log(`[${timestamp}] ${index + 1}. ${line}`);
        });


      }
      catch (error) {
        log(`[${timestamp}] Error reading file contents: ${error.message}`, 'error');
        continue;
      }
      log(`[${timestamp}] === Step 2a Complete ===\n`);
      
      // Step 2b: Extract department information and match organizational code
      const budgetData = await parseBudgetFile(file, log, departmentsData);
      if (!budgetData) {
        log(`[${timestamp}] Skipping file ${filename} - no matching department found in departments.json`, 'error');
        unmatchedFiles.add(filename);
        continue;
      }

      // Add department name to budgetData
      budgetData.name = departmentName;

      // Step 2c: Extract budget data from totals section
      const budgetDetails = await extractBudgetData(totalsSectionLines, log);
      if (!budgetDetails) {
        log(`[${timestamp}] Skipping file ${filename} - no budget data found`, 'error');
        unmatchedFiles.add(filename);
        continue;
      }

      // Step 2d: Create headcount and spending data arrays
      const budgetArrays = createBudgetArrays(budgetDetails, log);

      // Step 2e: Show comparison and differences
      await compareAndConfirmUpdate(budgetData.department, {
        ...budgetData,
        name: budgetData.name,
        headCount: budgetArrays.headCount,
        spending: budgetArrays.spending
      }, log);

      // Step 2f: Check for spending/note differences and ask user
      const hasSpendingOrNoteChanges = () => {
        // Check for spending differences
        const hasSpendingDiff = Object.entries(budgetArrays.spending.yearly).some(([year, value]) => {
          const currentValue = budgetData.department.spending?.yearly?.[year];
          // Convert both to numbers for comparison
          const newValue = Number(value);
          const existingValue = currentValue ? Number(currentValue) : null;
          // Only consider it different if both values exist and are different
          return existingValue !== null && newValue !== existingValue;
        });

        // Check for note differences
        const newNote = `Budget data from ${filename}`;
        const hasNoteDiff = budgetData.department.note && 
          budgetData.department.note.includes(newNote);

        return hasSpendingDiff || !hasNoteDiff;
      };

      // Ask user if they want to update if there are differences
      if (hasSpendingOrNoteChanges()) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const shouldUpdate = await new Promise((resolve) => {
          readline.question('\nDo you want to update this department? (y/n): ', (answer) => {
            readline.close();
            resolve(answer.toLowerCase() === 'y');
          });
        });

        if (!shouldUpdate) {
          log(`[${timestamp}] Skipping update for department: ${budgetData.department.name} - user declined`);
          continue;
        }
      } else {
        log(`[${timestamp}] Skipping update for department: ${budgetData.department.name} - no salary or note changes`);
        totalSkippedDepartments++;
        continue;
      }

      // Step 2g: Save changes to departments.json
      budgetData.department.spending = budgetArrays.spending;
      
      // Update note
      const newNote = `Budget data from ${filename}`;
      if (!budgetData.department.note) {
        budgetData.department.note = newNote;
      } else if (!budgetData.department.note.includes(newNote)) {
        budgetData.department.note = `${budgetData.department.note}, ${newNote}`;
      }
      
      totalUpdatedDepartments++;
      log(`Successfully updated department data for ${budgetData.department.name}`);
      
      // Save changes to departments.json
      try {
        fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
        log(`Successfully wrote updated departments.json`);
      } catch (error) {
        log(`Error writing departments.json: ${error.message}`, 'error');
      }
    }
    
    // ============================================
    // STEP 3: Final Processing
    // ============================================
    
    const endTime = new Date().toISOString();
    const duration = new Date(endTime) - new Date(startTime);
    
    // Step 3a: Count final departments with budget data
    const finalDepartmentsWithBudget = departmentsData.departments.filter(d => 
      d.headCount?.yearly && Object.values(d.headCount.yearly).some(yearData => yearData.length > 0)
    ).length;
    
    // Step 3b: Log final statistics
    log('\nFinal Statistics:');
    log(`- Initial departments with budget data: ${initialDepartmentsWithBudget}`);
    log(`- Final departments with budget data: ${finalDepartmentsWithBudget}`);
    log(`- Departments updated: ${totalUpdatedDepartments}`);
    log(`- Departments skipped: ${totalSkippedDepartments}`);
    log(`- Total departments processed: ${totalProcessedDepartments}`);
    
    // Step 3c: Log unmatched records
    log('\n=== UNMATCHED RECORDS ===');
    log('\nDepartments without budget data:');
    departmentsData.departments
      .filter(d => !d.headCount?.yearly || Object.values(d.headCount.yearly).every(yearData => !yearData.length))
      .forEach(d => {
        log(`- ${d.name} (organizational code: ${d.organizationalCode || 'None'})`);
        unmatchedDepartments.add(d.name);
      });
    
    log('\nBudget files without matching departments:');
    unmatchedFiles.forEach(file => log(`- ${file}`));
    
    // Step 3d: Write final departments.json
    log('\nWriting updated departments.json...');
    try {
      fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
      log('Successfully wrote updated departments.json');
    } catch (error) {
      log(`Error writing departments.json: ${error.message}`, 'error');
      process.exit(1);
    }

    // Add summary footer
    const footer = [
      '',
      '='.repeat(80),
      `Budget Data Processing Summary`,
      `Started: ${startTime}`,
      `Completed: ${endTime}`,
      `Duration: ${duration}ms`,
      `Total Files Processed: ${files.length}`,
      `Total Departments Updated: ${totalUpdatedDepartments}`,
      `Total Departments Skipped: ${totalSkippedDepartments}`,
      `Total Departments Processed: ${totalProcessedDepartments}`,
      `Unmatched Departments: ${unmatchedDepartments.size}`,
      `Unmatched Files: ${unmatchedFiles.size}`,
      '='.repeat(80)
    ].join('\n');
    
    fs.appendFileSync(logFile, footer);
    log('\nProcessing complete');

  } catch (error) {
    log(`Error in main execution: ${error.message}`, 'error');
    process.exit(1);
  }
};

main();