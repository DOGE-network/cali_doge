#!/usr/bin/env node

/**
 * Department Hierarchy Verification and Logging Script
 * 
 * Purpose:
 * - Reads latest report_hierarchy_mapping log file
 * - Verifies department hierarchy matches
 * - Logs new aliases and hierarchy mismatches
 * - Generates verification log with results
 * 
 * Input:
 * - Latest report_hierarchy_mapping log file
 * - departments.json (for verification only)
 * 
 * Output:
 * - verify_hierarchy_mapping_[timestamp].log
 * 
 * Functions:
 * - findLatestReportLog: Finds most recent report log file
 * - parseReportLog: Extracts detailed results from report log
 * - verifyHierarchy: Checks department hierarchy matches
 * - generateVerificationLog: Creates verification log
 * 
 * Hierarchy Rules:
 * - Only 1 department at orgLevel:0
 * - 3 departments at orgLevel:1
 * - For orgLevel:0 or 1 mismatches:
 *   - Skip if name/alias doesn't match level 0/1 records
 *   - Log mismatch if name/alias matches but hierarchy differs
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

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

// Find latest report log file
function findLatestReportLog() {
  const logFiles = glob.sync(path.join(__dirname, '../logs/report_hierarchy_mapping_*.log'));
  if (logFiles.length === 0) {
    throw new Error('No report log files found');
  }
  return logFiles.sort().pop(); // Get most recent file
}

// Parse report log to extract detailed results
function parseReportLog(logPath) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  const results = [];
  let currentDepartment = null;

  for (const line of lines) {
    if (line.startsWith('Department: ')) {
      if (currentDepartment) {
        results.push(currentDepartment);
      }
      currentDepartment = {
        name: line.replace('Department: ', ''),
        status: '',
        details: {}
      };
    } else if (currentDepartment && line.startsWith('Status: ')) {
      currentDepartment.status = line.replace('Status: ', '');
    } else if (currentDepartment && line.startsWith('- CSV name: ')) {
      currentDepartment.details.csvName = line.replace('- CSV name: ', '');
    } else if (currentDepartment && line.startsWith('- CSV orgLevel: ')) {
      currentDepartment.details.csvOrgLevel = parseInt(line.replace('- CSV orgLevel: ', ''));
    } else if (currentDepartment && line.startsWith('- JSON orgLevel: ')) {
      currentDepartment.details.jsonOrgLevel = parseInt(line.replace('- JSON orgLevel: ', ''));
    } else if (currentDepartment && line.startsWith('- CSV parent_agency: ')) {
      currentDepartment.details.csvParent_agency = line.replace('- CSV parent_agency: ', '');
    } else if (currentDepartment && line.startsWith('- JSON parent_agency: ')) {
      currentDepartment.details.jsonParent_agency = line.replace('- JSON parent_agency: ', '');
    } else if (currentDepartment && line.startsWith('- Potential new alias found:')) {
      if (!currentDepartment.details.newAliases) {
        currentDepartment.details.newAliases = [];
      }
      currentDepartment.details.newAliases.push(line.replace('- Potential new alias found:', '').trim());
    }
  }

  if (currentDepartment) {
    results.push(currentDepartment);
  }

  return results;
}

// Verify department hierarchy
function verifyHierarchy(department, departmentsJson) {
  const { csvOrgLevel, jsonOrgLevel, csvParent_agency, jsonParent_agency } = department.details;
  
  // Skip if org levels don't match
  if (csvOrgLevel !== jsonOrgLevel) {
    // For orgLevel 0 or 1, check if name/alias matches
    if (csvOrgLevel <= 1 || jsonOrgLevel <= 1) {
      const levelRecords = departmentsJson.departments.filter(d => d.orgLevel <= 1);
      const nameMatches = levelRecords.some(d => 
        d.canonicalName === department.name || 
        (d.aliases && d.aliases.includes(department.name))
      );
      
      if (!nameMatches) {
        return { skip: true };
      }
    }
    
    return {
      skip: false,
      mismatch: true,
      message: `Org level mismatch: CSV=${csvOrgLevel}, JSON=${jsonOrgLevel}`
    };
  }

  // Check parent agency match
  if (csvParent_agency !== jsonParent_agency) {
    return {
      skip: false,
      mismatch: true,
      message: `Parent agency mismatch: CSV=${csvParent_agency}, JSON=${jsonParent_agency}`
    };
  }

  return { skip: false, mismatch: false };
}

// Generate verification log
function generateVerificationLog(results) {
  const logContent = [
    'Department Hierarchy Verification Results',
    '=======================================',
    `Date: ${new Date().toISOString()}`,
    '',
    'Purpose:',
    '- Verify department hierarchy matches',
    '- Log new aliases and hierarchy mismatches',
    '- Generate verification report',
    '',
    'Summary:',
    `Total Departments Processed: ${results.length}`,
    `New Aliases Found: ${results.filter(r => r.status === 'matched_with_new_alias').length}`,
    `Hierarchy Mismatches: ${results.filter(r => r.verification?.mismatch).length}`,
    '',
    'Detailed Results:',
    '----------------'
  ];

  // Add new aliases section
  const newAliases = results.filter(r => r.status === 'matched_with_new_alias' && r.details.newAliases);
  if (newAliases.length > 0) {
    logContent.push('\nNew Aliases Found:');
    logContent.push('-----------------');
    for (const result of newAliases) {
      logContent.push(`\nDepartment: ${result.name}`);
      for (const alias of result.details.newAliases) {
        logContent.push(`- ${alias}`);
      }
    }
  }

  // Add hierarchy mismatches section
  const mismatches = results.filter(r => r.verification?.mismatch);
  if (mismatches.length > 0) {
    logContent.push('\nHierarchy Mismatches:');
    logContent.push('-------------------');
    for (const result of mismatches) {
      logContent.push(`\nDepartment: ${result.name}`);
      logContent.push(`- ${result.verification.message}`);
      logContent.push('Data comparison:');
      logContent.push(`  CSV name: ${result.details.csvName}`);
      logContent.push(`  CSV orgLevel: ${result.details.csvOrgLevel}`);
      logContent.push(`  JSON orgLevel: ${result.details.jsonOrgLevel}`);
      logContent.push(`  CSV parent_agency: ${result.details.csvParent_agency}`);
      logContent.push(`  JSON parent_agency: ${result.details.jsonParent_agency}`);
    }
  }

  // Add skipped departments section
  const skipped = results.filter(r => r.verification?.skip);
  if (skipped.length > 0) {
    logContent.push('\nSkipped Departments:');
    logContent.push('------------------');
    for (const result of skipped) {
      logContent.push(`\nDepartment: ${result.name}`);
      logContent.push('Note: No matching level 0/1 record found');
    }
  }

  return logContent.join('\n');
}

// Main execution
try {
  // Find and read latest report log
  const reportLogPath = findLatestReportLog();
  console.log(`Reading report log: ${reportLogPath}`);
  
  // Read departments.json for verification
  const departmentsPath = path.join(__dirname, '../data/departments.json');
  const departmentsJson = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));
  
  // Parse report log results
  const reportResults = parseReportLog(reportLogPath);
  
  // Verify hierarchy for each department
  for (const result of reportResults) {
    result.verification = verifyHierarchy(result, departmentsJson);
  }
  
  // Generate verification log
  const logPath = path.join(__dirname, '../logs', generateTimestampedFilename(__filename));
  const logContent = generateVerificationLog(reportResults, departmentsJson);
  
  // Ensure logs directory exists
  const logsDir = path.dirname(logPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Write verification log
  fs.writeFileSync(logPath, logContent);
  
  console.log(`\nVerification complete. Results logged to: ${logPath}`);
  console.log(`Departments processed: ${reportResults.length}`);
  console.log(`New aliases found: ${reportResults.filter(r => r.status === 'matched_with_new_alias').length}`);
  console.log(`Hierarchy mismatches: ${reportResults.filter(r => r.verification?.mismatch).length}`);
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} 