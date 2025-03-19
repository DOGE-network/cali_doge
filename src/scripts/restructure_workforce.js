#!/usr/bin/env node

/**
 * Restructure Workforce Data Script
 * ---------------------------------
 * 
 * DESCRIPTION:
 * This script transforms the workforce data structure in departments.json 
 * to match the format used for spending data.
 * 
 * TRANSFORMATION:
 * - Current format:
 *   "workforce": {
 *     "yearlyHeadCount": [
 *       { "year": "2022", "headCount": 1803 },
 *       { "year": "2023", "headCount": 1899 }
 *     ],
 *     "yearlyWages": [
 *       { "year": "2022", "wages": 180300000 },
 *       { "year": "2023", "wages": 189900000 }
 *     ]
 *   }
 * 
 * - New format:
 *   "workforce": {
 *     "headCount": {
 *       "yearly": {
 *         "2022": 1803,
 *         "2023": 1899
 *       }
 *     },
 *     "wages": {
 *       "yearly": {
 *         "2022": 180300000,
 *         "2023": 189900000
 *       }
 *     }
 *   }
 * 
 * EXECUTION:
 * 1. Make script executable: chmod +x src/scripts/restructure_workforce.js
 * 2. Run: node src/scripts/restructure_workforce.js
 * 
 * The script will automatically:
 * - Read the departments.json file
 * - Transform each department's workforce data
 * - Preserve any other existing fields in the workforce object
 * - Write the updated JSON back to the original file
 */

const fs = require('fs');
const path = require('path');

// Read the departments.json file
const departmentsFilePath = path.join(__dirname, '../data/departments.json');
const data = JSON.parse(fs.readFileSync(departmentsFilePath, 'utf8'));

// Function to transform the workforce data structure
function restructureWorkforceData(departments) {
  return departments.map(department => {
    // Skip if no workforce data
    if (!department.workforce) {
      return department;
    }

    const newWorkforce = {
      ...department.workforce  // Preserve any other fields that might exist
    };

    // Transform yearly head count data if it exists
    if (department.workforce.yearlyHeadCount) {
      newWorkforce.headCount = {
        yearly: department.workforce.yearlyHeadCount.reduce((acc, item) => {
          acc[item.year] = item.headCount;
          return acc;
        }, {})
      };
      // Remove the old structure
      delete newWorkforce.yearlyHeadCount;
    }

    // Transform yearly wages data if it exists
    if (department.workforce.yearlyWages) {
      newWorkforce.wages = {
        yearly: department.workforce.yearlyWages.reduce((acc, item) => {
          acc[item.year] = item.wages;
          return acc;
        }, {})
      };
      // Remove the old structure
      delete newWorkforce.yearlyWages;
    }

    // Return the updated department with new workforce structure
    return {
      ...department,
      workforce: newWorkforce
    };
  });
}

// Transform the departments data
data.departments = restructureWorkforceData(data.departments);

// Write the updated JSON back to the file
fs.writeFileSync(
  departmentsFilePath, 
  JSON.stringify(data, null, 2),
  'utf8'
);

console.log('Workforce data structure has been updated in departments.json'); 