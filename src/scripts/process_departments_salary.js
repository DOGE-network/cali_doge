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
 *    d. log the differences between the original and updated record
 *    e. only update department records if differences are found
 *    f. Log department details
 *    g. if existing parent agency field with data, attempt to match the parent agency field, use the matched record name field as the parent agency record being updated
 *    h. if the parent agency name is not matched with existing records, create a new department record for the parent agency
 *    i. match _note with the csv file name or append to the existing note
 *    j. save the changes
 *    k. continue until all files are processed
 * 
 * 3. Data Validation
 *    a. Verify salary ranges
 *    b. Check department hierarchy using matching parent_agency field. 
 *    c. Validate data types
 * 
 * 4. Results Summary
 *    a. Count updated departments
 *    b. Verify data consistency
 *    c. Log final statistics
 *    d. log differences between original and updated departments.json
 * 
 * Usage:
 * ```bash
 * node process_departments_salary.js
 * ```
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CSV_DIR = path.join(PROJECT_ROOT, 'src/data/workforce');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
const LOG_DIR = path.join(PROJECT_ROOT, 'src/logs');
const CSV_PATTERN = /.*\.csv$/;

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
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
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
  return Math.round(parseFloat(amount || 0));
};

const readDepartmentsJson = (log) => {
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

const writeDepartmentsJson = (data, log) => {
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
  log(`Calculating salary distribution for ${rows.length} employees`);
  const headCount = rows.length;
  if (headCount === 0) {
    log('No employees found, returning empty distribution');
    return [];
  }
  
  // Initialize distribution array with SalaryRange format
  const distribution = SALARY_RANGES.map(([min, max]) => ({
    range: [min, max],
    count: 0
  }));
  
  rows.forEach((row, index) => {
    // Calculate total compensation including benefits
    const totalCompensation = parseFloat(row.TotalWages || 0) + 
                          parseFloat(row.DefinedBenefitPlanContribution || 0) + 
                          parseFloat(row.EmployeesRetirementCostCovered || 0) + 
                          parseFloat(row.DeferredCompensationPlan || 0) + 
                          parseFloat(row.HealthDentalVision || 0);
    
    // Find the appropriate range and increment count
    const rangeIndex = SALARY_RANGES.findIndex(([min, max]) => 
      totalCompensation >= min && totalCompensation <= max
    );
    
    if (rangeIndex !== -1) {
      distribution[rangeIndex].count++;
    }
    
    if ((index + 1) % 1000 === 0) {
      log(`Processed ${index + 1}/${headCount} employees`);
    }
  });

  log(`Completed salary distribution calculation`);
  return distribution;
};

// Function to show differences between objects
const showDiff = (original, updated, log) => {
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

// Function to find department by name with thorough matching
const findDepartmentByName = (name, departmentsData) => {
  if (!name) return null;
  
  // Clean up the name
  const cleanName = name.trim().replace(/^"/, '').replace(/"$/, '');
  if (!cleanName) return null;
  
  // Thorough matching logic from generate-department-mappings.js
  return departmentsData.departments.find(dept => 
    dept.name === cleanName || 
    dept.canonicalName === cleanName || 
    (dept.aliases && dept.aliases.some(alias => 
      alias.toLowerCase() === cleanName.toLowerCase()
    )) ||
    // Also match by code in case name is slightly different
    (dept.budgetCode && dept.budgetCode.toString() === cleanName.toString())
  );
};

// Function to find department by name or alias
const findDepartmentByNameOrAlias = (name, departmentsData) => {
    if (!name) return null;
    
    // Clean up the name
    const cleanName = name.trim().replace(/^"/, '').replace(/"$/, '');
    if (!cleanName) return null;
    
  // First try exact matches
  const exactMatch = findDepartmentByName(cleanName, departmentsData);
  if (exactMatch) return exactMatch;
  
  // Then try matching against aliases
  return departmentsData.departments.find(dept => 
    dept.aliases && dept.aliases.some(alias => 
        alias.toLowerCase() === cleanName.toLowerCase()
    )
    );
  };
  
// Function to create a department record for parent if it doesn't exist
const createParentDepartment = (parentName, departmentsData, log) => {
    if (!parentName) return null;
    
    const cleanParentName = parentName.trim().replace(/^"/, '').replace(/"$/, '');
    if (!cleanParentName) return null;
    
    const parentSlug = cleanParentName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .replace(/^_|_$/g, '');
      
    const newParentDept = {
      name: cleanParentName,
      slug: parentSlug,
      canonicalName: cleanParentName,
      aliases: [cleanParentName.toLowerCase()],
      spending: {
        yearly: {}
      },
      workforce: {
        headCount: {
          yearly: {}
        },
        wages: {
          yearly: {}
        },
        averageTenureYears: null,
        averageSalary: null,
        averageAge: null,
        tenureDistribution: [],
        salaryDistribution: [],
        ageDistribution: [],
        _note: null
      },
      budget_status: "active",
      keyFunctions: "",
      abbreviation: "",
      code: null,
      orgLevel: 2,
      parent_agency: "Executive Branch"
    };
    
  log(`Creating parent department: ${cleanParentName}`);
    departmentsData.departments.push(newParentDept);
    
    return newParentDept;
  };
  
// Function to determine parent agency based on rules
const determineParentAgency = (record, departmentsData, log) => {
    const employerType = record.EmployerType || '';
    const _employerName = record.EmployerName || '';
    const departmentOrSubdivision = record.DepartmentOrSubdivision || '';
    
    // Rule 1: If EmployerType is Judicial Council
    if (employerType.includes('Judicial Council')) {
    const parent = findDepartmentByNameOrAlias("Superior Courts", departmentsData);
    if (!parent) {
      createParentDepartment("Superior Courts", departmentsData, log);
    }
    return parent ? parent.name : "Superior Courts";
    }
    
    // Rule 2: If EmployerType is California State University
    if (employerType.includes('California State University')) {
    const parent = findDepartmentByNameOrAlias("California State University Board of Trustees", departmentsData);
    if (!parent) {
      createParentDepartment("California State University Board of Trustees", departmentsData, log);
    }
    return parent ? parent.name : "California State University Board of Trustees";
    }
    
    // Rule 3: If EmployerType is University of California
    if (employerType.includes('University of California')) {
    const parent = findDepartmentByNameOrAlias("University of California Board of Regents", departmentsData);
    if (!parent) {
      createParentDepartment("University of California Board of Regents", departmentsData, log);
    }
    return parent ? parent.name : "University of California Board of Regents";
  }
  
  // Rule 4: If EmployerType is State Department
  if (employerType.includes('State Department')) {
    // If DepartmentOrSubdivision is empty
    if (!departmentOrSubdivision || departmentOrSubdivision.trim() === '') {
      const parent = findDepartmentByNameOrAlias("Governor's Office", departmentsData);
      if (!parent) {
        createParentDepartment("Governor's Office", departmentsData, log);
      }
      return parent ? parent.name : "Governor's Office";
    }
    
    // If DepartmentOrSubdivision has value
    const parent = findDepartmentByNameOrAlias(departmentOrSubdivision, departmentsData);
    if (!parent) {
      createParentDepartment(departmentOrSubdivision, departmentsData, log);
    }
    return parent ? parent.name : departmentOrSubdivision.trim().replace(/^"/, '').replace(/"$/, '');
  }

  // Rule 5: Handle specific department parent agencies
  const departmentParentMap = {
    'California Conservation Corps': 'Natural Resources Agency',
    'California Department of Veterans Affairs': 'Veterans Affairs Agency',
    'Horse Racing Board': 'Business, Consumer Services, and Housing Agency',
    'Department of Conservation': 'Natural Resources Agency',
    'Department of Fish and Wildlife': 'Natural Resources Agency',
    'Department of Forestry and Fire Protection': 'Natural Resources Agency',
    'Department of Parks and Recreation': 'Natural Resources Agency',
    'Department of Water Resources': 'Natural Resources Agency',
    'Energy Commission': 'Natural Resources Agency',
    'State Lands Commission': 'Natural Resources Agency',
    'State Water Resources Control Board': 'Natural Resources Agency',
    'Department of Alcoholic Beverage Control': 'Business, Consumer Services, and Housing Agency',
    'Department of Business Oversight': 'Business, Consumer Services, and Housing Agency',
    'Department of Consumer Affairs': 'Business, Consumer Services, and Housing Agency',
    'Department of Fair Employment and Housing': 'Business, Consumer Services, and Housing Agency',
    'Department of Housing and Community Development': 'Business, Consumer Services, and Housing Agency',
    'Department of Insurance': 'Business, Consumer Services, and Housing Agency',
    'Department of Real Estate': 'Business, Consumer Services, and Housing Agency',
    'Department of Veterans Affairs': 'Veterans Affairs Agency'
  };

  // Check if the department has a mapped parent
  const mappedParent = departmentParentMap[_employerName];
  if (mappedParent) {
    const parent = findDepartmentByNameOrAlias(mappedParent, departmentsData);
    if (!parent) {
      createParentDepartment(mappedParent, departmentsData, log);
    }
    return parent ? parent.name : mappedParent;
  }
  
  // Default fallback - try to find existing parent
  const fallbackParent = departmentOrSubdivision ? 
    findDepartmentByNameOrAlias(departmentOrSubdivision, departmentsData) : null;
  
  if (fallbackParent) {
    return fallbackParent.name;
  }
  
  // If no match found, use the departmentOrSubdivision as is
    return departmentOrSubdivision ? departmentOrSubdivision.trim().replace(/^"/, '').replace(/"$/, '') : "";
  };
  
// Main execution
const main = async () => {
  let log;
  let departmentsData;
  let initialDepartmentsWithSalary;
  let totalNewDepartments = 0;
  let totalUpdatedDepartments = 0;
  let totalSkippedDepartments = 0;
  let totalProcessedDepartments = 0;
  
  try {
    // Step 1: Initial Setup
    log = setupLogging().log;
    log('\n=== STEP 1: INITIAL SETUP ===');
    
    // Step 1a: Load departments.json
    log('Step 1a: Loading departments.json...');
    departmentsData = readDepartmentsJson(log);
    
    // Step 1b: Count initial departments with salary data
    log('Step 1b: Counting initial departments with salary data...');
    initialDepartmentsWithSalary = departmentsData.departments.filter(d => 
      d.workforce?.salaryDistribution?.length > 0
    ).length;
    log(`Found ${initialDepartmentsWithSalary} departments with salary distributions`);
    log('Initial departments with salary distributions:');
    departmentsData.departments
      .filter(d => d.workforce?.salaryDistribution?.length > 0)
      .forEach(d => log(`- ${d.name}`));
    
    // Step 1c: Setup complete
    log('Step 1c: Initial setup complete\n');
    
    // Step 2: CSV Processing
    log('=== STEP 2: CSV PROCESSING ===');
    
    // Get CSV files
    const files = fs.readdirSync(CSV_DIR)
      .filter(file => CSV_PATTERN.test(file))
      .map(file => path.join(CSV_DIR, file));
    
    log(`Found ${files.length} CSV files: ${files.map(f => path.basename(f)).join(', ')}`);
    
    // Process each file
    for (const file of files) {
      log(`\nProcessing file: ${path.basename(file)}`);
      
      // Step 2a: Read and parse CSV
      log('Step 2a: Reading and parsing CSV file...');
      const fileContent = fs.readFileSync(file, 'utf8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      log(`Found ${records.length} records in CSV file`);
      
      // Step 2b: Extract department information
      log('Step 2b: Extracting department information...');
      const employerNames = [...new Set(records.map(record => record.EmployerName))];
      log(`Found ${employerNames.length} unique employers`);
      
      // Step 2c: Process each department
      log('Step 2c: Processing departments...');
      for (const employerName of employerNames) {
        totalProcessedDepartments++;
        const employerRecords = records.filter(record => record.EmployerName === employerName);
        
        if (employerRecords.length === 0) {
          totalSkippedDepartments++;
          continue;
        }
        
        // Calculate statistics
        const headCount = employerRecords.length;
        const totalWages = employerRecords.reduce((sum, record) => sum + parseFloat(record.TotalWages || 0), 0);
        const totalBenefits = employerRecords.reduce((sum, record) => {
          return sum + 
            parseFloat(record.DefinedBenefitPlanContribution || 0) + 
            parseFloat(record.EmployeesRetirementCostCovered || 0) + 
            parseFloat(record.DeferredCompensationPlan || 0) + 
            parseFloat(record.HealthDentalVision || 0);
        }, 0);
        
        const totalCompensation = totalWages + totalBenefits;
        const averageSalary = Math.round(totalCompensation / headCount);
        
        // Step 2d: Calculate salary distribution
        log(`Step 2d: Calculating salary distribution for ${employerName}...`);
        const salaryDistribution = calculateSalaryDistribution(employerRecords, log);
        
        // Get employer information and determine parent agency
        const employerType = employerRecords[0].EmployerType;
        const departmentOrSubdivision = employerRecords[0].DepartmentOrSubdivision;
        const parentAgency = determineParentAgency(employerRecords[0], departmentsData, log);
        
        // Find or create department record
        const parentDepartment = findDepartmentByName(parentAgency, departmentsData);
        const parentOrgLevel = parentDepartment ? parentDepartment.orgLevel : 2;
        const orgLevel = parentOrgLevel + 1;
        
        const slug = employerName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '')
          .replace(/^_|_$/g, '');
        
        let department = departmentsData.departments.find(d => 
          d.name === employerName || 
          (d.aliases && d.aliases.includes(employerName))
        );
        
        const originalDepartment = department ? JSON.parse(JSON.stringify(department)) : null;
        
        // Step 2e: Log differences
        log('Step 2e: Logging differences...');
        if (department) {
          log(`Updating existing department: ${employerName}`);
          totalUpdatedDepartments++;
          
          // Update department data
          if (!department.workforce) {
            department.workforce = {
              headCount: { yearly: {} },
              wages: { yearly: {} },
              averageTenureYears: null,
              averageSalary: null,
              averageAge: null,
              tenureDistribution: [],
              salaryDistribution: [],
              ageDistribution: [],
              _note: null
            };
          }
          
          department.workforce.headCount.yearly["2023"] = headCount;
          department.workforce.wages.yearly["2023"] = totalCompensation;
          department.workforce.averageSalary = averageSalary;
          department.workforce.salaryDistribution = salaryDistribution;
          
          // Step 2g: Match existing parent agency field
          log('Step 2g: Matching existing parent agency field...');
          if (department.parent_agency) {
            log(`Current parent agency: ${department.parent_agency}`);
            const existingParent = findDepartmentByName(department.parent_agency, departmentsData);
            if (existingParent) {
              log(`Found existing parent agency: ${existingParent.name}`);
              department.parent_agency = existingParent.name;
            } else {
              log(`No existing parent agency found for: ${department.parent_agency}`);
            }
          } else {
            log(`No parent agency field to match for department: ${department.name}`);
          }
          
          // Step 2h: Create new parent agency if not matched
          log('Step 2h: Creating new parent agency if not matched...');
          if (department.parent_agency && !findDepartmentByName(department.parent_agency, departmentsData)) {
            log(`Creating new parent agency: ${department.parent_agency}`);
            const newParent = createParentDepartment(department.parent_agency, departmentsData, log);
            if (newParent) {
              log(`Created new parent agency: ${newParent.name}`);
              department.parent_agency = newParent.name;
            } else {
              log(`Failed to create parent agency: ${department.parent_agency}`);
            }
          } else {
            log(`No new parent agency needed for department: ${department.name}`);
          }
          
          // Step 2i: Handle note matching
          log('Step 2i: Handling note matching...');
          const newNote = `2023 salary data from ${path.basename(file)}`;
          if (!department.workforce._note) {
            log(`Setting new note: ${newNote}`);
            department.workforce._note = newNote;
          } else if (!department.workforce._note.includes(newNote)) {
            log(`Appending to existing note: ${newNote}`);
            department.workforce._note = `${department.workforce._note}, ${newNote}`;
          } else {
            log(`Note already exists: ${newNote}`);
          }
          
          department.orgLevel = orgLevel;
          
          showDiff(originalDepartment, department, log);
        } else {
          log(`Creating new department: ${employerName}`);
          totalNewDepartments++;
          
          const newDepartmentData = {
            name: employerName,
            slug: slug,
            canonicalName: employerName,
            aliases: [employerName.toLowerCase()],
            spending: { yearly: {} },
            workforce: {
              headCount: { yearly: { "2023": headCount } },
              wages: { yearly: { "2023": totalCompensation } },
              averageTenureYears: null,
              averageSalary: averageSalary,
              averageAge: null,
              salaryDistribution: salaryDistribution,
              tenureDistribution: [],
              ageDistribution: [],
              _note: `2023 salary data from ${path.basename(file)}`
            },
            budget_status: "active",
            keyFunctions: "",
            abbreviation: "",
            code: null,
            orgLevel: orgLevel,
            parent_agency: parentAgency
          };
          
          // Step 2g: Match existing parent agency field for new department
          log('Step 2g: Matching existing parent agency field for new department...');
          if (newDepartmentData.parent_agency) {
            log(`Current parent agency: ${newDepartmentData.parent_agency}`);
            const existingParent = findDepartmentByName(newDepartmentData.parent_agency, departmentsData);
            if (existingParent) {
              log(`Found existing parent agency: ${existingParent.name}`);
              newDepartmentData.parent_agency = existingParent.name;
            } else {
              log(`No existing parent agency found for: ${newDepartmentData.parent_agency}`);
            }
          } else {
            log(`No parent agency field to match for new department: ${newDepartmentData.name}`);
          }
          
          // Step 2h: Create new parent agency if not matched for new department
          log('Step 2h: Creating new parent agency if not matched for new department...');
          if (newDepartmentData.parent_agency && !findDepartmentByName(newDepartmentData.parent_agency, departmentsData)) {
            log(`Creating new parent agency: ${newDepartmentData.parent_agency}`);
            const newParent = createParentDepartment(newDepartmentData.parent_agency, departmentsData, log);
            if (newParent) {
              log(`Created new parent agency: ${newParent.name}`);
              newDepartmentData.parent_agency = newParent.name;
            } else {
              log(`Failed to create parent agency: ${newDepartmentData.parent_agency}`);
            }
          } else {
            log(`No new parent agency needed for new department: ${newDepartmentData.name}`);
          }
          
          departmentsData.departments.push(newDepartmentData);
          log('New department data:');
          log(JSON.stringify(newDepartmentData, null, 2));
        }
        
        // Step 2f: Log department details
        log(`\n----------------------------------------------`);
        log(`Department: ${employerName}`);
        log(`Type: ${employerType}`);
        log(`Subdivision: ${departmentOrSubdivision}`);
        log(`Determined Parent Agency: ${parentAgency}`);
        if (parentDepartment) {
          log(`Found parent department: ${parentDepartment.name} (Level ${parentOrgLevel})`);
          log(`Setting orgLevel to: ${orgLevel}`);
        } else {
          log(`No parent department found. Setting default orgLevel: ${orgLevel}`);
        }
        log(`Headcount: ${headCount}`);
        log(`Total Wages: $${formatCurrency(totalWages)}`);
        log(`Total Benefits: $${formatCurrency(totalBenefits)}`);
        log(`Total Compensation: $${formatCurrency(totalCompensation)}`);
        log(`Average Salary: $${averageSalary}`);
        log('Salary Distribution:');
        for (const item of salaryDistribution) {
          const [min, max] = item.range;
          const displayRange = min === 0 ? "Under 20k" :
                              min === 500000 ? "500k-10M" :
                              min >= 1000000 ? `${(min/1000000).toFixed(0)}M-${(max/1000000).toFixed(0)}M` :
                              `${min/1000}k-${max/1000}k`;
          log(`  ${displayRange}: ${item.count} employees`);
        }
        log('----------------------------------------------\n');
        
        // Step 2j: Save changes
        log('Step 2j: Saving changes...');
        writeDepartmentsJson(departmentsData, log);
        log(`Saved changes for department: ${employerName}`);
      }
      
      log(`Completed processing ${path.basename(file)}`);
    }
    
    // Step 3: Data Validation
    log('\n=== STEP 3: DATA VALIDATION ===');
    log('Step 3a: Verifying salary ranges...');
    const invalidRanges = departmentsData.departments
      .filter(d => d.workforce?.salaryDistribution)
      .filter(d => !d.workforce.salaryDistribution.every(item => 
        SALARY_RANGES.some(([min, max]) => 
          item.range[0] === min && item.range[1] === max
        )
      ));
    
    if (invalidRanges.length > 0) {
      log(`Found ${invalidRanges.length} departments with invalid salary ranges:`, 'error');
      invalidRanges.forEach(d => log(`- ${d.name}`, 'error'));
    } else {
      log('All salary ranges are valid');
    }
    
    log('Step 3b: Checking department hierarchy...');
    let updatedParentAgencies = 0;
    const invalidHierarchy = departmentsData.departments.filter(d => {
      if (!d.parent_agency) return false;
      
      // Use the same matching logic as findDepartmentByName
      const matchedParent = findDepartmentByName(d.parent_agency, departmentsData);
      
      if (matchedParent) {
        // Only log and update if there's an actual change
        if (d.parent_agency !== matchedParent.name) {
          log(`Found parent agency mismatch for ${d.name}:`);
          log(`  Current: ${d.parent_agency}`);
          log(`  Matched: ${matchedParent.name}`);
          log(`  Updating to: ${matchedParent.name}`);
          d.parent_agency = matchedParent.name;
          updatedParentAgencies++;
        }
        return false;
      }
      
      return true;
    });
    
    if (updatedParentAgencies > 0) {
      log(`Updated ${updatedParentAgencies} parent agency fields to match department names`);
      log('Saving updated parent agency fields...');
      writeDepartmentsJson(departmentsData, log);
      log('Successfully saved parent agency updates');
    }
    
    if (invalidHierarchy.length > 0) {
      log(`Found ${invalidHierarchy.length} departments with invalid parent agencies:`, 'error');
      invalidHierarchy.forEach(d => {
        log(`Department: ${d.name}`, 'error');
        log(`  Parent Agency: ${d.parent_agency}`, 'error');
        log(`  No matching department found`, 'error');
      });
    } else {
      log('All department hierarchies are valid');
    }
    
    // Step 4: Results Summary
    log('\n=== STEP 4: RESULTS SUMMARY ===');
    const finalDepartmentsWithSalary = departmentsData.departments.filter(d => 
      d.workforce?.salaryDistribution?.length > 0
    ).length;
    
    log('Step 4a: Processing Statistics:');
    log(`- Initial departments with salary distributions: ${initialDepartmentsWithSalary}`);
    log(`- Final departments with salary distributions: ${finalDepartmentsWithSalary}`);
    log(`- New departments created: ${totalNewDepartments}`);
    log(`- Existing departments updated: ${totalUpdatedDepartments}`);
    log(`- Departments skipped: ${totalSkippedDepartments}`);
    log(`- Total departments processed: ${totalProcessedDepartments}`);
    
    log('\nStep 4b: Final departments with salary distributions:');
    departmentsData.departments
      .filter(d => d.workforce?.salaryDistribution?.length > 0)
      .forEach(d => log(`- ${d.name}`));
    
    log('\nStep 4c: Processing complete');
    
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
};

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 