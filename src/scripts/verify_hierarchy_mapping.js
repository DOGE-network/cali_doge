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

// Function to extract all names from hierarchy recursively
function extractHierarchyNames(data) {
  const names = new Set();
  
  function traverse(node) {
    if (node.name) {
      names.add(node.name);
    }
    
    if (node.subAgencies) {
      if (Array.isArray(node.subAgencies)) {
        node.subAgencies.forEach(traverse);
      } else if (typeof node.subAgencies === 'object') {
        Object.values(node.subAgencies).forEach(agencyArray => {
          if (Array.isArray(agencyArray)) {
            agencyArray.forEach(traverse);
          }
        });
      }
    }
  }
  
  traverse(data);
  return names;
}

// Get all names from hierarchy
const hierarchyNames = extractHierarchyNames(hierarchyData);

// Function to check if two names match using the department's aliases
function namesMatch(hierName, dept) {
  const normalizedHierName = normalizeForMatching(hierName);
  const normalizedCanonicalName = normalizeForMatching(dept.canonicalName);
  const normalizedAliases = (dept.aliases || []).map(alias => normalizeForMatching(alias));
  
  // Check against canonical name and aliases
  return normalizedCanonicalName === normalizedHierName || 
         normalizedAliases.includes(normalizedHierName);
}

// Find mismatches using the existing aliases
const realMismatches = {
  inHierarchyNotInDepartments: [],
  inDepartmentsNotInHierarchy: []
};

// Check hierarchy names against departments
for (const hierName of hierarchyNames) {
  let found = false;
  for (const dept of departmentsData.departments) {
    if (namesMatch(hierName, dept)) {
      found = true;
      break;
    }
  }
  if (!found) {
    realMismatches.inHierarchyNotInDepartments.push(hierName);
  }
}

// Check department names against hierarchy
for (const dept of departmentsData.departments) {
  let found = false;
  for (const hierName of hierarchyNames) {
    if (namesMatch(hierName, dept)) {
      found = true;
      break;
    }
  }
  if (!found) {
    realMismatches.inDepartmentsNotInHierarchy.push(dept.canonicalName);
  }
}

// Print results
console.log('\nVerification Results (Using Existing Aliases):');
console.log('--------------------------------------------');
console.log(`Total names in hierarchy: ${hierarchyNames.size}`);
console.log(`Total canonical names in departments: ${departmentsData.departments.length}`);

if (realMismatches.inHierarchyNotInDepartments.length > 0) {
  console.log('\nNames in hierarchy but not in departments:');
  realMismatches.inHierarchyNotInDepartments.forEach(name => console.log(`- ${name}`));
}

if (realMismatches.inDepartmentsNotInHierarchy.length > 0) {
  console.log('\nCanonical names in departments but not in hierarchy:');
  realMismatches.inDepartmentsNotInHierarchy.forEach(name => console.log(`- ${name}`));
}

if (realMismatches.inHierarchyNotInDepartments.length === 0 && realMismatches.inDepartmentsNotInHierarchy.length === 0) {
  console.log('\n✅ Perfect one-to-one mapping verified!');
} else {
  console.log('\n❌ Mapping issues found. See above for details.');
  
  // Print some examples of successful matches for verification
  console.log('\nExample successful matches:');
  let matchCount = 0;
  for (const hierName of hierarchyNames) {
    for (const dept of departmentsData.departments) {
      if (namesMatch(hierName, dept) && hierName !== dept.canonicalName) {
        console.log(`- "${hierName}" matches "${dept.canonicalName}"`);
        matchCount++;
        if (matchCount >= 5) break;
      }
    }
    if (matchCount >= 5) break;
  }
} 