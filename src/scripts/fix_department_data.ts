import fs from 'fs';
import path from 'path';
import type { 
  DepartmentData, 
  NonNegativeInteger,
  BudgetStatus,
  ValidSlug,
  DepartmentsJSON
} from '@/types/department';

// Read the departments.json file
const departmentsPath = path.join(process.cwd(), 'src', 'data', 'departments.json');
const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8')) as DepartmentsJSON;

// Known top-level branches
const _TOP_LEVEL_BRANCHES = [
  'Executive Branch',
  'Legislative Branch',
  'Judicial Branch'
];

// Known level 2 agencies
const _LEVEL_TWO_AGENCIES = [
  'Natural Resources Agency',
  'Government Operations Agency',
  'Health and Human Services Agency',
  'Transportation Agency',
  'Environmental Protection Agency',
  'Labor and Workforce Development Agency',
  'Business, Consumer Services and Housing Agency'
];

// Helper function to ensure a number is a NonNegativeInteger
function asNonNegativeInteger(value: number): NonNegativeInteger {
  if (value >= 0 && Number.isInteger(value)) {
    return value as NonNegativeInteger;
  }
  throw new Error(`Value ${value} is not a non-negative integer`);
}

function fixDepartmentData(departments: DepartmentData[]): DepartmentData[] {
  const uniqueDepts = new Map<string, DepartmentData>();
  const fixedDepts: DepartmentData[] = [];

  departments.forEach(dept => {
    if (!dept.slug) {
      console.warn(`Department ${dept.name} has no slug, skipping`);
      return;
    }

    const fixedDept: DepartmentData = {
      ...dept,
      orgLevel: asNonNegativeInteger(dept.orgLevel || 0),
      budget_status: (dept.budget_status || 'active') as BudgetStatus,
      keyFunctions: dept.keyFunctions || 'No key functions specified',
      abbreviation: dept.abbreviation || '',
      parent_agency: dept.parent_agency || '',
      aliases: dept.aliases || [],
      slug: dept.slug as ValidSlug
    };

    if (!uniqueDepts.has(dept.slug)) {
      uniqueDepts.set(dept.slug, fixedDept);
      fixedDepts.push(fixedDept);
    } else {
      console.warn(`Duplicate department slug found: ${dept.slug}`);
    }
  });

  return fixedDepts;
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