/**
 * Department Salary Processing Script
 * 
 * This script processes workforce CSV files and updates departments.json with salary data.
 * It handles:
 * - Salary distribution calculations
 * - Department hierarchy management
 * - Data validation and type compliance
 * - Logging of operations and results
 * 
 * Workflow:
 * 1. Initial Setup
 *    a. Load departments.json
 *    b. Setup logging
 *    c. Count initial departments with salary data
 * 
 * 2. CSV Processing
 *    a. Read and parse CSV files
 *    b. Extract department information
 *    c. Calculate salary distributions
 *    d. Match CSV records to JSON departments
 *       - Find exact matches by entity code
 *       - Find exact matches by name/aliases
 *       - Find potential matches with scores
 *       - Auto-select high confidence matches (score > 80)
 *       - Present user with potential matches for selection
 *    e. Update department data with new salary information
 *    f. Validate changes before saving
 * 
 * 3. Data Validation
 *    a. Verify salary ranges
 *    b. Check department hierarchy
 *    c. Validate data types
 * 
 * 4. Results Summary
 *    a. Count updated departments
 *    b. Verify data consistency
 *    c. Log final statistics
 *    d. Log differences between original and updated departments.json
 * 
 * Usage:
 * ```bash
 * node process_departments_salary.js
 * ```
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { findDepartmentMatches } = require('../lib/departmentMatching');

// Data Structure Normalization
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
  
  if (normalized.wages) {
    normalized.wages = {
      yearly: normalized.wages.yearly || {}
    };
  }
  
  if (normalized.salaryDistribution) {
    normalized.salaryDistribution = {
      yearly: normalized.salaryDistribution.yearly || {}
    };
  }
  
  if (normalized.tenureDistribution) {
    normalized.tenureDistribution = {
      yearly: normalized.tenureDistribution.yearly || {}
    };
  }
  
  if (normalized.ageDistribution) {
    normalized.ageDistribution = {
      yearly: normalized.ageDistribution.yearly || {}
    };
  }
  
  if (normalized.spending) {
    normalized.spending = {
      yearly: normalized.spending.yearly || {}
    };
  }
  
  return normalized;
};

// Validation Functions
const validateSalaryRange = (range) => {
  if (!Array.isArray(range) || range.length !== 2) {
    return false;
  }
  const [min, max] = range;
  return SALARY_RANGES.some(([validMin, validMax]) => 
    min === validMin && max === validMax
  );
};

const validateDepartmentStructure = (dept) => {
  const errors = [];
  
  // Required fields check
  const requiredFields = ['name', 'slug', 'canonicalName', 'aliases', 'headCount', 'wages'];
  requiredFields.forEach(field => {
    if (!dept[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate salary distribution if present
  if (dept.salaryDistribution?.yearly) {
    Object.entries(dept.salaryDistribution.yearly).forEach(([year, ranges]) => {
      if (!Array.isArray(ranges)) {
        errors.push(`Invalid salary distribution for year ${year}: not an array`);
        return;
      }
      
      ranges.forEach((range, index) => {
        if (!validateSalaryRange(range.range)) {
          errors.push(`Invalid salary range at index ${index} for year ${year}: ${JSON.stringify(range.range)}`);
        }
        if (typeof range.count !== 'number' || range.count < 0) {
          errors.push(`Invalid count at index ${index} for year ${year}: ${range.count}`);
        }
      });
    });
  }

  // Validate headcount matches distribution
  if (dept.headCount?.yearly && dept.salaryDistribution?.yearly) {
    Object.entries(dept.headCount.yearly).forEach(([year, count]) => {
      if (dept.salaryDistribution.yearly[year]) {
        const totalCount = dept.salaryDistribution.yearly[year].reduce((sum, range) => sum + range.count, 0);
        if (totalCount !== count) {
          errors.push(`Headcount mismatch for year ${year}: distribution total ${totalCount} != headcount ${count}`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Enhanced Logging
const createValidationLogger = (log) => {
  return {
    logValidationError: (dept, field, value, expected) => {
      log(`Validation Error - Department: ${dept.name || 'Unknown'}`);
      log(`Field: ${field}`);
      log(`Value: ${JSON.stringify(value)}`);
      log(`Expected: ${JSON.stringify(expected)}`);
    },
    logDataIntegrityError: (dept, message) => {
      log(`Data Integrity Error - Department: ${dept.name || 'Unknown'}`);
      log(`Message: ${message}`);
    },
    logDepartmentUpdate: (dept, before, after) => {
      log(`Department Update - ${dept.name || 'Unknown'}`);
      log('Before:', JSON.stringify(before, null, 2));
      log('After:', JSON.stringify(after, null, 2));
    }
  };
};

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CSV_DIR = path.join(PROJECT_ROOT, 'src/data/workforce');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
const LOG_DIR = path.join(PROJECT_ROOT, 'src/logs');
const CSV_PATTERN = /.*\.csv$/;

// Function to extract annual year from CSV filename
const extractAnnualYear = (filename) => {
  // Extract year from filename (e.g., "workforce_  .csv" -> "2023")
  const yearMatch = filename.match(/_(\d{4})\.csv$/);
  if (!yearMatch) {
    throw new Error(`Could not extract annual year from filename: ${filename}`);
  }
  return yearMatch[1];
};

// Function to extract entity code from CSV filename
const extractEntityCode = (filename) => {
  // Extract first 4 digits from filename (e.g., "1234_workforce_2023.csv" -> "1234")
  const entityMatch = filename.match(/^(\d{4})_/);
  if (!entityMatch) {
    throw new Error(`Could not extract entity code from filename: ${filename}`);
  }
  return entityMatch[1];
};

// Define the salary ranges to match SalaryRange interface exactly
const SALARY_RANGES = [
  [0, 19999],       // Under 20k
  [20000, 29999],   // 20-30k
  [30000, 39999],   // 30-40k
  [40000, 49999],   // 40-50k
  [50000, 59999],   // 50-60k
  [60000, 69999],   // 60-70k
  [70000, 79999],   // 70-80k
  [80000, 89999],   // 80-90k
  [90000, 99999],   // 90-100k
  [100000, 109999], // 100-110k
  [110000, 119999], // 110-120k
  [120000, 129999], // 120-130k
  [130000, 139999], // 130-140k
  [140000, 149999], // 140-150k
  [150000, 159999], // 150-160k
  [160000, 169999], // 160-170k
  [170000, 179999], // 170-180k
  [180000, 189999], // 180-190k
  [190000, 199999], // 190-200k
  [200000, 249999], // 200-250k
  [250000, 299999], // 250-300k
  [300000, 349999], // 300-350k
  [350000, 399999], // 350-400k
  [400000, 449999], // 400-450k
  [450000, 499999], // 450-500k
  [500000, 10000000] // 500k-10M
];

// Setup logging
const setupLogging = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `process_departments_salary_${timestamp}.log`);
  
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
  
  return { logFile, log };
};

// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const _formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num);
};

const _readDepartmentsJson = async () => {
  try {
    log('Reading departments.json...');
    const data = fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8');
    const parsed = JSON.parse(data);
    log(`Successfully loaded departments.json with ${parsed.departments.length} departments`);
    return parsed;
  } catch (error) {
    log(`Error reading departments.json: ${error.message}`, 'error');
    process.exit(1);
  }
};

const _writeDepartmentsJson = async (data, log) => {
  try {
    log('Writing updated departments.json...');
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(DEPARTMENTS_JSON_PATH, jsonString, 'utf8');
    log('Successfully updated departments.json');
  } catch (error) {
    log(`Error writing departments.json: ${error.message}`, 'error');
    process.exit(1);
  }
};

const calculateSalaryDistribution = (rows, log) => {
  // Initialize distribution with all required ranges
  const distribution = SALARY_RANGES.map(([min, max]) => ({
    range: [min, max],
    count: 0
  }));

  let totalCount = 0;
  let totalSalary = 0;

  // Log the first row to see available fields
  if (rows.length > 0) {
    const firstRow = rows[0];
    log('CSV Fields:', Object.keys(firstRow).join(', '));
    log('First row sample:', JSON.stringify(firstRow));
  }

  rows.forEach(row => {
    // Calculate total compensation from all components
    const wages = parseFloat(row['Total Wages'] || row['TotalWages'] || 0);
    const benefits = parseFloat(row['Defined Benefit Plan Contribution'] || row['DefinedBenefitPlanContribution'] || 0) +
                    parseFloat(row['Employees Retirement Cost Covered'] || row['EmployeesRetirementCostCovered'] || 0) +
                    parseFloat(row['Deferred Compensation Plan'] || row['DeferredCompensationPlan'] || 0) +
                    parseFloat(row['Health Dental Vision'] || row['HealthDentalVision'] || 0);
    
    const totalCompensation = wages + benefits;
    
    if (totalCompensation > 0) {
      totalCount++;
      totalSalary += totalCompensation;
      
      // Find matching range
      const range = distribution.find(r => 
        totalCompensation >= r.range[0] && totalCompensation <= r.range[1]
      );
      
      if (range) {
        range.count++;
      } else {
        log(`Warning: Salary ${totalCompensation} outside all ranges`, 'warn');
        // Add to highest range if above maximum
        if (totalCompensation > SALARY_RANGES[SALARY_RANGES.length - 1][1]) {
          distribution[distribution.length - 1].count++;
        }
        // Add to lowest range if below minimum
        else if (totalCompensation < SALARY_RANGES[0][0]) {
          distribution[0].count++;
        }
      }
    }
  });

  // Calculate average salary and round to 1 decimal place
  const averageSalary = totalCount > 0 ? Number((totalSalary / totalCount).toFixed(1)) : null;

  // Validate total count matches
  const distributionTotal = distribution.reduce((sum, range) => sum + range.count, 0);
  if (distributionTotal !== totalCount) {
    log(`Warning: Distribution total (${distributionTotal}) does not match total count (${totalCount})`, 'warn');
  }

  // Validate all ranges are present
  const missingRanges = SALARY_RANGES.filter(([min, max]) => 
    !distribution.some(d => d.range[0] === min && d.range[1] === max)
  );

  if (missingRanges.length > 0) {
    log(`Warning: Missing salary ranges: ${JSON.stringify(missingRanges)}`, 'warn');
  }

  return {
    distribution,
    averageSalary,
    totalCount
  };
};

// Function to show differences between objects
const _showDiff = (original, updated, log) => {
  log('\nDifferences:');
  
  // Helper function to check deep changes
  const findDifferences = (obj1, obj2, path = '') => {
    // Handle null or undefined
    if (!obj1 || !obj2) {
      if (obj1 !== obj2) {
        log(`${path}: ${JSON.stringify(obj1)} → ${JSON.stringify(obj2)}`);
      }
      return;
    }
    
    // For arrays or non-objects, just compare directly
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || 
        Array.isArray(obj1) || Array.isArray(obj2)) {
      if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
        log(`${path}: ${JSON.stringify(obj1)} → ${JSON.stringify(obj2)}`);
      }
      return;
    }
    
    // Get all keys from both objects
    const allKeys = [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])];
    
    // Check each key
    allKeys.forEach(key => {
      const newPath = path ? `${path}.${key}` : key;
      
      // If key exists in both objects and values are both objects, recurse
      if (obj1[key] !== undefined && obj2[key] !== undefined && 
          typeof obj1[key] === 'object' && typeof obj2[key] === 'object' &&
          !Array.isArray(obj1[key]) && !Array.isArray(obj2[key])) {
        findDifferences(obj1[key], obj2[key], newPath);
      } 
      // Otherwise compare directly
      else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        log(`${newPath}: ${JSON.stringify(obj1[key])} → ${JSON.stringify(obj2[key])}`);
      }
    });
  };
  
  findDifferences(original, updated);
  log('');
};

// Function to extract campus name from state university name
function _extractCampusName(name) {
  if (!name) return null;
  
  // List of known CSU campus names
  const campusNames = [
    'pomona', 'san jose', 'humboldt', 'chico', 'dominguez hills', 'east bay',
    'fresno', 'fullerton', 'hayward', 'long beach', 'los angeles', 'monterey bay',
    'northridge', 'sacramento', 'san bernardino', 'san diego', 'san francisco',
    'san luis obispo', 'san marcos', 'sonoma', 'stanislaus'
  ];
  
  // Normalize the input name
  const normalizedName = name.toLowerCase()
    .replace(/[,()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  
  // Check if it's a state university name
  if (normalizedName.includes('state university') || normalizedName.includes('california state university')) {
    // Look for campus names in the normalized name
    for (const campus of campusNames) {
      if (normalizedName.includes(campus)) {
        return campus;
      }
    }
  }
  
  return null;
}

// Function to handle user selection of department match
const selectDepartmentMatch = async (employerName, potentialMatches, log) => {
  if (potentialMatches.length === 0) {
    log(`No potential matches found for ${employerName}`);
    return null;
  }

  // Step 2d.1: Display potential matches with scores and types
  log(`\nPotential matches for ${employerName}:`);
  potentialMatches.forEach((match, index) => {
    log(`${index + 1}. ${match.department.name} (${match.matchType}, score: ${match.score})`);
  });

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Step 2d.2: Get user selection
  return new Promise((resolve) => {
    readline.question('\nSelect a department to update (or press Enter to skip): ', (answer) => {
      readline.close();
      
      if (!answer) {
        log('Skipping department update');
        resolve(null);
        return;
      }

      const selectedIndex = parseInt(answer) - 1;
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= potentialMatches.length) {
        log('Invalid selection, skipping department update');
        resolve(null);
        return;
      }

      const selectedMatch = potentialMatches[selectedIndex];
      log(`Selected: ${selectedMatch.department.name}`);
      resolve(selectedMatch.department);
    });
  });
};

// Function to compare department data and ask for user confirmation
const compareAndConfirmUpdate = async (department, updateData, log, isPartialMatch = false, employerName = '') => {
  const timestamp = new Date().toISOString();
  
  log(`\n[${timestamp}] === Step 2e: Department Data Comparison ===`);
  
  // Show matching details
  log(`[${timestamp}] CSV Department:`);
  log(`[${timestamp}]   Name: ${employerName}`);
  log(`[${timestamp}]   Entity Code: ${updateData.entityCode}`);
  
  log(`[${timestamp}] JSON Department:`);
  log(`[${timestamp}]   Name: ${department.name}`);
  log(`[${timestamp}]   Entity Code: ${department.entityCode}`);
  log(`[${timestamp}]   Aliases: ${department.aliases?.join(', ') || 'None'}`);
  
  // Compare and show differences in data
  log(`\n[${timestamp}] Data Differences:`);
  
  // Compare headcount data
  log(`[${timestamp}] HeadCount Information:`);
  Object.entries(updateData.headCount?.yearly || {}).forEach(([year, value]) => {
    const currentValue = department.headCount?.yearly?.[year];
    if (currentValue !== value) {
      log(`[${timestamp}]   ${year}: JSON: ${currentValue || 'Not set'} | CSV: ${value || 'Not set'}`);
    }
  });
  
  // Compare wages data
  log(`\n[${timestamp}] Wages Information:`);
  Object.entries(updateData.wages?.yearly || {}).forEach(([year, value]) => {
    const currentValue = department.wages?.yearly?.[year];
    if (currentValue !== value) {
      log(`[${timestamp}]   ${year}: JSON: $${formatCurrency(currentValue) || 'Not set'} | CSV: $${formatCurrency(value) || 'Not set'}`);
    }
  });
  
  // Compare average salary
  if (updateData.averageSalary !== undefined) {
    const currentValue = department.averageSalary;
    if (currentValue !== updateData.averageSalary) {
      log(`\n[${timestamp}] Average Salary:`);
      log(`[${timestamp}]   JSON: $${formatCurrency(currentValue) || 'Not set'} | CSV: $${formatCurrency(updateData.averageSalary) || 'Not set'}`);
    }
  }
  
  // Compare salary distribution
  log(`\n[${timestamp}] Salary Distribution:`);
  Object.entries(updateData.salaryDistribution?.yearly || {}).forEach(([year, value]) => {
    const currentValue = department.salaryDistribution?.yearly?.[year];
    if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
      log(`[${timestamp}]   ${year}: Distribution data differs`);
    }
  });
  
  log(`[${timestamp}] === Step 2e Complete ===\n`);
  
  // For high confidence matches, auto-approve
  if (!isPartialMatch) {
    log(`[${timestamp}] High confidence match detected - auto-approving update`);
    return true;
  }
  
  // For partial matches, ask for user confirmation
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  log(`[${timestamp}] === Step 2e: User Confirmation ===`);

  return new Promise((resolve) => {
    readline.question('\nDo you want to update this department? (y/n): ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
};

// Main execution
const main = async () => {
  let log;
  let logFile;
  // eslint-disable-next-line no-unused-vars
  let validationLogger = createValidationLogger(log);
  let departmentsData;
  let initialDepartmentsWithSalary;
  let _totalNewDepartments = 0;
  let _totalUpdatedDepartments = 0;
  let _totalSkippedDepartments = 0;
  let _totalProcessedDepartments = 0;
  let totalValidationErrors = 0;
  let _finalDepartmentsWithSalary = 0;
  
  try {
    // Step 1: Initial Setup
    const loggingSetup = setupLogging();
    log = loggingSetup.log;
    logFile = loggingSetup.logFile;
    
    // Initialize processedDepartments map
    const processedDepartments = new Map();
    
    // Step 1a: Load departments.json
    log('Step 1a: Loading departments.json...');
    try {
      const data = fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8');
      departmentsData = JSON.parse(data);
      
      // Normalize department data
      departmentsData.departments = departmentsData.departments.map(dept => normalizeDepartmentData(dept));
      
      log(`Successfully loaded departments.json with ${departmentsData?.departments?.length || 0} departments`);
      
      // Validate initial data
      departmentsData.departments.forEach((dept, index) => {
        const validation = validateDepartmentStructure(dept);
        if (!validation.isValid) {
          totalValidationErrors++;
          log(`Validation errors in department ${index + 1} (${dept.name || 'Unknown'}):`);
          validation.errors.forEach(error => log(`- ${error}`));
        }
      });
      
      if (totalValidationErrors > 0) {
        log(`Found ${totalValidationErrors} departments with validation errors in initial data`, 'error');
      }
    } catch (error) {
      log(`Error reading departments.json: ${error.message}`, 'error');
      process.exit(1);
    }
    
    // Step 1b: Count initial departments with salary data
    log('Step 1b: Counting initial departments with salary data...');
    initialDepartmentsWithSalary = departmentsData.departments.filter(d => 
      d.salaryDistribution?.yearly && Object.values(d.salaryDistribution.yearly).some(yearData => yearData.length > 0)
    ).length;
    log(`Found ${initialDepartmentsWithSalary} departments with salary data initially`);
    
    // Step 1c: Setup complete
    log('Step 1c: Initial setup complete\n');
    
    // Step 2: CSV Processing
    log('=== STEP 2: CSV PROCESSING ===');
    
    // Get CSV files
    const files = fs.readdirSync(CSV_DIR)
      .filter(file => CSV_PATTERN.test(file))
      .map(file => path.join(CSV_DIR, file));
    
    if (files.length === 0) {
      log('No CSV files found in workforce directory', 'error');
      process.exit(1);
    }
    
    log(`Found ${files.length} CSV files: ${files.map(f => path.basename(f)).join(', ')}`);
    
    // Initialize processedDepartments with all CSV employers
    for (const file of files) {
      const _filename = path.basename(file);
      const records = parse(fs.readFileSync(file, 'utf8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      const employerNames = [...new Set(records.map(record => record.EmployerName))];
      for (const employerName of employerNames) {
        processedDepartments.set(employerName, {
          updated: false,
          reason: 'Failed to update',
          details: 'No matching CSV data found'
        });
      }
    }
    
    // Process each file
    for (const file of files) {
      const _filename = path.basename(file);
      const annualYear = extractAnnualYear(_filename);
      const entityCode = extractEntityCode(_filename);
      log(`\nProcessing file: ${_filename} (Annual Year: ${annualYear}, Entity Code: ${entityCode})`);
      
      // Step 2a: Read and parse CSV
      log('Step 2a: Reading and parsing CSV file...');
      const fileContent = fs.readFileSync(file, 'utf8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      if (!Array.isArray(records) || records.length === 0) {
        log(`No valid records found in ${_filename}`, 'error');
        continue;
      }
      
      log(`Found ${records.length} records in CSV file`);
      
      // Step 2b: Extract department information
      log('Step 2b: Extracting department information...');
      const employerNames = [...new Set(records.map(record => record.EmployerName))];
      log(`Found ${employerNames.length} unique employers`);
      
      // Step 2c: Process each department
      log('Step 2c: Processing departments...');
      for (const employerName of employerNames) {
        _totalProcessedDepartments++;
        log(`\nProcessing employer: ${employerName}`);
        
        const employerRecords = records.filter(record => record.EmployerName === employerName);
        if (employerRecords.length === 0) {
          _totalSkippedDepartments++;
          continue;
        }
        
        // Step 2d: Match CSV records to JSON departments
        log('Step 2d: Finding department matches...');
        const { bestMatch, potentialMatches } = findDepartmentMatches(employerName, departmentsData.departments, entityCode);

        let department = null;
        let isPartialMatch = false;

        // Step 2d.1: Handle high confidence matches
        if (bestMatch) {
          department = bestMatch.department;
          isPartialMatch = bestMatch.isPartialMatch;
          log(`Found high confidence match: ${department.name} (score: ${bestMatch.score})`);
        } else {
          // Step 2d.2: Present potential matches for user selection
          department = await selectDepartmentMatch(employerName, potentialMatches, log);
          isPartialMatch = true;
        }

        // Step 2d.3: Handle no match found
        if (!department) {
          const processed = processedDepartments.get(employerName);
          if (processed) {
            processed.updated = false;
            processed.reason = 'No matching department found';
            processed.details = `Could not find matching department for "${employerName}"`;
          }
          log(`No matching department found for ${employerName}`, 'error');
          continue;
        }
        
        // Step 2e: Update department data
        log(`Step 2e: Updating department data for ${department.name}...`);
        try {
          // Calculate total compensation
          const totalCompensation = employerRecords.reduce((sum, row) => {
            const wages = parseFloat(row.TotalWages || 0);
            const benefits = parseFloat(row.DefinedBenefitPlanContribution || 0) +
                            parseFloat(row.EmployeesRetirementCostCovered || 0) +
                            parseFloat(row.DeferredCompensationPlan || 0) +
                            parseFloat(row.HealthDentalVision || 0);
            return sum + wages + benefits;
          }, 0);
          
          // Calculate headcount from records
          const headCount = employerRecords.length;
          
          // Calculate salary distribution and average salary
          const { distribution: salaryDistribution, averageSalary: calculatedAverageSalary } = calculateSalaryDistribution(employerRecords, log);
          
          // Log salary distribution calculation results
          log('Salary Distribution Calculation Results:');
          log(`Total Records: ${employerRecords.length}`);
          log(`Total Compensation: $${formatCurrency(totalCompensation)}`);
          log(`Average Salary: $${formatCurrency(calculatedAverageSalary)}`);
          log(`Headcount from Distribution: ${headCount}`);
          
          if (!salaryDistribution || !Array.isArray(salaryDistribution) || salaryDistribution.length === 0) {
            log('Error: Salary distribution array is empty or invalid', 'error');
            return false;
          }
          
          // Prepare update data
          const updateData = {
            headCount: {
              yearly: {
                [annualYear]: headCount
              }
            },
            wages: {
              yearly: {
                [annualYear]: totalCompensation
              }
            },
            averageSalary: calculatedAverageSalary,
            salaryDistribution: {
              yearly: {
                [annualYear]: salaryDistribution
              }
            },
            entityCode: entityCode
          };
          
          // Compare and confirm update
          const shouldUpdate = await compareAndConfirmUpdate(department, updateData, log, isPartialMatch, employerName);
          
          // Update department data directly if confirmed
          if (shouldUpdate) {
            // If this is a partial match, add the CSV name to aliases if not already present
            if (isPartialMatch && !department.aliases?.some(alias => alias.toLowerCase() === employerName.toLowerCase())) {
              if (!department.aliases) {
                department.aliases = [];
              }
              department.aliases.push(employerName);
              log(`Added "${employerName}" to department aliases`);
            }
            
            // Directly update the department data
            if (updateData.headCount?.yearly) {
              department.headCount = department.headCount || { yearly: {} };
              Object.assign(department.headCount.yearly, updateData.headCount.yearly);
            }
            
            if (updateData.wages?.yearly) {
              department.wages = department.wages || { yearly: {} };
              Object.assign(department.wages.yearly, updateData.wages.yearly);
            }
            
            if (updateData.averageSalary !== undefined) {
              department.averageSalary = Number(updateData.averageSalary.toFixed(1));
            }
            
            if (updateData.salaryDistribution?.yearly) {
              department.salaryDistribution = department.salaryDistribution || { yearly: {} };
              Object.assign(department.salaryDistribution.yearly, updateData.salaryDistribution.yearly);
            }
            
            // Handle note matching
            const newNote = `Salary data from ${_filename}`;
            if (!department.note) {
              department.note = newNote;
            } else if (!department.note.includes(newNote)) {
              department.note = `${department.note}, ${newNote}`;
            }
            
            // Update entity code if not present or different
            if (updateData.entityCode && (!department.entityCode || department.entityCode !== updateData.entityCode)) {
              department.entityCode = updateData.entityCode;
              log(`Updated entity code to ${updateData.entityCode}`);
            }
            
            // Update the processedDepartments tracking for successful updates
            const processed = processedDepartments.get(employerName);
            if (processed) {
              processed.updated = true;
              processed.reason = 'Successfully updated';
              processed.details = `Updated with data from ${_filename}`;
            }
            
            _totalUpdatedDepartments++;
            log(`Successfully updated department data for ${department.name}`);
            
            // Write to file immediately after each successful update
            try {
              fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
              log(`Successfully wrote updated departments.json`);
            } catch (error) {
              log(`Error writing departments.json: ${error.message}`, 'error');
            }
          } else {
            // Update the processedDepartments tracking for skipped updates
            const processed = processedDepartments.get(employerName);
            if (processed) {
              processed.updated = true; // Mark as processed even if skipped
              processed.reason = 'Skipped - No changes needed';
              processed.details = `Data from ${_filename} matches existing data`;
            }
            log(`Skipping update for department: ${department.name} - No changes needed`);
            continue;
          }
          
        } catch (error) {
          // Update the processedDepartments tracking for errors
          const processed = processedDepartments.get(employerName);
          if (processed) {
            processed.updated = false;
            processed.reason = 'Error processing data';
            processed.details = `Error: ${error.message}`;
          }
          log(`Error updating department data: ${error.message}`, 'error');
          continue;
        }
      }
    }
    
    // Step 3: Final Processing
    log('\n=== STEP 3: FINAL PROCESSING ===');
    
    // Step 3a: Count final departments with salary data
    _finalDepartmentsWithSalary = departmentsData.departments.filter(d => 
      d.salaryDistribution?.yearly && Object.values(d.salaryDistribution.yearly).some(yearData => yearData.length > 0)
    ).length;
    
    // Step 3b: Log final statistics
    log('\nProcessing Summary:');
    log('===================');
    
    // Calculate total departments in JSON
    const totalDepartmentsInJson = departmentsData.departments.length;
    
    // Calculate departments processed from CSV
    const departmentsFromCsv = processedDepartments.size;
    
    // Calculate successful updates
    const successfulUpdates = Array.from(processedDepartments.values())
      .filter(d => d.updated && d.reason === 'Successfully updated').length;
    
    // Calculate skipped updates
    const skippedUpdates = Array.from(processedDepartments.values())
      .filter(d => d.updated && d.reason === 'Skipped - No changes needed').length;
    
    // Calculate failed updates
    const failedUpdates = Array.from(processedDepartments.values())
      .filter(d => !d.updated).length;
    
    // Calculate departments with salary data
    const departmentsWithSalary = departmentsData.departments.filter(d => 
      d.salaryDistribution?.yearly && Object.values(d.salaryDistribution.yearly).some(yearData => yearData.length > 0)
    ).length;
    
    // Log summary statistics
    log('\nOverall Statistics:');
    log('------------------');
    log(`Total departments in departments.json: ${totalDepartmentsInJson}`);
    log(`Departments with salary data: ${departmentsWithSalary}`);
    log(`Departments without salary data: ${totalDepartmentsInJson - departmentsWithSalary}`);
    
    log('\nCSV Processing Results:');
    log('----------------------');
    log(`Departments found in CSV files: ${departmentsFromCsv}`);
    log(`Successfully updated: ${successfulUpdates}`);
    log(`Skipped - No changes needed: ${skippedUpdates}`);
    log(`Failed to update: ${failedUpdates}`);
    
    // Group failed updates by reason
    const failedByReason = Array.from(processedDepartments.values())
      .filter(d => !d.updated)
      .reduce((acc, d) => {
        acc[d.reason] = (acc[d.reason] || 0) + 1;
        return acc;
      }, {});
    
    log('\nFailed Updates by Reason:');
    log('------------------------');
    Object.entries(failedByReason).forEach(([reason, count]) => {
      log(`${reason}: ${count} departments`);
      // Log details for each failed department
      Array.from(processedDepartments.entries())
        .filter(([_, d]) => !d.updated && d.reason === reason)
        .forEach(([name, d]) => {
          log(`  - ${name}: ${d.details}`);
        });
    });
    
    // Step 3c: Department Update Summary
    const summary = [];
    summary.push('\nDetailed Department Status:');
    summary.push('=========================');
    
    // Get all departments from JSON
    const allDepartments = departmentsData.departments.map(d => ({
      name: d.name,
      organizationalCode: d.organizationalCode || 'NO_BUDGET_CODE',
      updated: false,
      reason: 'Not processed',
      details: ''
    }));

    // Update the status of processed departments
    for (const dept of allDepartments) {
      const processed = processedDepartments.get(dept.name);
      if (processed) {
        dept.updated = processed.updated;
        dept.reason = processed.reason;
        dept.details = processed.details;
      }
    }
    
    // Group departments by status - only include departments that were in CSV files
    const updatedDepartments = allDepartments.filter(d => 
      processedDepartments.has(d.name) && 
      d.updated && 
      d.reason === 'Successfully updated'
    );
    
    const skippedDepartments = allDepartments.filter(d => 
      processedDepartments.has(d.name) && 
      d.updated && 
      d.reason === 'Skipped - No changes needed'
    );
    
    const notUpdatedDepartments = allDepartments.filter(d => 
      processedDepartments.has(d.name) && 
      !d.updated
    );
    
    // Build summary
    summary.push(`\nSuccessfully Updated Departments (${updatedDepartments.length}):`);
    summary.push('----------------------------------------');
    updatedDepartments.forEach(d => {
      summary.push(`${d.organizationalCode}_${d.name}`);
      if (d.details) {
        summary.push(`  Details: ${d.details}`);
      }
    });
    
    summary.push(`\nSkipped - No Changes Needed (${skippedDepartments.length}):`);
    summary.push('----------------------------------------');
    skippedDepartments.forEach(d => {
      summary.push(`${d.organizationalCode}_${d.name}`);
      if (d.details) {
        summary.push(`  Details: ${d.details}`);
      }
    });
    
    summary.push(`\nFailed to Update Departments (${notUpdatedDepartments.length}):`);
    summary.push('----------------------------------------');
    
    // Group by reason for better organization
    const groupedByReason = notUpdatedDepartments.reduce((acc, d) => {
      const key = d.reason;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(d);
      return acc;
    }, {});
    
    Object.entries(groupedByReason).forEach(([reason, departments]) => {
      summary.push(`\n${reason}: ${departments.length} departments`);
      departments.forEach(d => {
        summary.push(`${d.organizationalCode}_${d.name}`);
        if (d.details) {
          summary.push(`  Details: ${d.details}`);
        }
      });
    });

    // Add a section for departments not found in CSV files
    const departmentsNotInCsv = allDepartments.filter(d => !processedDepartments.has(d.name));
    if (departmentsNotInCsv.length > 0) {
      summary.push(`\nDepartments Not Found in CSV Files (${departmentsNotInCsv.length}):`);
      summary.push('----------------------------------------');
      departmentsNotInCsv.forEach(d => {
        summary.push(`${d.organizationalCode}_${d.name}`);
      });
    }

    // Write summary to both console and log file
    const summaryText = summary.join('\n');
    console.log(summaryText);
    fs.appendFileSync(logFile, summaryText + '\n');

    // Step 3d: Final validation check
    log('\nPerforming final validation check...');
    departmentsData.departments.forEach((dept, index) => {
      const validation = validateDepartmentStructure(dept);
      if (!validation.isValid) {
        log(`Final validation errors in department ${index + 1} (${dept.name || 'Unknown'}):`, 'error');
        validation.errors.forEach(error => log(`- ${error}`, 'error'));
      }
    });

    // Step 3e: Write updated departments.json
    log('\nWriting updated departments.json...');
    try {
      fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
      log('Successfully wrote updated departments.json');
    } catch (error) {
      log(`Error writing departments.json: ${error.message}`, 'error');
      process.exit(1);
    }

    log('\nProcessing complete');

  } catch (error) {
    log(`Error in main execution: ${error.message}`, 'error');
    process.exit(1);
  }
};

main();