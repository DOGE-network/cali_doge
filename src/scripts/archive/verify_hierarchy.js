async function fetchDepartments() {
  const response = await fetch('http://localhost:3000/api/departments');
  if (!response.ok) {
    throw new Error('Failed to fetch departments');
  }
  return response.json();
}

/**
 * @param {DepartmentHierarchy} dept 
 * @param {string} _parentName
 */
function verifyDepartment(dept, _parentName) {
  // Verify orgLevel
  const expectedLevel = dept.parent_agency === 'California State Government' ? 1 : 
    dept.parent_agency === 'Executive Branch' ? 2 : 3;
  
  if (dept.orgLevel !== expectedLevel) {
    console.error(`Department ${dept.name} has incorrect orgLevel. Expected: ${expectedLevel}, Got: ${dept.orgLevel}`);
  }

  // Verify subdepartments
  if (dept.subDepartments) {
    for (const subDept of dept.subDepartments) {
      verifyDepartment(subDept, dept.name);
    }
  }
}

/**
 * @param {DepartmentHierarchy} root 
 * @param {string} name
 * @returns {{ department: DepartmentHierarchy | null; path: string[] }}
 */
function findDepartmentInHierarchy(root, name) {
  if (!root.subDepartments) {
    return { department: null, path: [] };
  }

  for (const dept of root.subDepartments) {
    const result = findDepartmentInHierarchy(dept, name);
    if (result.department) {
      return {
        department: result.department,
        path: [root.name, ...result.path]
      };
    }
  }

  return { department: null, path: [] };
}

function getReportingDepartments(departments) {
  const byApi = [];
  const byWorkforce = [];

  departments.forEach(dept => {
    // Check API reporting
    if (dept.parent_agency === 'California State Government') {
      byApi.push(dept.name);
    }

    // Check Workforce Display reporting
    if (dept.budget_status?.toLowerCase() === 'active') {
      byWorkforce.push(dept.name);
    }
  });

  // Sort alphabetically
  return {
    byApi: byApi.sort(),
    byWorkforce: byWorkforce.sort()
  };
}

function getDirectReports(departments) {
  const directReports = {
    byParentAgency: [],
    byOrgLevel: [],
    byWorkforce: []
  };

  departments.forEach(dept => {
    // Check parent_agency field
    if (dept.parent_agency === 'California State Government') {
      directReports.byParentAgency.push({
        name: dept.name,
        orgLevel: dept.orgLevel,
        budget_status: dept.budget_status
      });
    }

    // Check orgLevel field (level 1 should report to California State Government)
    if (dept.orgLevel === 1) {
      directReports.byOrgLevel.push({
        name: dept.name,
        parent_agency: dept.parent_agency,
        budget_status: dept.budget_status
      });
    }

    // Check workforce status
    if (dept.budget_status?.toLowerCase() === 'active') {
      directReports.byWorkforce.push({
        name: dept.name,
        parent_agency: dept.parent_agency,
        orgLevel: dept.orgLevel
      });
    }
  });

  return directReports;
}

function findReportingIssues(departments) {
  const issues = [];
  
  departments.forEach(dept => {
    // Check Level 1 departments that don't report to California State Government
    if (dept.orgLevel === 1 && dept.parent_agency !== 'California State Government') {
      issues.push({
        department: dept.name,
        issue: 'Level 1 department not reporting to California State Government',
        current: {
          parent_agency: dept.parent_agency,
          orgLevel: dept.orgLevel
        },
        fix: 'Update parent_agency to "California State Government"'
      });
    }

    // Check departments reporting to California State Government but not Level 1
    if (dept.parent_agency === 'California State Government' && dept.orgLevel !== 1) {
      issues.push({
        department: dept.name,
        issue: 'Incorrect orgLevel for California State Government direct report',
        current: {
          parent_agency: dept.parent_agency,
          orgLevel: dept.orgLevel
        },
        fix: 'Update orgLevel to 1'
      });
    }
  });

  return issues;
}

function verifyAllSources(departments) {
  // Create sets for each source
  const byParentAgency = new Set();
  const byOrgLevel = new Set();
  const byWorkforce = new Set();

  // Collect departments from each source
  departments.forEach(dept => {
    if (dept.parent_agency === 'California State Government') {
      byParentAgency.add(dept.name);
    }
    if (dept.orgLevel === 1) {
      byOrgLevel.add(dept.name);
    }
    if (dept.budget_status?.toLowerCase() === 'active') {
      byWorkforce.add(dept.name);
    }
  });

  // Find departments that appear in all three sources
  const inAllSources = new Set();
  byParentAgency.forEach(dept => {
    if (byOrgLevel.has(dept) && byWorkforce.has(dept)) {
      inAllSources.add(dept);
    }
  });

  // Find discrepancies
  const discrepancies = {
    onlyInParentAgency: [...byParentAgency].filter(dept => !inAllSources.has(dept)),
    onlyInOrgLevel: [...byOrgLevel].filter(dept => !inAllSources.has(dept)),
    onlyInWorkforce: [...byWorkforce].filter(dept => !inAllSources.has(dept)),
    correctInAllSources: [...inAllSources]
  };

  // Get detailed info for each department
  const detailedInfo = {};
  departments.forEach(dept => {
    detailedInfo[dept.name] = {
      parent_agency: dept.parent_agency,
      orgLevel: dept.orgLevel,
      budget_status: dept.budget_status
    };
  });

  return { discrepancies, detailedInfo };
}

async function verifyHierarchy() {
  try {
    const departments = await fetchDepartments();
    const { discrepancies, detailedInfo } = verifyAllSources(departments);

    // Display departments that are correct in all sources
    console.log('\nDepartments Correctly Reporting to California State Government in All Sources:');
    console.log('====================================================================');
    if (discrepancies.correctInAllSources.length === 0) {
      console.log('No departments are correctly configured in all three sources.');
    } else {
      discrepancies.correctInAllSources.forEach(dept => {
        console.log(`- ${dept}`);
        console.log(`  Parent Agency: ${detailedInfo[dept].parent_agency}`);
        console.log(`  Org Level: ${detailedInfo[dept].orgLevel}`);
        console.log(`  Workforce Status: ${detailedInfo[dept].budget_status}`);
      });
    }

    // Display discrepancies
    console.log('\nDiscrepancies Found:');
    console.log('===================');

    if (discrepancies.onlyInParentAgency.length > 0) {
      console.log('\nOnly in Parent Agency (parent_agency = "California State Government"):');
      discrepancies.onlyInParentAgency.forEach(dept => {
        console.log(`- ${dept}`);
        console.log(`  Current State:`);
        console.log(`    Parent Agency: ${detailedInfo[dept].parent_agency}`);
        console.log(`    Org Level: ${detailedInfo[dept].orgLevel}`);
        console.log(`    Workforce Status: ${detailedInfo[dept].budget_status}`);
      });
    }

    if (discrepancies.onlyInOrgLevel.length > 0) {
      console.log('\nOnly in Org Level (orgLevel = 1):');
      discrepancies.onlyInOrgLevel.forEach(dept => {
        console.log(`- ${dept}`);
        console.log(`  Current State:`);
        console.log(`    Parent Agency: ${detailedInfo[dept].parent_agency}`);
        console.log(`    Org Level: ${detailedInfo[dept].orgLevel}`);
        console.log(`    Workforce Status: ${detailedInfo[dept].budget_status}`);
      });
    }

    if (discrepancies.onlyInWorkforce.length > 0) {
      console.log('\nOnly in Workforce (Active status):');
      discrepancies.onlyInWorkforce.forEach(dept => {
        console.log(`- ${dept}`);
        console.log(`  Current State:`);
        console.log(`    Parent Agency: ${detailedInfo[dept].parent_agency}`);
        console.log(`    Org Level: ${detailedInfo[dept].orgLevel}`);
        console.log(`    Workforce Status: ${detailedInfo[dept].budget_status}`);
      });
    }

    // Display fix requirements
    console.log('\nFix Requirements:');
    console.log('================');
    console.log('To fix these discrepancies, ensure for each department:');
    console.log('1. If it reports to California State Government:');
    console.log('   - parent_agency must be "California State Government"');
    console.log('   - orgLevel must be 1');
    console.log('   - budget_status must be "active"');
  } catch (error) {
    console.error('Error verifying hierarchy:', error);
  }
}

// Export functions for use in other files
module.exports = {
  verifyHierarchy,
  verifyDepartment,
  findDepartmentInHierarchy,
  getReportingDepartments,
  getDirectReports,
  findReportingIssues,
  verifyAllSources
}; 