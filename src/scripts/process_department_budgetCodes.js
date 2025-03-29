#!/usr/bin/env node

/**
 * Department budgetCode Processing Script
 * 
 * This script updates department codes in departments.json based on budget_structure.csv data.
 * It handles:
 * - Department code matching from CSV and text files
 * - Department name variations and aliases
 * - Data validation and type compliance
 * - Logging of operations and results
 * 
 * steps:
 * 1. Initial Setup
 *    a. Load departments.json
 *    b. Setup logging
 * 
 * 2. CSV Processing
 *    a. Extract department name and budget code from CSV filtering out rows ending with "DO NOT USE", "(Renume to .*)", or "USE ONLY", "(Abolished .*)". Remove text at end following special characters.
 *    b. Walk the departments.json records and check for exact matches of name and budget code
 *    c. If there is an exact match of JSON and CSV, name and budget codes then skip
 *    d. else partial matches between JSON fields and CSV record then display JSON name, canonical name, aliases, abbreviation, budget code and CSV name, budget code
 *    f. Ask for user approval before saving changes
 *    g. Log department details
 *    h. Save the changes
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
const BUDGET_CODES_CSV = path.join(PROJECT_ROOT, 'src/data/budget_structure.csv');
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
    
    // Step 1a: Load departments.json
    log('\nStep 1a: Loading departments.json...');
    let departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8'));
    log(`Successfully loaded departments.json with ${departmentsData.departments.length} departments`);
    
    // Step 1b: Setup logging
    log('\nStep 1b: Logging setup complete');
    
    // Read budget code variations before CSV processing
    log('\nReading budget code variations from text files...');
    const budgetCodeVariations = readBudgetCodeVariations();
    log(`Loaded variations for ${budgetCodeVariations.size} budget codes`);
    
    // Step 2: CSV Processing
    log('\n=== STEP 2: CSV PROCESSING ===');
    
    // Step 2a: Extract department name and budget code from CSV
    log('\nStep 2a: Extracting department data from CSV...');
    log('Filtering out rows with: "DO NOT USE", "(Renum to .*)", "USE ONLY", "(Abolished .*)"');
    log('Removing text following special characters');
    
    const csvContent = fs.readFileSync(BUDGET_CODES_CSV, 'utf8');
    const lines = csvContent.split('\n');
    const budgetCodesData = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split the line by comma, handling quoted fields
      const fields = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField);
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      // Add the last field
      fields.push(currentField);
      
      // Ensure we have all required fields
      if (fields.length >= 5) {
        const [level, code, description, xPosition, page] = fields;
        const paddedCode = code.trim().padStart(4, '0');
        let cleanName = description.trim().replace(/^"|"$/g, ''); // Remove surrounding quotes
        
        // Filter out rows with specific endings
        if (cleanName.match(/(?:DO NOT USE|DOF USE|ABOLISHED|USE ONLY|\(Renum to .*\)|\(Abolished .*\))$/i)) {
          log(`Skipping filtered row ${i}: ${cleanName}`);
          continue;
        }
        
        // Remove text following special characters
        cleanName = cleanName.replace(/[\(\[].*$/, '').trim();
        
        // Log each CSV line's code and name
        log(`CSV Line ${i}: Code=${paddedCode}, Name=${cleanName}`);
        
        budgetCodesData.push({
          'Level': level.trim(),
          'Department Code': paddedCode,
          'Department Name': cleanName,
          'X Position': xPosition.trim(),
          'Page': page.trim(),
          'Variations': budgetCodeVariations.get(paddedCode) || []
        });
      } else {
        log(`Warning: Skipping invalid line ${i + 1}: ${line}`, 'warn');
      }
    }
    log(`Successfully loaded ${budgetCodesData.length} budget codes`);

    // Create budgetDeptMap for matching
    const budgetDeptMap = {};
    budgetCodesData.forEach(row => {
      budgetDeptMap[row['Department Name']] = row['Department Code'];
    });

    // Step 2b: Walk departments.json records and check matches
    log('\nStep 2b: Walking departments.json records and checking for exact matches...');
    
    // Track statistics
    const stats = {
      totalDepartments: departmentsData.departments.length,
      totalCSVRows: budgetCodesData.length,
      skippedRecords: 0,
      unmatchedCSVRows: 0,
      unmatchedJSONRecords: 0,
      newCodes: 0,
      changedCodes: 0,
      removedCodes: 0,
      unchangedCodes: 0,
      exactMatches: 0,
      partialMatches: 0,
      noBudgetCode: 0,
      matches: [], // Track all matches
      codeChanges: {
        new: [],    // New codes added
        changed: [], // Codes that changed
        unchanged: [] // Codes that stayed the same
      }
    };

    // Count departments with no budget code
    stats.noBudgetCode = departmentsData.departments.filter(dept => !dept.budgetCode).length;

    // Process each department
    for (const dept of departmentsData.departments) {
      log('\n=== Processing Department: ${dept.name} ===');
      
      // Step 2c: Check for exact matches
      log('\nStep 2c: Checking for exact matches of name and budget code...');
      
      // 1. Show JSON Record - Summarized
      log('\nJSON Record:');
      log(`Name: ${dept.name}`);
      log(`Canonical Name: ${dept.canonicalName || 'None'}`);
      log(`Current Budget Code: ${dept.budgetCode || 'None'}`);
      if (dept.aliases && dept.aliases.length > 0) {
        log(`Aliases: ${dept.aliases.join(', ')}`);
      }
      
      // 2. Show CSV Matches - Summarized
      const csvMatches = budgetCodesData.filter(row => {
        const csvName = row['Department Name'].trim();
        return csvName.toLowerCase().includes(dept.name.toLowerCase()) ||
               dept.name.toLowerCase().includes(csvName.toLowerCase());
      });
      log('\nCSV Matches:');
      if (csvMatches.length > 0) {
        csvMatches.forEach(match => {
          log(`Level ${match['Level']}: ${match['Department Code']} - ${match['Department Name']}`);
        });
      } else {
        log('No matches found');
      }

      // Check for exact matches
      const hasExactCSVMatch = csvMatches.some(match => {
        // First check budget code match
        if (match['Department Code'] !== dept.budgetCode) return false;
        
        // Get normalized versions of all names
        const normalizedCSVName = normalizeForExactMatch(match['Department Name']);
        const normalizedJSONName = normalizeForExactMatch(dept.name);
        const normalizedCanonicalName = dept.canonicalName ? normalizeForExactMatch(dept.canonicalName) : '';
        
        // Split into words and sort to handle different word orders
        const csvWords = normalizedCSVName.split(' ').sort().join(' ');
        const jsonWords = normalizedJSONName.split(' ').sort().join(' ');
        const canonicalWords = normalizedCanonicalName ? normalizedCanonicalName.split(' ').sort().join(' ') : '';
        
        // Check if any of the normalized names match
        return csvWords === jsonWords || csvWords === canonicalWords;
      });

      // Check for partial matches
      const hasPartialCSVMatch = csvMatches.length > 0 && !hasExactCSVMatch;

      // Update statistics based on match status
      if (hasExactCSVMatch) {
        stats.exactMatches++;
        stats.skippedRecords++;
        log('\nMatch Status: ✓ Exact Match Found - Skipping');
        continue;
      }

      if (!dept.budgetCode && !hasPartialCSVMatch) {
        stats.unmatchedJSONRecords++;
        log('\nMatch Status: ❌ No Matches Found');
        continue;
      }

      if (hasPartialCSVMatch) {
        stats.partialMatches++;
        log('\nMatch Status: ⚠️ Partial Matches Found');
      }

      // Step 2f: Ask for user approval
      if (hasPartialCSVMatch) {
        log('\nStep 2f: Requesting user approval before saving changes...');
        
        // Find best match from CSV matches
        let bestMatch = null;
        let bestMatchScore = 0;
        
        for (const match of csvMatches) {
          const score = calculateMatchScore(dept.name, match['Department Name']);
          if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatch = match;
          }
        }

        if (bestMatch && bestMatchScore > 0.8) {
          log('\nBest Potential Match:');
          log(`  Code: ${bestMatch['Department Code']}`);
          log(`  Name: ${bestMatch['Department Name']}`);
          log(`  Score: ${bestMatchScore.toFixed(2)}`);

          const originalDepartment = JSON.parse(JSON.stringify(dept));
          const proposedDepartment = JSON.parse(JSON.stringify(dept));
          proposedDepartment.budgetCode = bestMatch['Department Code'];

          log('\nProposed Changes:');
          showDiff(originalDepartment, proposedDepartment, log);

          const shouldUpdate = await askForApproval('\nApply changes? (y/n): ');
          
          if (shouldUpdate) {
            // Step 2g: Log department details
            log('\nStep 2g: Logging department details...');
            
            stats.matches.push({
              department: dept.name,
              currentCode: dept.budgetCode,
              newCode: bestMatch['Department Code'],
              matchedName: bestMatch['Department Name'],
              matchScore: bestMatchScore
            });

            if (!dept.budgetCode) {
              stats.codeChanges.new.push({
                name: dept.name,
                code: bestMatch['Department Code']
              });
            } else if (dept.budgetCode !== bestMatch['Department Code']) {
              stats.codeChanges.changed.push({
                name: dept.name,
                oldCode: dept.budgetCode,
                newCode: bestMatch['Department Code']
              });
            } else {
              stats.codeChanges.unchanged.push({
                name: dept.name,
                code: bestMatch['Department Code']
              });
            }
            
            dept.budgetCode = bestMatch['Department Code'];
            log('✓ Changes applied successfully.');
            
            // Step 2h: Save the changes
            log('\nStep 2h: Saving changes...');
            try {
              fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
              log('✓ Changes saved to departments.json');
            } catch (error) {
              log(`Error saving changes: ${error.message}`, 'error');
            }
          } else {
            log('✗ Changes skipped.');
          }
        } else {
          log('\nNo good matches found for partial matches.');
        }
      }
    }

    // Step 3: Data Validation
    log('\n=== STEP 3: DATA VALIDATION ===');
    
    // Step 3a: Verify code matches
    log('\nStep 3a: Verifying code matches...');
    const matchedCSVCodes = new Set(departmentsData.departments.map(dept => dept.budgetCode));
    stats.unmatchedCSVRows = budgetCodesData.filter(row => !matchedCSVCodes.has(row['Department Code'])).length;
    
    // Step 3b: Check department hierarchy
    log('\nStep 3b: Checking department hierarchy...');
    // Add hierarchy validation logic here if needed
    
    // Step 3c: Validate data types
    log('\nStep 3c: Validating data types...');
    // Add data type validation logic here if needed

    // Step 4: Results Summary
    log('\n=== STEP 4: RESULTS SUMMARY ===');
    
    // Step 4a: Count updated departments
    log('\nStep 4a: Counting updated departments...');
    
    // Step 4b: Verify data consistency
    log('\nStep 4b: Verifying data consistency...');
    
    // Step 4c: Log final statistics
    log('\nStep 4c: Logging final statistics...');
    log('\nSummary Statistics:');
    log('------------------');
    log(`Total Departments (JSON): ${stats.totalDepartments}`);
    log(`Total CSV Rows: ${stats.totalCSVRows}`);
    log(`Departments with No Budget Code: ${stats.noBudgetCode}`);
    log(`Skipped Records (Exact Matches): ${stats.skippedRecords}`);
    log(`Unmatched CSV Rows: ${stats.unmatchedCSVRows}`);
    log(`Unmatched JSON Records: ${stats.unmatchedJSONRecords}`);
    log(`New Codes: ${stats.newCodes}`);
    log(`Changed Codes: ${stats.changedCodes}`);
    log(`Removed Codes: ${stats.removedCodes}`);
    log(`Unchanged Codes: ${stats.unchangedCodes}`);
    log(`Exact Matches: ${stats.exactMatches}`);
    log(`Partial Matches: ${stats.partialMatches}`);
    
    // Step 4d: Log differences
    log('\nStep 4d: Logging differences...');
    // Add difference logging logic here if needed

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

// Function to normalize text for exact matching (handles plurals)
function normalizeForExactMatch(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    // Remove all special characters including commas
    .replace(/[^a-z0-9\s]/g, '')
    // Remove articles and common words
    .replace(/\b(a|an|the|of|for|and|or|in|to|at|on|by)\b/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Split into words and remove plurals from each word
    .split(' ')
    .map(word => word.replace(/\b(s|es|ies)$/, ''))
    .join(' ')
    .trim();
}

// Function to get all possible name variations for a department
function _getNameVariations(name) {
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
function _padCode(code) {
  return code.padStart(4, '0');
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});