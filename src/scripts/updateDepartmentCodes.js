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
  return name.toLowerCase()
    .replace(/^california\s+/, '') // Remove 'California ' prefix
    .replace(/\s+department\s+of\s+/, ' ') // Normalize 'Department of '
    .replace(/department\s+/, '') // Remove 'Department'
    .replace(/the\s+/, '') // Remove 'The '
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Read departments data
let departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8'));

// Reset all department codes
console.log('Resetting all department codes...');
departmentsData.departments.forEach(dept => {
  delete dept.code;
});

// Manual mappings for departments that are hard to match automatically
// Format: department name -> budget code
const manualMappings = {
  'Energy Commission': '3360', // Energy Resources Conservation and Development Commission
  'Water Resources Control Board': '3940', // This might not be in budget files
  'Department of Toxic Substances Control': '3960', // This might not be in budget files
  'California Department of Social Services': '5180', // This might not be in budget files
  'California Department of Health Care Services': '4260', // State Department of Health Care Services
  'California Department of Transportation': '2660', // This might not be in budget files
  'California Environmental Protection Agency': '0555', // Secretary for Environmental Protection
  'California Department of Human Resources': '7501', // This might not be in budget files
  'California Department of General Services': '7760', // This might not be in budget files
  'California Highway Patrol': '2720', // This might not be in budget files
  'Department of Motor Vehicles': '2740', // This might not be in budget files
  'Secretary of Business, Consumer Services and Housing': '0515', // Secretary for Business, Consumer Services, and Housing Agency
  'Secretary of Transportation': '0521', // Secretary for Transportation Agency
  'Secretary of Health and Human Services': '0530' // Secretary for California Health and Human Services Agency
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
  if (!budgetDocsMap[file.code] || year > budgetDocsMap[file.code].year) {
    budgetDocsMap[file.code] = {
      code: file.code,
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
      normalizedName.replace(/\s+&\s+/, ' and ')
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

// Match departments to budget codes
let updatedCount = 0;
let codesAssigned = {};

departmentsData.departments.forEach(dept => {
  // First, check manual mappings
  if (manualMappings[dept.name]) {
    const code = manualMappings[dept.name];
    dept.code = code;
    updatedCount++;
    codesAssigned[code] = true;
    console.log(`✓ Assigned code ${code} to "${dept.name}" (manual mapping)`);
    return;
  }
  
  // Normalize department names for matching
  const normalizedName = normalizeForMatching(dept.name);
  const normalizedCanonical = normalizeForMatching(dept.canonicalName || '');
  let matched = false;
  
  // Direct match with normalized name
  if (normalizedBudgetDeptNames[normalizedName]) {
    const code = normalizedBudgetDeptNames[normalizedName];
    dept.code = code;
    updatedCount++;
    codesAssigned[code] = true;
    console.log(`✓ Assigned code ${code} to "${dept.name}" (direct match)`);
    matched = true;
  } 
  // Match with canonical name
  else if (normalizedCanonical && normalizedBudgetDeptNames[normalizedCanonical]) {
    const code = normalizedBudgetDeptNames[normalizedCanonical];
    dept.code = code;
    updatedCount++;
    codesAssigned[code] = true;
    console.log(`✓ Assigned code ${code} to "${dept.name}" (canonical match)`);
    matched = true;
  }
  
  // If no direct match, try partial matching
  if (!matched) {
    // Try finding the budget name that contains our department name
    for (const [budgetName, code] of Object.entries(normalizedBudgetDeptNames)) {
      if (
        (budgetName.includes(normalizedName) && normalizedName.length > 5) ||
        (normalizedCanonical && budgetName.includes(normalizedCanonical) && normalizedCanonical.length > 5)
      ) {
        dept.code = code;
        updatedCount++;
        codesAssigned[code] = true;
        console.log(`✓ Assigned code ${code} to "${dept.name}" (partial match)`);
        matched = true;
        break;
      }
    }
  }
  
  // Try the reverse - department name containing budget name
  if (!matched) {
    for (const [budgetName, code] of Object.entries(normalizedBudgetDeptNames)) {
      if (
        (normalizedName.includes(budgetName) && budgetName.length > 5) ||
        (normalizedCanonical && normalizedCanonical.includes(budgetName) && budgetName.length > 5)
      ) {
        dept.code = code;
        updatedCount++;
        codesAssigned[code] = true;
        console.log(`✓ Assigned code ${code} to "${dept.name}" (reverse partial match)`);
        matched = true;
        break;
      }
    }
  }
  
  // Try matching using the code in the slug if it exists
  if (!matched && dept.slug) {
    const slugParts = dept.slug.split('_');
    if (slugParts.length > 0 && /^\d+$/.test(slugParts[0])) {
      const slugCode = slugParts[0];
      if (budgetDocsMap[slugCode]) {
        dept.code = slugCode;
        updatedCount++;
        codesAssigned[slugCode] = true;
        console.log(`✓ Assigned code ${slugCode} to "${dept.name}" (slug match)`);
        matched = true;
      }
    }
  }
  
  if (!matched) {
    console.log(`✗ No code found for "${dept.name}"`);
  }
});

// Report on unused codes
const unusedCodes = Object.keys(budgetDocsMap).filter(code => !codesAssigned[code]);
if (unusedCodes.length > 0) {
  console.log(`\n${unusedCodes.length} budget codes not assigned to any department:`);
  unusedCodes.forEach(code => {
    const docName = extractDepartmentNameFromBudgetFile(budgetDocsMap[code].filename);
    console.log(`- Code ${code}: "${docName}"`);
  });
}

// Write the updated departments data
fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
console.log(`\nUpdated ${updatedCount} departments with budget codes`);
console.log(`Saved updated data to ${DEPARTMENTS_JSON_PATH}`); 