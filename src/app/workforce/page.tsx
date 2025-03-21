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

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AgencyDataVisualization from './AgencyDataVisualization';
import type { DepartmentData, DepartmentHierarchy } from '@/types/department';
import { getDepartmentByName } from '@/lib/departmentMapping';

// Fetch departments from API
async function fetchDepartments(): Promise<DepartmentData[]> {
  const response = await fetch('/api/departments');
  if (!response.ok) {
    throw new Error('Failed to fetch departments');
  }
  return response.json();
}

function buildHierarchy(departments: DepartmentData[]): DepartmentHierarchy {
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
    subDepartments: [],
    subordinateOffices: 0
  };

  // Create maps for lookup
  const deptMap = new Map<string, DepartmentHierarchy>();
  const levelMap = new Map<number, DepartmentHierarchy[]>();
  const aliasMap = new Map<string, DepartmentHierarchy>();
  
  // First pass: Initialize all departments and build lookup maps
  departments.forEach(dept => {
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

  // Calculate subordinate offices
  const calculateSubordinates = (dept: DepartmentHierarchy): number => {
    if (!dept.subDepartments) return 0;
    dept.subordinateOffices = dept.subDepartments.reduce((sum: number, child: DepartmentHierarchy) => 
      sum + calculateSubordinates(child) + 1, 0);
    return dept.subordinateOffices;
  };
  calculateSubordinates(root);

  return root;
}

// Filter inactive departments
function filterInactiveDepartments(departments: DepartmentHierarchy[], showInactive: boolean): DepartmentHierarchy[] {
  if (!departments) return [];
  
  return departments.map(dept => {
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
  // Check if this department is the currently selected item
  const isActiveItem = activeAgencyPath.length === parentPath.length + 1 && 
    activeAgencyPath[parentPath.length] === department.name;
  
  // Show chart only when this department is specifically selected
  const showChart = isActiveItem;
  
  // Always show subdepartments
  const showSubDepartments = true;
  
  const fullPath = [...parentPath, department.name];
  
  return (
    <div>
      <DepartmentCard 
        department={department}
        isActive={isActiveItem}
        onClick={() => onDepartmentClick(fullPath)}
        showChart={showChart}
      />
      
      {department.subDepartments && showSubDepartments && (
        <div className="grid grid-cols-1 gap-4 mt-4 ml-4">
          {department.subDepartments.map((subDept) => (
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

// Client component that uses useSearchParams
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
  const [hierarchyData, setHierarchyData] = useState<DepartmentHierarchy | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch departments and build hierarchy
  useEffect(() => {
    async function loadDepartments() {
    try {
        setIsLoading(true);
        setError(null);
        const departments = await fetchDepartments();
        const hierarchy = buildHierarchy(departments);
      setHierarchyData(hierarchy);
      } catch (err) {
        console.error('Error loading departments:', err);
        setError('Failed to load department data');
      } finally {
        setIsLoading(false);
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
        setSelectedDepartmentName(departmentParam);
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
  
  if (isLoading || !hierarchyData) {
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">California State Government Workforce</h1>
        
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
      </div>
      
      {/* Child departments */}
      {childDepartments.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">
            {currentActiveDepartment?.name} Subdepartments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {childDepartments.map((dept: DepartmentHierarchy) => (
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

      {/* Sources */}
      <div className="mt-16">
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