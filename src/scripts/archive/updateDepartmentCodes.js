#!/usr/bin/env node

/**
 * This script updates the department codes in departments.json based on 
 * budget document filenames in the src/data/budget_docs/text directory
 * one time to get the codes for 2023-2025
 */

const fs = require('fs');
const path = require('path');

// Path configurations
const BUDGET_DOCS_DIR = path.join(__dirname, '../data/budget_docs/text');
const DEPARTMENTS_JSON_PATH = path.join(__dirname, '../data/departments.json');

// Helper function to normalize department names for matching
function normalizeForMatching(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[,()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to get all possible name variations for a department
function getNameVariations(name) {
  const normalized = normalizeForMatching(name);
  const variations = new Set([normalized]);
  
  // Add variations without common prefixes
  ['department of', 'state', 'california', 'office of'].forEach(prefix => {
    if (normalized.startsWith(prefix)) {
      variations.add(normalized.slice(prefix.length).trim());
    }
  });
  
  // Add variations without common suffixes
  ['commission', 'board', 'authority', 'agency', 'office'].forEach(suffix => {
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
  
  return Array.from(variations);
}

// Read departments data
let departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8'));

// Track existing codes instead of resetting them
console.log('Checking existing department codes...');
const existingCodes = new Set();
departmentsData.departments.forEach(dept => {
  if (dept.budgetCode) {
    existingCodes.add(dept.budgetCode);
  }
});

// Manual mappings for departments that are hard to match automatically
// Format: department name -> budget code
const manualMappings = {
  // Education
  'K-12 Education': '6100',
  'School Districts (1,037)': '6100',
  'Higher Education': '6440', // Map to UC as primary higher ed institution
  
  // Conservancies
  'Baldwin Hills Conservancy': '3835',
  'Coachella Valley Mountains Conservancy': '3850',
  'Sacramento-San Joaquin Delta Conservancy': '3875',
  'San Francisco Bay Conservation and Development Commission': '3820',
  
  // Health & Human Services
  'State Council on Developmental Disabilities': '4100',
  'Department of Health Care Access and Information': '4140',
  'Department of Managed Health Care': '4150',
  'California Department of Aging': '4170',
  'Commission on Aging': '4180',
  'Department of Community Services and Development': '4700',
  'California Health Benefit Exchange': '4800',
  'No Place Like Home Program Advisory Board': '4260', // Map to Health Care Services
  
  // Corrections
  'Board of State and Community Corrections': '5227',
  '1984 Prison Construction Committee': '5225', // Map to CDCR
  
  // Education
  'California State Library': '6120',
  'Education Audit Appeals Panel': '6125',
  'California State Summer School for the Arts': '6255',
  'College of the Law, San Francisco': '6600',
  
  // Labor & Workforce
  'Employment Development Department': '7100',
  'Agricultural Labor Relations Board': '7300',
  'Public Employment Relations Board': '7320',
  'Department of Industrial Relations': '7350',
  
  // State Operations
  'California Arts Council': '8260',
  'Fair Political Practices Commission': '8620',
  'Political Reform Act of 1974': '8640',
  'Public Utilities Commission': '8660',
  'Commission on the Status of Women and Girls': '8820',
  'California State Auditor\'s Office': '8855',
  'Department of Finance': '8860',
  'Military Department': '8940',
  'California Earthquake Authority': '0845', // Special fund authority
  'California Infrastructure and Economic Development Bank': '0971', // Special fund authority
  'California Competes Tax Credit Committee': '0509', // Map to Business & Economic Development
  
  // Legacy mappings
  'Energy Commission': '3360',
  'Water Resources Control Board': '3940',
  'Department of Toxic Substances Control': '3960',
  'California Department of Social Services': '5180',
  'California Department of Health Care Services': '4260',
  'California Department of Transportation': '2660',
  'California Environmental Protection Agency': '0555',
  'California Department of Human Resources': '7501',
  'California Department of General Services': '7760',
  'California Highway Patrol': '2720',
  'Department of Motor Vehicles': '2740',
  'Secretary of Business, Consumer Services and Housing': '0515',
  'Secretary of Transportation': '0521',
  'Secretary of Health and Human Services': '0530',
  'Department of Real Estate': '2320',
  'Department of Technology': '7502',
  'Franchise Tax Board': '7730',
  'High-Speed Rail Authority': '2665',
  'State Compensation Insurance Fund': '8885',
  'Legislative Branch': '0110',
  'Supreme Court': '0250',
  'Courts of Appeal': '0250',
  'Trial Courts': '0250',
  'Senate': '0110',
  'Assembly': '0110',
  'Legislative Counsel Bureau': '0110'
};

// Get all budget doc filenames
const budgetFiles = fs.readdirSync(BUDGET_DOCS_DIR)
  .filter(filename => filename.endsWith('_budget.txt'))
  .map(filename => {
    // Extract the code from the filename (e.g., 3900_2024_budget.txt -> 3900)
    const code = filename.split('_')[0];
    return {
      code,
      filename
    };
  });

console.log(`Found ${budgetFiles.length} budget documents with department codes`);

// Create a map of department codes to filenames
const budgetDocsMap = {};
budgetFiles.forEach(file => {
  // If there are multiple files for the same code, keep the most recent one
  const year = file.filename.split('_')[1];
  if (!budgetDocsMap[file.budgetCode] || year > budgetDocsMap[file.budgetCode].year) {
    budgetDocsMap[file.budgetCode] = {
      code: file.budgetCode,
      year,
      filename: file.filename
    };
  }
});

console.log(`Found ${Object.keys(budgetDocsMap).length} unique department codes`);

// Helper function to extract department name from budget file
function extractDepartmentNameFromBudgetFile(filename) {
  const filePath = path.join(BUDGET_DOCS_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // First line typically contains code and department name
  const lines = content.split('\n');
  
  // Check the first line which typically contains "CODE   Department Name"
  const firstLine = lines[0].trim();
  if (firstLine) {
    // Extract department name after the code
    const matches = firstLine.match(/^\d+\s+(.*?)$/);
    if (matches && matches[1]) {
      return matches[1].trim();
    }
  }
  
  // Fallback: Try to find a title-like line in the first few lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (line && !line.match(/^\d+/) && line.length > 5) {
      return line;
    }
  }
  
  return '';
}

// Create a mapping of normalized budget file department names to codes
const normalizedBudgetDeptNames = {};
Object.keys(budgetDocsMap).forEach(code => {
  const name = extractDepartmentNameFromBudgetFile(budgetDocsMap[code].filename);
  const normalizedName = normalizeForMatching(name);
  if (normalizedName) {
    normalizedBudgetDeptNames[normalizedName] = code;
    
    // Also add variations for better matching
    const variations = [
      normalizedName.replace(/\s+and\s+/, ' & '),
      normalizedName.replace(/\s+&\s+/, ' and '),
      normalizedName.replace(/\s+commission\s*$/, ''),
      normalizedName.replace(/\s+board\s*$/, ''),
      normalizedName.replace(/\s+authority\s*$/, ''),
      normalizedName.replace(/\s+agency\s*$/, ''),
      normalizedName.replace(/\s+office\s*$/, '')
    ];
    
    variations.forEach(variant => {
      if (variant !== normalizedName) {
        normalizedBudgetDeptNames[variant] = code;
      }
    });
  }
});

// Debug: Print extracted department names
console.log('\nExtracted department names from budget files:');
Object.keys(budgetDocsMap).forEach(code => {
  const name = extractDepartmentNameFromBudgetFile(budgetDocsMap[code].filename);
  console.log(`- Code ${code}: "${name}"`);
});

// Helper function to extract key words from department name
function extractKeyWords(name) {
  const normalized = normalizeForMatching(name);
  const words = normalized.split(/\s+/);
  
  // Common organizational terms (adjectives)
  const orgTerms = new Set([
    'commission', 'board', 'council', 'department', 'agency', 'authority',
    'office', 'committee', 'panel', 'fund', 'corporation', 'institute',
    'foundation', 'association', 'bureau', 'division', 'service', 'program'
  ]);
  
  // Extract nouns (non-org terms) and org terms
  const nouns = words.filter(word => !orgTerms.has(word));
  const orgs = words.filter(word => orgTerms.has(word));
  
  return { nouns, orgs };
}

// Helper function to find best two-word match
function findBestTwoWordMatch(deptName, budgetDeptNames) {
  const { nouns, orgs } = extractKeyWords(deptName);
  const matches = [];
  
  // Try each noun + org term combination
  for (const noun of nouns) {
    for (const org of orgs) {
      // Create a more specific pattern that requires the words to be adjacent
      const pattern = `\\b${noun}\\s+${org}\\b`;
      const regex = new RegExp(pattern, 'i');
      
      // Find all budget departments that match this pattern
      const matchingDepts = Object.entries(budgetDeptNames)
        .filter(([name]) => regex.test(name))
        .map(([name, code]) => ({ name, code }));
      
      if (matchingDepts.length > 0) {
        // Calculate match quality score
        const matchScore = matchingDepts.map(match => {
          let score = 0;
          const matchWords = normalizeForMatching(match.name).split(/\s+/);
          const deptWords = normalizeForMatching(deptName).split(/\s+/);
          
          // Count matching words
          matchWords.forEach(word => {
            if (deptWords.includes(word)) score++;
          });
          
          // Bonus for exact matches
          if (normalizeForMatching(match.name) === normalizeForMatching(deptName)) {
            score += 5;
          }
          
          // Penalty for mismatched key terms
          const deptKeyTerms = deptWords.filter(word => word.length > 3);
          const matchKeyTerms = matchWords.filter(word => word.length > 3);
          const mismatchedTerms = deptKeyTerms.filter(term => !matchKeyTerms.includes(term));
          if (mismatchedTerms.length > 0) {
            score -= mismatchedTerms.length;
          }
          
          // Penalty for mismatched org terms
          const deptOrgs = deptWords.filter(word => orgs.includes(word));
          const matchOrgs = matchWords.filter(word => orgs.includes(word));
          if (deptOrgs.length > 0 && matchOrgs.length > 0 && !deptOrgs.some(org => matchOrgs.includes(org))) {
            score -= 2;
          }
          
          return { ...match, score };
        });
        
        matches.push({
          pattern,
          matches: matchScore,
          matchCount: matchingDepts.length
        });
      }
    }
  }
  
  if (matches.length === 0) return null;
  
  // Sort by number of matches and match quality
  matches.sort((a, b) => {
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }
    // If same number of matches, use highest quality match
    const aMaxScore = Math.max(...a.matches.map(m => m.score));
    const bMaxScore = Math.max(...b.matches.map(m => m.score));
    return bMaxScore - aMaxScore;
  });
  
  // If multiple patterns have the same number of matches, log them
  const maxMatches = matches[0].matchCount;
  const topMatches = matches.filter(m => m.matchCount === maxMatches);
  
  if (topMatches.length > 1) {
    console.log(`Multiple patterns found for "${deptName}":`);
    topMatches.forEach(match => {
      console.log(`- Pattern: "${match.pattern}" matches ${match.matchCount} departments`);
      match.matches.forEach(m => console.log(`  * ${m.name} (${m.budgetCode}) - Score: ${m.score}`));
    });
  }
  
  // Return the match with highest quality score
  const bestMatch = topMatches[0].matches.reduce((best, current) => 
    current.score > best.score ? current : best
  );
  
  // Only return a match if the score is positive
  if (bestMatch.score <= 0) {
    return null;
  }
  
  return bestMatch;
}

// Match departments to budget codes
let updatedCount = 0;
let codesAssigned = {};
let preservedCodes = new Set();
let aliasUpdates = 0;

departmentsData.departments.forEach(dept => {
  // Store existing code if any
  const existingCode = dept.budgetCode;
  
  // If department has a code, check if there's a matching budget file
  if (existingCode) {
    preservedCodes.add(existingCode);
    codesAssigned[existingCode] = true;
    
    // Check if there's a matching budget file with a different name
    const budgetFile = budgetDocsMap[existingCode];
    if (budgetFile) {
      const budgetName = extractDepartmentNameFromBudgetFile(budgetFile.filename);
      if (budgetName && budgetName !== dept.name) {
        // Initialize aliases array if it doesn't exist
        if (!dept.aliases) {
          dept.aliases = [];
        }
        
        // Add the budget file name as an alias if it's not already there
        if (!dept.aliases.includes(budgetName)) {
          dept.aliases.push(budgetName);
          aliasUpdates++;
          console.log(`✓ Added alias "${budgetName}" to "${dept.name}" (from budget file)`);
        }
      }
    }
    return;
  }
  
  // First, check manual mappings
  if (manualMappings[dept.name] && !codesAssigned[manualMappings[dept.name]]) {
    const code = manualMappings[dept.name];
    dept.budgetCode = code;
    updatedCount++;
    codesAssigned[code] = true;
    console.log(`✓ Assigned code ${code} to "${dept.name}" (manual mapping)`);
    return;
  }
  
  // Get all possible name variations for the department
  const nameVariations = getNameVariations(dept.name);
  const canonicalVariations = dept.canonicalName ? getNameVariations(dept.canonicalName) : [];
  const aliasVariations = (dept.aliases || []).flatMap(alias => getNameVariations(alias));
  
  // Try to match any variation against the budget department names
  for (const variation of [...nameVariations, ...canonicalVariations, ...aliasVariations]) {
    if (normalizedBudgetDeptNames[variation] && !codesAssigned[normalizedBudgetDeptNames[variation]]) {
      const code = normalizedBudgetDeptNames[variation];
      dept.budgetCode = code;
      updatedCount++;
      codesAssigned[code] = true;
      console.log(`✓ Assigned code ${code} to "${dept.name}" (matched variation: "${variation}")`);
      return;
    }
  }
  
  // Try two-word matching if no exact match found
  const twoWordMatch = findBestTwoWordMatch(dept.name, normalizedBudgetDeptNames);
  if (twoWordMatch && !codesAssigned[twoWordMatch.budgetCode]) {
    dept.budgetCode = twoWordMatch.budgetCode;
    updatedCount++;
    codesAssigned[twoWordMatch.budgetCode] = true;
    console.log(`✓ Assigned code ${twoWordMatch.budgetCode} to "${dept.name}" (two-word match: "${twoWordMatch.name}")`);
    return;
  }
  
  // No match found - set to null
  dept.budgetCode = null;
  console.log(`✗ No code found for "${dept.name}"`);
});

// Report on unused codes and mismatches
const unusedCodes = Object.keys(budgetDocsMap).filter(code => !codesAssigned[code]);
if (unusedCodes.length > 0) {
  console.log(`\n${unusedCodes.length} budget codes not assigned to any department:`);
  unusedCodes.forEach(code => {
    const docName = extractDepartmentNameFromBudgetFile(budgetDocsMap[code].filename);
    console.log(`- Code ${code}: "${docName}"`);
  });
}

// Report on all preserved codes
if (preservedCodes.size > 0) {
  console.log(`\nAll preserved codes (${preservedCodes.size} total):`);
  Array.from(preservedCodes).sort().forEach(code => {
    const dept = departmentsData.departments.find(d => d.budgetCode === code);
    const budgetName = budgetDocsMap[code] ? extractDepartmentNameFromBudgetFile(budgetDocsMap[code].filename) : null;
    if (budgetName) {
      console.log(`- Code ${code}: "${dept.name}" (matches budget file: "${budgetName}")`);
    } else {
      console.log(`- Code ${code}: "${dept.name}" (no matching budget file)`);
    }
  });
}

// Report on preserved codes that don't match budget files
const preservedNonBudgetCodes = Array.from(preservedCodes).filter(code => !budgetDocsMap[code]);
if (preservedNonBudgetCodes.length > 0) {
  console.log(`\n${preservedNonBudgetCodes.length} preserved codes that don't match budget files:`);
  preservedNonBudgetCodes.forEach(code => {
    const dept = departmentsData.departments.find(d => d.budgetCode === code);
    console.log(`- Code ${code}: "${dept.name}"`);
  });
}

// Write the updated departments data
fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
console.log(`\nPreserved ${preservedCodes.size} existing codes`);
console.log(`Updated ${updatedCount} departments with new codes`);
console.log(`Added ${aliasUpdates} new aliases from budget files`);
console.log(`Saved updated data to ${DEPARTMENTS_JSON_PATH}`);