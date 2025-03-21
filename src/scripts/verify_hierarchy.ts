import type { DepartmentData, DepartmentHierarchy } from '@/types/department';

async function fetchDepartments(): Promise<DepartmentData[]> {
  const response = await fetch('/api/departments');
  if (!response.ok) {
    throw new Error('Failed to fetch departments');
  }
  return response.json();
}

function verifyDepartment(dept: DepartmentHierarchy, parentName: string): void {
  // Verify parent relationship
  if (dept.parent_agency !== parentName) {
    console.error(`Department ${dept.name} has incorrect parent_agency. Expected: ${parentName}, Got: ${dept.parent_agency}`);
  }

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

function findDepartmentInHierarchy(root: DepartmentHierarchy, name: string): { department: DepartmentHierarchy | null; path: string[] } {
  if (root.name === name) {
    return { department: root, path: [root.name] };
  }

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

async function verifyHierarchy(): Promise<void> {
  try {
    // Fetch departments from API
    const departments = await fetchDepartments();
    
    // Create root department
    const root: DepartmentHierarchy = {
      name: 'California State Government',
      slug: 'california_state_government',
      canonicalName: 'California State Government',
      aliases: [],
      orgLevel: 0,
      budget_status: 'Active',
      keyFunctions: 'State Government',
      abbreviation: 'CA',
      parent_agency: '',
      subDepartments: []
    };

    // Create maps for lookup
    const deptMap = new Map<string, DepartmentHierarchy>();
    const levelMap = new Map<number, DepartmentHierarchy[]>();
    const aliasMap = new Map<string, DepartmentHierarchy>();
    
    // First pass: Initialize all departments and build lookup maps
    departments.forEach(dept => {
      const department: DepartmentHierarchy = {
        ...dept,
        subDepartments: []
      };
      
      // Add to main department map
      deptMap.set(dept.name, department);
      
      // Add aliases to alias map
      if (dept.aliases) {
        dept.aliases.forEach(alias => {
          aliasMap.set(alias.toLowerCase(), department);
        });
      }
      
      // Group by orgLevel for easier parent lookup
      const level = dept.orgLevel || 999;
      if (!levelMap.has(level)) {
        levelMap.set(level, []);
      }
      levelMap.get(level)?.push(department);
    });

    // Add root to maps
    deptMap.set(root.name, root);
    levelMap.set(0, [root]);

    // Helper function to normalize department names
    const normalizeName = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim();

    // Helper function to find best parent match
    const findParent = (parentName: string, childLevel: number): DepartmentHierarchy | undefined => {
      // Try exact match first
      let parent = deptMap.get(parentName);
      if (parent) return parent;

      // Try alias match
      parent = aliasMap.get(normalizeName(parentName));
      if (parent) return parent;

      // Try fuzzy match in previous level
      const normalizedParent = normalizeName(parentName);
      const potentialParents = levelMap.get(childLevel - 1) || [];
      
      return potentialParents.find(p => {
        const normalizedName = normalizeName(p.name);
        return normalizedName.includes(normalizedParent) || 
               normalizedParent.includes(normalizedName) ||
               (p.aliases || []).some(alias => 
                 normalizeName(alias).includes(normalizedParent) || 
                 normalizedParent.includes(normalizeName(alias))
               );
      });
    };

    // Second pass: Build hierarchy by orgLevel
    for (let level = 1; level <= Math.max(...Array.from(levelMap.keys())); level++) {
      const depts = levelMap.get(level) || [];
      
      for (const dept of depts) {
        if (!dept.parent_agency) {
          // If no parent specified but it's level 1, attach to root
          if (level === 1) {
            root.subDepartments?.push(dept);
          }
          continue;
        }

        // Find parent using helper function
        const parent = findParent(dept.parent_agency, level);
        
        if (parent) {
          // Only add if not already a child of this parent
          if (!parent.subDepartments?.some((d: DepartmentHierarchy) => d.name === dept.name)) {
            parent.subDepartments = parent.subDepartments || [];
            parent.subDepartments.push(dept);
          }
        } else {
          // If no parent found but it's level 1 or 2, attach to root
          if (level <= 2) {
            root.subDepartments?.push(dept);
          }
        }
      }
    }

    // Sort subDepartments alphabetically at each level
    const sortDepartments = (dept: DepartmentHierarchy) => {
      if (dept.subDepartments) {
        dept.subDepartments.sort((a: DepartmentHierarchy, b: DepartmentHierarchy) => a.name.localeCompare(b.name));
        dept.subDepartments.forEach(sortDepartments);
      }
    };
    sortDepartments(root);

    // Verify hierarchy
    if (!root.subDepartments) {
      console.error('Root has no subDepartments');
      return;
    }

    // Verify each department
    for (const dept of root.subDepartments) {
      verifyDepartment(dept, root.name);
    }

    // Sample departments to check
    const departmentsToCheck = [
      'Department of General Services',
      'Department of Technology',
      'Department of Human Resources'
    ];

    for (const deptName of departmentsToCheck) {
      console.log(`Checking department: ${deptName}`);
      // Find in hierarchy
      const { path } = findDepartmentInHierarchy(root, deptName);
      console.log(`Hierarchy Path: ${path.join(' -> ')}`);
      console.log('---');
    }

  } catch (error) {
    console.error('Error verifying hierarchy:', error);
  }
}

// Run verification
verifyHierarchy().catch(console.error); 