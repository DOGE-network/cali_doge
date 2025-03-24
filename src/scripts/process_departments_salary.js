// This script processes the workforce CSV files and updates the departments.json file
// It ensures the salaryDistribution keys are in the correct order and adds a note to the JSON file
// It also handles the parent_agency and orgLevel based on the rules provided
// It also handles the creation of new departments and updates existing departments
// It also handles the confirmation of changes before they are written to the file
// It also handles the continuation to the next file or department
// It also handles the stopping of processing

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const prompt = require('prompt-sync')({ sigint: true });

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CSV_DIR = path.join(PROJECT_ROOT, 'src/data/workforce');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
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

// Utility functions
const formatCurrency = (amount) => {
  return Math.round(parseFloat(amount || 0));
};

const readDepartmentsJson = () => {
  try {
    const data = fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading departments.json:', error);
    process.exit(1);
  }
};

const writeDepartmentsJson = (data) => {
  try {
    // Convert to string with pretty printing
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(DEPARTMENTS_JSON_PATH, jsonString, 'utf8');
    console.log('Successfully updated departments.json');
  } catch (error) {
    console.error('Error writing departments.json:', error);
    process.exit(1);
  }
};

const calculateSalaryDistribution = (rows) => {
  const headCount = rows.length;
  if (headCount === 0) return [];
  
  // Initialize distribution array with SalaryRange format
  const distribution = SALARY_RANGES.map(([min, max]) => ({
    range: [min, max],
    count: 0
  }));
  
  rows.forEach(row => {
    // Calculate total compensation including benefits for salary distribution
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
  });

  return distribution;
};

// Function to show differences between objects
const showDiff = (original, updated) => {
  console.log('\nDifferences:');
  
  // Helper function to check deep changes
  const findDifferences = (obj1, obj2, path = '') => {
    // Handle null or undefined
    if (!obj1 || !obj2) {
      if (obj1 !== obj2) {
        console.log(`${path}: ${JSON.stringify(obj1)} → ${JSON.stringify(obj2)}`);
      }
      return;
    }
    
    // For arrays or non-objects, just compare directly
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || 
        Array.isArray(obj1) || Array.isArray(obj2)) {
      if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
        console.log(`${path}: ${JSON.stringify(obj1)} → ${JSON.stringify(obj2)}`);
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
        console.log(`${newPath}: ${JSON.stringify(obj1[key])} → ${JSON.stringify(obj2[key])}`);
      }
    });
  };
  
  findDifferences(original, updated);
  console.log('');
};

const processCSVFile = async (filePath) => {
  console.log(`\nProcessing ${path.basename(filePath)}...`);
  
  // Read and parse CSV file
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  // Get unique employer names within the specified employer type
  const employerNames = [...new Set(records.map(record => record.EmployerName))];
  
  // Load departments JSON
  const departmentsData = readDepartmentsJson();
  
  // Create a sample to examine the schema
  console.log("\nExamining department schema...");
  const sampleDept = departmentsData.departments[0];
  console.log("Sample department structure:");
  console.log(JSON.stringify({
    name: sampleDept.name,
    workforce: {
      headCount: sampleDept.workforce.headCount,
      wages: sampleDept.workforce.wages,
      salaryDistribution: sampleDept.workforce.salaryDistribution || "Not present in sample"
    }
  }, null, 2));
  
  // Find parent department by name
  const findDepartmentByName = (name) => {
    if (!name) return null;
    
    // Clean up the name
    const cleanName = name.trim().replace(/^"/, '').replace(/"$/, '');
    if (!cleanName) return null;
    
    return departmentsData.departments.find(d => 
      d.name === cleanName || 
      (d.aliases && d.aliases.some(alias => 
        alias.toLowerCase() === cleanName.toLowerCase()
      ))
    );
  };
  
  // Create a department record for parent if it doesn't exist
  const createParentDepartment = (parentName) => {
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
    
    console.log(`Creating parent department: ${cleanParentName}`);
    departmentsData.departments.push(newParentDept);
    
    return newParentDept;
  };
  
  // Determine parent agency based on the rules
  const determineParentAgency = (record) => {
    const employerType = record.EmployerType || '';
    const _employerName = record.EmployerName || '';
    const departmentOrSubdivision = record.DepartmentOrSubdivision || '';
    
    // Rule 1: If EmployerType is Judicial Council
    if (employerType.includes('Judicial Council')) {
      return "Superior Courts";
    }
    
    // Rule 2: If EmployerType is California State University
    if (employerType.includes('California State University')) {
      return "California State University Board of Trustees";
    }
    
    // Rule 3: If EmployerType is University of California
    if (employerType.includes('University of California')) {
      return "University of California Board of Regents";
    }
    
    // Rules 4 & 5: If EmployerType is State Department
    if (employerType.includes('State Department')) {
      // Rule 4: If DepartmentOrSubdivision is empty
      if (!departmentOrSubdivision || departmentOrSubdivision.trim() === '') {
        return "Governor's Office";
      }
      
      // Rule 5: If DepartmentOrSubdivision has value
      // Check if DepartmentOrSubdivision exists in the JSON
      const parentDept = findDepartmentByName(departmentOrSubdivision);
      
      if (!parentDept) {
        // Create the parent department
        createParentDepartment(departmentOrSubdivision);
        return departmentOrSubdivision.trim().replace(/^"/, '').replace(/"$/, '');
      } else {
        return departmentOrSubdivision.trim().replace(/^"/, '').replace(/"$/, '');
      }
    }
    
    // Default fallback
    return departmentOrSubdivision ? departmentOrSubdivision.trim().replace(/^"/, '').replace(/"$/, '') : "";
  };
  
  for (const employerName of employerNames) {
    // Filter records for this employer
    const employerRecords = records.filter(record => record.EmployerName === employerName);
    
    if (employerRecords.length === 0) continue;
    
    // Calculate statistics
    const headCount = employerRecords.length;
    
    // Sum wages and total compensation (wages + benefits)
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
    
    const salaryDistribution = calculateSalaryDistribution(employerRecords);
    
    // Get employer information
    const employerType = employerRecords[0].EmployerType;
    const departmentOrSubdivision = employerRecords[0].DepartmentOrSubdivision;
    
    // Determine parent agency using the rules
    const parentAgency = determineParentAgency(employerRecords[0]);
    
    // Find parent department and determine orgLevel
    const parentDepartment = findDepartmentByName(parentAgency);
    const parentOrgLevel = parentDepartment ? parentDepartment.orgLevel : 2;
    const orgLevel = parentOrgLevel + 1;
    
    // Create slug from employer name
    const slug = employerName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .replace(/^_|_$/g, '');
    
    // Find existing department or prepare for a new one
    let department = departmentsData.departments.find(d => 
      d.name === employerName || 
      (d.aliases && d.aliases.includes(employerName))
    );
    
    // Store original department data for diff
    const originalDepartment = department ? JSON.parse(JSON.stringify(department)) : null;
    
    const noteText = `2023 salary data from ${path.basename(filePath)}`;
    
    // Display planned changes
    console.log('\n----------------------------------------------');
    console.log(`Department: ${employerName}`);
    console.log(`Type: ${employerType}`);
    console.log(`Subdivision: ${departmentOrSubdivision}`);
    console.log(`Determined Parent Agency: ${parentAgency}`);
    if (parentDepartment) {
      console.log(`Found parent department: ${parentDepartment.name} (Level ${parentOrgLevel})`);
      console.log(`Setting orgLevel to: ${orgLevel}`);
    } else {
      console.log(`No parent department found. Setting default orgLevel: ${orgLevel}`);
    }
    console.log(`Headcount: ${headCount}`);
    console.log(`Total Wages: $${formatCurrency(totalWages)}`);
    console.log(`Total Benefits: $${formatCurrency(totalBenefits)}`);
    console.log(`Total Compensation: $${formatCurrency(totalCompensation)}`);
    console.log(`Average Salary: $${averageSalary}`);
    console.log('Salary Distribution:');
    for (const item of salaryDistribution) {
      const [min, max] = item.range;
      const displayRange = min === 0 ? "Under 20k" :
                          min === 500000 ? "500k-10M" :
                          min >= 1000000 ? `${(min/1000000).toFixed(0)}M-${(max/1000000).toFixed(0)}M` :
                          `${min/1000}k-${max/1000}k`;
      console.log(`  ${displayRange}: ${item.count} employees`);
    }
    console.log('----------------------------------------------\n');
    
    // Ask for confirmation
    const proceed = prompt('Proceed with updates? (Y/n): ');
    if (proceed.toLowerCase() !== 'y' && proceed !== '') {
      console.log('Skipping this department');
      continue;
    }
    
    // Update or create department record
    if (department) {
      console.log('Updating existing department record');
      
      // Ensure workforce structure exists and matches interface
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
      
      // Update headCount
      if (!department.workforce.headCount) {
        department.workforce.headCount = { yearly: {} };
      }
      if (!department.workforce.headCount.yearly) {
        department.workforce.headCount.yearly = {};
      }
      department.workforce.headCount.yearly["2023"] = headCount;
      
      // Update wages
      if (!department.workforce.wages) {
        department.workforce.wages = { yearly: {} };
      }
      if (!department.workforce.wages.yearly) {
        department.workforce.wages.yearly = {};
      }
      department.workforce.wages.yearly["2023"] = totalCompensation;
      
      // Update salary data
      department.workforce.averageSalary = averageSalary;
      department.workforce.salaryDistribution = salaryDistribution;
      department.workforce._note = noteText;
      
      // Update parent_agency and orgLevel
      department.parent_agency = parentAgency;
      department.orgLevel = orgLevel;
      
      // Save after update
      writeDepartmentsJson(departmentsData);
      
      // Show differences
      showDiff(originalDepartment, department);
    } else {
      console.log('Creating new department record');
      const newDepartmentData = {
        name: employerName,
        slug: slug,
        canonicalName: employerName,
        aliases: [employerName.toLowerCase()],
        spending: {
          yearly: {}
        },
        workforce: {
          headCount: {
            yearly: {
              "2023": headCount
            }
          },
          wages: {
            yearly: {
              "2023": totalCompensation
            }
          },
          averageTenureYears: null,
          averageSalary: averageSalary,
          averageAge: null,
          salaryDistribution: salaryDistribution,
          tenureDistribution: [],
          ageDistribution: [],
          _note: noteText
        },
        budget_status: "active",
        keyFunctions: "",
        abbreviation: "",
        code: null,
        orgLevel: orgLevel,
        parent_agency: parentAgency
      };
      
      departmentsData.departments.push(newDepartmentData);
      
      // Save after update
      writeDepartmentsJson(departmentsData);
      
      // Show the new record
      console.log('New department data:');
      console.log(JSON.stringify(newDepartmentData, null, 2));
    }
    
    // Ask for confirmation before moving to the next department
    const proceedToNext = prompt('Proceed to next department? (Y/n): ');
    if (proceedToNext.toLowerCase() !== 'y' && proceedToNext !== '') {
      console.log('Stopping processing');
      return;
    }
  }
  
  console.log(`Completed processing ${path.basename(filePath)}`);
};

// Main execution
const main = async () => {
  try {
    // Get CSV files
    const files = fs.readdirSync(CSV_DIR)
      .filter(file => CSV_PATTERN.test(file))
      .map(file => path.join(CSV_DIR, file));
    
    console.log(`Found ${files.length} CSV files: ${files.map(f => path.basename(f)).join(', ')}`);
    
    // Process each file
    for (const file of files) {
      await processCSVFile(file);
      
      // Ask to continue to next file
      if (files.indexOf(file) < files.length - 1) {
        const proceedToNextFile = prompt('Proceed to next file? (Y/n): ');
        if (proceedToNextFile.toLowerCase() !== 'y' && proceedToNextFile !== '') {
          console.log('Stopping processing');
          break;
        }
      }
    }
    
    console.log('All files processed successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the script
main(); 