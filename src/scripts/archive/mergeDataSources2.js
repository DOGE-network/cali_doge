#!/usr/bin/env node

/**
 * Merge Data Sources Script v2
 * ---------------------------
 * 
 * This script merges the executive branch hierarchy data into departments.json.
 * It uses budget codes as primary keys, falling back to name matching if no code exists.
 */

const fs = require('fs');
const path = require('path');

// Read the data files
const departmentsPath = path.join(__dirname, '../data/departments.json');
const hierarchyPath = path.join(__dirname, '../data/executive-branch-hierarchy.json');

// Check if files exist
if (!fs.existsSync(departmentsPath)) {
  console.error('Error: departments.json not found at', departmentsPath);
  process.exit(1);
}

if (!fs.existsSync(hierarchyPath)) {
  console.error('Error: executive-branch-hierarchy.json not found at', hierarchyPath);
  console.error('Please ensure the hierarchy file exists before running this script.');
  process.exit(1);
}

const departments = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));
const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));

// Log initial state
console.log('Initial departments count:', departments.departments.length);

// Normalize department names for matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/^(california|department of|office of|secretary of|secretary for)\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Process a single agency and its hierarchy
function processAgency(agency, parentName = null) {
  const agencyData = {
    name: agency.name,
    orgLevel: agency.orgLevel,
    budget_status: agency.budget_status || 'active',
    keyFunctions: agency.keyFunctions || agency.description || '',
    abbreviation: agency.abbreviation || '',
    code: agency.budget_code || agency.budgetCode || '',
    parent_agency: parentName,
    subAgencies: agency.subAgencies || []
  };

  return agencyData;
}

// Extract all agencies with their relationships
function extractAgencies(data, agencies = new Map(), parentName = null) {
  if (!data) return agencies;

  if (data.name) {
    agencies.set(data.name, processAgency(data, parentName));
  }

  // Handle Executive Branch's special structure
  if (data.subAgencies) {
    if (typeof data.subAgencies === 'object' && !Array.isArray(data.subAgencies)) {
      // Process categorized agencies
      Object.values(data.subAgencies).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(agency => {
            agencies.set(agency.name, processAgency(agency, data.name));
            if (agency.subAgencies) {
              if (Array.isArray(agency.subAgencies)) {
                agency.subAgencies.forEach(subAgency => {
                  agencies.set(subAgency.name, processAgency(subAgency, agency.name));
                });
              }
            }
          });
        }
      });
    } else if (Array.isArray(data.subAgencies)) {
      data.subAgencies.forEach(agency => {
        agencies.set(agency.name, processAgency(agency, data.name));
        extractAgencies(agency, agencies, agency.name);
      });
    }
  }

  return agencies;
}

// Extract all agencies and build relationships
const agencyMap = extractAgencies(hierarchy);
console.log(`Found ${agencyMap.size} agencies in hierarchy`);

// Track changes
const newDepartments = [];
const matchedDepartments = [];
const warnings = [];

// Remove any existing hierarchy metadata
if (departments.hierarchy) {
  delete departments.hierarchy;
}

// Update departments
agencyMap.forEach((agencyData, agencyName) => {
  let matched = false;

  // Try to match by budget code first
  if (agencyData.budgetCode) {
    const deptMatch = departments.departments.find(dept => dept.budgetCode === agencyData.budgetCode);
    if (deptMatch) {
      Object.assign(deptMatch, {
        orgLevel: agencyData.orgLevel,
        budget_status: agencyData.budget_status,
        keyFunctions: agencyData.keyFunctions,
        abbreviation: agencyData.abbreviation,
        parent_agency: agencyData.parent_agency,
        subAgencies: agencyData.subAgencies
      });
      matched = true;
      matchedDepartments.push({ name: agencyName, matchType: 'code' });
    }
  }

  // If no code match, try name matching
  if (!matched) {
    const normalizedAgencyName = normalizeName(agencyName);
    const deptMatch = departments.departments.find(dept => 
      normalizeName(dept.name) === normalizedAgencyName ||
      normalizeName(dept.canonicalName) === normalizedAgencyName ||
      (dept.aliases && dept.aliases.some(alias => normalizeName(alias) === normalizedAgencyName))
    );

    if (deptMatch) {
      Object.assign(deptMatch, {
        orgLevel: agencyData.orgLevel,
        budget_status: agencyData.budget_status,
        keyFunctions: agencyData.keyFunctions,
        abbreviation: agencyData.abbreviation,
        parent_agency: agencyData.parent_agency,
        subAgencies: agencyData.subAgencies
      });
      matched = true;
      matchedDepartments.push({ name: agencyName, matchType: 'name' });
    }
  }

  // If no match found, create new department record
  if (!matched) {
    const newDept = {
      name: agencyName,
      slug: agencyName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      canonicalName: agencyName,
      aliases: [],
      code: agencyData.budgetCode,
      orgLevel: agencyData.orgLevel,
      budget_status: agencyData.budget_status,
      keyFunctions: agencyData.keyFunctions,
      abbreviation: agencyData.abbreviation,
      parent_agency: agencyData.parent_agency,
      subAgencies: agencyData.subAgencies,
      spending: {
        yearly: {},
        stateOperations: {}
      },
      workforce: {
        averageTenureYears: null,
        averageSalary: null,
        averageAge: null,
        headCount: { yearly: {} },
        wages: { yearly: {} }
      }
    };
    departments.departments.push(newDept);
    newDepartments.push(agencyName);
  }

  // Check for unexpected data
  if (agencyData.budgetCode && !matched) {
    warnings.push(`Agency with code ${agencyData.budgetCode} (${agencyName}) not matched`);
  }
});

// Write updated departments.json
fs.writeFileSync(
  departmentsPath,
  JSON.stringify(departments, null, 2),
  'utf8'
);

// Log results
console.log('\nMerge Results:');
console.log('-------------');
console.log(`Matched departments (${matchedDepartments.length}):`);
matchedDepartments.forEach(match => {
  console.log(`- ${match.name} (matched by ${match.matchType})`);
});

console.log(`\nNew departments created (${newDepartments.length}):`);
newDepartments.forEach(name => {
  console.log(`- ${name}`);
});

if (warnings.length > 0) {
  console.log('\nWarnings:');
  console.log('---------');
  warnings.forEach(warning => {
    console.log(`- ${warning}`);
  });
}

console.log('\nMerge completed successfully!'); 