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
const _question = (query) => new Promise((resolve) => rl.question(query, resolve));

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

// Function to validate department structure
function validateDepartment(dept) {
  const requiredFields = ['name', 'slug', 'canonicalName', 'aliases', 'budget_status'];
  const missingFields = requiredFields.filter(field => !dept.hasOwnProperty(field));
  
  if (missingFields.length > 0) {
    throw new Error(`Department ${dept.name || 'unknown'} is missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Validate types
  if (typeof dept.name !== 'string' || dept.name.trim() === '') {
    throw new Error(`Department has invalid name: ${dept.name}`);
  }
  if (typeof dept.slug !== 'string' || dept.slug.trim() === '') {
    throw new Error(`Department ${dept.name} has invalid slug: ${dept.slug}`);
  }
  if (typeof dept.canonicalName !== 'string' || dept.canonicalName.trim() === '') {
    throw new Error(`Department ${dept.name} has invalid canonicalName: ${dept.canonicalName}`);
  }
  if (!Array.isArray(dept.aliases)) {
    throw new Error(`Department ${dept.name} has invalid aliases: not an array`);
  }
  
  return true;
}

// Function to validate entire departments data
function validateDepartmentsData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid departments data: not an object');
  }
  
  const requiredKeys = ['departments', 'budgetSummary', 'revenueSources', 'totalRevenue'];
  const missingKeys = requiredKeys.filter(key => !data.hasOwnProperty(key));
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required top-level keys: ${missingKeys.join(', ')}`);
  }
  
  if (!Array.isArray(data.departments)) {
    throw new Error('Invalid departments data: departments is not an array');
  }
  
  // Validate each department
  data.departments.forEach((dept, index) => {
    try {
      validateDepartment(dept);
    } catch (error) {
      throw new Error(`Invalid department at index ${index}: ${error.message}`);
    }
  });
  
  return true;
}

// Function to safely save JSON with validation
async function _saveJsonSafely(filePath, data, log) {
  const backupPath = `${filePath}.backup`;
  
  try {
    // Step 1: Validate data before saving
    log('Validating departments data...');
    validateDepartmentsData(data);
    
    // Step 2: Create backup of current file
    log('Creating backup...');
    fs.copyFileSync(filePath, backupPath);
    
    // Step 3: Write new data to temporary file first
    const tempPath = `${filePath}.temp`;
    log('Writing to temporary file...');
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    
    // Step 4: Validate the written file can be parsed
    log('Validating written file...');
    const readBack = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
    validateDepartmentsData(readBack);
    
    // Step 5: Replace the original file
    log('Replacing original file...');
    fs.renameSync(tempPath, filePath);
    
    // Step 6: Final validation
    log('Performing final validation...');
    const finalCheck = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    validateDepartmentsData(finalCheck);
    
    // Verify department count hasn't changed unexpectedly
    const expectedRemoved = data.departments.length - readBack.departments.length;
    if (expectedRemoved !== 0) {
      throw new Error(`Unexpected change in department count. Expected ${data.departments.length}, got ${readBack.departments.length}`);
    }
    
    log('File saved successfully');
    return true;
  } catch (error) {
    // If anything goes wrong, restore from backup
    log(`Error saving file: ${error.message}`, 'error');
    if (fs.existsSync(backupPath)) {
      log('Restoring from backup...', 'warn');
      fs.copyFileSync(backupPath, filePath);
      log('Restored from backup', 'warn');
    }
    throw error;
  }
}

// Function to handle duplicate group analysis and logging
function handleDuplicateAnalysis(group, log) {
  log('\nOriginal Department:');
  log(formatDepartmentDetails(group.original, 1));
  
  // Get recommendations first
  const recommendations = analyzeGroup(group);
  
  for (let i = 0; i < group.matches.length; i++) {
    const match = group.matches[i];
    const recommendation = recommendations[i];
    
    log(`\nDuplicate ${i + 1} (Similarity: ${match.similarity.toFixed(2)}, Reason: ${match.reason})`);
    log(formatDepartmentDetails(match.department, 2));
    
    log('\nAnalysis:');
    log(`Original Score: ${recommendation.dept1Score}`);
    log(`Duplicate Score: ${recommendation.dept2Score}`);
    log(`Recommendation: ${recommendation.recommendation}`);
  }
}

// Canonical hierarchy structure
const CANONICAL_HIERARCHY = {
  name: 'California State Government',
  canonicalName: 'California State Government',
  slug: 'california_state_government',
  aliases: [],
  org_level: 0,
  budget_status: 'active',
  children: {
    'Executive Branch': {
      name: 'Executive Branch',
      canonicalName: 'Executive Branch',
      slug: 'executive_branch',
      aliases: [],
      org_level: 1,
      parent_agency: 'California State Government',
      budget_status: 'active',
      children: {
        'Governor\'s Office': {
          name: 'Governor\'s Office',
          canonicalName: 'Governor\'s Office',
          slug: 'governors_office',
          aliases: ['GOV'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Governor\'s Office of Business and Economic Development': {
          name: 'Governor\'s Office of Business and Economic Development',
          canonicalName: 'Governor\'s Office of Business and Economic Development',
          slug: 'governors_office_of_business_and_economic_development',
          aliases: ['Go-Biz'],
          org_level: 3,
          parent_agency: 'Governor\'s Office',
          budget_status: 'active',
          children: {}
        },
        'Governor\'s Office of Emergency Services': {
          name: 'Governor\'s Office of Emergency Services',
          canonicalName: 'Governor\'s Office of Emergency Services',
          slug: 'governors_office_of_emergency_services',
          aliases: ['Cal OES'],
          org_level: 3,
          parent_agency: 'Governor\'s Office',
          budget_status: 'active',
          children: {}
        },
        'Governor\'s Office of Planning and Research': {
          name: 'Governor\'s Office of Planning and Research',
          canonicalName: 'Governor\'s Office of Planning and Research',
          slug: 'governors_office_of_planning_and_research',
          aliases: ['OPR'],
          org_level: 3,
          parent_agency: 'Governor\'s Office',
          budget_status: 'active',
          children: {}
        },
        'State Council on Developmental Disabilities': {
          name: 'State Council on Developmental Disabilities',
          canonicalName: 'State Council on Developmental Disabilities',
          slug: 'state_council_on_developmental_disabilities',
          aliases: ['SCDD'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Board of Professional Engineers': {
          name: 'Board of Professional Engineers',
          canonicalName: 'Board of Professional Engineers',
          slug: 'board_of_professional_engineers',
          aliases: ['BPELS'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Board of Professional Land Surveyors': {
          name: 'Board of Professional Land Surveyors',
          canonicalName: 'Board of Professional Land Surveyors',
          slug: 'board_of_professional_land_surveyors',
          aliases: ['BPLS'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Commission on Peace Officer Standards and Training': {
          name: 'Commission on Peace Officer Standards and Training',
          canonicalName: 'Commission on Peace Officer Standards and Training',
          slug: 'commission_on_peace_officer_standards_and_training',
          aliases: ['POST'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Commission on Teacher Credentialing': {
          name: 'Commission on Teacher Credentialing',
          canonicalName: 'Commission on Teacher Credentialing',
          slug: 'commission_on_teacher_credentialing',
          aliases: ['CTC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of the Small Business Advocate': {
          name: 'Office of the Small Business Advocate',
          canonicalName: 'Office of the Small Business Advocate',
          slug: 'office_of_the_small_business_advocate',
          aliases: ['OSBA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Board of Vocational Nursing': {
          name: 'Board of Vocational Nursing',
          canonicalName: 'Board of Vocational Nursing',
          slug: 'board_of_vocational_nursing',
          aliases: ['BVN'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Board of Professional Fiduciaries': {
          name: 'Board of Professional Fiduciaries',
          canonicalName: 'Board of Professional Fiduciaries',
          slug: 'board_of_professional_fiduciaries',
          aliases: ['PFB'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Board of Vocational Nursing and Psychiatric Technicians': {
          name: 'Board of Vocational Nursing and Psychiatric Technicians',
          canonicalName: 'Board of Vocational Nursing and Psychiatric Technicians',
          slug: 'board_of_vocational_nursing_and_psychiatric_technicians',
          aliases: ['BVNPT'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Commission on Health and Safety and Workers Compensation': {
          name: 'Commission on Health and Safety and Workers Compensation',
          canonicalName: 'Commission on Health and Safety and Workers Compensation',
          slug: 'commission_on_health_and_safety_and_workers_compensation',
          aliases: ['CHSWC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Commission on Judicial Performance': {
          name: 'Commission on Judicial Performance',
          canonicalName: 'Commission on Judicial Performance',
          slug: 'commission_on_judicial_performance',
          aliases: ['CJP'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Commission on State Mandates': {
          name: 'Commission on State Mandates',
          canonicalName: 'Commission on State Mandates',
          slug: 'commission_on_state_mandates',
          aliases: ['COSM'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Commission on the Status of Women and Girls': {
          name: 'Commission on the Status of Women and Girls',
          canonicalName: 'Commission on the Status of Women and Girls',
          slug: 'commission_on_the_status_of_women_and_girls',
          aliases: ['CCSWG'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Fair Political Practices Commission': {
          name: 'Fair Political Practices Commission',
          canonicalName: 'Fair Political Practices Commission',
          slug: 'fair_political_practices_commission',
          aliases: ['FPPC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Little Hoover Commission': {
          name: 'Little Hoover Commission',
          canonicalName: 'Little Hoover Commission',
          slug: 'little_hoover_commission',
          aliases: ['LHC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Mental Health Services Oversight and Accountability Commission': {
          name: 'Mental Health Services Oversight and Accountability Commission',
          canonicalName: 'Mental Health Services Oversight and Accountability Commission',
          slug: 'mental_health_services_oversight_and_accountability_commission',
          aliases: ['MHSOAC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of Administrative Hearings': {
          name: 'Office of Administrative Hearings',
          canonicalName: 'Office of Administrative Hearings',
          slug: 'office_of_administrative_hearings',
          aliases: ['OAH'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of Administrative Law': {
          name: 'Office of Administrative Law',
          canonicalName: 'Office of Administrative Law',
          slug: 'office_of_administrative_law',
          aliases: ['OAL'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of Data and Innovation': {
          name: 'Office of Data and Innovation',
          canonicalName: 'Office of Data and Innovation',
          slug: 'office_of_data_and_innovation',
          aliases: ['ODI'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of Planning and Research': {
          name: 'Office of Planning and Research',
          canonicalName: 'Office of Planning and Research',
          slug: 'office_of_planning_and_research',
          aliases: ['OPR'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of State Fire Marshal': {
          name: 'Office of State Fire Marshal',
          canonicalName: 'Office of State Fire Marshal',
          slug: 'office_of_state_fire_marshal',
          aliases: ['OSFM'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of Systems Integration': {
          name: 'Office of Systems Integration',
          canonicalName: 'Office of Systems Integration',
          slug: 'office_of_systems_integration',
          aliases: ['OSI'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of Tax Appeals': {
          name: 'Office of Tax Appeals',
          canonicalName: 'Office of Tax Appeals',
          slug: 'office_of_tax_appeals',
          aliases: ['OTA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Office of the State Public Defender': {
          name: 'Office of the State Public Defender',
          canonicalName: 'Office of the State Public Defender',
          slug: 'office_of_the_state_public_defender',
          aliases: ['OSPD'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Seismic Safety Commission': {
          name: 'Seismic Safety Commission',
          canonicalName: 'Seismic Safety Commission',
          slug: 'seismic_safety_commission',
          aliases: ['SSC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'State Personnel Board': {
          name: 'State Personnel Board',
          canonicalName: 'State Personnel Board',
          slug: 'state_personnel_board',
          aliases: ['SPB'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Unemployment Insurance Appeals Board': {
          name: 'Unemployment Insurance Appeals Board',
          canonicalName: 'Unemployment Insurance Appeals Board',
          slug: 'unemployment_insurance_appeals_board',
          aliases: ['UIAB'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Workers Compensation Appeals Board': {
          name: 'Workers Compensation Appeals Board',
          canonicalName: 'Workers Compensation Appeals Board',
          slug: 'workers_compensation_appeals_board',
          aliases: ['WCAB'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Arts Council': {
          name: 'California Arts Council',
          canonicalName: 'California Arts Council',
          slug: 'california_arts_council',
          aliases: ['CAC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Citizens Redistricting Commission': {
          name: 'California Citizens Redistricting Commission',
          canonicalName: 'California Citizens Redistricting Commission',
          slug: 'california_citizens_redistricting_commission',
          aliases: ['CCRC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Coastal Commission': {
          name: 'California Coastal Commission',
          canonicalName: 'California Coastal Commission',
          slug: 'california_coastal_commission',
          aliases: ['CCC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Public Employment Relations Board': {
          name: 'California Public Employment Relations Board',
          canonicalName: 'California Public Employment Relations Board',
          slug: 'california_public_employment_relations_board',
          aliases: ['PERB'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Aging': {
          name: 'Department of Aging',
          canonicalName: 'Department of Aging',
          slug: 'department_of_aging',
          aliases: ['CDA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Alcoholic Beverage Control': {
          name: 'Department of Alcoholic Beverage Control',
          canonicalName: 'Department of Alcoholic Beverage Control',
          slug: 'department_of_alcoholic_beverage_control',
          aliases: ['ABC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Child Support Services': {
          name: 'Department of Child Support Services',
          canonicalName: 'Department of Child Support Services',
          slug: 'department_of_child_support_services',
          aliases: ['DCSS'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Community Services and Development': {
          name: 'Department of Community Services and Development',
          canonicalName: 'Department of Community Services and Development',
          slug: 'department_of_community_services_and_development',
          aliases: ['CSD'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Conservation': {
          name: 'Department of Conservation',
          canonicalName: 'Department of Conservation',
          slug: 'department_of_conservation',
          aliases: ['DOC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Consumer Affairs': {
          name: 'Department of Consumer Affairs',
          canonicalName: 'Department of Consumer Affairs',
          slug: 'department_of_consumer_affairs',
          aliases: ['DCA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Education': {
          name: 'Department of Education',
          canonicalName: 'Department of Education',
          slug: 'department_of_education',
          aliases: ['CDE'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Financial Protection and Innovation': {
          name: 'Department of Financial Protection and Innovation',
          canonicalName: 'Department of Financial Protection and Innovation',
          slug: 'department_of_financial_protection_and_innovation',
          aliases: ['DFPI'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Fish and Wildlife': {
          name: 'Department of Fish and Wildlife',
          canonicalName: 'Department of Fish and Wildlife',
          slug: 'department_of_fish_and_wildlife',
          aliases: ['CDFW'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Forestry and Fire Protection': {
          name: 'Department of Forestry and Fire Protection',
          canonicalName: 'Department of Forestry and Fire Protection',
          slug: 'department_of_forestry_and_fire_protection',
          aliases: ['CAL FIRE'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Health Care Access and Information': {
          name: 'Department of Health Care Access and Information',
          canonicalName: 'Department of Health Care Access and Information',
          slug: 'department_of_health_care_access_and_information',
          aliases: ['HCAI'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Housing and Community Development': {
          name: 'Department of Housing and Community Development',
          canonicalName: 'Department of Housing and Community Development',
          slug: 'department_of_housing_and_community_development',
          aliases: ['HCD'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Managed Health Care': {
          name: 'Department of Managed Health Care',
          canonicalName: 'Department of Managed Health Care',
          slug: 'department_of_managed_health_care',
          aliases: ['DMHC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Parks and Recreation': {
          name: 'Department of Parks and Recreation',
          canonicalName: 'Department of Parks and Recreation',
          slug: 'department_of_parks_and_recreation',
          aliases: ['Parks and Rec', 'State Parks'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Real Estate': {
          name: 'Department of Real Estate',
          canonicalName: 'Department of Real Estate',
          slug: 'department_of_real_estate',
          aliases: ['DRE'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Social Services': {
          name: 'Department of Social Services',
          canonicalName: 'Department of Social Services',
          slug: 'department_of_social_services',
          aliases: ['CDSS'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Alternative Energy and Advanced Transportation Financing Authority': {
          name: 'California Alternative Energy and Advanced Transportation Financing Authority',
          canonicalName: 'California Alternative Energy and Advanced Transportation Financing Authority',
          slug: 'california_alternative_energy_and_advanced_transportation_financing_authority',
          aliases: ['CAEATFA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Debt Limit Allocation Committee': {
          name: 'California Debt Limit Allocation Committee',
          canonicalName: 'California Debt Limit Allocation Committee',
          slug: 'california_debt_limit_allocation_committee',
          aliases: ['CDLAC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Educational Facilities Authority': {
          name: 'California Educational Facilities Authority',
          canonicalName: 'California Educational Facilities Authority',
          slug: 'california_educational_facilities_authority',
          aliases: ['CEFA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Health Facilities Financing Authority': {
          name: 'California Health Facilities Financing Authority',
          canonicalName: 'California Health Facilities Financing Authority',
          slug: 'california_health_facilities_financing_authority',
          aliases: ['CHFFA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Housing Finance Agency': {
          name: 'California Housing Finance Agency',
          canonicalName: 'California Housing Finance Agency',
          slug: 'california_housing_finance_agency',
          aliases: ['CalHFA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Pollution Control Financing Authority': {
          name: 'California Pollution Control Financing Authority',
          canonicalName: 'California Pollution Control Financing Authority',
          slug: 'california_pollution_control_financing_authority',
          aliases: ['CPCFA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California School Finance Authority': {
          name: 'California School Finance Authority',
          canonicalName: 'California School Finance Authority',
          slug: 'california_school_finance_authority',
          aliases: ['CSFA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Tax Credit Allocation Committee': {
          name: 'California Tax Credit Allocation Committee',
          canonicalName: 'California Tax Credit Allocation Committee',
          slug: 'california_tax_credit_allocation_committee',
          aliases: ['CTCAC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Transportation Financing Authority': {
          name: 'California Transportation Financing Authority',
          canonicalName: 'California Transportation Financing Authority',
          slug: 'california_transportation_financing_authority',
          aliases: ['CTFA'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'State Compensation Insurance Fund': {
          name: 'State Compensation Insurance Fund',
          canonicalName: 'State Compensation Insurance Fund',
          slug: 'state_compensation_insurance_fund',
          aliases: ['State Fund'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California Public Employees Retirement System': {
          name: 'California Public Employees Retirement System',
          canonicalName: 'California Public Employees Retirement System',
          slug: 'california_public_employees_retirement_system',
          aliases: ['CalPERS'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'California State Teachers Retirement System': {
          name: 'California State Teachers Retirement System',
          canonicalName: 'California State Teachers Retirement System',
          slug: 'california_state_teachers_retirement_system',
          aliases: ['CalSTRS'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Public Health': {
          name: 'Department of Public Health',
          canonicalName: 'Department of Public Health',
          slug: 'department_of_public_health',
          aliases: ['CDPH'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Cannabis Control': {
          name: 'Department of Cannabis Control',
          canonicalName: 'Department of Cannabis Control',
          slug: 'department_of_cannabis_control',
          aliases: ['DCC'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Fair Employment and Housing': {
          name: 'Department of Fair Employment and Housing',
          canonicalName: 'Department of Fair Employment and Housing',
          slug: 'department_of_fair_employment_and_housing',
          aliases: ['DFEH'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Health Care Services': {
          name: 'Department of Health Care Services',
          canonicalName: 'Department of Health Care Services',
          slug: 'department_of_health_care_services',
          aliases: ['DHCS'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        },
        'Department of Industrial Relations': {
          name: 'Department of Industrial Relations',
          canonicalName: 'Department of Industrial Relations',
          slug: 'department_of_industrial_relations',
          aliases: ['DIR'],
          org_level: 2,
          parent_agency: 'Executive Branch',
          budget_status: 'active',
          children: {}
        }
      }
    },
    'Government Operations Agency': {
      name: 'Government Operations Agency',
      canonicalName: 'Government Operations Agency',
      slug: 'government_operations_agency',
      aliases: ['CalGovOps'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {
        'Department of General Services': {
          name: 'Department of General Services',
          canonicalName: 'Department of General Services',
          slug: 'department_of_general_services',
          aliases: ['DGS'],
          org_level: 3,
          parent_agency: 'Government Operations Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Human Resources': {
          name: 'Department of Human Resources',
          canonicalName: 'Department of Human Resources',
          slug: 'department_of_human_resources',
          aliases: ['CalHR'],
          org_level: 3,
          parent_agency: 'Government Operations Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Technology': {
          name: 'Department of Technology',
          canonicalName: 'Department of Technology',
          slug: 'department_of_technology',
          aliases: ['CDT'],
          org_level: 3,
          parent_agency: 'Government Operations Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Tax and Fee Administration': {
          name: 'Department of Tax and Fee Administration',
          canonicalName: 'Department of Tax and Fee Administration',
          slug: 'department_of_tax_and_fee_administration',
          aliases: ['CDTFA'],
          org_level: 3,
          parent_agency: 'Government Operations Agency',
          budget_status: 'active',
          children: {}
        },
        'Office of Administrative Law': {
          name: 'Office of Administrative Law',
          canonicalName: 'Office of Administrative Law',
          slug: 'office_of_administrative_law',
          aliases: ['OAL'],
          org_level: 3,
          parent_agency: 'Government Operations Agency',
          budget_status: 'active',
          children: {}
        },
        'Office of Administrative Hearings': {
          name: 'Office of Administrative Hearings',
          canonicalName: 'Office of Administrative Hearings',
          slug: 'office_of_administrative_hearings',
          aliases: ['OAH'],
          org_level: 3,
          parent_agency: 'Government Operations Agency',
          budget_status: 'active',
          children: {}
        },
        'Office of Data and Innovation': {
          name: 'Office of Data and Innovation',
          canonicalName: 'Office of Data and Innovation',
          slug: 'office_of_data_and_innovation',
          aliases: ['ODI'],
          org_level: 3,
          parent_agency: 'Government Operations Agency',
          budget_status: 'active',
          children: {}
        },
        'Office of Systems Integration': {
          name: 'Office of Systems Integration',
          canonicalName: 'Office of Systems Integration',
          slug: 'office_of_systems_integration',
          aliases: ['OSI'],
          org_level: 3,
          parent_agency: 'Government Operations Agency',
          budget_status: 'active',
          children: {}
        }
      }
    },
    'Business, Consumer Services and Housing Agency': {
      name: 'Business, Consumer Services and Housing Agency',
      canonicalName: 'Business, Consumer Services and Housing Agency',
      slug: 'business_consumer_services_and_housing_agency',
      aliases: ['BCSH'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {
        'Department of Consumer Affairs': {
          name: 'Department of Consumer Affairs',
          canonicalName: 'Department of Consumer Affairs',
          slug: 'department_of_consumer_affairs',
          aliases: ['DCA'],
          org_level: 3,
          parent_agency: 'Business, Consumer Services and Housing Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Housing and Community Development': {
          name: 'Department of Housing and Community Development',
          canonicalName: 'Department of Housing and Community Development',
          slug: 'department_of_housing_and_community_development',
          aliases: ['HCD'],
          org_level: 3,
          parent_agency: 'Business, Consumer Services and Housing Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Real Estate': {
          name: 'Department of Real Estate',
          canonicalName: 'Department of Real Estate',
          slug: 'department_of_real_estate',
          aliases: ['DRE'],
          org_level: 3,
          parent_agency: 'Business, Consumer Services and Housing Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Financial Protection and Innovation': {
          name: 'Department of Financial Protection and Innovation',
          canonicalName: 'Department of Financial Protection and Innovation',
          slug: 'department_of_financial_protection_and_innovation',
          aliases: ['DFPI'],
          org_level: 3,
          parent_agency: 'Business, Consumer Services and Housing Agency',
          budget_status: 'active',
          children: {}
        },
        'Housing Finance Agency': {
          name: 'Housing Finance Agency',
          canonicalName: 'Housing Finance Agency',
          slug: 'housing_finance_agency',
          aliases: ['CalHFA'],
          org_level: 3,
          parent_agency: 'Business, Consumer Services and Housing Agency',
          budget_status: 'active',
          children: {}
        }
      }
    },
    'California Environmental Protection Agency': {
      name: 'California Environmental Protection Agency',
      canonicalName: 'California Environmental Protection Agency',
      slug: 'california_environmental_protection_agency',
      aliases: ['CalEPA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {
        'Air Resources Board': {
          name: 'Air Resources Board',
          canonicalName: 'Air Resources Board',
          slug: 'air_resources_board',
          aliases: ['ARB'],
          org_level: 3,
          parent_agency: 'California Environmental Protection Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Pesticide Regulation': {
          name: 'Department of Pesticide Regulation',
          canonicalName: 'Department of Pesticide Regulation',
          slug: 'department_of_pesticide_regulation',
          aliases: ['DPR'],
          org_level: 3,
          parent_agency: 'California Environmental Protection Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Toxic Substances Control': {
          name: 'Department of Toxic Substances Control',
          canonicalName: 'Department of Toxic Substances Control',
          slug: 'department_of_toxic_substances_control',
          aliases: ['DTSC'],
          org_level: 3,
          parent_agency: 'California Environmental Protection Agency',
          budget_status: 'active',
          children: {}
        },
        'State Water Resources Control Board': {
          name: 'State Water Resources Control Board',
          canonicalName: 'State Water Resources Control Board',
          slug: 'state_water_resources_control_board',
          aliases: ['SWRCB'],
          org_level: 3,
          parent_agency: 'California Environmental Protection Agency',
          budget_status: 'active',
          children: {}
        },
        'Office of Environmental Health Hazard Assessment': {
          name: 'Office of Environmental Health Hazard Assessment',
          canonicalName: 'Office of Environmental Health Hazard Assessment',
          slug: 'office_of_environmental_health_hazard_assessment',
          aliases: ['OEHHA'],
          org_level: 3,
          parent_agency: 'California Environmental Protection Agency',
          budget_status: 'active',
          children: {}
        },
        'California Environmental Protection Agency': {
          name: 'California Environmental Protection Agency',
          canonicalName: 'California Environmental Protection Agency',
          slug: 'california_environmental_protection_agency',
          aliases: ['CalEPA'],
          org_level: 3,
          parent_agency: 'California Environmental Protection Agency',
          budget_status: 'active',
          children: {}
        }
      }
    },
    'California Health and Human Services Agency': {
      name: 'California Health and Human Services Agency',
      canonicalName: 'California Health and Human Services Agency',
      slug: 'california_health_and_human_services_agency',
      aliases: ['CHHS'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {
        'Department of Health Care Services': {
          name: 'Department of Health Care Services',
          canonicalName: 'Department of Health Care Services',
          slug: 'department_of_health_care_services',
          aliases: ['DHCS'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Public Health': {
          name: 'Department of Public Health',
          canonicalName: 'Department of Public Health',
          slug: 'department_of_public_health',
          aliases: ['CDPH'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Social Services': {
          name: 'Department of Social Services',
          canonicalName: 'Department of Social Services',
          slug: 'department_of_social_services',
          aliases: ['CDSS'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Aging': {
          name: 'Department of Aging',
          canonicalName: 'Department of Aging',
          slug: 'department_of_aging',
          aliases: ['CDA'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Developmental Services': {
          name: 'Department of Developmental Services',
          canonicalName: 'Department of Developmental Services',
          slug: 'department_of_developmental_services',
          aliases: ['DDS'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Rehabilitation': {
          name: 'Department of Rehabilitation',
          canonicalName: 'Department of Rehabilitation',
          slug: 'department_of_rehabilitation',
          aliases: ['DOR'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of State Hospitals': {
          name: 'Department of State Hospitals',
          canonicalName: 'Department of State Hospitals',
          slug: 'department_of_state_hospitals',
          aliases: ['DSH'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Emergency Medical Services Authority': {
          name: 'Emergency Medical Services Authority',
          canonicalName: 'Emergency Medical Services Authority',
          slug: 'emergency_medical_services_authority',
          aliases: ['EMSA'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Health Care Access and Information': {
          name: 'Health Care Access and Information',
          canonicalName: 'Health Care Access and Information',
          slug: 'health_care_access_and_information',
          aliases: ['HCAI'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        },
        'Managed Health Care': {
          name: 'Managed Health Care',
          canonicalName: 'Managed Health Care',
          slug: 'managed_health_care',
          aliases: ['DMHC'],
          org_level: 3,
          parent_agency: 'California Health and Human Services Agency',
          budget_status: 'active',
          children: {}
        }
      }
    },
    'California Natural Resources Agency': {
      name: 'California Natural Resources Agency',
      canonicalName: 'California Natural Resources Agency',
      slug: 'california_natural_resources_agency',
      aliases: ['Resources'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {
        'Department of Conservation': {
          name: 'Department of Conservation',
          canonicalName: 'Department of Conservation',
          slug: 'department_of_conservation',
          aliases: ['DOC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Fish and Wildlife': {
          name: 'Department of Fish and Wildlife',
          canonicalName: 'Department of Fish and Wildlife',
          slug: 'department_of_fish_and_wildlife',
          aliases: ['CDFW'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Forestry and Fire Protection': {
          name: 'Department of Forestry and Fire Protection',
          canonicalName: 'Department of Forestry and Fire Protection',
          slug: 'department_of_forestry_and_fire_protection',
          aliases: ['CAL FIRE'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Parks and Recreation': {
          name: 'Department of Parks and Recreation',
          canonicalName: 'Department of Parks and Recreation',
          slug: 'department_of_parks_and_recreation',
          aliases: ['State Parks'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Water Resources': {
          name: 'Department of Water Resources',
          canonicalName: 'Department of Water Resources',
          slug: 'department_of_water_resources',
          aliases: ['DWR'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'California Coastal Commission': {
          name: 'California Coastal Commission',
          canonicalName: 'California Coastal Commission',
          slug: 'california_coastal_commission',
          aliases: ['CCC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'California Coastal Conservancy': {
          name: 'California Coastal Conservancy',
          canonicalName: 'California Coastal Conservancy',
          slug: 'california_coastal_conservancy',
          aliases: ['SCC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'California Conservation Corps': {
          name: 'California Conservation Corps',
          canonicalName: 'California Conservation Corps',
          slug: 'california_conservation_corps',
          aliases: ['CCC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'California Energy Commission': {
          name: 'California Energy Commission',
          canonicalName: 'California Energy Commission',
          slug: 'california_energy_commission',
          aliases: ['CEC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'California State Lands Commission': {
          name: 'California State Lands Commission',
          canonicalName: 'California State Lands Commission',
          slug: 'california_state_lands_commission',
          aliases: ['SLC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'California Tahoe Conservancy': {
          name: 'California Tahoe Conservancy',
          canonicalName: 'California Tahoe Conservancy',
          slug: 'california_tahoe_conservancy',
          aliases: ['CTC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'Delta Stewardship Council': {
          name: 'Delta Stewardship Council',
          canonicalName: 'Delta Stewardship Council',
          slug: 'delta_stewardship_council',
          aliases: ['DSC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'Ocean Protection Council': {
          name: 'Ocean Protection Council',
          canonicalName: 'Ocean Protection Council',
          slug: 'ocean_protection_council',
          aliases: ['OPC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'San Francisco Bay Conservation and Development Commission': {
          name: 'San Francisco Bay Conservation and Development Commission',
          canonicalName: 'San Francisco Bay Conservation and Development Commission',
          slug: 'san_francisco_bay_conservation_and_development_commission',
          aliases: ['BCDC'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        },
        'Wildlife Conservation Board': {
          name: 'Wildlife Conservation Board',
          canonicalName: 'Wildlife Conservation Board',
          slug: 'wildlife_conservation_board',
          aliases: ['WCB'],
          org_level: 3,
          parent_agency: 'California Natural Resources Agency',
          budget_status: 'active',
          children: {}
        }
      }
    },
    'California State Transportation Agency': {
      name: 'California State Transportation Agency',
      canonicalName: 'California State Transportation Agency',
      slug: 'california_state_transportation_agency',
      aliases: ['CalSTA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {
        'Department of Motor Vehicles': {
          name: 'Department of Motor Vehicles',
          canonicalName: 'Department of Motor Vehicles',
          slug: 'department_of_motor_vehicles',
          aliases: ['DMV'],
          org_level: 3,
          parent_agency: 'California State Transportation Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Transportation': {
          name: 'Department of Transportation',
          canonicalName: 'Department of Transportation',
          slug: 'department_of_transportation',
          aliases: ['Caltrans'],
          org_level: 3,
          parent_agency: 'California State Transportation Agency',
          budget_status: 'active',
          children: {}
        },
        'Highway Patrol': {
          name: 'Highway Patrol',
          canonicalName: 'Highway Patrol',
          slug: 'highway_patrol',
          aliases: ['CHP'],
          org_level: 3,
          parent_agency: 'California State Transportation Agency',
          budget_status: 'active',
          children: {}
        },
        'California High-Speed Rail Authority': {
          name: 'California High-Speed Rail Authority',
          canonicalName: 'California High-Speed Rail Authority',
          slug: 'california_high_speed_rail_authority',
          aliases: ['CHSRA'],
          org_level: 3,
          parent_agency: 'California State Transportation Agency',
          budget_status: 'active',
          children: {}
        },
        'California Transportation Commission': {
          name: 'California Transportation Commission',
          canonicalName: 'California Transportation Commission',
          slug: 'california_transportation_commission',
          aliases: ['CTC'],
          org_level: 3,
          parent_agency: 'California State Transportation Agency',
          budget_status: 'active',
          children: {}
        }
      }
    },
    'Labor and Workforce Development Agency': {
      name: 'Labor and Workforce Development Agency',
      canonicalName: 'Labor and Workforce Development Agency',
      slug: 'labor_and_workforce_development_agency',
      aliases: ['LWDA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {
        'Employment Development Department': {
          name: 'Employment Development Department',
          canonicalName: 'Employment Development Department',
          slug: 'employment_development_department',
          aliases: ['EDD'],
          org_level: 3,
          parent_agency: 'Labor and Workforce Development Agency',
          budget_status: 'active',
          children: {}
        },
        'Department of Industrial Relations': {
          name: 'Department of Industrial Relations',
          canonicalName: 'Department of Industrial Relations',
          slug: 'department_of_industrial_relations',
          aliases: ['DIR'],
          org_level: 3,
          parent_agency: 'Labor and Workforce Development Agency',
          budget_status: 'active',
          children: {}
        },
        'California Workforce Development Board': {
          name: 'California Workforce Development Board',
          canonicalName: 'California Workforce Development Board',
          slug: 'california_workforce_development_board',
          aliases: ['CWDB'],
          org_level: 3,
          parent_agency: 'Labor and Workforce Development Agency',
          budget_status: 'active',
          children: {}
        },
        'Employment Training Panel': {
          name: 'Employment Training Panel',
          canonicalName: 'Employment Training Panel',
          slug: 'employment_training_panel',
          aliases: ['ETP'],
          org_level: 3,
          parent_agency: 'Labor and Workforce Development Agency',
          budget_status: 'active',
          children: {}
        }
      }
    },
    'Department of Corrections and Rehabilitation': {
      name: 'Department of Corrections and Rehabilitation',
      canonicalName: 'Department of Corrections and Rehabilitation',
      slug: 'department_of_corrections_and_rehabilitation',
      aliases: ['CDCR'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Finance': {
      name: 'Department of Finance',
      canonicalName: 'Department of Finance',
      slug: 'department_of_finance',
      aliases: ['DOF'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Veterans Affairs': {
      name: 'Department of Veterans Affairs',
      canonicalName: 'Department of Veterans Affairs',
      slug: 'department_of_veterans_affairs',
      aliases: ['CalVet'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Food and Agriculture': {
      name: 'Department of Food and Agriculture',
      canonicalName: 'Department of Food and Agriculture',
      slug: 'department_of_food_and_agriculture',
      aliases: ['CDFA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Justice': {
      name: 'Department of Justice',
      canonicalName: 'Department of Justice',
      slug: 'department_of_justice',
      aliases: ['DOJ'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Insurance': {
      name: 'Department of Insurance',
      canonicalName: 'Department of Insurance',
      slug: 'department_of_insurance',
      aliases: ['CDI'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Military Department': {
      name: 'Military Department',
      canonicalName: 'Military Department',
      slug: 'military_department',
      aliases: ['Calguard'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Cannabis Control': {
      name: 'Department of Cannabis Control',
      canonicalName: 'Department of Cannabis Control',
      slug: 'department_of_cannabis_control',
      aliases: ['DCC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Privacy Protection Agency': {
      name: 'California Privacy Protection Agency',
      canonicalName: 'California Privacy Protection Agency',
      slug: 'california_privacy_protection_agency',
      aliases: ['CPPA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Cannabis Control Appeals Panel': {
      name: 'Cannabis Control Appeals Panel',
      canonicalName: 'Cannabis Control Appeals Panel',
      slug: 'cannabis_control_appeals_panel',
      aliases: ['CCAP'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Center for Data Insights and Innovation': {
      name: 'Center for Data Insights and Innovation',
      canonicalName: 'Center for Data Insights and Innovation',
      slug: 'center_for_data_insights_and_innovation',
      aliases: ['CDII'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Central Valley Flood Protection Board': {
      name: 'Central Valley Flood Protection Board',
      canonicalName: 'Central Valley Flood Protection Board',
      slug: 'central_valley_flood_protection_board',
      aliases: ['CVFPB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Civil Rights Department': {
      name: 'Civil Rights Department',
      canonicalName: 'Civil Rights Department',
      slug: 'civil_rights_department',
      aliases: ['CRD'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Colorado River Board of California': {
      name: 'Colorado River Board of California',
      canonicalName: 'Colorado River Board of California',
      slug: 'colorado_river_board_of_california',
      aliases: ['CRB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Commission on Health and Safety and Workers Compensation': {
      name: 'Commission on Health and Safety and Workers Compensation',
      canonicalName: 'Commission on Health and Safety and Workers Compensation',
      slug: 'commission_on_health_and_safety_and_workers_compensation',
      aliases: ['CHSWC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Health Benefit Exchange': {
      name: 'California Health Benefit Exchange',
      canonicalName: 'California Health Benefit Exchange',
      slug: 'california_health_benefit_exchange',
      aliases: ['Covered California'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Health Facilities Financing Authority': {
      name: 'California Health Facilities Financing Authority',
      canonicalName: 'California Health Facilities Financing Authority',
      slug: 'california_health_facilities_financing_authority',
      aliases: ['CHFFA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Horse Racing Board': {
      name: 'California Horse Racing Board',
      canonicalName: 'California Horse Racing Board',
      slug: 'california_horse_racing_board',
      aliases: ['CHRB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Independent Living Council': {
      name: 'California Independent Living Council',
      canonicalName: 'California Independent Living Council',
      slug: 'california_independent_living_council',
      aliases: ['SILC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Infrastructure and Economic Development Bank': {
      name: 'California Infrastructure and Economic Development Bank',
      canonicalName: 'California Infrastructure and Economic Development Bank',
      slug: 'california_infrastructure_and_economic_development_bank',
      aliases: ['IBank'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Law Revision Commission': {
      name: 'California Law Revision Commission',
      canonicalName: 'California Law Revision Commission',
      slug: 'california_law_revision_commission',
      aliases: ['CLRC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California State Library': {
      name: 'California State Library',
      canonicalName: 'California State Library',
      slug: 'california_state_library',
      aliases: ['CSL'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California State Lottery': {
      name: 'California State Lottery',
      canonicalName: 'California State Lottery',
      slug: 'california_state_lottery',
      aliases: ['CSL'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Student Aid Commission': {
      name: 'California Student Aid Commission',
      canonicalName: 'California Student Aid Commission',
      slug: 'california_student_aid_commission',
      aliases: ['CSAC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Native American Heritage Commission': {
      name: 'Native American Heritage Commission',
      canonicalName: 'Native American Heritage Commission',
      slug: 'native_american_heritage_commission',
      aliases: ['NAHC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Office of Energy Infrastructure Safety': {
      name: 'Office of Energy Infrastructure Safety',
      canonicalName: 'Office of Energy Infrastructure Safety',
      slug: 'office_of_energy_infrastructure_safety',
      aliases: ['OEIS'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Office of the Inspector General': {
      name: 'Office of the Inspector General',
      canonicalName: 'Office of the Inspector General',
      slug: 'office_of_the_inspector_general',
      aliases: ['OIG'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Office of the Patient Advocate': {
      name: 'Office of the Patient Advocate',
      canonicalName: 'Office of the Patient Advocate',
      slug: 'office_of_the_patient_advocate',
      aliases: ['OPA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Office of Traffic Safety': {
      name: 'Office of Traffic Safety',
      canonicalName: 'Office of Traffic Safety',
      slug: 'office_of_traffic_safety',
      aliases: ['OTS'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Accountancy': {
      name: 'Board of Accountancy',
      canonicalName: 'Board of Accountancy',
      slug: 'board_of_accountancy',
      aliases: ['CBA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Acupuncture Board': {
      name: 'Acupuncture Board',
      canonicalName: 'Acupuncture Board',
      slug: 'acupuncture_board',
      aliases: ['CAB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Agricultural Labor Relations Board': {
      name: 'Agricultural Labor Relations Board',
      canonicalName: 'Agricultural Labor Relations Board',
      slug: 'agricultural_labor_relations_board',
      aliases: ['ALRB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Air Resources Board': {
      name: 'Air Resources Board',
      canonicalName: 'Air Resources Board',
      slug: 'air_resources_board',
      aliases: ['CARB', 'ARB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Barbering and Cosmetology': {
      name: 'Board of Barbering and Cosmetology',
      canonicalName: 'Board of Barbering and Cosmetology',
      slug: 'board_of_barbering_and_cosmetology',
      aliases: ['BBC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Behavioral Sciences': {
      name: 'Board of Behavioral Sciences',
      canonicalName: 'Board of Behavioral Sciences',
      slug: 'board_of_behavioral_sciences',
      aliases: ['BBS'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Building Standards Commission': {
      name: 'California Building Standards Commission',
      canonicalName: 'California Building Standards Commission',
      slug: 'california_building_standards_commission',
      aliases: ['CBSC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Bureau for Private Postsecondary Education': {
      name: 'Bureau for Private Postsecondary Education',
      canonicalName: 'Bureau for Private Postsecondary Education',
      slug: 'bureau_for_private_postsecondary_education',
      aliases: ['BPPE'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on Aging': {
      name: 'California Commission on Aging',
      canonicalName: 'California Commission on Aging',
      slug: 'california_commission_on_aging',
      aliases: ['CCoA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California State Athletic Commission': {
      name: 'California State Athletic Commission',
      canonicalName: 'California State Athletic Commission',
      slug: 'california_state_athletic_commission',
      aliases: ['CSAC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Baldwin Hills Conservancy': {
      name: 'Baldwin Hills Conservancy',
      canonicalName: 'Baldwin Hills Conservancy',
      slug: 'baldwin_hills_conservancy',
      aliases: ['BHC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Coachella Valley Mountains Conservancy': {
      name: 'Coachella Valley Mountains Conservancy',
      canonicalName: 'Coachella Valley Mountains Conservancy',
      slug: 'coachella_valley_mountains_conservancy',
      aliases: ['CVMC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Chiropractic Examiners': {
      name: 'Board of Chiropractic Examiners',
      canonicalName: 'Board of Chiropractic Examiners',
      slug: 'board_of_chiropractic_examiners',
      aliases: ['BCE'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Contractors State License Board': {
      name: 'Contractors State License Board',
      canonicalName: 'Contractors State License Board',
      slug: 'contractors_state_license_board',
      aliases: ['CSLB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Court Reporters Board': {
      name: 'Court Reporters Board',
      canonicalName: 'Court Reporters Board',
      slug: 'court_reporters_board',
      aliases: ['CRB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Dental Board of California': {
      name: 'Dental Board of California',
      canonicalName: 'Dental Board of California',
      slug: 'dental_board_of_california',
      aliases: ['DBC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Dental Hygiene Board of California': {
      name: 'Dental Hygiene Board of California',
      canonicalName: 'Dental Hygiene Board of California',
      slug: 'dental_hygiene_board_of_california',
      aliases: ['DHBC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Education': {
      name: 'Board of Education',
      canonicalName: 'Board of Education',
      slug: 'board_of_education',
      aliases: ['SBE'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Guide Dogs for the Blind': {
      name: 'Board of Guide Dogs for the Blind',
      canonicalName: 'Board of Guide Dogs for the Blind',
      slug: 'board_of_guide_dogs_for_the_blind',
      aliases: ['BGDB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Occupational Therapy': {
      name: 'Board of Occupational Therapy',
      canonicalName: 'Board of Occupational Therapy',
      slug: 'board_of_occupational_therapy',
      aliases: ['BOT'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Optometry': {
      name: 'Board of Optometry',
      canonicalName: 'Board of Optometry',
      slug: 'board_of_optometry',
      aliases: ['CSBO'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Pharmacy': {
      name: 'Board of Pharmacy',
      canonicalName: 'Board of Pharmacy',
      slug: 'board_of_pharmacy',
      aliases: ['BOP'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Physical Therapy Board': {
      name: 'Physical Therapy Board',
      canonicalName: 'Physical Therapy Board',
      slug: 'physical_therapy_board',
      aliases: ['PTB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Physician Assistant Board': {
      name: 'Physician Assistant Board',
      canonicalName: 'Physician Assistant Board',
      slug: 'physician_assistant_board',
      aliases: ['PAB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Podiatric Medicine': {
      name: 'Board of Podiatric Medicine',
      canonicalName: 'Board of Podiatric Medicine',
      slug: 'board_of_podiatric_medicine',
      aliases: ['BPM'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Professional Engineers, Land Surveyors, and Geologists': {
      name: 'Board of Professional Engineers, Land Surveyors, and Geologists',
      canonicalName: 'Board of Professional Engineers, Land Surveyors, and Geologists',
      slug: 'board_of_professional_engineers_land_surveyors_and_geologists',
      aliases: ['BPELSG'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Psychology': {
      name: 'Board of Psychology',
      canonicalName: 'Board of Psychology',
      slug: 'board_of_psychology',
      aliases: ['BOP'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Registered Nursing': {
      name: 'Board of Registered Nursing',
      canonicalName: 'Board of Registered Nursing',
      slug: 'board_of_registered_nursing',
      aliases: ['BRN'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Respiratory Care Board': {
      name: 'Respiratory Care Board',
      canonicalName: 'Respiratory Care Board',
      slug: 'respiratory_care_board',
      aliases: ['RCB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Speech-Language Pathology and Audiology and Hearing Aid Dispensers Board': {
      name: 'Speech-Language Pathology and Audiology and Hearing Aid Dispensers Board',
      canonicalName: 'Speech-Language Pathology and Audiology and Hearing Aid Dispensers Board',
      slug: 'speech_language_pathology_and_audiology_and_hearing_aid_dispensers_board',
      aliases: ['SLPAHADB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Structural Pest Control Board': {
      name: 'Structural Pest Control Board',
      canonicalName: 'Structural Pest Control Board',
      slug: 'structural_pest_control_board',
      aliases: ['SPCB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Veterinary Medical Board': {
      name: 'Veterinary Medical Board',
      canonicalName: 'Veterinary Medical Board',
      slug: 'veterinary_medical_board',
      aliases: ['VMB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Medical Board of California': {
      name: 'Medical Board of California',
      canonicalName: 'Medical Board of California',
      slug: 'medical_board_of_california',
      aliases: ['MBC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Vocational Nursing': {
      name: 'Board of Vocational Nursing',
      canonicalName: 'Board of Vocational Nursing',
      slug: 'board_of_vocational_nursing',
      aliases: ['BVN'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Osteopathic Medical Board': {
      name: 'Osteopathic Medical Board',
      canonicalName: 'Osteopathic Medical Board',
      slug: 'osteopathic_medical_board',
      aliases: ['OMB'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Sacramento-San Joaquin Delta Conservancy': {
      name: 'Sacramento-San Joaquin Delta Conservancy',
      canonicalName: 'Sacramento-San Joaquin Delta Conservancy',
      slug: 'sacramento_san_joaquin_delta_conservancy',
      aliases: ['SSJDC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'San Diego River Conservancy': {
      name: 'San Diego River Conservancy',
      canonicalName: 'San Diego River Conservancy',
      slug: 'san_diego_river_conservancy',
      aliases: ['SDRC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'San Gabriel and Lower Los Angeles Rivers and Mountains Conservancy': {
      name: 'San Gabriel and Lower Los Angeles Rivers and Mountains Conservancy',
      canonicalName: 'San Gabriel and Lower Los Angeles Rivers and Mountains Conservancy',
      slug: 'san_gabriel_and_lower_los_angeles_rivers_and_mountains_conservancy',
      aliases: ['RMC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Santa Monica Mountains Conservancy': {
      name: 'Santa Monica Mountains Conservancy',
      canonicalName: 'Santa Monica Mountains Conservancy',
      slug: 'santa_monica_mountains_conservancy',
      aliases: ['SMMC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Sierra Nevada Conservancy': {
      name: 'Sierra Nevada Conservancy',
      canonicalName: 'Sierra Nevada Conservancy',
      slug: 'sierra_nevada_conservancy',
      aliases: ['SNC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Commission on Peace Officer Standards and Training': {
      name: 'Commission on Peace Officer Standards and Training',
      canonicalName: 'Commission on Peace Officer Standards and Training',
      slug: 'commission_on_peace_officer_standards_and_training',
      aliases: ['POST'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Commission on Teacher Credentialing': {
      name: 'Commission on Teacher Credentialing',
      canonicalName: 'Commission on Teacher Credentialing',
      slug: 'commission_on_teacher_credentialing',
      aliases: ['CTC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Fair Political Practices Commission': {
      name: 'Fair Political Practices Commission',
      canonicalName: 'Fair Political Practices Commission',
      slug: 'fair_political_practices_commission',
      aliases: ['FPPC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Office of Environmental Health Hazard Assessment': {
      name: 'Office of Environmental Health Hazard Assessment',
      canonicalName: 'Office of Environmental Health Hazard Assessment',
      slug: 'office_of_environmental_health_hazard_assessment',
      aliases: ['OEHHA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Office of the State Public Defender': {
      name: 'Office of the State Public Defender',
      canonicalName: 'Office of the State Public Defender',
      slug: 'office_of_the_state_public_defender',
      aliases: ['OSPD'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'State Council on Developmental Disabilities': {
      name: 'State Council on Developmental Disabilities',
      canonicalName: 'State Council on Developmental Disabilities',
      slug: 'state_council_on_developmental_disabilities',
      aliases: ['SCDD'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Board of Professional Fiduciaries': {
      name: 'Board of Professional Fiduciaries',
      canonicalName: 'Board of Professional Fiduciaries',
      slug: 'board_of_professional_fiduciaries',
      aliases: ['BPF'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on Disability Access': {
      name: 'California Commission on Disability Access',
      canonicalName: 'California Commission on Disability Access',
      slug: 'california_commission_on_disability_access',
      aliases: ['CCDA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on the Status of Women and Girls': {
      name: 'California Commission on the Status of Women and Girls',
      canonicalName: 'California Commission on the Status of Women and Girls',
      slug: 'california_commission_on_the_status_of_women_and_girls',
      aliases: ['CCSWG'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Office of Administrative Hearings': {
      name: 'Office of Administrative Hearings',
      canonicalName: 'Office of Administrative Hearings',
      slug: 'office_of_administrative_hearings',
      aliases: ['OAH'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Office of the Small Business Advocate': {
      name: 'Office of the Small Business Advocate',
      canonicalName: 'Office of the Small Business Advocate',
      slug: 'office_of_the_small_business_advocate',
      aliases: ['OSBA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on Aging': {
      name: 'California Commission on Aging',
      canonicalName: 'California Commission on Aging',
      slug: 'california_commission_on_aging',
      aliases: ['CCoA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on Asian and Pacific Islander American Affairs': {
      name: 'California Commission on Asian and Pacific Islander American Affairs',
      canonicalName: 'California Commission on Asian and Pacific Islander American Affairs',
      slug: 'california_commission_on_asian_and_pacific_islander_american_affairs',
      aliases: ['CCAPIA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on Hispanic Affairs': {
      name: 'California Commission on Hispanic Affairs',
      canonicalName: 'California Commission on Hispanic Affairs',
      slug: 'california_commission_on_hispanic_affairs',
      aliases: ['CCHA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on Indian Affairs': {
      name: 'California Commission on Indian Affairs',
      canonicalName: 'California Commission on Indian Affairs',
      slug: 'california_commission_on_indian_affairs',
      aliases: ['CCIA'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on the Status of Women and Girls': {
      name: 'California Commission on the Status of Women and Girls',
      canonicalName: 'California Commission on the Status of Women and Girls',
      slug: 'california_commission_on_the_status_of_women_and_girls',
      aliases: ['CCSWG'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'California Commission on Uniform State Laws': {
      name: 'California Commission on Uniform State Laws',
      canonicalName: 'California Commission on Uniform State Laws',
      slug: 'california_commission_on_uniform_state_laws',
      aliases: ['CCUSL'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Public Health': {
      name: 'Department of Public Health',
      canonicalName: 'Department of Public Health',
      slug: 'department_of_public_health',
      aliases: ['CDPH'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Cannabis Control': {
      name: 'Department of Cannabis Control',
      canonicalName: 'Department of Cannabis Control',
      slug: 'department_of_cannabis_control',
      aliases: ['DCC'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Fair Employment and Housing': {
      name: 'Department of Fair Employment and Housing',
      canonicalName: 'Department of Fair Employment and Housing',
      slug: 'department_of_fair_employment_and_housing',
      aliases: ['DFEH'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Health Care Services': {
      name: 'Department of Health Care Services',
      canonicalName: 'Department of Health Care Services',
      slug: 'department_of_health_care_services',
      aliases: ['DHCS'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    },
    'Department of Industrial Relations': {
      name: 'Department of Industrial Relations',
      canonicalName: 'Department of Industrial Relations',
      slug: 'department_of_industrial_relations',
      aliases: ['DIR'],
      org_level: 2,
      parent_agency: 'Executive Branch',
      budget_status: 'active',
      children: {}
    }
  },
  'Constitutional Officers': {
    name: 'Constitutional Officers',
    canonicalName: 'Constitutional Officers',
    slug: 'constitutional_officers',
    aliases: [],
    org_level: 1,
    parent_agency: 'California State Government',
    budget_status: 'active',
    children: {
      'Lieutenant Governor': {
        name: 'Lieutenant Governor',
        canonicalName: 'Lieutenant Governor',
        slug: 'lieutenant_governor',
        aliases: [],
        org_level: 2,
        parent_agency: 'Constitutional Officers',
        budget_status: 'active',
        children: {}
      },
      'Secretary of State': {
        name: 'Secretary of State',
        canonicalName: 'Secretary of State',
        slug: 'secretary_of_state',
        aliases: [],
        org_level: 2,
        parent_agency: 'Constitutional Officers',
        budget_status: 'active',
        children: {}
      },
      'Attorney General': {
        name: 'Attorney General',
        canonicalName: 'Attorney General',
        slug: 'attorney_general',
        aliases: [],
        org_level: 2,
        parent_agency: 'Constitutional Officers',
        budget_status: 'active',
        _note: 'leads the Department of Justice',
        children: {}
      },
      'Treasurer': {
        name: 'Treasurer',
        canonicalName: 'Treasurer',
        slug: 'treasurer',
        aliases: [],
        org_level: 2,
        parent_agency: 'Constitutional Officers',
        budget_status: 'active',
        children: {}
      },
      'Controller': {
        name: 'Controller',
        canonicalName: 'Controller',
        slug: 'controller',
        aliases: [],
        org_level: 2,
        parent_agency: 'Constitutional Officers',
        budget_status: 'active',
        children: {}
      },
      'Superintendent of Public Instruction': {
        name: 'Superintendent of Public Instruction',
        canonicalName: 'Superintendent of Public Instruction',
        slug: 'superintendent_of_public_instruction',
        aliases: [],
        org_level: 2,
        parent_agency: 'Constitutional Officers',
        budget_status: 'active',
        children: {}
      },
      'Insurance Commissioner': {
        name: 'Insurance Commissioner',
        canonicalName: 'Insurance Commissioner',
        slug: 'insurance_commissioner',
        aliases: [],
        org_level: 2,
        parent_agency: 'Constitutional Officers',
        budget_status: 'active',
        _note: 'leads the Department of Insurance',
        children: {}
      }
    }
  },
  'Judicial Branch': {
    name: 'Judicial Branch',
    canonicalName: 'Judicial Branch',
    slug: '0250_judicial_branch',
    aliases: ['judicial branch'],
    org_level: 1,
    parent_agency: 'California State Government',
    budget_status: 'active',
    children: {
      'California Supreme Court': {
        name: 'California Supreme Court',
        canonicalName: 'California Supreme Court',
        slug: 'california_supreme_court',
        aliases: ['Supreme Court', 'California Supreme Court'],
        org_level: 2,
        parent_agency: 'Judicial Branch',
        budget_status: 'active',
        _note: 'highest court',
        children: {}
      },
      'California Courts of Appeal': {
        name: 'California Courts of Appeal',
        canonicalName: 'California Courts of Appeal',
        slug: 'california_courts_of_appeal',
        aliases: ['Courts of Appeal', 'California Courts of Appeal'],
        org_level: 2,
        parent_agency: 'Judicial Branch',
        budget_status: 'active',
        _note: 'intermediate appellate courts',
        children: {}
      },
      'California Superior Courts': {
        name: 'California Superior Courts',
        canonicalName: 'California Superior Courts',
        slug: 'california_superior_courts',
        aliases: ['Superior Courts', 'California Superior Courts'],
        org_level: 2,
        parent_agency: 'Judicial Branch',
        budget_status: 'active',
        _note: 'primary trial courts',
        children: {
          'Alameda County Superior Court': {
            name: 'Alameda County Superior Court',
            canonicalName: 'Alameda County Superior Court',
            slug: 'alameda_county_superior_court',
            aliases: ['alameda county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Glenn County Superior Court': {
            name: 'Glenn County Superior Court',
            canonicalName: 'Glenn County Superior Court',
            slug: 'glenn_county_superior_court',
            aliases: ['glenn county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Imperial County Superior Court': {
            name: 'Imperial County Superior Court',
            canonicalName: 'Imperial County Superior Court',
            slug: 'imperial_county_superior_court',
            aliases: ['imperial county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Lake County Superior Court': {
            name: 'Lake County Superior Court',
            canonicalName: 'Lake County Superior Court',
            slug: 'lake_county_superior_court',
            aliases: ['lake county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Los Angeles County Superior Court': {
            name: 'Los Angeles County Superior Court',
            canonicalName: 'Los Angeles County Superior Court',
            slug: 'los_angeles_county_superior_court',
            aliases: ['los angeles county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Madera County Superior Court': {
            name: 'Madera County Superior Court',
            canonicalName: 'Madera County Superior Court',
            slug: 'madera_county_superior_court',
            aliases: ['madera county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Mariposa County Superior Court': {
            name: 'Mariposa County Superior Court',
            canonicalName: 'Mariposa County Superior Court',
            slug: 'mariposa_county_superior_court',
            aliases: ['mariposa county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Merced County Superior Court': {
            name: 'Merced County Superior Court',
            canonicalName: 'Merced County Superior Court',
            slug: 'merced_county_superior_court',
            aliases: ['merced county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Modoc County Superior Court': {
            name: 'Modoc County Superior Court',
            canonicalName: 'Modoc County Superior Court',
            slug: 'modoc_county_superior_court',
            aliases: ['modoc county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Monterey County Superior Court': {
            name: 'Monterey County Superior Court',
            canonicalName: 'Monterey County Superior Court',
            slug: 'monterey_county_superior_court',
            aliases: ['monterey county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Orange County Superior Court': {
            name: 'Orange County Superior Court',
            canonicalName: 'Orange County Superior Court',
            slug: 'orange_county_superior_court',
            aliases: ['orange county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Placer County Superior Court': {
            name: 'Placer County Superior Court',
            canonicalName: 'Placer County Superior Court',
            slug: 'placer_county_superior_court',
            aliases: ['placer county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Riverside County Superior Court': {
            name: 'Riverside County Superior Court',
            canonicalName: 'Riverside County Superior Court',
            slug: 'riverside_county_superior_court',
            aliases: ['riverside county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Sacramento County Superior Court': {
            name: 'Sacramento County Superior Court',
            canonicalName: 'Sacramento County Superior Court',
            slug: 'sacramento_county_superior_court',
            aliases: ['sacramento county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Sonoma County Superior Court': {
            name: 'Sonoma County Superior Court',
            canonicalName: 'Sonoma County Superior Court',
            slug: 'sonoma_county_superior_court',
            aliases: ['sonoma county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Stanislaus County Superior Court': {
            name: 'Stanislaus County Superior Court',
            canonicalName: 'Stanislaus County Superior Court',
            slug: 'stanislaus_county_superior_court',
            aliases: ['stanislaus county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Tulare County Superior Court': {
            name: 'Tulare County Superior Court',
            canonicalName: 'Tulare County Superior Court',
            slug: 'tulare_county_superior_court',
            aliases: ['tulare county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          },
          'Ventura County Superior Court': {
            name: 'Ventura County Superior Court',
            canonicalName: 'Ventura County Superior Court',
            slug: 'ventura_county_superior_court',
            aliases: ['ventura county superior court'],
            org_level: 3,
            parent_agency: 'California Superior Courts',
            budget_status: 'active',
            children: {}
          }
        }
      }
    }
  },
  'Legislative Branch': {
    name: 'Legislative Branch',
    canonicalName: 'Legislative Branch',
    slug: 'legislative_branch',
    aliases: ['legislative branch'],
    org_level: 1,
    parent_agency: 'California State Government',
    budget_status: 'active',
    children: {
      'Senate': {
        name: 'Senate',
        canonicalName: 'Senate',
        slug: 'senate',
        aliases: ['California State Senate'],
        org_level: 2,
        parent_agency: 'Legislative Branch',
        budget_status: 'active',
        children: {}
      },
      'Assembly': {
        name: 'Assembly',
        canonicalName: 'Assembly',
        slug: 'assembly',
        aliases: ['California State Assembly'],
        org_level: 2,
        parent_agency: 'Legislative Branch',
        budget_status: 'active',
        children: {}
      },
      'Law Revision Commission': {
        name: 'Law Revision Commission',
        canonicalName: 'Law Revision Commission',
        slug: 'law_revision_commission',
        aliases: ['law revision commission', 'law revision', 'commission law revision'],
        org_level: 3,
        parent_agency: 'Legislative Branch',
        budget_status: 'active',
        children: {}
      },
      'Little Hoover Commission': {
        name: 'Little Hoover Commission',
        canonicalName: 'Little Hoover Commission',
        slug: 'little_hoover_commission',
        aliases: ['little hoover commission', 'little hoover', 'commission little hoover'],
        org_level: 3,
        parent_agency: 'Legislative Branch',
        budget_status: 'active',
        children: {}
      }
    }
  }
};

// Function to get canonical parent for a department
function _getCanonicalParent(deptName) {
  function searchInHierarchy(node, targetName, parentName = null) {
    if (node.hasOwnProperty(targetName)) {
      return parentName;
    }
    
    for (const [childName, childNode] of Object.entries(node)) {
      if (childNode.children) {
        const result = searchInHierarchy(childNode.children, targetName, childName);
        if (result) return result;
      }
    }
    return null;
  }
  
  return searchInHierarchy(CANONICAL_HIERARCHY, deptName);
}

// Function to compare current hierarchy with canonical
function _compareWithCanonical(departments, log) {
  log('\n=== COMPARING WITH CANONICAL HIERARCHY ===');
  const differences = {
    missingDepartments: [],
    wrongParent: [],
    extraDepartments: []
  };
  
  // Check for missing or wrong parent departments
  function getAllCanonicalDepts(node, path = []) {
    const depts = [];
    for (const [name, child] of Object.entries(node)) {
      depts.push({
        name,
        path: [...path, name],
        parent: path[path.length - 1] || 'California State Government'
      });
      if (child.children) {
        depts.push(...getAllCanonicalDepts(child.children, [...path, name]));
      }
    }
    return depts;
  }
  
  const canonicalDepts = getAllCanonicalDepts(CANONICAL_HIERARCHY);
  const currentDepts = new Set(departments.map(d => d.canonicalName));
  
  // Check for missing departments and wrong parents
  canonicalDepts.forEach(({ name, parent }) => {
    if (!currentDepts.has(name)) {
      differences.missingDepartments.push({ name, expectedParent: parent });
    } else {
      const dept = departments.find(d => d.canonicalName === name);
      const currentParent = dept.parent_agency || 'California State Government';
      if (currentParent !== parent) {
        differences.wrongParent.push({
          name,
          currentParent,
          expectedParent: parent
        });
      }
    }
  });
  
  // Check for extra departments
  const canonicalNames = new Set(canonicalDepts.map(d => d.name));
  departments.forEach(dept => {
    if (!canonicalNames.has(dept.canonicalName)) {
      differences.extraDepartments.push({
        name: dept.canonicalName,
        currentParent: dept.parent_agency || 'California State Government'
      });
    }
  });
  
  // Log differences
  log('\nMissing Departments:');
  if (differences.missingDepartments.length === 0) {
    log('None');
  } else {
    differences.missingDepartments.forEach(({ name, expectedParent }) => {
      log(`- ${name} (should be under: ${expectedParent})`);
    });
  }
  
  log('\nWrong Parent Assignments:');
  if (differences.wrongParent.length === 0) {
    log('None');
  } else {
    differences.wrongParent.forEach(({ name, currentParent, expectedParent }) => {
      log(`- ${name}:`);
      log(`  Current: ${currentParent}`);
      log(`  Expected: ${expectedParent}`);
    });
  }
  
  log('\nExtra Departments:');
  if (differences.extraDepartments.length === 0) {
    log('None');
  } else {
    differences.extraDepartments.forEach(({ name, currentParent }) => {
      log(`- ${name} (currently under: ${currentParent})`);
    });
  }
  
  return differences;
}

// Function to load and parse departments.json
async function loadDepartmentsJson() {
  try {
    const data = await fs.promises.readFile(DEPARTMENTS_JSON_PATH, 'utf8');
    return JSON.parse(data).departments;
  } catch (error) {
    throw new Error(`Failed to load departments.json: ${error.message}`);
  }
}

// Function to extract all departments from the hierarchy object
function extractDepartmentsFromHierarchy(hierarchy, departments = new Map()) {
  for (const [dept] of Object.entries(hierarchy)) {
    if (dept.canonicalName) {
      departments.set(dept.canonicalName, dept);
    }
    if (dept.children) {
      extractDepartmentsFromHierarchy(dept.children, departments);
    }
  }
  return departments;
}

// Function to show differences between objects
function showDiff(original, updated, log) {
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
}

// Function to compare JSON records with script records
async function compareJsonWithScript(scriptHierarchy, log) {
  const jsonDepartments = await loadDepartmentsJson();
  const scriptDepartments = extractDepartmentsFromHierarchy(scriptHierarchy);
  const missingDepartments = [];
  const existingDepartments = new Map();

  log('Starting comparison between JSON and script records...');

  // First, identify missing departments
  for (const jsonDept of jsonDepartments) {
    if (!scriptDepartments.has(jsonDept.canonicalName)) {
      log(`Found department in JSON but not in script: ${jsonDept.canonicalName}`);
      missingDepartments.push({
        name: jsonDept.name,
        canonicalName: jsonDept.canonicalName,
        slug: jsonDept.slug,
        aliases: jsonDept.aliases || [],
        org_level: jsonDept.orgLevel || 2,
        parent_agency: jsonDept.parent_agency || 'Executive Branch',
        budget_status: 'inactive',
        children: {}
      });
    } else {
      existingDepartments.set(jsonDept.canonicalName, jsonDept);
    }
  }

  // Show summary of missing departments
  if (missingDepartments.length > 0) {
    log(`\nFound ${missingDepartments.length} departments in JSON that are not in the script:`);
    missingDepartments.forEach(dept => {
      log(`- ${dept.canonicalName}`);
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nWould you like to add these missing departments? (y/n): ', resolve);
    });
    
    if (answer.toLowerCase() !== 'y') {
      log('Skipping addition of missing departments');
      missingDepartments.length = 0;
    }
  }

  // Now check existing departments for updates
  for (const [canonicalName, jsonDept] of existingDepartments) {
    const scriptDept = scriptDepartments.get(canonicalName);
    if (!scriptDept) continue;

    // Create updated version preserving all JSON values
    const updatedDept = {
      ...jsonDept, // Preserve all existing JSON values
      // Only update specific fields from script
      name: scriptDept.name,
      canonicalName: scriptDept.canonicalName,
      parent_agency: scriptDept.parent_agency,
      org_level: scriptDept.org_level,
      // Only update slug if it's null or empty in script
      slug: scriptDept.slug || jsonDept.slug,
      // Merge aliases from both sources
      aliases: [...new Set([...(scriptDept.aliases || []), ...(jsonDept.aliases || [])])]
    };

    // Show differences
    showDiff(jsonDept, updatedDept, log);
    
    const answer = await new Promise(resolve => {
      rl.question(`\nWould you like to update ${canonicalName}? (y/n): `, resolve);
    });
    
    if (answer.toLowerCase() === 'y') {
      // Update the department in the hierarchy
      updateDepartmentInHierarchy(scriptHierarchy, updatedDept);
      log(`Updated ${canonicalName}`);
    } else {
      log(`Skipped update for ${canonicalName}`);
    }
  }

  return missingDepartments;
}

// Function to update a department in the hierarchy
function updateDepartmentInHierarchy(hierarchy, department) {
  // Find the department in the hierarchy
  function findAndUpdate(node, targetName) {
    for (const [child] of Object.entries(node)) {
      if (child.canonicalName === targetName) {
        // Update the department
        Object.assign(child, department);
        return true;
      }
      if (child.children) {
        if (findAndUpdate(child.children, targetName)) {
          return true;
        }
      }
    }
    return false;
  }

  findAndUpdate(hierarchy, department.canonicalName);
}

// Function to add missing departments to hierarchy
function addMissingDepartments(hierarchy, missingDepts) {
  for (const dept of missingDepts) {
    const parentAgency = dept.parent_agency;
    if (!hierarchy[parentAgency]) {
      hierarchy[parentAgency] = {
        name: parentAgency,
        canonicalName: parentAgency,
        slug: parentAgency.toLowerCase().replace(/\s+/g, '_'),
        aliases: [],
        org_level: dept.org_level - 1,
        parent_agency: 'California State Government',
        budget_status: 'active',
        children: {}
      };
    }
    hierarchy[parentAgency].children[dept.canonicalName] = dept;
  }
  return hierarchy;
}

// Main execution
const main = async () => {
  const { log } = setupLogging();
  
  try {
    // Load the hierarchy
    const hierarchy = {
      'California State Government': {
        name: 'California State Government',
        canonicalName: 'California State Government',
        slug: 'california_state_government',
        aliases: ['california state government', 'state government'],
        org_level: 0,
        parent_agency: '',
        budget_status: 'active',
        children: {
          // ... existing hierarchy ...
        }
      }
    };

    // Compare with JSON and get missing departments
    const missingDepartments = await compareJsonWithScript(hierarchy, log);
    
    if (missingDepartments.length > 0) {
      log(`Found ${missingDepartments.length} departments in JSON that are not in the script`);
      // Add missing departments to hierarchy
      addMissingDepartments(hierarchy, missingDepartments);
      log('Added missing departments to hierarchy with inactive status');
    } else {
      log('No missing departments found');
    }

    // Find and handle duplicates
    const duplicates = findDuplicates(Object.values(hierarchy), log);
    if (duplicates.length > 0) {
      log(`Found ${duplicates.length} potential duplicate groups`);
      for (const group of duplicates) {
        await handleDuplicateAnalysis(group, log);
      }
    }

    // Save updated hierarchy
    await saveJsonSafely(DEPARTMENTS_JSON_PATH, { departments: Object.values(hierarchy) }, log);
    log('Successfully updated department hierarchy');

  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  rl.close();
  process.exit(1);
}); 