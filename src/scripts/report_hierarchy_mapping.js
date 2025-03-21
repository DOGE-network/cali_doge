#!/usr/bin/env node

/**
 * Report on Department Hierarchy Script
 * 
 * Purpose:
 * - Matches department records between JSON and CSV sources
 * - Logs all matches and potential updates for review
 * - Tracks data sources for each match
 * - Identifies new department name variations for review
 * - Detects and logs fuzzy matches with strict single-match requirements
 * - Handles department abbreviations without adding them as aliases
 * 
 * Input (Read-only):
 * - departments.json: Current department records with canonical names and aliases
 * - department-structure-research.csv: Raw research data from government sources
 * 
 * Expected CSV Format:
 * type DepartmentResearchRecord = {
 *   '#': string;              // Sequential ID number
 *   'Department': string;     // Department name (may include abbreviations in parentheses)
 *   'parent_agency': string[];   // Parent agency or organization
 *   'org_level': string;      // Organizational level (1-4)
 *   'active': string;         // Activity status ('yes' or 'no')
 * }
 * 
 * CSV File Structure:
 * - Comments start with '#'
 * - Fields are comma-delimited
 * - Values are double-quoted
 * - First non-comment line contains headers
 * - Headers must match DepartmentResearchRecord fields exactly
 * 
 * Output:
 * - verify_hierarchy_mapping.log: Detailed log of matches and potential updates
 *   - Summary statistics
 *   - Fuzzy match errors (multiple matches found)
 *   - Detailed results for each department
 *   - Potential new aliases (excluding abbreviations)
 * 
 * Functions:
 * - normalizeForMatching: Standardizes department names for comparison
 *   - Handles case, whitespace, and common variations
 *   - Standardizes "Dept of" to "Department of"
 *   - Removes parentheses and special characters
 * 
 * - extractAbbreviation: Extracts text from parentheses
 *   - Used for matching but not for creating aliases
 *   - Returns null if no abbreviation found
 * 
 * - calculateSimilarity: Computes string similarity score
 *   - Uses Levenshtein distance
 *   - Returns score between 0 and 1
 *   - Used for fuzzy matching with 80% threshold
 * 
 * - namesMatch: Checks if names match using multiple strategies
 *   - Direct match against canonical name
 *   - Match against existing aliases
 *   - Match against abbreviations
 * 
 * - findFuzzyMatches: Identifies similar department names
 *   - Enforces single-match requirement
 *   - Logs errors for multiple matches
 *   - Returns best match or error
 * 
 * - logNewAlias: Identifies potential new aliases
 *   - Excludes abbreviations in parentheses
 *   - Checks against existing aliases
 *   - Returns formatted message or null
 * 
 * - processDepartments: Main processing function
 *   - Handles all matching strategies
 *   - Generates detailed results
 *   - Tracks statistics and errors
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Helper function to generate timestamped filename
function generateTimestampedFilename(scriptName) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')  // Replace colons and periods with hyphens
    .replace('T', '_')      // Replace T with underscore
    .replace('Z', '');      // Remove Z
  const baseName = path.basename(scriptName, '.js');
  return `${baseName}_${timestamp}.log`;
}

// Read all required files
const departmentsPath = path.join(__dirname, '../data/departments.json');
const csvPath = path.join(__dirname, '../data/department-structure-research.csv');
const logPath = path.join(__dirname, '../logs', generateTimestampedFilename(__filename));

// Ensure logs directory exists
const logsDir = path.dirname(logPath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Read and parse files
const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));
const csvData = csv.parse(fs.readFileSync(csvPath, 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  comment: '#',
  delimiter: ',',
  trim: true,
  quote: '"'
});

// Helper function to normalize department names for matching
function normalizeForMatching(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[,()]/g, '')  // Remove parentheses and commas
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .replace(/dept\.?\s+of/i, 'department of')  // Standardize "Dept of"
    .replace(/agency/i, 'agency')  // Standardize "Agency"
    .replace(/\s+/g, ' ')   // Normalize whitespace again
    .trim();
}

// Function to extract abbreviation from parentheses
function extractAbbreviation(name) {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

// Function to calculate string similarity (Levenshtein distance)
function calculateSimilarity(str1, str2) {
  const s1 = normalizeForMatching(str1);
  const s2 = normalizeForMatching(str2);
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshteinDistance(longer, shorter);
  return 1 - (distance / Math.max(longer.length, shorter.length));
}

// Helper function to calculate Levenshtein distance
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Function to check if two names match using the department's aliases
function namesMatch(csvName, dept) {
  const normalizedCsvName = normalizeForMatching(csvName);
  const normalizedCanonicalName = normalizeForMatching(dept.canonicalName);
  const normalizedAliases = (dept.aliases || []).map(alias => normalizeForMatching(alias));
  
  // Direct match check
  if (normalizedCanonicalName === normalizedCsvName || 
      normalizedAliases.includes(normalizedCsvName)) {
    return true;
  }

  // Check abbreviation match
  const csvAbbr = extractAbbreviation(csvName);
  if (csvAbbr) {
    const normalizedAbbr = normalizeForMatching(csvAbbr);
    if (normalizedCanonicalName.includes(normalizedAbbr) || 
        normalizedAliases.some(alias => alias.includes(normalizedAbbr))) {
      return true;
    }
  }

  return false;
}

// Function to find fuzzy matches
function findFuzzyMatches(csvName, departments) {
  const matches = departments.filter(dept => {
    const similarity = calculateSimilarity(csvName, dept.canonicalName);
    return similarity > 0.8; // 80% similarity threshold
  });

  if (matches.length > 1) {
    return {
      error: true,
      message: `Multiple fuzzy matches found for "${csvName}": ${matches.map(m => m.canonicalName).join(', ')}`
    };
  }

  return {
    error: false,
    match: matches[0]
  };
}

// Function to log potential new aliases
function logNewAlias(dept, csvRecord) {
  const normalizedCsvName = normalizeForMatching(csvRecord.Department);
  const normalizedCanonicalName = normalizeForMatching(dept.canonicalName);
  const normalizedAliases = (dept.aliases || []).map(alias => normalizeForMatching(alias));
  
  // Check for variations that should be aliases
  if (normalizedCanonicalName !== normalizedCsvName && !normalizedAliases.includes(normalizedCsvName)) {
    // Don't add abbreviations as aliases if they're in parentheses
    if (!csvRecord.Department.includes('(')) {
      return `Potential new alias found: "${csvRecord.Department}" for "${dept.canonicalName}"`;
    }
  }

  // Check for abbreviation matches that should be aliases
  const csvAbbr = extractAbbreviation(csvRecord.Department);
  if (csvAbbr) {
    const normalizedAbbr = normalizeForMatching(csvAbbr);
    if (normalizedCanonicalName.includes(normalizedAbbr) || 
        normalizedAliases.some(alias => alias.includes(normalizedAbbr))) {
      // Clean the abbreviation for the alias (remove special characters)
      const cleanAbbr = csvAbbr.replace(/[()]/g, '').trim();
      return `Potential new alias found (from abbreviation): "${cleanAbbr}" for "${dept.canonicalName}"`;
    }
  }

  // Check for common variations that should be aliases
  const commonVariations = [
    { from: /dept\.?\s+of/i, to: 'Department of' },
    { from: /dept\.?\s+of/i, to: 'Dept of' },
    { from: /agency/i, to: 'Agency' },
    { from: /board/i, to: 'Board' },
    { from: /commission/i, to: 'Commission' },
    { from: /committee/i, to: 'Committee' },
    { from: /office/i, to: 'Office' },
    { from: /bureau/i, to: 'Bureau' },
    { from: /division/i, to: 'Division' },
    { from: /branch/i, to: 'Branch' }
  ];

  for (const variation of commonVariations) {
    const variationMatch = csvRecord.Department.match(variation.from);
    if (variationMatch) {
      const normalizedVariation = normalizeForMatching(csvRecord.Department.replace(variation.from, variation.to));
      if (normalizedCanonicalName === normalizedVariation && !normalizedAliases.includes(normalizedVariation)) {
        // Clean the variation for the alias (remove special characters)
        const cleanVariation = csvRecord.Department.replace(/[()]/g, '').trim();
        return `Potential new alias found (from variation): "${cleanVariation}" for "${dept.canonicalName}"`;
      }
    }
  }

  return null;
}

// Main processing function
function processDepartments() {
  const results = {
    total: departmentsData.departments.length,
    matched: 0,
    unmatched: 0,
    potentialAliases: 0,
    fuzzyMatchErrors: [],
    details: []
  };

  // Process each department
  for (const dept of departmentsData.departments) {
    let found = false;
    let newAlias = null;

    // Look for matching CSV record
    for (const csvRecord of csvData) {
      if (namesMatch(csvRecord.Department, dept)) {
        found = true;
        results.matched++;

        // Check for potential new aliases
        newAlias = logNewAlias(dept, csvRecord);
        if (newAlias) {
          results.potentialAliases++;
        }

        // Log the results
        const logEntry = {
          department: dept.canonicalName,
          status: newAlias ? 'matched_with_new_alias' : 'matched',
          newAlias: newAlias,
          csvData: {
            name: csvRecord.Department,
            org_level: csvRecord.org_level,
            parent_agency: [csvRecord.parent_agency]
          },
          jsonData: {
            org_level: dept.org_level,
            parent_agency: dept.parent_agency
          },
          source: csvRecord.source || 'department-structure-research.csv'
        };
        results.details.push(logEntry);
        break;
      }
    }

    if (!found) {
      // Try fuzzy matching for unmatched departments
      const fuzzyResult = findFuzzyMatches(dept.canonicalName, csvData);
      if (fuzzyResult.error) {
        results.fuzzyMatchErrors.push(fuzzyResult.message);
      } else if (fuzzyResult.match) {
        found = true;
        results.matched++;
        results.details.push({
          department: dept.canonicalName,
          status: 'fuzzy_matched',
          csvData: {
            name: fuzzyResult.match.Department,
            org_level: fuzzyResult.match.org_level,
            parent_agency: [fuzzyResult.match.parent_agency]
          },
          jsonData: {
            org_level: dept.org_level,
            parent_agency: dept.parent_agency
          },
          source: fuzzyResult.match.source || 'department-structure-research.csv'
        });
      } else {
        results.unmatched++;
        results.details.push({
          department: dept.canonicalName,
          status: 'unmatched',
          message: 'No matching CSV record found'
        });
      }
    }
  }

  return results;
}

// Process departments and generate report
const results = processDepartments();

// Write results to log file
const logContent = [
  'Department Hierarchy Mapping Verification Results',
  '===============================================',
  `Date: ${new Date().toISOString()}`,
  '',
  'Purpose:',
  '- Match department records between JSON and CSV sources',
  '- Log all matches and potential updates for review',
  '- Track data sources for each match',
  '- Identify new department name variations for review',
  '- Detects and logs fuzzy matches with strict single-match requirements',
  '- Handles department abbreviations without adding them as aliases',
  '',
  'Summary:',
  `Total Departments: ${results.total}`,
  `Matched Departments: ${results.matched}`,
  `Potential New Aliases: ${results.potentialAliases}`,
  `Unmatched Departments: ${results.unmatched}`,
  '',
  'Fuzzy Match Errors:',
  '------------------'
];

if (results.fuzzyMatchErrors.length > 0) {
  results.fuzzyMatchErrors.forEach(error => {
    logContent.push(`\n${error}`);
  });
}

logContent.push(
  '',
  'Detailed Results:',
  '----------------'
);

// Add detailed results
results.details.forEach(detail => {
  logContent.push(`\nDepartment: ${detail.department}`);
  logContent.push(`Status: ${detail.status}`);
  
  if (detail.newAlias) {
    logContent.push('Potential Update:');
    logContent.push(`- ${detail.newAlias}`);
  }
  
  if (detail.status === 'matched' || detail.status === 'matched_with_new_alias') {
    logContent.push('Data comparison:');
    logContent.push(`- CSV name: ${detail.csvData.name}`);
    logContent.push(`- CSV org_level: ${detail.csvData.org_level}`);
    logContent.push(`- JSON org_level: ${detail.jsonData.org_level}`);
    logContent.push(`- CSV parent_agency: ${detail.csvData.parent_agency?.[0] || ''}`);
    logContent.push(`- JSON parent_agency: ${detail.jsonData.parent_agency?.[0] || ''}`);
    logContent.push(`- Source: ${detail.source}`);
  }
  
  if (detail.status === 'unmatched') {
    logContent.push(`Note: ${detail.message}`);
  }
});

// Write to log file
fs.writeFileSync(logPath, logContent.join('\n'));

console.log(`\nVerification complete. Results logged to: ${logPath}`);
console.log(`Total departments processed: ${results.total}`);
console.log(`Matched: ${results.matched}`);
console.log(`Potential new aliases: ${results.potentialAliases}`);
console.log(`Unmatched: ${results.unmatched}`); 