#!/usr/bin/env node

/**
 * Update Department Hierarchy Script
 * 
 * Purpose:
 * - Identifies duplicate departments in the hierarchy using fuzzy matching
 * - Presents options for which department record to keep
 * - Logs all matches and decisions for review
 * - Tracks data sources and similarity scores for each match
 * - Provides detailed analysis of each potential duplicate
 * - Generates report of all duplicates found and decisions made
 * - Interactive decision making for each duplicate group
 * 
 * Output format for each duplicate:
 * Department 1:
 *   Name: 
 *   Abbreviation:
 *   Code:
 *   Entity:
 *   Slug:
 *   Canonical Name:
 *   Aliases:
 *   Organization Level:
 *   Parent Agency:
 *   Budget Status:
 *   _note:
 *   Similar Score:
 * 
 * Department 2:
 *   [Same fields as above]
 * 
 * Steps:
 * 1. Initial Setup
 *    a. Load departments.json
 *    b. Setup logging
 *    c. Initialize results tracking
 * 
 * 2. Duplicate Detection
 *    a. Compare each department against all others
 *    b. Calculate similarity scores using fuzzy matching
 *    c. Track potential duplicates with high similarity
 *    d. Group related duplicates together
 * 
 * 3. Analysis & Decision Making
 *    a. Present each duplicate group
 *    b. Show comparison and recommendations
 *    c. Prompt for decision
 *    d. Apply and log decisions
 * 
 * 4. Final Report
 *    a. Generate summary of decisions
 *    b. Create detailed log entries
 *    c. Output results
 * 
 * Usage:
 * ```bash
 * node update_hierarchy.js
 * ```
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
const LOG_DIR = path.join(PROJECT_ROOT, 'src/logs');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

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

// Setup logging
const setupLogging = () => {
  const logFile = path.join(LOG_DIR, generateTimestampedFilename(__filename));
  
  const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    fs.appendFileSync(logFile, `${logMessage}\n`);
    
    // Also output to console without timestamp for readability
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  };
  
  return { logFile, log };
};

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

// Function to find duplicate departments
function findDuplicates(departments, log) {
  const duplicates = [];
  const processed = new Set();

  log('Starting duplicate detection...');

  for (let i = 0; i < departments.length; i++) {
    const dept1 = departments[i];
    const dept1Key = `${dept1.canonicalName}|${dept1.code || ''}`;
    
    if (processed.has(dept1Key)) continue;
    processed.add(dept1Key);

    const matches = [];
    
    for (let j = i + 1; j < departments.length; j++) {
      const dept2 = departments[j];
      const dept2Key = `${dept2.canonicalName}|${dept2.code || ''}`;
      
      if (processed.has(dept2Key)) continue;

      const similarity = calculateSimilarity(dept1.canonicalName, dept2.canonicalName);
      
      // Check for high similarity or matching codes/abbreviations
      if (similarity > 0.8 || 
          (dept1.code && dept2.code && dept1.code === dept2.code) ||
          (dept1.abbreviation && dept2.abbreviation && dept1.abbreviation === dept2.abbreviation)) {
        
        matches.push({
          department: dept2,
          similarity,
          reason: similarity > 0.8 ? 'name similarity' : 
                  dept1.code === dept2.code ? 'matching code' : 'matching abbreviation'
        });
        
        processed.add(dept2Key);
      }
    }

    if (matches.length > 0) {
      duplicates.push({
        original: dept1,
        matches: matches
      });
    }
  }

  return duplicates;
}

// Function to format department details for display
function formatDepartmentDetails(dept, index) {
  return `
Department ${index}:
  Name: ${dept.canonicalName}
  Abbreviation: ${dept.abbreviation || 'N/A'}
  Code: ${dept.code || 'N/A'}
  Entity: ${dept.entity || 'N/A'}
  Slug: ${dept.slug || 'N/A'}
  Canonical Name: ${dept.canonicalName}
  Aliases: ${(dept.aliases || []).join(', ') || 'N/A'}
  Organization Level: ${dept.org_level || 'N/A'}
  Parent Agency: ${dept.parent_agency || 'N/A'}
  Budget Status: ${dept.budget_status || 'N/A'}
  _note: ${dept._note || 'N/A'}`;
}

// Function to analyze and get recommendation for a duplicate group
function analyzeGroup(group) {
  const original = group.original;
  const recommendations = [];
  
  group.matches.forEach((match, index) => {
    const dept1Score = calculateCompletenessScore(original);
    const dept2Score = calculateCompletenessScore(match.department);
    
    recommendations.push({
      index,
      dept1Score,
      dept2Score,
      recommendation: dept1Score > dept2Score ? 
        `Keep "${original.canonicalName}" (more complete data, score: ${dept1Score})` :
        dept2Score > dept1Score ?
          `Keep "${match.department.canonicalName}" (more complete data, score: ${dept2Score})` :
          `Either could be kept (equal completeness, scores: ${dept1Score})`
    });
  });
  
  return recommendations;
}

// Helper function to calculate completeness score of department data
function calculateCompletenessScore(dept) {
  let score = 0;
  if (dept.canonicalName) score += 1;
  if (dept.code) score += 1;
  if (dept.abbreviation) score += 1;
  if (dept.entity) score += 1;
  if (dept.slug) score += 1;
  if (Array.isArray(dept.aliases) && dept.aliases.length > 0) score += 1;
  if (dept.org_level) score += 1;
  if (dept.parent_agency) score += 1;
  if (dept.budget_status) score += 1;
  return score;
}

// Function to handle user decision for a duplicate group
async function handleDuplicateDecision(group, log, departments) {
  console.log('\nOriginal Department:');
  console.log(formatDepartmentDetails(group.original, 1));
  
  // Get recommendations first
  const recommendations = analyzeGroup(group);
  
  for (let i = 0; i < group.matches.length; i++) {
    const match = group.matches[i];
    const recommendation = recommendations[i];
    
    console.log(`\nDuplicate ${i + 1} (Similarity: ${match.similarity.toFixed(2)}, Reason: ${match.reason})`);
    console.log(formatDepartmentDetails(match.department, 2));
    
    console.log('\nAnalysis:');
    console.log(`Original Score: ${recommendation.dept1Score}`);
    console.log(`Duplicate Score: ${recommendation.dept2Score}`);
    console.log(`Recommendation: ${recommendation.recommendation}`);
    
    console.log('\nOptions:');
    console.log(`1. Keep Original: "${group.original.canonicalName}"`);
    console.log(`2. Keep Duplicate: "${match.department.canonicalName}"`);
    console.log('3. Keep Both (Do Nothing)');
    
    const answer = await question('Enter your choice (1/2/3): ');
    
    let decision;
    let toRemove;
    switch (answer.trim()) {
      case '1':
        decision = `Kept original: ${group.original.canonicalName}`;
        toRemove = match.department;
        break;
      case '2':
        decision = `Kept duplicate: ${match.department.canonicalName}`;
        toRemove = group.original;
        break;
      case '3':
        decision = 'Kept both records';
        toRemove = null;
        break;
      default:
        decision = 'Invalid choice - no action taken';
        toRemove = null;
    }
    
    // Remove the department if one was selected for removal
    if (toRemove) {
      const index = departments.findIndex(d => 
        d.canonicalName === toRemove.canonicalName && 
        d.slug === toRemove.slug
      );
      if (index !== -1) {
        departments.splice(index, 1);
        log(`Removed department: ${toRemove.canonicalName}`);
      }
    }
    
    // Log with timestamp and decision details
    log(`Decision for comparison ${i + 1}: ${decision} (Recommendation was: ${recommendation.recommendation})`);
  }
}

// Main execution
const main = async () => {
  let log;
  let logFile;
  let departmentsData;
  let results;
  
  try {
    // Step 1: Initial Setup
    const logging = setupLogging();
    log = logging.log;
    logFile = logging.logFile;
    log('\n=== STEP 1: INITIAL SETUP ===');
    
    // Step 1a: Load departments.json
    log('Step 1a: Loading departments.json...');
    departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8'));
    const departments = [...departmentsData.departments]; // Create a copy to modify
    log(`Successfully loaded departments.json with ${departments.length} departments`);
    
    // Step 1b: Setup logging
    log('Step 1b: Logging system initialized');
    log(`Log file created at: ${logFile}`);
    
    // Step 1c: Initialize results tracking
    log('Step 1c: Initializing results tracking...');
    results = {
      total: departments.length,
      duplicatesFound: 0,
      groupsFound: 0,
      decisions: [],
      removed: 0
    };
    
    // Step 2: Duplicate Detection
    log('\n=== STEP 2: DUPLICATE DETECTION ===');
    
    // Step 2a: Find duplicates
    log('Step 2a: Searching for duplicates...');
    const duplicates = findDuplicates(departments, log);
    results.duplicatesFound = duplicates.reduce((sum, group) => sum + group.matches.length, 0);
    results.groupsFound = duplicates.length;
    
    // Step 3: Interactive Decision Making
    log('\n=== STEP 3: INTERACTIVE DECISION MAKING ===');
    log(`Found ${results.duplicatesFound} potential duplicates in ${results.groupsFound} groups`);
    
    for (let i = 0; i < duplicates.length; i++) {
      const group = duplicates[i];
      console.log(`\n=== Duplicate Group ${i + 1} of ${duplicates.length} ===`);
      await handleDuplicateDecision(group, log, departments);
    }
    
    // Step 4: Save Updated Data
    log('\n=== STEP 4: SAVING UPDATED DATA ===');
    const removedCount = departmentsData.departments.length - departments.length;
    results.removed = removedCount;
    
    // Create backup of original file
    const backupPath = DEPARTMENTS_JSON_PATH + '.backup';
    fs.copyFileSync(DEPARTMENTS_JSON_PATH, backupPath);
    log(`Created backup at: ${backupPath}`);
    
    // Save updated departments
    const updatedData = {
      ...departmentsData,
      departments: departments
    };
    fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(updatedData, null, 2));
    log(`Saved updated departments.json with ${departments.length} departments`);
    
    // Step 5: Final Report
    log('\n=== STEP 5: FINAL REPORT ===');
    log('\nSummary:');
    log(`Total departments analyzed: ${results.total}`);
    log(`Duplicate groups processed: ${results.groupsFound}`);
    log(`Total duplicates reviewed: ${results.duplicatesFound}`);
    log(`Departments removed: ${results.removed}`);
    log(`Remaining departments: ${departments.length}`);
    log(`Original file backed up to: ${backupPath}`);
    log(`Detailed results written to: ${logFile}`);
    
    rl.close();
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    rl.close();
    process.exit(1);
  }
};

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  rl.close();
  process.exit(1);
}); 