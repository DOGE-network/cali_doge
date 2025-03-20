#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read both JSON files
const hierarchyPath = path.join(__dirname, '../data/executive-branch-hierarchy.json');
const departmentsPath = path.join(__dirname, '../data/departments.json');

const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));

// Helper function to normalize department names for matching
function normalizeForMatching(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[,()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Function to flatten hierarchy and track parent agencies
function flattenHierarchy(data) {
  const flattened = [];
  
  function traverse(node, parentAgencies = []) {
    if (node.name) {
      flattened.push({
        name: node.name,
        budget_code: node.budget_code || '',
        keyFunctions: node.keyFunctions || '',
        org_level: node.org_level || 0,
        parent_agencies: [...parentAgencies]
      });
    }
    
    if (node.subAgencies) {
      const newParentAgencies = node.name ? [...parentAgencies, node.name] : parentAgencies;
      
      if (Array.isArray(node.subAgencies)) {
        node.subAgencies.forEach(child => traverse(child, newParentAgencies));
      } else if (typeof node.subAgencies === 'object') {
        Object.values(node.subAgencies).forEach(agencyArray => {
          if (Array.isArray(agencyArray)) {
            agencyArray.forEach(child => traverse(child, newParentAgencies));
          }
        });
      }
    }
  }
  
  traverse(data);
  return flattened;
}

// Function to check if two names match using the department's aliases
function namesMatch(hierName, dept) {
  const normalizedHierName = normalizeForMatching(hierName);
  const normalizedCanonicalName = normalizeForMatching(dept.canonicalName);
  const normalizedAliases = (dept.aliases || []).map(alias => normalizeForMatching(alias));
  
  return normalizedCanonicalName === normalizedHierName || 
         normalizedAliases.includes(normalizedHierName);
}

// Flatten the hierarchy
const flattenedHierarchy = flattenHierarchy(hierarchyData);

// Match against departments
const matches = {
  matched: [],
  unmatched: []
};

// Check each flattened hierarchy entry against departments
for (const hierEntry of flattenedHierarchy) {
  let found = false;
  for (const dept of departmentsData.departments) {
    if (namesMatch(hierEntry.name, dept)) {
      matches.matched.push({
        hierarchy: hierEntry,
        department: dept
      });
      found = true;
      break;
    }
  }
  if (!found) {
    matches.unmatched.push(hierEntry);
  }
}

// Print results
console.log('\nHierarchy to Department Mapping Results:');
console.log('----------------------------------------');
console.log(`Total entries in flattened hierarchy: ${flattenedHierarchy.length}`);
console.log(`Total departments: ${departmentsData.departments.length}`);
console.log(`Matched entries: ${matches.matched.length}`);
console.log(`Unmatched entries: ${matches.unmatched.length}`);

if (matches.matched.length > 0) {
  console.log('\nSuccessful Matches:');
  console.log('------------------');
  matches.matched.forEach(({ hierarchy, department }) => {
    console.log(`\nHierarchy Name: "${hierarchy.name}"`);
    console.log(`Department Name: "${department.canonicalName}"`);
    console.log(`Budget Code: ${hierarchy.budget_code || 'N/A'}`);
    console.log(`Org Level: ${hierarchy.org_level}`);
    console.log(`Parent Agencies: ${hierarchy.parent_agencies.join(' > ')}`);
    if (department.aliases && department.aliases.length > 0) {
      console.log(`Department Aliases: ${department.aliases.join(', ')}`);
    }
  });
}

if (matches.unmatched.length > 0) {
  console.log('\nUnmatched Hierarchy Entries:');
  console.log('----------------------------');
  matches.unmatched.forEach(entry => {
    console.log(`\nName: "${entry.name}"`);
    console.log(`Budget Code: ${entry.budget_code || 'N/A'}`);
    console.log(`Org Level: ${entry.org_level}`);
    console.log(`Parent Agencies: ${entry.parent_agencies.join(' > ')}`);
    if (entry.keyFunctions) {
      console.log(`Key Functions: ${entry.keyFunctions}`);
    }
  });
}

// Export the flattened structure
const outputPath = path.join(__dirname, '../data/flattened-hierarchy.json');
fs.writeFileSync(outputPath, JSON.stringify(flattenedHierarchy, null, 2));
console.log(`\nFlattened hierarchy exported to: ${outputPath}`); 