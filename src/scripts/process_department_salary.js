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
 *    d. match the CSV file name with the name, aliases or canonicalName field in departments.json. ignore the number as it is an entity id and not used. 
 *    e. for every match where there is a diff of the json record and the new data, ask if user wants to update the json record with the new data.
 *    f. may never create new department records, only update existing ones
 *    g. may not update parent_agency field or the budgetCode field
 *    h. log the differences between the original and updated record
 *    i. Log department details
 *    i. match _note with the csv file name or append to the existing note
 *    j. save the changes using the CSV filename annual year
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
  // Extract year from filename (e.g., "workforce_2023.csv" -> "2023")
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
  return Math.round(parseFloat(amount || 0));
};

const formatNumber = (num) => {
  return parseFloat(num || 0).toFixed(1);
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

// Function to normalize department names for matching
function normalizeForMatching(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[,()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\b(of|the|and|or|in|for|to|at|on|by|county|state|california)\b/g, '') // Remove common words
    .replace(/\b(superior|municipal|justice|appellate)\s+court\b/g, 'court') // Normalize court types
    .replace(/\b(workers|worker's)\s+compensation\b/g, 'workers compensation') // Normalize workers compensation
    .replace(/\b(department|office|board|commission|authority|agency|council|panel)\b/g, '') // Remove common entity types
    .replace(/\b(california|state)\b/g, '') // Remove state references
    .replace(/\b(csu|california state university|california state|state university)\b/g, 'csu') // Normalize CSU
    .replace(/\b(uc|university of california)\b/g, 'uc') // Normalize UC
    .replace(/\b(san francisco|los angeles|san diego|sacramento|fresno|long beach|fullerton|hayward|northridge|pomona|san bernardino|san jose|san luis obispo|san marcos|sonoma|stanislaus|chico|dominguez hills|east bay|monterey bay|northridge|pomona|sacramento|san bernardino|san diego|san francisco|san jose|san luis obispo|san marcos|sonoma|stanislaus)\b/g, '') // Remove campus names
    .trim();
}

// Function to get all possible name variations for a department
function getNameVariations(name) {
  const normalized = normalizeForMatching(name);
  const variations = new Set([normalized]);
  
  // Add variations without common prefixes
  ['department of', 'state', 'california', 'office of', 'board of', 'commission on', 'county of'].forEach(prefix => {
    if (normalized.startsWith(prefix)) {
      variations.add(normalized.slice(prefix.length).trim());
    }
  });
  
  // Add variations without common suffixes
  ['commission', 'board', 'authority', 'agency', 'office', 'department', 'council', 'panel', 'court'].forEach(suffix => {
    if (normalized.endsWith(suffix)) {
      variations.add(normalized.slice(0, -suffix.length).trim());
    }
  });
  
  // Add variations with common abbreviations
  if (normalized.includes('and')) {
    variations.add(normalized.replace(/\s+and\s+/, ' & '));
  }
  if (normalized.includes('&')) {
    variations.add(normalized.replace(/\s*&\s*/, ' and '));
  }
  
  // Add variations without articles
  variations.add(normalized.replace(/\b(a|an|the)\b/g, ''));
  
  // Add variations with common word order changes
  const words = normalized.split(' ');
  if (words.length > 2) {
    variations.add(words.slice(1).join(' ') + ' ' + words[0]);
  }
  
  // Add variations for courts
  if (normalized.includes('court')) {
    variations.add(normalized.replace(/\b(superior|municipal|justice|appellate)\s+court\b/g, 'court'));
    variations.add(normalized.replace(/\bcourt\b/g, 'superior court'));
  }
  
  // Add variations for workers compensation
  if (normalized.includes('workers compensation')) {
    variations.add(normalized.replace(/\b(workers|worker's)\s+compensation\b/g, 'workers compensation'));
  }

  // Add variations for universities - now with strict separation between CSU and UC
  if (normalized.includes('csu') || normalized.includes('california state university') || normalized.includes('state university')) {
    variations.add('csu');
    variations.add('california state university');
    variations.add('state university');
    // Don't add UC variations for CSU
  } else if (normalized.includes('uc') || normalized.includes('university of california')) {
    variations.add('uc');
    variations.add('university of california');
    // Don't add CSU variations for UC
  }

  // Add variations without common entity types
  ['department', 'office', 'board', 'commission', 'authority', 'agency', 'council', 'panel'].forEach(type => {
    if (normalized.includes(type)) {
      variations.add(normalized.replace(new RegExp(`\\b${type}\\b`, 'g'), ''));
    }
  });

  // Add variations without state references
  ['california', 'state'].forEach(ref => {
    if (normalized.includes(ref)) {
      variations.add(normalized.replace(new RegExp(`\\b${ref}\\b`, 'g'), ''));
    }
  });

  // Add variations with common word combinations
  if (normalized.includes('health care')) {
    variations.add(normalized.replace('health care', 'healthcare'));
  }
  if (normalized.includes('healthcare')) {
    variations.add(normalized.replace('healthcare', 'health care'));
  }

  // Add variations for common department types
  if (normalized.includes('department')) {
    variations.add(normalized.replace('department', 'dept'));
  }
  if (normalized.includes('dept')) {
    variations.add(normalized.replace('dept', 'department'));
  }

  return Array.from(variations);
}

// Function to calculate match score between two strings
function calculateMatchScore(str1, str2) {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  
  // Count matching words
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matches++;
        break;
      }
    }
  }
  
  // Calculate score based on matching words
  const score = matches / Math.max(words1.length, words2.length);
  
  // Boost score for exact matches
  if (str1 === str2) return 1.0;
  
  // Boost score for substring matches
  if (str1.includes(str2) || str2.includes(str1)) {
    return Math.max(score + 0.2, 0.8);
  }
  
  return score;
}

// Function to calculate match score between CSV name and department
const calculateDepartmentMatchScore = (csvName, department, _entityCode) => {
  const cleanCsvName = csvName.trim().toLowerCase();
  const nameVariations = getNameVariations(cleanCsvName);
  const deptVariations = getNameVariations(department.name.toLowerCase());
  
  // Check exact matches (case insensitive)
  if (department.name.toLowerCase() === cleanCsvName) {
    return { totalScore: 100, details: { exactNameMatch: 100, canonicalNameMatch: 0, aliasMatch: 0, partialNameMatch: 0 } };
  }
  
  // Check canonical name (case insensitive)
  if (department.canonicalName.toLowerCase() === cleanCsvName) {
    return { totalScore: 90, details: { exactNameMatch: 0, canonicalNameMatch: 90, aliasMatch: 0, partialNameMatch: 0 } };
  }
  
  // Check aliases (case insensitive)
  if (department.aliases?.some(alias => alias.toLowerCase() === cleanCsvName)) {
    return { totalScore: 80, details: { exactNameMatch: 0, canonicalNameMatch: 0, aliasMatch: 80, partialNameMatch: 0 } };
  }
  
  // Calculate best partial match score
  let bestScore = 0;
  let _bestMatch = null;
  
  for (const nameVar of nameVariations) {
    for (const deptVar of deptVariations) {
      const score = calculateMatchScore(nameVar, deptVar);
      if (score > bestScore) {
        bestScore = score;
        _bestMatch = deptVar;
      }
    }
  }
  
  // Penalize mismatches between CSU and UC
  if ((cleanCsvName.includes('csu') || cleanCsvName.includes('state university')) && 
      (department.name.toLowerCase().includes('uc') || department.name.toLowerCase().includes('university of california'))) {
    bestScore = 0; // Force no match
  }
  if ((cleanCsvName.includes('uc') || cleanCsvName.includes('university of california')) && 
      (department.name.toLowerCase().includes('csu') || department.name.toLowerCase().includes('state university'))) {
    bestScore = 0; // Force no match
  }
  
  return {
    totalScore: Math.round(bestScore * 100),
    details: {
      exactNameMatch: 0,
      canonicalNameMatch: 0,
      aliasMatch: 0,
      partialNameMatch: bestScore * 100
    }
  };
};

// Function to find department by name with improved matching
const findDepartmentByName = (name, departments, log, entityCode) => {
  let bestMatch = null;
  let bestScoreObj = null;
  
  const _matchType = 'exact';
  const _nameVariations = getNameVariations(name);
  
  // First try exact match (case insensitive)
  const exactMatch = departments.find(d => 
    d.name.toLowerCase() === name.toLowerCase() ||
    d.canonicalName.toLowerCase() === name.toLowerCase() ||
    d.aliases?.some(a => a.toLowerCase() === name.toLowerCase())
  );
  
  if (exactMatch) {
    log(`Found exact match for department: ${exactMatch.name}`);
    log(`Match Details:`);
    log(`- Department Name: ${exactMatch.name}`);
    log(`- Canonical Name: ${exactMatch.canonicalName}`);
    log(`- Aliases: ${exactMatch.aliases?.join(', ') || 'None'}`);
    log(`- Budget Code: ${exactMatch.budgetCode || 'None'}`);
    log(`- Entity Code: ${entityCode || 'None'}`);
    log(`- Source Data:`);
    log(`  CSV Name: "${name}"`);
    log(`  JSON Name: "${exactMatch.name}"`);
    log(`  JSON Canonical: "${exactMatch.canonicalName}"`);
    log(`  JSON Aliases: ${exactMatch.aliases?.map(a => `"${a}"`).join(', ') || 'None'}`);
    log(`  CSV Entity Code: "${entityCode}"`);
    return { department: exactMatch, isPartialMatch: false };
  }
  
  // Then try fuzzy matching with better scoring
  let bestScore = 0;
  
  for (const dept of departments) {
    const score = calculateDepartmentMatchScore(name, dept, entityCode);
    if (score.totalScore > bestScore && score.totalScore > 80) {
      bestScore = score.totalScore;
      bestMatch = dept;
      bestScoreObj = score;
    }
  }
  
  if (bestMatch) {
    log(`Found fuzzy match for department: ${bestMatch.name} (score: ${formatNumber(bestScore)}%)`);
    log(`Match Details:`);
    log(`- Department Name: ${bestMatch.name}`);
    log(`- Canonical Name: ${bestMatch.canonicalName}`);
    log(`- Aliases: ${bestMatch.aliases?.join(', ') || 'None'}`);
    log(`- Budget Code: ${bestMatch.budgetCode || 'None'}`);
    log(`- Entity Code: ${entityCode || 'None'}`);
    log(`- Source Data:`);
    log(`  CSV Name: "${name}"`);
    log(`  JSON Name: "${bestMatch.name}"`);
    log(`  JSON Canonical: "${bestMatch.canonicalName}"`);
    log(`  JSON Aliases: ${bestMatch.aliases?.map(a => `"${a}"`).join(', ') || 'None'}`);
    log(`  CSV Entity Code: "${entityCode}"`);
    log(`- Match Score Breakdown:`);
    Object.entries(bestScoreObj.details).forEach(([type, score]) => {
      log(`  * ${type}: ${formatNumber(score)}%`);
    });
    return { department: bestMatch, isPartialMatch: true };
  }
  
  log(`No match found for department: ${name}`, 'error');
  return null;
};

// Function to compare department data and ask for user confirmation
const compareAndConfirmUpdate = (department, updateData, log, isPartialMatch, employerName) => {
  const differences = [];
  
  // Compare entity code
  if (updateData.entityCode && department.entityCode !== updateData.entityCode) {
    differences.push(`Entity Code: ${department.entityCode || 'None'} → ${updateData.entityCode}`);
  }
  
  // Compare headCount
  if (updateData.headCount?.yearly) {
    Object.entries(updateData.headCount.yearly).forEach(([year, count]) => {
      const currentCount = department.headCount?.yearly?.[year];
      if (currentCount !== count) {
        differences.push(`HeadCount for ${year}: ${currentCount} → ${count}`);
      }
    });
  }
  
  // Compare wages
  if (updateData.wages?.yearly) {
    Object.entries(updateData.wages.yearly).forEach(([year, amount]) => {
      const currentAmount = department.wages?.yearly?.[year];
      if (currentAmount !== amount) {
        differences.push(`Wages for ${year}: ${currentAmount} → ${amount}`);
      }
    });
  }
  
  // Compare average salary with epsilon for floating point comparison
  const EPSILON = 0.0001; // Small value for floating point comparison
  if (updateData.averageSalary !== undefined && 
      department.averageSalary !== undefined && 
      Math.abs(updateData.averageSalary - department.averageSalary) > EPSILON) {
    differences.push(`Average Salary: ${formatNumber(department.averageSalary)} → ${formatNumber(updateData.averageSalary)}`);
  }
  
  // Compare salary distribution
  if (updateData.salaryDistribution?.yearly) {
    Object.entries(updateData.salaryDistribution.yearly).forEach(([year, distribution]) => {
      const currentDistribution = department.salaryDistribution?.yearly?.[year];
      if (JSON.stringify(currentDistribution) !== JSON.stringify(distribution)) {
        differences.push(`Salary Distribution for ${year}: Updated`);
      }
    });
  }

  // Add alias update information for partial matches
  if (isPartialMatch && !department.aliases?.some(alias => alias.toLowerCase() === employerName.toLowerCase())) {
    differences.push(`Aliases: Adding "${employerName}" to department aliases`);
  }
  
  if (differences.length === 0) {
    log(`No differences found for department: ${department.name}`);
    return false;
  }
  
  // Display differences and ask for confirmation
  log(`\nDifferences found for department: ${department.name}`);
  differences.forEach(diff => log(`- ${diff}`));
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
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
  let totalNewDepartments = 0;
  let totalUpdatedDepartments = 0;
  let totalSkippedDepartments = 0;
  let totalProcessedDepartments = 0;
  let totalValidationErrors = 0;
  
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
        totalProcessedDepartments++;
        log(`\nProcessing employer: ${employerName}`);
        
        const employerRecords = records.filter(record => record.EmployerName === employerName);
        if (employerRecords.length === 0) {
          totalSkippedDepartments++;
          continue;
        }
        
        // Step 2d: Calculate salary distribution
        log(`Step 2d: Calculating salary distribution for ${employerName}...`);
        const { distribution: salaryDistribution, averageSalary: calculatedAverageSalary } = calculateSalaryDistribution(employerRecords, log);
        
        // Step 2e: Find department by name/aliases/canonicalName/entityCode
        log('Step 2e: Finding department...');
        const matchResult = findDepartmentByName(employerName, departmentsData.departments, log, entityCode);
        if (!matchResult) {
          log(`No matching department found for ${employerName}`, 'error');
          continue;
        }
        
        const { department, isPartialMatch } = matchResult;
        
        // Step 2f: Update department data
        log(`Step 2f: Updating department data for ${department.name}...`);
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
          
          // Calculate headcount from salary distribution
          const headCount = salaryDistribution.reduce((sum, range) => sum + range.count, 0);
          
          // Log salary distribution calculation results
          log('Salary Distribution Calculation Results:');
          log(`Total Records: ${employerRecords.length}`);
          log(`Total Compensation: $${formatCurrency(totalCompensation)}`);
          log(`Average Salary: $${formatCurrency(calculatedAverageSalary)}`);
          log(`Headcount from Distribution: ${headCount}`);
          
          if (salaryDistribution && salaryDistribution.length > 0) {
            log('Distribution Ranges:');
            salaryDistribution.forEach(range => {
              const [min, max] = range.range;
              const displayRange = min === 0 ? "Under 20k" :
                                  min === 500000 ? "500k-10M" :
                                  min >= 1000000 ? `${(min/1000000).toFixed(1)}M-${(max/1000000).toFixed(1)}M` :
                                  `${(min/1000).toFixed(1)}k-${(max/1000).toFixed(1)}k`;
              log(`  ${displayRange}: ${range.count} employees`);
            });
          } else {
            log('Warning: No salary distribution data available', 'warn');
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
          
          // Validate the update data structure before applying
          if (!salaryDistribution || !Array.isArray(salaryDistribution) || salaryDistribution.length === 0) {
            log('Error: Salary distribution array is empty or invalid', 'error');
            return false;
          }
          
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
            if (!department._note) {
              department._note = newNote;
            } else if (!department._note.includes(newNote)) {
              department._note = `${department._note}, ${newNote}`;
            }
            
            // Update entity code if not present or different
            if (updateData.entityCode && (!department.entityCode || department.entityCode !== updateData.entityCode)) {
              department.entityCode = updateData.entityCode;
              log(`Updated entity code to ${updateData.entityCode}`);
            }
            
            // Update the processedDepartments tracking
            const processed = processedDepartments.get(employerName);
            if (processed) {
              processed.updated = true;
              processed.reason = 'Successfully updated';
              processed.details = `Updated with data from ${_filename}`;
            }
            
            totalUpdatedDepartments++;
            log(`Successfully updated department data for ${department.name}`);
            
            // Write to file immediately after each successful update
            try {
              fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
              log(`Successfully wrote updated departments.json`);
            } catch (error) {
              log(`Error writing departments.json: ${error.message}`, 'error');
            }
          } else {
            log(`Skipping update for department: ${department.name}`);
            continue;
          }
          
        } catch (error) {
          log(`Error updating department data: ${error.message}`, 'error');
          continue;
        }
      }
    }
    
    // Step 3: Final Processing
    log('\n=== STEP 3: FINAL PROCESSING ===');
    
    // Step 3a: Count final departments with salary data
    const finalDepartmentsWithSalary = departmentsData.departments.filter(d => 
      d.salaryDistribution?.yearly && Object.values(d.salaryDistribution.yearly).some(yearData => yearData.length > 0)
    ).length;
    
    // Step 3b: Log final statistics
    log('\nFinal Statistics:');
    log(`- Initial departments with salary distributions: ${initialDepartmentsWithSalary}`);
    log(`- Final departments with salary distributions: ${finalDepartmentsWithSalary}`);
    log(`- New departments created: ${totalNewDepartments}`);
    log(`- Existing departments updated: ${totalUpdatedDepartments}`);
    log(`- Departments skipped: ${totalSkippedDepartments}`);
    log(`- Total departments processed: ${totalProcessedDepartments}`);
    log(`- Total validation errors: ${totalValidationErrors}`);
    
    // Step 3c: Department Update Summary
    const summary = [];
    summary.push('\nDepartment Update Summary:');
    summary.push('------------------------');

    // Get all departments from JSON
    const allDepartments = departmentsData.departments.map(d => ({
      name: d.name,
      budgetCode: d.budgetCode || 'NO_BUDGET_CODE',
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

    // Group departments by status
    const updatedDepartments = allDepartments.filter(d => d.updated);
    const notUpdatedDepartments = allDepartments.filter(d => !d.updated);

    // Group not updated departments by reason
    const groupedNotUpdated = notUpdatedDepartments.reduce((acc, dept) => {
      const key = dept.reason;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(dept);
      return acc;
    }, {});

    // Build summary
    summary.push(`\nUpdated Departments (${updatedDepartments.length}):`);
    summary.push('----------------------------------------');
    updatedDepartments.forEach(d => {
      summary.push(`${d.budgetCode}_${d.name}`);
      if (d.details) {
        summary.push(`  Details: ${d.details}`);
      }
    });

    summary.push(`\nNot Updated Departments (${notUpdatedDepartments.length}):`);
    summary.push('----------------------------------------');

    // Add each group with its departments
    Object.entries(groupedNotUpdated).forEach(([reason, departments]) => {
      summary.push(`\n${reason}: ${departments.length} departments`);
      departments.forEach(d => {
        summary.push(`${d.budgetCode}_${d.name}`);
        if (d.details) {
          summary.push(`  Details: ${d.details}`);
        }
      });
    });

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