import fs from 'fs';
import path from 'path';
import type { DepartmentData, DepartmentsJSON } from '@/types/department';

// Read the departments.json file
const departmentsPath = path.join(process.cwd(), 'src', 'data', 'departments.json');
const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8')) as DepartmentsJSON;

// Known top-level branches
const TOP_LEVEL_BRANCHES = [
  'Executive Branch',
  'Legislative Branch',
  'Judicial Branch'
];

// Known level 2 agencies
const LEVEL_TWO_AGENCIES = [
  'Natural Resources Agency',
  'Government Operations Agency',
  'Health and Human Services Agency',
  'Transportation Agency',
  'Environmental Protection Agency',
  'Labor and Workforce Development Agency',
  'Business, Consumer Services and Housing Agency'
];

function fixDepartmentData(departments: DepartmentData[]): DepartmentData[] {
  // Step 1: Remove duplicates and normalize basic fields
  const uniqueDepts = new Map<string, DepartmentData>();
  
  for (const dept of departments) {
    const fixedDept = {
      ...dept,
      budget_status: dept.budget_status?.toLowerCase() === 'active' ? 'Active' : 'Inactive',
      parent_agency: dept.parent_agency || '',
      orgLevel: dept.orgLevel || 999,
      aliases: dept.aliases || []
    };

    // If we already have this department, keep the one with more data
    const existing = uniqueDepts.get(dept.slug);
    if (existing) {
      const existingScore = Object.values(existing).filter(Boolean).length;
      const newScore = Object.values(fixedDept).filter(Boolean).length;
      if (newScore > existingScore) {
        uniqueDepts.set(dept.slug, fixedDept);
      }
    } else {
      uniqueDepts.set(dept.slug, fixedDept);
    }
  }

  // Step 2: Fix org levels based on known structure
  const fixedDepts = Array.from(uniqueDepts.values()).map(dept => {
    // Root level
    if (dept.name === 'California State Government') {
      return { ...dept, orgLevel: 0, parent_agency: '' };
    }

    // Level 1: Main branches
    if (TOP_LEVEL_BRANCHES.includes(dept.name)) {
      return { ...dept, orgLevel: 1, parent_agency: 'California State Government' };
    }

    // Level 2: Major agencies
    if (LEVEL_TWO_AGENCIES.includes(dept.name)) {
      return { ...dept, orgLevel: 2, parent_agency: 'Executive Branch' };
    }

    // Constitutional Officers are level 1 under Executive Branch
    if (dept.name === 'Constitutional Officers') {
      return { ...dept, orgLevel: 1, parent_agency: 'Executive Branch' };
    }

    // Try to find parent in fixed departments
    const parent = Array.from(uniqueDepts.values()).find(p => 
      p.name === dept.parent_agency || 
      p.aliases?.includes(dept.parent_agency)
    );

    if (parent) {
      return {
        ...dept,
        orgLevel: parent.orgLevel + 1
      };
    }

    // If no parent found, try to find best match
    const normalizedParent = dept.parent_agency?.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normalizedParent) {
      const potentialParents = Array.from(uniqueDepts.values()).filter(p => p.orgLevel === dept.orgLevel - 1);
      
      // Try to find best match based on name similarity
      const bestMatch = potentialParents.find(p => {
        const normalizedName = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
        return normalizedName.includes(normalizedParent) || 
               normalizedParent.includes(normalizedName) ||
               (p.aliases || []).some(alias => 
                 alias.toLowerCase().includes(normalizedParent) || 
                 normalizedParent.includes(alias.toLowerCase())
               );
      });

      if (bestMatch) {
        return {
          ...dept,
          parent_agency: bestMatch.name
        };
      }
    }

    return dept;
  });

  // Step 3: Validate and fix remaining hierarchy issues
  return fixedDepts.map(dept => {
    // Ensure no department has same or higher level than its parent
    if (dept.parent_agency) {
      const parent = fixedDepts.find(p => 
        p.name === dept.parent_agency || 
        p.aliases?.includes(dept.parent_agency)
      );

      if (parent && dept.orgLevel <= parent.orgLevel) {
        return {
          ...dept,
          orgLevel: parent.orgLevel + 1
        };
      }
    }

    // If no valid parent found but has parent_agency field, try to find best match
    if (dept.parent_agency && !fixedDepts.some(p => 
      p.name === dept.parent_agency || 
      p.aliases?.includes(dept.parent_agency))
    ) {
      // Find departments one level up
      const potentialParents = fixedDepts.filter(p => p.orgLevel === dept.orgLevel - 1);
      
      // Try to find best match based on name similarity
      const bestMatch = potentialParents.find(p => 
        p.name.toLowerCase().includes(dept.parent_agency.toLowerCase()) ||
        dept.parent_agency.toLowerCase().includes(p.name.toLowerCase())
      );

      if (bestMatch) {
        return {
          ...dept,
          parent_agency: bestMatch.name
        };
      }
    }

    return dept;
  });
}

// Fix the data
const fixedDepartments = fixDepartmentData(departmentsData.departments);

// Write back to file
fs.writeFileSync(
  departmentsPath,
  JSON.stringify({ departments: fixedDepartments }, null, 2)
);

console.log('Department data has been fixed and normalized.');
console.log(`Total departments: ${fixedDepartments.length}`);
console.log('Org levels distribution:');
const levelCounts = fixedDepartments.reduce((acc, dept) => {
  acc[dept.orgLevel] = (acc[dept.orgLevel] || 0) + 1;
  return acc;
}, {} as Record<number, number>);
Object.entries(levelCounts)
  .sort(([a], [b]) => Number(a) - Number(b))
  .forEach(([level, count]) => {
    console.log(`Level ${level}: ${count} departments`);
  }); 