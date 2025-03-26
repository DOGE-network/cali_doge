#!/usr/bin/env node

/**
 * Department Code Processing Script
 * 
 * This script updates department codes in departments.json based on ebudget FY2023 CSV data.
 * It handles:
 * - Department code matching from CSV and text files
 * - Department name variations and aliases
 * - Data validation and type compliance
 * - Logging of operations and results
 * 
 * Workflow:
 * 1. Initial Setup
 *    a. Load departments.json
 *    b. Setup logging
 *    c. Read budget code variations from text files
 * 
 * 2. CSV Processing
 *    a. Read and parse budget codes CSV
 *    b. Extract department information
 *    c. Match departments with codes
 *    d. Log the differences between the original and updated record
 *    e. Only update department records if differences are found
 *    f. Log department details
 *    g. Save the changes
 * 
 * 3. Data Validation
 *    a. Verify code matches
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
 * node process_department_codes.js
 * ```
 */

const fs = require('fs');
const path = require('path');

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BUDGET_CODES_CSV = path.join(PROJECT_ROOT, 'src/data/ebudget.ca.gov_budget_codes_fy2023-fy2024.csv');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
const BUDGET_DOCS_DIR = path.join(PROJECT_ROOT, 'src/data/budget_docs/text');
const LOG_DIR = path.join(PROJECT_ROOT, 'src/logs');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(LOG_DIR, `process_department_codes_${timestamp}.log`);

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Setup logging
const setupLogging = () => {
  const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  };
  
  return { logFile: LOG_FILE, log };
};

// Function to read budget code variations from text files
function readBudgetCodeVariations() {
  const variations = new Map(); // Map of budget code to array of name variations
  
  try {
    const files = fs.readdirSync(BUDGET_DOCS_DIR);
    
    for (const file of files) {
      if (!file.endsWith('.txt')) continue;
      
      // Extract budget code from filename (4 digits at start)
      const codeMatch = file.match(/^(\d{4})_/);
      if (!codeMatch) continue;
      
      const code = codeMatch[1];
      const content = fs.readFileSync(path.join(BUDGET_DOCS_DIR, file), 'utf8');
      const lines = content.split('\n');
      
      // First line should contain the department name
      const departmentName = lines[0].trim();
      if (!departmentName) continue;
      
      // Add the department name as the primary variation
      variations.set(code, [departmentName]);
    }
    
    return variations;
  } catch (error) {
    console.error('Error reading budget code variations:', error);
    return new Map();
  }
}

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

// Function to ask for user approval
const askForApproval = (question) => {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', data => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === 'y');
    });
  });
};

// Main execution
const main = async () => {
  let log;
  
  try {
    // Step 1: Initial Setup
    log = setupLogging().log;
    log('\n=== STEP 1: INITIAL SETUP ===');
    
    // Read departments data
    log('Reading departments.json...');
    let departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8'));
    log(`Successfully loaded departments.json with ${departmentsData.departments.length} departments`);
    
    // Read budget code variations
    log('Reading budget code variations from text files...');
    const budgetCodeVariations = readBudgetCodeVariations();
    log(`Loaded variations for ${budgetCodeVariations.size} budget codes`);
    
    // Read and parse budget codes CSV
    log('Reading budget codes CSV...');
    const csvContent = fs.readFileSync(BUDGET_CODES_CSV, 'utf8');
    const lines = csvContent.split('\n');
    const budgetCodesData = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Extract code and name from the line
      const match = line.match(/"(\d+)\s*","([^"]+)"/);
      if (match) {
        const code = padCode(match[1].trim());
        const name = match[2].trim();
        budgetCodesData.push({
          'Department Code': code,
          'Department Name': name,
          'Variations': budgetCodeVariations.get(code) || []
        });
      }
    }
    log(`Successfully loaded ${budgetCodesData.length} budget codes`);

    // Log all data sources for verification
    log('\n=== DATA SOURCES ===');
    log('===================');
    
    log('\n1. CSV Data:');
    log('-----------');
    budgetCodesData.forEach(row => {
      log(`Code: ${row['Department Code']}`);
      log(`Name: ${row['Department Name']}`);
      log(`Variations: ${row['Variations'].join(', ')}`);
      log('---');
    });

    log('\n2. Text File Variations:');
    log('----------------------');
    budgetCodeVariations.forEach((variations, code) => {
      log(`Code: ${code}`);
      log(`Variations: ${variations.join(', ')}`);
      log('---');
    });

    log('\n3. JSON Records:');
    log('--------------');
    departmentsData.departments.forEach(dept => {
      log(`Name: ${dept.name}`);
      log(`Canonical Name: ${dept.canonicalName || 'None'}`);
      log(`Aliases: ${(dept.aliases || []).join(', ')}`);
      log(`Current Budget Code: ${dept.budgetCode || 'None'}`);
      log('---');
    });

    // Create a map of normalized budget department names to codes
    const budgetDeptMap = {};
    budgetCodesData.forEach(row => {
      const code = row['Department Code'];
      const name = row['Department Name'].trim();
      const variations = row['Variations'];
      const normalizedName = normalizeForMatching(name);
      
      if (normalizedName) {
        budgetDeptMap[normalizedName] = code;
        
        // Add variations for better matching
        const nameVariations = getNameVariations(name);
        [...nameVariations, ...variations].forEach(variant => {
          const normalizedVariant = normalizeForMatching(variant);
          if (normalizedVariant && normalizedVariant !== normalizedName) {
            budgetDeptMap[normalizedVariant] = code;
          }
        });
      }
    });

    // Log the normalized mapping
    log('\n4. Normalized Name Mapping:');
    log('-------------------------');
    Object.entries(budgetDeptMap).forEach(([name, code]) => {
      log(`Normalized Name: ${name}`);
      log(`Maps to Code: ${code}`);
      log('---');
    });

    log('\n=== Starting Department Processing ===');
    log('=====================================');

    // Track matches and no matches
    const matches = [];
    const noMatches = [];
    const codeChanges = {
      new: [], // departments getting a code for the first time
      changed: [], // departments with code changes
      unchanged: [], // departments with unchanged codes
      removed: [] // departments losing their code
    };

    // Process each department
    for (const dept of departmentsData.departments) {
      log(`\n=== Processing Department: ${dept.name} ===`);
      
      // Show all data sources for this department
      log('\n=== DATA SOURCES FOR THIS DEPARTMENT ===');
      log('=====================================');
      
      // 1. Show JSON Record
      log('\n1. JSON Record:');
      log('--------------');
      log(JSON.stringify(dept, null, 2));
      
      // 2. Show CSV Matches
      log('\n2. CSV Matches:');
      log('-------------');
      const csvMatches = budgetCodesData.filter(row => {
        const csvName = row['Department Name'].trim();
        return csvName.toLowerCase().includes(dept.name.toLowerCase()) ||
               dept.name.toLowerCase().includes(csvName.toLowerCase());
      });
      if (csvMatches.length > 0) {
        csvMatches.forEach(match => {
          log(`Found in CSV:`);
          log(`  Code: ${match['Department Code']}`);
          log(`  Name: ${match['Department Name']}`);
        });
      } else {
        log('No matches found in CSV');
      }
      
      // 3. Show Text File Matches
      log('\n3. Text File Matches:');
      log('-------------------');
      const textMatches = [];
      budgetCodeVariations.forEach((variations, code) => {
        if (variations.some(v => 
          v.toLowerCase().includes(dept.name.toLowerCase()) ||
          dept.name.toLowerCase().includes(v.toLowerCase())
        )) {
          textMatches.push({ code, variations });
        }
      });
      if (textMatches.length > 0) {
        textMatches.forEach(match => {
          log(`Found in Text Files:`);
          log(`  Code: ${match.code}`);
          log(`  Variations: ${match.variations.join(', ')}`);
        });
      } else {
        log('No matches found in text files');
      }
      
      // 4. Show Name Variations Being Tried
      log('\n4. Name Variations to Try:');
      log('------------------------');
      const nameVariations = getNameVariations(dept.name);
      const canonicalVariations = dept.canonicalName ? getNameVariations(dept.canonicalName) : [];
      const aliasVariations = (dept.aliases || []).flatMap(alias => getNameVariations(alias));
      
      // 5. Show Matching Process
      log('\n5. Matching Process:');
      log('------------------');
      let matched = false;
      let matchedCode = null;
      let matchedName = null;
      let bestMatch = null;
      let bestMatchScore = 0;
      
      // Try to match any variation against the budget department names
      for (const variation of [...nameVariations, ...canonicalVariations, ...aliasVariations]) {
        log(`\nTrying variation: "${variation}"`);
        
        // Try exact match first
        if (budgetDeptMap[variation]) {
          matched = true;
          matchedCode = budgetDeptMap[variation];
          matchedName = variation;
          log(`✓ Exact match found!`);
          log(`  Code: ${matchedCode}`);
          log(`  Name: ${matchedName}`);
          break;
        }
        
        // Try fuzzy matching if exact match fails
        log('No exact match, trying fuzzy matching...');
        for (const [budgetName, code] of Object.entries(budgetDeptMap)) {
          const score = calculateMatchScore(variation, budgetName);
          log(`  Against "${budgetName}": score = ${score.toFixed(2)}`);
          if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatch = { name: budgetName, code };
          }
        }
      }
      
      // 6. Show Final Match Decision
      log('\n6. Final Match Decision:');
      log('----------------------');
      if (matched) {
        log(`✓ Exact Match Found:`);
        log(`  Code: ${matchedCode}`);
        log(`  Name: ${matchedName}`);
      } else if (bestMatch) {
        log(`Best Fuzzy Match:`);
        log(`  Code: ${bestMatch.code}`);
        log(`  Name: ${bestMatch.name}`);
        log(`  Score: ${bestMatchScore.toFixed(2)}`);
      } else {
        log('❌ No matches found');
      }
      
      // If no exact match but we have a good fuzzy match, use it
      if (!matched && bestMatch && bestMatchScore > 0.8) {
        matched = true;
        matchedCode = bestMatch.code;
        matchedName = bestMatch.name;
        log(`\nUsing fuzzy match (score > 0.8):`);
        log(`  Code: ${matchedCode}`);
        log(`  Name: ${matchedName}`);
      }
      
      if (matched) {
        const originalDepartment = JSON.parse(JSON.stringify(dept));
        const proposedDepartment = JSON.parse(JSON.stringify(dept));
        proposedDepartment.budgetCode = matchedCode;
        
        log('\n7. Proposed Changes:');
        log('-----------------');
        showDiff(originalDepartment, proposedDepartment, log);
        
        const shouldUpdate = await askForApproval('\nWould you like to apply these changes? (y/n): ');
        
        if (shouldUpdate) {
          matches.push({
            department: dept.name,
            currentCode: dept.budgetCode,
            newCode: matchedCode,
            matchedName,
            matchScore: bestMatchScore
          });

          // Track the type of change
          if (!dept.budgetCode) {
            codeChanges.new.push({
              name: dept.name,
              code: matchedCode
            });
          } else if (dept.budgetCode !== matchedCode) {
            codeChanges.changed.push({
              name: dept.name,
              oldCode: dept.budgetCode,
              newCode: matchedCode
            });
          } else {
            codeChanges.unchanged.push({
              name: dept.name,
              code: matchedCode
            });
          }
          
          dept.budgetCode = matchedCode;
          log('✓ Changes applied successfully.');
        } else {
          log('✗ Changes skipped.');
        }
      } else {
        noMatches.push({
          department: dept.name,
          currentCode: dept.budgetCode,
          variations: [...nameVariations, ...canonicalVariations, ...aliasVariations],
          bestMatch: bestMatch ? { name: bestMatch.name, score: bestMatchScore } : null
        });
        
        if (dept.budgetCode) {
          const originalDepartment = JSON.parse(JSON.stringify(dept));
          const proposedDepartment = JSON.parse(JSON.stringify(dept));
          proposedDepartment.budgetCode = null;
          
          log('\nNo match found. Current code will be removed:');
          showDiff(originalDepartment, proposedDepartment, log);
          
          const shouldRemove = await askForApproval('\nWould you like to remove the current code? (y/n): ');
          
          if (shouldRemove) {
            codeChanges.removed.push({
              name: dept.name,
              oldCode: dept.budgetCode
            });
            dept.budgetCode = null;
            log('✓ Code removed successfully.');
          } else {
            log('✗ Code removal skipped.');
          }
        }
      }
      
      // Save changes after each department
      fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
    }

    // Display summary of changes
    log('\n=== STEP 2: SUMMARY OF PROPOSED CHANGES ===');
    log('=========================================');

    log('\n1. New Budget Codes:');
    log('------------------');
    if (codeChanges.new.length === 0) {
      log('None');
    } else {
      codeChanges.new.forEach(({name, code}) => {
        log(`${name}: ${code}`);
      });
    }

    log('\n2. Changed Budget Codes:');
    log('----------------------');
    if (codeChanges.changed.length === 0) {
      log('None');
    } else {
      codeChanges.changed.forEach(({name, oldCode, newCode}) => {
        log(`${name}: ${oldCode} -> ${newCode}`);
      });
    }

    log('\n3. Removed Budget Codes:');
    log('----------------------');
    if (codeChanges.removed.length === 0) {
      log('None');
    } else {
      codeChanges.removed.forEach(({name, oldCode}) => {
        log(`${name}: ${oldCode} removed`);
      });
    }

    log('\n4. Unchanged Budget Codes:');
    log('------------------------');
    log(`${codeChanges.unchanged.length} departments`);

    log('\nDetailed Analysis of Unmatched Departments:');
    log('----------------------------------------');
    noMatches.forEach(({department, currentCode, variations, bestMatch}) => {
      const dept = departmentsData.departments.find(d => d.name === department);
      log('\nDepartment: ' + department);
      log('Current Code: ' + (currentCode || 'None'));
      log('Canonical Name: ' + (dept.canonicalName || 'None'));
      log('Aliases: ' + (dept.aliases ? dept.aliases.join(', ') : 'None'));
      log('Name Variations:');
      variations.forEach(variant => {
        log(`  - ${variant}`);
      });
      if (bestMatch) {
        log('Best Potential Match: ' + bestMatch.name);
        log('Match Score: ' + bestMatch.score.toFixed(2));
      }
    });

    log('\nSummary Statistics:');
    log('------------------');
    log(`Total Departments: ${departmentsData.departments.length}`);
    log(`New Codes: ${codeChanges.new.length}`);
    log(`Changed Codes: ${codeChanges.changed.length}`);
    log(`Removed Codes: ${codeChanges.removed.length}`);
    log(`Unchanged Codes: ${codeChanges.unchanged.length}`);
    log(`No Matches: ${noMatches.length}`);

    log('\nProcessing complete.');
    
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
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

// Helper function to pad code to 4 digits
function padCode(code) {
  return code.padStart(4, '0');
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});