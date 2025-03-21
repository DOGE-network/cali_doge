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
const { execSync } = require('child_process');

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CSV_DIR = path.join(PROJECT_ROOT, 'src/data/workforce');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
const CSV_PATTERN = /2023_.*\.csv$/;

// Define the order of keys for salary distribution - with <20000 first and >500000 last
const SALARY_DISTRIBUTION_ORDER = [
  "<20000", "20000", "30000", "40000", "50000", "60000", "70000", "80000", "90000", 
  "100000", "110000", "120000", "130000", "140000", "150000", "160000", "170000", 
  "180000", "190000", "200000", "250000", "300000", "350000", "400000", "450000", 
  "500000", ">500000"
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
    // First write the standard JSON
    fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
    
    // Construct the sed command dynamically based on the salaryDistribution
    const sedCommand = SALARY_DISTRIBUTION_ORDER.map(key => {
      const value = data.departments[0]?.workforce?.salaryDistribution?.[key] ?? 0;
      return `          "${key}": ${value}`;
    }).join(',\n');

    // Use sed command to ensure salaryDistribution is written in the specified order
    execSync(`printf '${sedCommand}\n' | sed -n 'p' > salary_data.txt && cat salary_data.txt`);
    
    console.log('Successfully updated departments.json');
  } catch (error) {
    console.error('Error writing departments.json:', error);
    process.exit(1);
  }
};

const calculateSalaryDistribution = (rows) => {
  const headCount = rows.length;
  if (headCount === 0) return {};
  
  // Create an empty object to store the distribution
  const distribution = {};
  
  // Initialize distribution object with keys in the desired order and zero values
  for (const key of SALARY_DISTRIBUTION_ORDER) {
    distribution[key] = 0;
  }
  
  rows.forEach(row => {
    // Calculate total compensation including benefits for salary distribution
    // as required by the updated type definition
    const totalCompensation = parseFloat(row.TotalWages || 0) + 
                          parseFloat(row.DefinedBenefitPlanContribution || 0) + 
                          parseFloat(row.EmployeesRetirementCostCovered || 0) + 
                          parseFloat(row.DeferredCompensationPlan || 0) + 
                          parseFloat(row.HealthDentalVision || 0);
    
    // Use total compensation for distribution (not just wages)
    if (totalCompensation < 20000) {
      distribution["<20000"]++;
    } else if (totalCompensation < 30000) {
      distribution["20000"]++;
    } else if (totalCompensation < 40000) {
      distribution["30000"]++;
    } else if (totalCompensation < 50000) {
      distribution["40000"]++;
    } else if (totalCompensation < 60000) {
      distribution["50000"]++;
    } else if (totalCompensation < 70000) {
      distribution["60000"]++;
    } else if (totalCompensation < 80000) {
      distribution["70000"]++;
    } else if (totalCompensation < 90000) {
      distribution["80000"]++;
    } else if (totalCompensation < 100000) {
      distribution["90000"]++;
    } else if (totalCompensation < 110000) {
      distribution["100000"]++;
    } else if (totalCompensation < 120000) {
      distribution["110000"]++;
    } else if (totalCompensation < 130000) {
      distribution["120000"]++;
    } else if (totalCompensation < 140000) {
      distribution["130000"]++;
    } else if (totalCompensation < 150000) {
      distribution["140000"]++;
    } else if (totalCompensation < 160000) {
      distribution["150000"]++;
    } else if (totalCompensation < 170000) {
      distribution["160000"]++;
    } else if (totalCompensation < 180000) {
      distribution["170000"]++;
    } else if (totalCompensation < 190000) {
      distribution["180000"]++;
    } else if (totalCompensation < 200000) {
      distribution["190000"]++;
    } else if (totalCompensation < 250000) {
      distribution["200000"]++;
    } else if (totalCompensation < 300000) {
      distribution["250000"]++;
    } else if (totalCompensation < 350000) {
      distribution["300000"]++;
    } else if (totalCompensation < 400000) {
      distribution["350000"]++;
    } else if (totalCompensation < 450000) {
      distribution["400000"]++;
    } else if (totalCompensation < 500000) {
      distribution["450000"]++;
    } else if (totalCompensation === 500000) {
      distribution["500000"]++;
    } else if (totalCompensation > 500000) {
      distribution[">500000"]++;
    }
  });

  // Calculate percentages from distribution
  const percentages = {};
  for (const key of SALARY_DISTRIBUTION_ORDER) {
    percentages[key] = parseFloat(((distribution[key] / headCount) * 100).toFixed(1));
  }

  return { distribution, percentages };
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
        averageSalary: null,
        averageTenureYears: null,
        averageAge: null
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
    // Use total compensation for averageSalary as per type definition
    const averageSalary = Math.round(totalCompensation / headCount);
    
    const { distribution: salaryDistribution, percentages: salaryPercentages } = calculateSalaryDistribution(employerRecords);
    
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
    // Ensure proper order when displaying distribution data
    for (const range of SALARY_DISTRIBUTION_ORDER) {
      if (salaryDistribution[range] > 0) {
        console.log(`  ${range}: ${salaryPercentages[range]}% (${salaryDistribution[range]} employees)`);
      }
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
      
      // Merge with existing data preserving structure
      if (!department.workforce) {
        department.workforce = {};
      }
      
      // Update or create headCount structure
      if (!department.workforce.headCount) {
        department.workforce.headCount = { yearly: {} };
      } else if (!department.workforce.headCount.yearly) {
        department.workforce.headCount.yearly = {};
      }
      department.workforce.headCount.yearly["2023"] = headCount;
      
      // Update or create wages structure - store as number
      if (!department.workforce.wages) {
        department.workforce.wages = { yearly: {} };
      } else if (!department.workforce.wages.yearly) {
        department.workforce.wages.yearly = {};
      }
      // Store total compensation (wages + benefits) in the wages field as per type definition
      department.workforce.wages.yearly["2023"] = totalCompensation;
      
      // Update averageSalary if it exists using total compensation as per type definition
      if (department.workforce.averageSalary !== undefined) {
        department.workforce.averageSalary = averageSalary;
      }
      
      // Update salaryDistribution if it exists
      if (department.workforce.salaryDistribution !== undefined) {
        // Ensure salaryDistribution is correctly structured before saving
        if (!department.workforce.salaryDistribution) {
          department.workforce.salaryDistribution = {};
        }
        for (const key of SALARY_DISTRIBUTION_ORDER) {
          department.workforce.salaryDistribution[key] = salaryDistribution[key] || 0;
        }

        // Log the salaryDistribution to verify its structure
        console.log('Salary Distribution before saving:', JSON.stringify(department.workforce.salaryDistribution, null, 2));
      }
      
      // Add _note field
      department.workforce._note = noteText;
      
      // Update parent_agency based on rules
      department.parent_agency = parentAgency;
      
      // Update orgLevel based on parent's orgLevel
      department.orgLevel = orgLevel;
      
      // Save after update
      writeDepartmentsJson(departmentsData);
      
      // Show the updated record
      console.log('Original department data:');
      console.log(JSON.stringify(originalDepartment, null, 2));
      
      console.log('\nUpdated department data:');
      console.log(JSON.stringify(department, null, 2));
      
      // Show differences
      showDiff(originalDepartment, department);
    } else {
      console.log('Creating new department record - confirm this won\'t violate structure');
      const confirmCreate = prompt('This will add a new department record. Continue? (Y/n): ');
      if (confirmCreate.toLowerCase() !== 'y' && confirmCreate !== '') {
        console.log('Skipping this department');
        continue;
      }
      
      // Create a new department with all fields from the type definition
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
              "2023": totalCompensation  // Use total compensation as per type definition
            }
          },
          averageSalary,  // Already using total compensation as defined earlier
          averageTenureYears: null,
          averageAge: null,
          // Create an ordered salary distribution object
          salaryDistribution: salaryDistribution, // Already ordered from calculateSalaryDistribution
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