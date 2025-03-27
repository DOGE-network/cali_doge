#!/usr/bin/env node

/**
 * Department Hierarchy Update Script
 * 
 * Purpose:
 * - Updates department hierarchy based on verification log
 * - Sets orgLevel to (parent_agency.orgLevel - 1) for departments with specific parent agencies
 * - Never modifies orgLevel for departments with level 0 or 1 (locked)
 * - Updates parent agencies to match CSV data
 * - Adds new aliases from verification log
 * - Generates detailed report of changes
 * 
 * Rules:
 * - Org levels 0 and 1 are locked and cannot be modified
 * - New orgLevel is calculated as (parent_agency.orgLevel - 1)
 * - If calculated level would be 0 or 1, current level is preserved
 * 
 * Input:
 * - departments.json: Current department records
 * - verify_hierarchy_mapping.log: Verification results
 * 
 * Output:
 * - departments.json: Updated department records
 * - update_hierarchy_report.log: Detailed report of changes
 */

const fs = require('fs');
const path = require('path');

// Helper function to generate timestamped filename
function generateTimestampedFilename(scriptName) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', '');
  const baseName = path.basename(scriptName, '.js');
  return `${baseName}_${timestamp}.log`;
}

// Helper function to find latest verification log
function findLatestVerificationLog() {
  const logsDir = path.join(__dirname, '../logs');
  const files = fs.readdirSync(logsDir);
  const verificationLogs = files.filter(f => f.startsWith('verify_hierarchy_mapping_'));
  if (verificationLogs.length === 0) {
    throw new Error('No verification log found');
  }
  return path.join(logsDir, verificationLogs.sort().pop());
}

// Read all required files
const departmentsPath = path.join(__dirname, '../data/departments.json');
const verificationLogPath = findLatestVerificationLog();
const logPath = path.join(__dirname, '../logs', generateTimestampedFilename(__filename));

// Ensure logs directory exists
const logsDir = path.dirname(logPath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Read and parse files
const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));
const verificationLog = fs.readFileSync(verificationLogPath, 'utf8');

// Function to parse verification log
function parseVerificationLog(logContent) {
  const departments = new Map();
  let currentDepartment = null;
  let currentData = null;

  logContent.split('\n').forEach(line => {
    if (line.startsWith('Department: ')) {
      if (currentDepartment) {
        departments.set(currentDepartment, currentData);
      }
      currentDepartment = line.replace('Department: ', '').trim();
      currentData = {
        csvData: {},
        jsonData: {},
        status: ''
      };
    } else if (line.startsWith('Status: ')) {
      currentData.status = line.replace('Status: ', '').trim();
    } else if (line.startsWith('  CSV name: ')) {
      currentData.csvData.name = line.replace('  CSV name: ', '').trim();
    } else if (line.startsWith('  CSV orgLevel: ')) {
      currentData.csvData.orgLevel = parseInt(line.replace('  CSV orgLevel: ', '').trim());
    } else if (line.startsWith('  CSV parent_agency: ')) {
      currentData.csvData.parent_agency = line.replace('  CSV parent_agency: ', '').trim();
      currentData.csvData.parent_agency = [currentData.csvData.parent_agency];
    } else if (line.startsWith('  JSON orgLevel: ')) {
      currentData.jsonData.orgLevel = parseInt(line.replace('  JSON orgLevel: ', '').trim());
    } else if (line.startsWith('  JSON parent_agency: ')) {
      currentData.jsonData.parent_agency = line.replace('  JSON parent_agency: ', '').trim();
      currentData.jsonData.parent_agency = [currentData.jsonData.parent_agency];
    }
  });

  if (currentDepartment) {
    departments.set(currentDepartment, currentData);
  }

  return departments;
}

// Function to find parent agency's org level
function findParentAgencyLevel(parent_agency, departments) {
  if (!parent_agency) return null;
  
  // Find parent agency in departments
  const parentDept = departments.find(d => d.canonicalName === parent_agency);
  if (!parentDept) return null;
  
  return parentDept.orgLevel;
}

// Function to calculate new org level based on parent
function calculateNewOrgLevel(parentLevel, currentLevel) {
  // Never change levels 0 or 1
  if (currentLevel === 0 || currentLevel === 1) return currentLevel;
  
  // If parent level is invalid, keep current level
  if (parentLevel === null || parentLevel <= 0) return currentLevel;
  
  // Calculate new level but ensure it's not 0 or 1
  const newLevel = parentLevel - 1;
  return newLevel <= 1 ? currentLevel : newLevel;
}

// Main processing function
function processDepartments() {
  const verificationData = parseVerificationLog(verificationLog);
  const results = {
    total: departmentsData.departments.length,
    updated: 0,
    skipped: 0,
    changes: []
  };

  // Process each department
  for (const dept of departmentsData.departments) {
    const verifData = verificationData.get(dept.canonicalName);
    const changes = [];

    if (verifData) {
      // Check parent agency
      if (dept.parent_agency?.[0] !== verifData.csvData.parent_agency?.[0]) {
        changes.push({
          field: 'parent_agency',
          old: dept.parent_agency?.[0],
          new: verifData.csvData.parent_agency?.[0]
        });
        dept.parent_agency = verifData.csvData.parent_agency;
      }

      // Update orgLevel based on parent agency's level
      if (dept.parent_agency?.[0]) {
        const parentLevel = findParentAgencyLevel(dept.parent_agency[0], departmentsData.departments);
        if (parentLevel !== null) {
          const newLevel = calculateNewOrgLevel(parentLevel, dept.orgLevel);
          if (dept.orgLevel !== newLevel) {
            changes.push({
              field: 'orgLevel',
              old: dept.orgLevel,
              new: newLevel
            });
            dept.orgLevel = newLevel;
          }
        }
      }

      // Add any new aliases from verification log
      if (verifData.csvData.name && verifData.csvData.name !== dept.canonicalName) {
        const newAlias = verifData.csvData.name.replace(/[()]/g, '').trim();
        if (!dept.aliases) dept.aliases = [];
        if (!dept.aliases.includes(newAlias)) {
          changes.push({
            field: 'aliases',
            old: dept.aliases,
            new: [...dept.aliases, newAlias]
          });
          dept.aliases.push(newAlias);
        }
      }

      if (changes.length > 0) {
        results.updated++;
        results.changes.push({
          department: dept.canonicalName,
          changes
        });
      } else {
        results.skipped++;
      }
    } else {
      results.skipped++;
    }
  }

  return results;
}

// Process departments and generate report
const results = processDepartments();

// Write results to log file
const logContent = [
  'Department Hierarchy Update Report',
  '===============================',
  `Date: ${new Date().toISOString()}`,
  `Using verification log: ${verificationLogPath}`,
  '',
  'Summary:',
  `Total Departments: ${results.total}`,
  `Updated Departments: ${results.updated}`,
  `Skipped Departments: ${results.skipped}`,
  '',
  'Detailed Changes:',
  '----------------'
];

// Add detailed changes
results.changes.forEach(change => {
  logContent.push(`\nDepartment: ${change.department}`);
  change.changes.forEach(fieldChange => {
    logContent.push(`- ${fieldChange.field}:`);
    logContent.push(`  From: ${JSON.stringify(fieldChange.old)}`);
    logContent.push(`  To: ${JSON.stringify(fieldChange.new)}`);
  });
});

// Write to log file
fs.writeFileSync(logPath, logContent.join('\n'));

// Write updated departments.json
fs.writeFileSync(departmentsPath, JSON.stringify(departmentsData, null, 2));

console.log(`\nUpdate complete. Results logged to: ${logPath}`);
console.log(`Total departments processed: ${results.total}`);
console.log(`Updated: ${results.updated}`);
console.log(`Skipped: ${results.skipped}`); 