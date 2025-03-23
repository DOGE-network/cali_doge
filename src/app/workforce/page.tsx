/**
 * Workforce Page Component
 * 
 * Purpose:
 * Displays a hierarchical view of California State Government workforce data,
 * including employee counts, salaries, and organizational relationships.
 * 
 * Data Structure:
 * - Level 0: California State Government (root)
 * - All other agencies are organized by their parent_agency relationship
 * 
 * Key Functions:
 * 
 * buildHierarchy(departments: DepartmentData[]): DepartmentData
 * - Creates a hierarchical tree of departments based on parent_agency relationships
 * - Each department becomes a node in the tree
 * - If a department has a parent_agency, it becomes a child of that department
 * - If parent not found or no parent specified, department is added to root
 * - Sorts all departments alphabetically at each level
 * - Calculates number of subordinate departments for each department
 * 
 * filterInactiveDepartments(departments: DepartmentData[], showInactive: boolean): DepartmentData[]
 * - Removes or includes inactive departments based on showInactive flag
 * - Recursively filters through all levels of hierarchy
 * - Preserves hierarchy structure while filtering
 * 
 * Display Rules:
 * - Always show path to root and ancestors (no data/charts)
 * - Show active card with data and charts
 * - Show immediate children of active card (no data)
 * - Hide all other branches
 */

// Level 0: California State Government
// Level 1: Executive, Legislative, Judicial Branches
// Level 2: Branch-specific sub-organizations
// Level 3: Categories (Superagencies and Departments, etc.)
// Level 4: Departments (Department of General Services, etc.)

// When nothing is selected:
// - Show California State Government (Level 0). show data and charts.
// - Show Level 1 branches (no data or charts)
// - Hide everything else

// When something is selected:
// Always show the path to root, ancestors. ancestors do not display data or charts. 
// always show the active card, data and charts
// if no json data display ~
// if no json chart data then display no-data-yet svg for each chart missing data
// Show only immediate children of active card. do not display data
// Hide all other branches

// Display Rules:
// - Always show path to root and ancestors (no data/charts)
// - Show active card with data and charts
// - Show immediate children of active card (no data)
// - Hide all other branches

'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import AgencyDataVisualization from './AgencyDataVisualization';
import type { DepartmentData, DepartmentHierarchy, NonNegativeInteger, ValidSlug, BudgetStatus, RawDistributionItem } from '@/types/department';
import { getDepartmentByName, getDepartmentByWorkforceName } from '@/lib/departmentMapping';

// Fetch departments from API
async function fetchDepartments(): Promise<DepartmentData[]> {
  // Add caching headers
  const response = await fetch('/api/departments', {
    next: {
      revalidate: 3600 // Cache for 1 hour
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch departments');
  }
  return response.json();
}

// Helper function to count total departments in hierarchy
function countDepartments(hierarchy: DepartmentHierarchy | DepartmentHierarchy[]): number {
  if (!hierarchy) return 0;
  if (Array.isArray(hierarchy)) {
    return hierarchy.reduce((sum, dept) => sum + countDepartments(dept), 0);
  }
  let count = 1; // Count current department
  if (hierarchy.subDepartments) {
    count += hierarchy.subDepartments.reduce((acc, dept) => acc + countDepartments(dept), 0);
  }
  return count;
}

// Helper function to aggregate distribution arrays
function aggregateDistributions(departments: DepartmentHierarchy[]): {
  tenureDistribution: RawDistributionItem[];
  salaryDistribution: RawDistributionItem[];
  ageDistribution: RawDistributionItem[];
} {
  const result = {
    tenureDistribution: [] as RawDistributionItem[],
    salaryDistribution: [] as RawDistributionItem[],
    ageDistribution: [] as RawDistributionItem[]
  };

  // Helper to aggregate a single distribution type
  const aggregateDistribution = (distributions: RawDistributionItem[][]): RawDistributionItem[] => {
    const rangeMap = new Map<string, number>();

    distributions.forEach(dist => {
      if (!dist) return;
      dist.forEach(item => {
        const key = `${item.range[0]}-${item.range[1]}`;
        rangeMap.set(key, (rangeMap.get(key) || 0) + item.count);
      });
    });

    return Array.from(rangeMap.entries()).map(([key, count]) => ({
      range: key.split('-').map(Number) as [number, number],
      count
    }));
  };

  // Get all distributions from departments and their subdepartments recursively
  const getAllDistributions = (depts: DepartmentHierarchy[]) => {
    const distributions = {
      tenure: [] as RawDistributionItem[][],
      salary: [] as RawDistributionItem[][],
      age: [] as RawDistributionItem[][]
    };

    depts.forEach(dept => {
      if (dept.workforce?.tenureDistribution) {
        distributions.tenure.push(dept.workforce.tenureDistribution);
      }
      if (dept.workforce?.salaryDistribution) {
        distributions.salary.push(dept.workforce.salaryDistribution);
      }
      if (dept.workforce?.ageDistribution) {
        distributions.age.push(dept.workforce.ageDistribution);
      }
      if (dept.subDepartments?.length) {
        const subDist = getAllDistributions(dept.subDepartments);
        distributions.tenure.push(...subDist.tenure);
        distributions.salary.push(...subDist.salary);
        distributions.age.push(...subDist.age);
      }
    });

    return distributions;
  };

  const allDistributions = getAllDistributions(departments);
  
  result.tenureDistribution = aggregateDistribution(allDistributions.tenure);
  result.salaryDistribution = aggregateDistribution(allDistributions.salary);
  result.ageDistribution = aggregateDistribution(allDistributions.age);

  return result;
}

function buildHierarchy(departments: DepartmentData[]): DepartmentHierarchy {
  console.log('Building hierarchy with departments:', departments.length);
  
  // Find the California State Government department from the data
  const rootDept = departments.find(d => d.name === 'California State Government');
  
  // Create root department using actual data
  const root: DepartmentHierarchy = {
    ...(rootDept || {
      name: 'California State Government',
      slug: ('california_state_government' as ValidSlug),
      canonicalName: 'California State Government',
      aliases: [],
      orgLevel: (0 as NonNegativeInteger),
      budget_status: 'active' as BudgetStatus,
      keyFunctions: 'State Government',
      abbreviation: 'CA',
      parent_agency: '',
    }),
    // Always ensure these hierarchy-specific fields exist
    subDepartments: [],
    subordinateOffices: 0,
    orgLevel: (0 as NonNegativeInteger), // Force root level
    parent_agency: '', // Force no parent
  };

  // Create maps for lookup
  const deptMap = new Map<string, DepartmentHierarchy>();
  const levelMap = new Map<number, DepartmentHierarchy[]>();
  const aliasMap = new Map<string, DepartmentHierarchy>();
  
  // First pass: Initialize all departments and build lookup maps
  departments.forEach(dept => {
    // Skip the root department as we've already handled it
    if (dept.name === 'California State Government') return;
    
    const department: DepartmentHierarchy = {
      ...dept,
      subDepartments: [],
      subordinateOffices: 0
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
  const unattachedDepts = new Set(deptMap.keys());
  unattachedDepts.delete(root.name);

  for (let level = 1; level <= Math.max(...Array.from(levelMap.keys())); level++) {
    const depts = levelMap.get(level) || [];
    
    for (const dept of depts) {
      let attached = false;
      if (!dept.parent_agency) {
        // If no parent specified but it's level 1, attach to root
        if (level === 1) {
          root.subDepartments?.push(dept);
          attached = true;
        }
      } else {
        // Find parent using helper function
        const parent = findParent(dept.parent_agency, level);
        
        if (parent) {
          // Only add if not already a child of this parent
          if (!parent.subDepartments?.some((d: DepartmentHierarchy) => d.name === dept.name)) {
            parent.subDepartments = parent.subDepartments || [];
            parent.subDepartments.push(dept);
            attached = true;
          }
        }
      }

      if (attached) {
        unattachedDepts.delete(dept.name);
      }
    }
  }

  // Add any remaining unattached departments to root
  unattachedDepts.forEach(deptName => {
    const dept = deptMap.get(deptName);
    if (dept && !root.subDepartments?.some(d => d.name === dept.name)) {
      root.subDepartments?.push(dept);
    }
  });

  // Sort subDepartments alphabetically at each level
  const sortDepartments = (dept: DepartmentHierarchy) => {
    if (dept.subDepartments) {
      dept.subDepartments.sort((a: DepartmentHierarchy, b: DepartmentHierarchy) => a.name.localeCompare(b.name));
      dept.subDepartments.forEach(sortDepartments);
    }
  };
  sortDepartments(root);

  // Calculate subordinate offices and aggregate distributions
  const calculateSubordinatesAndAggregateData = (dept: DepartmentHierarchy): number => {
    if (!dept.subDepartments?.length) return 0;
    
    // Calculate subordinates
    dept.subordinateOffices = dept.subDepartments.reduce((sum: number, child: DepartmentHierarchy) => 
      sum + calculateSubordinatesAndAggregateData(child) + 1, 0);
    
    // Aggregate distributions from children
    if (dept.subDepartments.length > 0) {
      const aggregatedData = aggregateDistributions(dept.subDepartments);
      dept.aggregatedDistributions = aggregatedData;
    }
    
    return dept.subordinateOffices;
  };
  calculateSubordinatesAndAggregateData(root);

  // After building hierarchy
  console.log('Departments in hierarchy:', countDepartments(root));
  return root;
}

// Filter inactive departments
function filterInactiveDepartments(departments: DepartmentHierarchy[], showInactive: boolean): DepartmentHierarchy[] {
  console.log('Filtering inactive departments from hierarchy with total:', countDepartments(departments));
  
  if (!departments) return [];
  
  const filtered = departments.map(dept => {
    if (showInactive || dept.budget_status.toLowerCase() !== 'inactive') {
      return {
        ...dept,
        subDepartments: dept.subDepartments 
          ? filterInactiveDepartments(dept.subDepartments, showInactive)
          : []
      };
    }
    return null;
  }).filter(Boolean) as DepartmentHierarchy[];
  
  // After filtering
  console.log('Departments after filtering:', countDepartments(filtered));
  return filtered;
}

interface DepartmentCardProps {
  department: DepartmentHierarchy;
  isActive: boolean;
  onClick: () => void;
  showChart: boolean;
}

function DepartmentCard({ department, isActive, onClick, showChart }: DepartmentCardProps) {
  return (
    <div className={`space-y-4 ${isActive ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
      <div 
        className={`p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow ${department.budget_status.toLowerCase() === 'inactive' ? 'bg-gray-100 opacity-75' : 'bg-white'} cursor-pointer relative`}
        onClick={onClick}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {department.name}
              {department.abbreviation && <span className="ml-2 text-sm text-gray-500">({department.abbreviation})</span>}
              {department.budget_status.toLowerCase() === 'inactive' && <span className="ml-2 text-xs text-gray-500 italic">(inactive)</span>}
              {department.code && (
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {department.code}
                </span>
              )}
            </h3>
            {department.keyFunctions && (
              <p className="mt-2 text-sm text-gray-600">{department.keyFunctions}</p>
            )}
          </div>
          {department.subordinateOffices !== undefined && department.subordinateOffices > 0 && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">{department.subordinateOffices}</span>
            </div>
          )}
        </div>
      </div>
      {showChart && (
        <div className="chart-wrapper">
          <AgencyDataVisualization department={department} />
        </div>
      )}
    </div>
  );
}

interface SubDepartmentSectionProps {
  department: DepartmentHierarchy;
  parentPath: string[];
  activeAgencyPath: string[];
  onDepartmentClick: (_path: string[]) => void;
}

function SubDepartmentSection({ 
  department, 
  parentPath,
  activeAgencyPath,
  onDepartmentClick
}: SubDepartmentSectionProps) {
  // Check if this is the root department "California State Government"
  const isRoot = department.name === 'California State Government';
  
  // Check if this department is the currently selected item
  const isActiveItem = activeAgencyPath.length === parentPath.length + 1 && 
    activeAgencyPath[parentPath.length] === department.name;
  
  // Check if this is a direct child of the active item
  const isChildOfActive = parentPath.length > 0 && 
    parentPath.join('/') === activeAgencyPath.join('/') &&
    !activeAgencyPath.includes(department.name);
  
  // Check if this is an ancestor in the path to the active item
  const isAncestorOfActive = activeAgencyPath.length > parentPath.length + 1 && 
    activeAgencyPath[parentPath.length] === department.name;
  
  // Show chart only when this department is specifically selected
  const showChart = isActiveItem;
  
  // Show subdepartments only if this is active or an ancestor of active
  const showSubDepartments = isActiveItem || isAncestorOfActive;
  
  const fullPath = [...parentPath, department.name];
  
  // Don't render this department if it's not in the path to active, not active, and not a child of active
  if (!isActiveItem && !isAncestorOfActive && !isChildOfActive) {
    return null;
  }
  
  // Get departments to display as children
  let displaySubDepartments = department.subDepartments || [];
  
  // Special handling for root level - only show direct children with parent_agency == "California State Government"
  if (isRoot && isActiveItem) {
    displaySubDepartments = displaySubDepartments.filter(dept => 
      dept.parent_agency === 'California State Government'
    );
  }
  
  return (
    <div>
      <DepartmentCard 
        department={department}
        isActive={isActiveItem}
        onClick={() => onDepartmentClick(fullPath)}
        showChart={showChart}
      />
      
      {displaySubDepartments && showSubDepartments && (
        <div className="grid grid-cols-1 gap-4 mt-4 ml-4">
          {displaySubDepartments.map((subDept) => (
            <SubDepartmentSection
              key={subDept.name}
              department={subDept}
              parentPath={fullPath}
              activeAgencyPath={activeAgencyPath}
              onDepartmentClick={onDepartmentClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkforcePage() {
  return (
    <Suspense fallback={<div className="p-4">Loading workforce data...</div>}>
      <WorkforcePageContent />
    </Suspense>
  );
}

function WorkforcePageContent() {
  const searchParams = useSearchParams();
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [activePath, setActivePath] = useState<string[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[] | null>(null);
  const hierarchyData = useMemo(() => {
    if (!departments) return null;
    return buildHierarchy(departments);
  }, [departments]);
  const [error, setError] = useState<string | null>(null);

  // Fetch departments and build hierarchy
  useEffect(() => {
    async function loadDepartments() {
      try {
        setError(null);
        const deps = await fetchDepartments();
        setDepartments(deps);
      } catch (err) {
        console.error('Error loading departments:', err);
        setError('Failed to load department data');
      }
    }
    loadDepartments();
  }, []);

  // Get the department from URL query parameter
  useEffect(() => {
    const agencyParam = searchParams.get('agency');
    const departmentParam = searchParams.get('department');
    
    if (departmentParam) {
      const dept = getDepartmentByName(departmentParam);
      if (dept) {
        setSelectedDepartmentName(dept.name);
      } else {
        // Try to find the department by workforce name
        const workforceDept = getDepartmentByWorkforceName(departmentParam);
        if (workforceDept) {
          setSelectedDepartmentName(workforceDept.name);
        } else {
          setSelectedDepartmentName(departmentParam);
        }
      }
    } else if (agencyParam) {
      setSelectedDepartmentName(agencyParam);
    }
  }, [searchParams]);
  
  // When selectedDepartmentName or hierarchyData changes, find the active path
  useEffect(() => {
    if (!hierarchyData) return;
    
    if (!selectedDepartmentName) {
      setActivePath([hierarchyData.name]);
      return;
    }
    
    // Function to find department by name in hierarchy
    const findDepartmentByName = (
      departments: DepartmentHierarchy[], 
      targetName: string, 
      currentPath: string[] = []
    ): { department: DepartmentHierarchy | null; path: string[] } => {
      for (const dept of departments) {
        const updatedPath = [...currentPath, dept.name];
        
        // Check for exact match only (workforceName doesn't exist on DepartmentHierarchy)
        if (dept.name === targetName) {
          return { department: dept, path: updatedPath };
        }
        
        if (dept.subDepartments) {
          const result = findDepartmentByName(dept.subDepartments, targetName, updatedPath);
          if (result.department) {
            return result;
          }
        }
      }
      
      return { department: null, path: [] };
    };
    
    // First check if the root itself is selected
    if (selectedDepartmentName === hierarchyData.name) {
      setActivePath([hierarchyData.name]);
      return;
    }
    
    // Otherwise search through subdepartments
    const result = findDepartmentByName(
      hierarchyData.subDepartments || [],
      selectedDepartmentName,
      [hierarchyData.name]
    );
    
    if (result.department) {
      setActivePath(result.path);
    } else {
      // If not found in hierarchy, set to root
      setActivePath([hierarchyData.name]);
    }
  }, [selectedDepartmentName, hierarchyData]);
  
  // Handle department selection
  const handleSelectDepartment = (department: DepartmentData) => {
    setSelectedDepartmentName(department.name);
  };
  
  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!hierarchyData) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Filter inactive departments if needed
  const filteredHierarchy = showInactive ? hierarchyData : {
    ...hierarchyData,
    subDepartments: filterInactiveDepartments(hierarchyData.subDepartments || [], false)
  };

  // Log counts after filtering
  console.log('Final hierarchy departments:', countDepartments(filteredHierarchy));
  
  // Get path departments to display
  const pathDepartments: DepartmentData[] = [];
  let currentDepartments = [filteredHierarchy];
  
  for (let i = 0; i < activePath.length; i++) {
    const currentName = activePath[i];
    const foundDepartment = currentDepartments.find(d => d.name === currentName);
    
    if (foundDepartment) {
      pathDepartments.push(foundDepartment);
      if (foundDepartment.subDepartments) {
        currentDepartments = foundDepartment.subDepartments;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  // The last department in the path is the active one
  const currentActiveDepartment = pathDepartments[pathDepartments.length - 1] as DepartmentHierarchy;
  
  // Child departments of the active department (to display below)
  const childDepartments = currentActiveDepartment?.subDepartments || [];

  // Filter child departments to only include direct children at the root level
  // At root level, only show departments with parent_agency == "California State Government"
  const childDepartmentsToDisplay = currentActiveDepartment?.name === 'California State Government' ?
    childDepartments.filter(dept => dept.parent_agency === 'California State Government') :
    childDepartments;

  // Log final display counts
  const totalDisplayed = pathDepartments.length + childDepartmentsToDisplay.length;
  console.log('Path departments:', pathDepartments.length);
  console.log('Child departments:', childDepartmentsToDisplay.length);
  console.log('Total displayed:', totalDisplayed);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">California State Government Workforce</h1>

        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 border rounded-full p-1 bg-gray-100">
            <button
              className={`rounded-full px-3 py-1 text-xs ${!showInactive ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setShowInactive(!showInactive)}
            >
              {!showInactive ? 'Show All' : 'Show Active Only'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mb-10">
        {/* Breadcrumb navigation showing path to root */}
        <nav className="mb-4">
          <ol className="flex flex-wrap items-center">
            {pathDepartments.map((dept, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-gray-400">/</span>
                )}
                <button 
                  onClick={() => handleSelectDepartment(dept)}
                  className={`text-sm ${
                    index === pathDepartments.length - 1 
                      ? 'font-bold text-blue-600' 
                      : 'text-gray-600 hover:text-blue-500'
                  }`}
                >
                  {dept.name}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        
        {/* Active department card with visualization */}
        {currentActiveDepartment && (
          <div className="mb-6">
            <DepartmentCard 
              department={currentActiveDepartment} 
              isActive={true} 
              onClick={() => {}} 
              showChart={true} 
            />
          </div>
        )}
        
        {/* Immediate children of active department (no data) */}
        {childDepartmentsToDisplay.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Departments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {childDepartmentsToDisplay.map(dept => (
                <DepartmentCard
                  key={dept.name}
                  department={dept}
                  isActive={false}
                  onClick={() => handleSelectDepartment(dept)}
                  showChart={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Help information for navigating the hierarchy */}
      <div className="bg-blue-50 p-4 rounded-lg mb-8">
        <h3 className="text-md font-semibold mb-2">Understanding the Hierarchy</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600">
          <li>Click on any department to view its details and subdivisions</li>
          <li>Use the breadcrumb navigation above to return to previous levels</li>
          <li>Toggle between showing active departments only or all departments</li>
        </ul>
      </div>

      {/* Sources */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Sources</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600">
          <li>
            <a 
              href="https://publicpay.ca.gov/Reports/State/State.aspx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California State Controller&apos;s Office - Government Compensation in California
            </a>
          </li>
          <li>
            <a 
              href="https://www.calhr.ca.gov/pages/workforce-planning-statistics.aspx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California Department of Human Resources - Workforce Statistics
            </a>
          </li>
          <li>
            <a 
              href="https://lao.ca.gov/StateWorkforce" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California Legislative Analyst&apos;s Office - State Workforce Reports
            </a>
          </li>
          <li>
            <a 
              href="https://dof.ca.gov/forecasting/demographics/state-and-county-population-projections/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California Department of Finance - Employment Data
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
} 