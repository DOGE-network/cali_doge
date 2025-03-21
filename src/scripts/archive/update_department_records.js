#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read both JSON files
const hierarchyPath = path.join(__dirname, '../data/flattened-hierarchy.json');
const departmentsPath = path.join(__dirname, '../data/departments.json');

const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));

// Helper function to normalize strings for matching
function normalizeForMatching(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[,()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Function to check if two entries match
function entriesMatch(hierEntry, dept) {
  // Check budget code match if both have it
  if (hierEntry.budget_code && dept.budget_code && 
      hierEntry.budget_code === dept.budget_code) {
    return true;
  }

  // Check name matches
  const normalizedHierName = normalizeForMatching(hierEntry.name);
  const normalizedDeptName = normalizeForMatching(dept.name);
  
  if (normalizedHierName === normalizedDeptName) {
    return true;
  }

  // Check aliases
  if (dept.aliases && Array.isArray(dept.aliases)) {
    const normalizedAliases = dept.aliases.map(alias => normalizeForMatching(alias));
    if (normalizedAliases.includes(normalizedHierName)) {
      return true;
    }
  }

  return false;
}

// Function to update department record
function updateDepartmentRecord(dept, hierEntry) {
  const updatedDept = { ...dept };
  
  // Update org_level if hierarchy entry has it
  if (hierEntry.org_level !== undefined) {
    updatedDept.org_level = hierEntry.org_level;
  }
  
  // Update parent_agencies if hierarchy entry has it
  if (hierEntry.parent_agencies && Array.isArray(hierEntry.parent_agencies)) {
    updatedDept.parent_agencies = hierEntry.parent_agencies;
  }

  return updatedDept;
}

// Process the data
const results = {
  matched: [],
  unmatched: [],
  updated: []
};

// Check each department against hierarchy entries
for (const dept of departmentsData.departments) {
  let found = false;
  
  // Find all matching hierarchy entries
  const matchingEntries = hierarchyData.filter(hierEntry => 
    entriesMatch(hierEntry, dept)
  );

  if (matchingEntries.length > 0) {
    // Use the last matching entry (most recent)
    const lastMatch = matchingEntries[matchingEntries.length - 1];
    results.matched.push({
      department: dept,
      hierarchy: lastMatch
    });

    // Update the department record
    const updatedDept = updateDepartmentRecord(dept, lastMatch);
    if (JSON.stringify(updatedDept) !== JSON.stringify(dept)) {
      results.updated.push({
        original: dept,
        updated: updatedDept
      });
    }
    found = true;
  }

  if (!found) {
    results.unmatched.push(dept);
  }
}

// Print results
console.log('\nDepartment Update Results:');
console.log('--------------------------');
console.log(`Total departments: ${departmentsData.departments.length}`);
console.log(`Matched departments: ${results.matched.length}`);
console.log(`Unmatched departments: ${results.unmatched.length}`);
console.log(`Updated departments: ${results.updated.length}`);

if (results.matched.length > 0) {
  console.log('\nSuccessful Matches:');
  console.log('------------------');
  results.matched.forEach(({ department, hierarchy }) => {
    console.log(`\nDepartment: "${department.name}"`);
    console.log(`Hierarchy Name: "${hierarchy.name}"`);
    console.log(`Budget Code: ${hierarchy.budget_code || 'N/A'}`);
    console.log(`Org Level: ${hierarchy.org_level}`);
    console.log(`Parent Agencies: ${hierarchy.parent_agencies.join(' > ')}`);
  });
}

if (results.updated.length > 0) {
  console.log('\nUpdated Departments:');
  console.log('-------------------');
  results.updated.forEach(({ original, updated }) => {
    console.log(`\nDepartment: "${original.name}"`);
    if (original.org_level !== updated.org_level) {
      console.log(`Org Level: ${original.org_level} -> ${updated.org_level}`);
    }
    if (JSON.stringify(original.parent_agencies) !== JSON.stringify(updated.parent_agencies)) {
      console.log('Parent Agencies Updated:');
      console.log(`Original: ${original.parent_agencies?.join(' > ') || 'None'}`);
      console.log(`Updated: ${updated.parent_agencies?.join(' > ') || 'None'}`);
    }
  });
}

// Update the departments.json file if there are changes
if (results.updated.length > 0) {
  const updatedDepartments = departmentsData.departments.map(dept => {
    const update = results.updated.find(u => u.original.name === dept.name);
    return update ? update.updated : dept;
  });

  const updatedData = {
    ...departmentsData,
    departments: updatedDepartments
  };

  fs.writeFileSync(
    departmentsPath,
    JSON.stringify(updatedData, null, 2)
  );
  console.log(`\nUpdated departments.json with ${results.updated.length} changes`);
}

// Print detailed summary of non-matches at the end
console.log('\n==========================================');
console.log('SUMMARY OF NON-MATCHES');
console.log('==========================================');
console.log(`Total non-matches: ${results.unmatched.length}`);
console.log('------------------------------------------');

if (results.unmatched.length > 0) {
  // Group unmatched departments by budget code status
  const withBudgetCode = results.unmatched.filter(d => d.budget_code);
  const withoutBudgetCode = results.unmatched.filter(d => !d.budget_code);
  
  console.log(`\nDepartments with Budget Code (${withBudgetCode.length}):`);
  console.log('------------------------------------------');
  withBudgetCode.forEach(dept => {
    console.log(`\nName: "${dept.name}"`);
    console.log(`Budget Code: ${dept.budget_code}`);
    if (dept.aliases && dept.aliases.length > 0) {
      console.log(`Aliases: ${dept.aliases.join(', ')}`);
    }
  });

  console.log(`\nDepartments without Budget Code (${withoutBudgetCode.length}):`);
  console.log('------------------------------------------');
  withoutBudgetCode.forEach(dept => {
    console.log(`\nName: "${dept.name}"`);
    if (dept.aliases && dept.aliases.length > 0) {
      console.log(`Aliases: ${dept.aliases.join(', ')}`);
    }
  });

  // Print potential matches for manual review
  console.log('\nPotential Matches for Manual Review:');
  console.log('------------------------------------------');
  results.unmatched.forEach(dept => {
    const normalizedDeptName = normalizeForMatching(dept.name);
    const potentialMatches = hierarchyData.filter(hierEntry => {
      const normalizedHierName = normalizeForMatching(hierEntry.name);
      return normalizedHierName.includes(normalizedDeptName) || 
             normalizedDeptName.includes(normalizedHierName);
    });

    if (potentialMatches.length > 0) {
      console.log(`\nDepartment: "${dept.name}"`);
      console.log('Potential matches:');
      potentialMatches.forEach(match => {
        console.log(`- "${match.name}" (Budget Code: ${match.budget_code || 'N/A'})`);
      });
    }
  });
} else {
  console.log('No non-matches found!');
} 