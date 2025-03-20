const fs = require('fs');
const path = require('path');

// Read both files
const newHierarchy = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/departments_new.json'), 'utf8'));
const existingData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/departments.json'), 'utf8'));

// Create a map of existing department data by name
const existingDepartments = new Map();
existingData.departments.forEach(dept => {
  existingDepartments.set(dept.name, dept);
});

// Function to merge data into a department in the hierarchy
function mergeDepartmentData(hierarchyDept, existingDept) {
  if (!existingDept) return hierarchyDept;

  return {
    ...hierarchyDept,
    slug: existingDept.slug || hierarchyDept.slug,
    canonicalName: existingDept.canonicalName || hierarchyDept.canonicalName,
    aliases: existingDept.aliases || hierarchyDept.aliases || [],
    spending: existingDept.spending || hierarchyDept.spending || {},
    workforce: existingDept.workforce || hierarchyDept.workforce || {},
    code: existingDept.code || hierarchyDept.code,
    budget_status: existingDept.budget_status || hierarchyDept.budget_status,
    keyFunctions: existingDept.keyFunctions || hierarchyDept.keyFunctions,
    abbreviation: existingDept.abbreviation || hierarchyDept.abbreviation,
    parentAgency: existingDept.parentAgency || hierarchyDept.parentAgency
  };
}

// Function to recursively process the hierarchy and merge data
function processHierarchy(departments) {
  return departments.map(dept => {
    const existingDept = existingDepartments.get(dept.name);
    const mergedDept = mergeDepartmentData(dept, existingDept);

    if (dept.subAgencies && dept.subAgencies.length > 0) {
      mergedDept.subAgencies = processHierarchy(dept.subAgencies);
    }

    return mergedDept;
  });
}

// Process the hierarchy
const mergedHierarchy = {
  departments: processHierarchy(newHierarchy.departments)
};

// Write the merged data back to departments.json
fs.writeFileSync(
  path.join(__dirname, '../data/departments.json'),
  JSON.stringify(mergedHierarchy, null, 2)
);

console.log('Successfully merged department data into hierarchy structure'); 