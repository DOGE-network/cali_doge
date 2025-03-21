#!/usr/bin/env node

/**
 * Simple script to merge spending and workforce data into a unified departments.json
 * one time to get the data for 2023-2025
 */

const fs = require('fs');
const path = require('path');

// Path configurations
const SPENDING_DATA_PATH = path.join(__dirname, '../src/data/spending-data.json');
const WORKFORCE_DATA_PATH = path.join(__dirname, '../src/data/workforce-data.json');
const OUTPUT_PATH = path.join(__dirname, '../src/data/departments.json');

// Read input files
const spendingData = JSON.parse(fs.readFileSync(SPENDING_DATA_PATH, 'utf8'));
const workforceData = JSON.parse(fs.readFileSync(WORKFORCE_DATA_PATH, 'utf8'));

// Create an object to easily look up departments by different name formats
const departmentsByName = {};

// Create unified data structure
const unifiedData = {
  departments: []
};

// Normalize department names for matching
function normalizeForMatching(name) {
  return name.toLowerCase()
    .replace(/^california\s+/, '') // Remove 'California ' prefix
    .replace(/department\s+of\s+/, '') // Remove 'Department of '
    .replace(/\s+/g, ''); // Remove all spaces
}

// Step 1: First process all spending data
console.log(`Processing ${spendingData.agencies.length} departments from spending data`);
spendingData.agencies.forEach(agency => {
  const dept = {
    name: agency.name,
    slug: generateSlug(agency.name),
    code: '',
    canonicalName: agency.name,
    aliases: [],
    spending: {
      yearly: { ...agency.spending },
      stateOperations: { ...(agency.stateOperations || {}) }
    }
  };
  
  unifiedData.departments.push(dept);
  
  // Add to lookup by name
  departmentsByName[normalizeForMatching(agency.name)] = dept;
  departmentsByName[agency.name] = dept;
});

// Step 2: Process workforce data
console.log(`Processing ${workforceData.departments.length} departments from workforce data`);
workforceData.departments.forEach(dept => {
  // Skip the overall government entry
  if (dept.name === "California State Government") return;
  
  // Try to find a matching department
  const normalizedName = normalizeForMatching(dept.name);
  let existingDept = departmentsByName[normalizedName] || departmentsByName[dept.name];
  
  if (existingDept) {
    // Add workforce data to existing department
    existingDept.workforce = {
      yearlyHeadCount: dept.yearlyHeadCount || [],
      yearlyWages: dept.yearlyWages || [],
      averageTenureYears: dept.averageTenureYears,
      averageSalary: dept.averageSalary,
      averageAge: dept.averageAge
    };
    
    // If the workforce name contains "California" and the existing name doesn't, 
    // prefer the more complete name for canonicalName
    if (dept.name.includes('California') && !existingDept.name.includes('California')) {
      existingDept.canonicalName = dept.name;
      // Also add this name to our lookup
      departmentsByName[dept.name] = existingDept;
    }
  } else {
    // Create a new department entry
    const newDept = {
      name: dept.name,
      slug: generateSlug(dept.name),
      code: '',
      canonicalName: dept.name,
      aliases: [],
      workforce: {
        yearlyHeadCount: dept.yearlyHeadCount || [],
        yearlyWages: dept.yearlyWages || [],
        averageTenureYears: dept.averageTenureYears,
        averageSalary: dept.averageSalary,
        averageAge: dept.averageAge
      }
    };
    
    unifiedData.departments.push(newDept);
    departmentsByName[normalizeForMatching(dept.name)] = newDept;
    departmentsByName[dept.name] = newDept;
  }
});

// Helper function to generate slugs from department names
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove special chars
    .replace(/\s+/g, '_')      // Replace spaces with underscores
    .replace(/__+/g, '_');     // Replace multiple underscores with single one
}

// Verification step
function verifyData() {
  let success = true;
  
  // Verify spending data
  console.log("\nVerifying spending data:");
  spendingData.agencies.forEach(agency => {
    // Find department with matching normalized name
    const normalizedName = normalizeForMatching(agency.name);
    const unifiedDept = departmentsByName[normalizedName] || departmentsByName[agency.name];
    
    if (!unifiedDept) {
      console.error(`✗ Missing spending data for: ${agency.name}`);
      success = false;
      return;
    }
    
    if (!unifiedDept.spending) {
      console.error(`✗ No spending data found for: ${agency.name}`);
      success = false;
      return;
    }
    
    // Check a sample value
    const sampleYear = 'FY2023';
    if (unifiedDept.spending.yearly[sampleYear] !== agency.spending[sampleYear]) {
      console.error(`✗ Spending data mismatch for ${agency.name}: ${agency.spending[sampleYear]} vs ${unifiedDept.spending.yearly[sampleYear]}`);
      success = false;
      return;
    }
    
    console.log(`✓ Verified spending data for: ${agency.name}`);
  });
  
  // Verify workforce data
  console.log("\nVerifying workforce data:");
  workforceData.departments.forEach(dept => {
    // Skip the overall government entry
    if (dept.name === "California State Government") return;
    
    // Find department with matching normalized name
    const normalizedName = normalizeForMatching(dept.name);
    const unifiedDept = departmentsByName[normalizedName] || departmentsByName[dept.name];
    
    if (!unifiedDept) {
      console.error(`✗ Missing workforce data for: ${dept.name}`);
      success = false;
      return;
    }
    
    if (!unifiedDept.workforce) {
      console.error(`✗ No workforce data found for: ${dept.name}`);
      success = false;
      return;
    }
    
    // Check if headcount data was copied
    if (dept.yearlyHeadCount && dept.yearlyHeadCount.length > 0) {
      if (!unifiedDept.workforce.yearlyHeadCount || unifiedDept.workforce.yearlyHeadCount.length === 0) {
        console.error(`✗ Workforce headcount data missing for: ${dept.name}`);
        success = false;
        return;
      }
    }
    
    console.log(`✓ Verified workforce data for: ${dept.name}`);
  });
  
  return success;
}

// Count departments with various data
const withSpendingData = unifiedData.departments.filter(d => d.spending).length;
const withWorkforceData = unifiedData.departments.filter(d => d.workforce).length;
const withBothData = unifiedData.departments.filter(d => d.spending && d.workforce).length;

// Write output file
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(unifiedData, null, 2));
console.log(`\nCreated unified data with ${unifiedData.departments.length} departments:`);
console.log(`- ${withSpendingData} departments with spending data`);
console.log(`- ${withWorkforceData} departments with workforce data`);
console.log(`- ${withBothData} departments with both spending and workforce data`);

// Run verification
console.log("\nRunning data verification...");
const verified = verifyData();
if (verified) {
  console.log("\n✅ All data verified successfully!");
} else {
  console.error("\n❌ Data verification failed. Check issues above.");
} 