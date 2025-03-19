#!/usr/bin/env node

/**
 * This script updates the aliases field in departments.json based on 
 * budget document filenames in the src/data/budget_docs/text directory.
 * It extracts department names from budget files and adds them as aliases
 * if they differ from the canonical name.
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

// Helper function to generate variations of a name
function generateNameVariations(name) {
  const variations = new Set();
  
  // Add the original name
  variations.add(name);
  
  // Add version with "California" prefix if not present
  if (!name.toLowerCase().startsWith('california')) {
    variations.add(`California ${name}`);
  }
  
  // Add version with "Department of" if applicable
  if (!name.toLowerCase().includes('department of') && 
      !name.toLowerCase().includes('commission') && 
      !name.toLowerCase().includes('board') && 
      !name.toLowerCase().includes('office') && 
      !name.toLowerCase().includes('agency')) {
    variations.add(`Department of ${name}`);
    variations.add(`California Department of ${name}`);
  }
  
  // Handle "and" vs "&" variations
  if (name.includes(' and ')) {
    variations.add(name.replace(' and ', ' & '));
  }
  if (name.includes(' & ')) {
    variations.add(name.replace(' & ', ' and '));
  }
  
  return Array.from(variations);
}

// Read departments data
let departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8'));

// Get all budget doc filenames and extract department names
const budgetFiles = fs.readdirSync(BUDGET_DOCS_DIR)
  .filter(filename => filename.endsWith('_budget.txt'));

console.log(`Found ${budgetFiles.length} budget documents`);

// Create a map of normalized names to original names from budget files
const budgetDeptNames = new Map();
budgetFiles.forEach(filename => {
  const deptName = extractDepartmentNameFromBudgetFile(filename);
  if (deptName) {
    const normalizedName = normalizeForMatching(deptName);
    budgetDeptNames.set(normalizedName, deptName);
  }
});

// Update aliases for each department
let updatedCount = 0;
departmentsData.departments.forEach(dept => {
  const normalizedName = normalizeForMatching(dept.name);
  const normalizedCanonical = normalizeForMatching(dept.canonicalName);
  
  // Initialize aliases array if it doesn't exist
  if (!Array.isArray(dept.aliases)) {
    dept.aliases = [];
  }
  
  // Create a set of existing aliases (normalized) to avoid duplicates
  const existingAliases = new Set([
    normalizedName,
    normalizedCanonical,
    ...dept.aliases.map(alias => normalizeForMatching(alias))
  ]);
  
  // Find matching budget names
  for (const [normalizedBudgetName, originalBudgetName] of budgetDeptNames.entries()) {
    if (
      normalizedBudgetName.includes(normalizedName) || 
      (normalizedCanonical && normalizedBudgetName.includes(normalizedCanonical)) ||
      normalizedName.includes(normalizedBudgetName) ||
      (normalizedCanonical && normalizedCanonical.includes(normalizedBudgetName))
    ) {
      // Generate variations of the budget name
      const variations = generateNameVariations(originalBudgetName);
      
      // Add new variations that aren't already in aliases
      variations.forEach(variation => {
        const normalizedVariation = normalizeForMatching(variation);
        if (!existingAliases.has(normalizedVariation) && 
            variation !== dept.name && 
            variation !== dept.canonicalName) {
          dept.aliases.push(variation);
          existingAliases.add(normalizedVariation);
          console.log(`✓ Added alias "${variation}" to "${dept.name}"`);
        }
      });
      
      updatedCount++;
    }
  }
  
  // Remove duplicates and sort aliases
  dept.aliases = Array.from(new Set(dept.aliases)).sort();
});

// Write the updated departments data
fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(departmentsData, null, 2));
console.log(`\nUpdated aliases for ${updatedCount} departments`);
console.log(`Saved updated data to ${DEPARTMENTS_JSON_PATH}`); 