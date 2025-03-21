#!/usr/bin/env node

/**
 * Workforce Data Migration Script
 * ---------------------------------
 * 
 * DESCRIPTION:
 * This script transforms workforce data from the old format to the new format
 * and validates the data structure in departments.json.
 * 
 * TRANSFORMATION:
 * From old format:
 *   "workforce": {
 *     "yearlyHeadCount": [
 *       { "year": "2022", "headCount": 1803 }
 *     ],
 *     "yearlyWages": [
 *       { "year": "2022", "wages": 180300000 }
 *     ]
 *   }
 * 
 * To new format:
 *   "workforce": {
 *     "headCount": {
 *       "yearly": {
 *         "2022": 1803
 *       }
 *     },
 *     "wages": {
 *       "yearly": {
 *         "2022": 180300000
 *       }
 *     }
 *   }
 */

const fs = require('fs');
const path = require('path');

// Resolve the path to departments.json relative to the project root
const projectRoot = path.resolve(__dirname, '../../..');
const departmentsFilePath = path.join(projectRoot, 'src/data/departments.json');

// Check if file exists
if (!fs.existsSync(departmentsFilePath)) {
  console.error(`Error: departments.json not found at ${departmentsFilePath}`);
  console.error('Please ensure the file exists at src/data/departments.json');
  process.exit(1);
}

try {
  // Read and parse the departments.json file
  const data = JSON.parse(fs.readFileSync(departmentsFilePath, 'utf8'));

  // Function to transform old format to new format
  function transformOldToNewFormat(workforce) {
    const newWorkforce = { ...workforce };
    
    // Transform yearlyHeadCount if it exists
    if (workforce.yearlyHeadCount) {
      newWorkforce.headCount = {
        yearly: workforce.yearlyHeadCount.reduce((acc, item) => {
          acc[item.year] = typeof item.headCount === 'number' ? item.headCount : null;
          return acc;
        }, {})
      };
      delete newWorkforce.yearlyHeadCount;
    }

    // Transform yearlyWages if it exists
    if (workforce.yearlyWages) {
      newWorkforce.wages = {
        yearly: workforce.yearlyWages.reduce((acc, item) => {
          acc[item.year] = typeof item.wages === 'number' ? item.wages : null;
          return acc;
        }, {})
      };
      delete newWorkforce.yearlyWages;
    }

    return newWorkforce;
  }

  // Function to validate and clean workforce data structure
  function validateAndTransformWorkforce(departments) {
    let transformedCount = 0;
    let validatedCount = 0;
    
    const transformedDepartments = departments.map(department => {
      // Skip if no workforce data
      if (!department.workforce) {
        console.log(`Skipping department without workforce data: ${department.name}`);
        return department;
      }

      const { workforce } = department;
      let newWorkforce = { ...workforce };
      let wasTransformed = false;

      // Check if department uses old format
      if (workforce.yearlyHeadCount || workforce.yearlyWages) {
        console.log(`\nTransforming department: ${department.name} (${department.slug})`);
        
        if (workforce.yearlyHeadCount) {
          console.log('- Found yearlyHeadCount data to transform');
        }
        if (workforce.yearlyWages) {
          console.log('- Found yearlyWages data to transform');
        }

        // Transform to new format
        newWorkforce = transformOldToNewFormat(workforce);
        wasTransformed = true;
        transformedCount++;
        
        console.log('✓ Transformation complete');
      }

      // Validate the structure exists (whether transformed or not)
      if (!newWorkforce.headCount?.yearly || !newWorkforce.wages?.yearly) {
        throw new Error(`Department ${department.name} is missing required workforce data structure after transformation.`);
      }

      // Clean and validate the data
      const validatedWorkforce = {
        ...newWorkforce,
        headCount: {
          yearly: Object.entries(newWorkforce.headCount.yearly).reduce((acc, [year, count]) => {
            acc[year] = typeof count === 'number' ? count : null;
            return acc;
          }, {})
        },
        wages: {
          yearly: Object.entries(newWorkforce.wages.yearly).reduce((acc, [year, wages]) => {
            acc[year] = typeof wages === 'number' ? wages : null;
            return acc;
          }, {})
        }
      };

      // Ensure numeric fields are properly typed
      if (validatedWorkforce.averageTenureYears !== undefined && typeof validatedWorkforce.averageTenureYears !== 'number') {
        validatedWorkforce.averageTenureYears = null;
      }
      if (validatedWorkforce.averageSalary !== undefined && typeof validatedWorkforce.averageSalary !== 'number') {
        validatedWorkforce.averageSalary = null;
      }
      if (validatedWorkforce.averageAge !== undefined && typeof validatedWorkforce.averageAge !== 'number') {
        validatedWorkforce.averageAge = null;
      }

      if (!wasTransformed) {
        validatedCount++;
      }

      return {
        ...department,
        workforce: validatedWorkforce
      };
    });

    console.log('\nSummary:');
    console.log(`- Transformed ${transformedCount} departments from old format`);
    console.log(`- Validated ${validatedCount} departments already in new format`);
    console.log(`- Total departments processed: ${transformedCount + validatedCount}`);

    return transformedDepartments;
  }

  // Transform and validate the departments data
  data.departments = validateAndTransformWorkforce(data.departments);

  // Write the updated JSON back to the file
  fs.writeFileSync(
    departmentsFilePath, 
    JSON.stringify(data, null, 2),
    'utf8'
  );

  console.log('\nWorkforce data has been transformed, validated, and saved to departments.json');
} catch (error) {
  console.error('\nError:', error.message);
  process.exit(1);
} 