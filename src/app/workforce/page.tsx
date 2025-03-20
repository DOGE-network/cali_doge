// Level 0: California State Government
// Level 1: Executive, Legislative, Judicial Branches
// Level 2: Branch-specific sub-organizations
// Level 3: Categories (Superagencies and Departments, etc.)
// Level 4: Agencies (Department of General Services, etc.)

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
import departmentsData from '@/data/departments.json';
import { DepartmentsJSON } from '@/types/department';
import type { Agency } from '@/types/agency';
import type { WorkforceData } from '@/types/workforce';
import { getDepartmentByName, normalizeForMatching } from '@/lib/departmentMapping';

// Cast imported data to proper types
const typedDepartmentsData = {
  departments: departmentsData.departments.map(dept => ({
    ...dept,
    org_level: dept.org_level || 0,
    budget_status: dept.budget_status || 'active',
    keyFunctions: dept.keyFunctions || '',
    abbreviation: dept.abbreviation || '',
    parentAgency: dept.parentAgency || '',
    spending: dept.spending ? {
      yearly: Object.fromEntries(
        Object.entries(dept.spending.yearly || {}).map(([key, value]) => [key, String(value)])
      ),
      stateOperations: Object.fromEntries(
        Object.entries(dept.spending.stateOperations || {}).map(([key, value]) => [key, String(value)])
      )
    } : undefined,
    workforce: dept.workforce ? {
      ...dept.workforce,
      averageTenureYears: dept.workforce.averageTenureYears || undefined
    } : undefined
  }))
} as DepartmentsJSON;

// Helper function to create agency from department
const createAgencyFromDepartment = (dept: any): Agency => {
  // Get workforce data with proper null checks
  const workforceData = dept.workforce || {};
  const headCountYearly = workforceData.headCount?.yearly || {};
  const wagesYearly = workforceData.wages?.yearly || {};

  return {
    name: dept.name,
    org_level: dept.org_level || 4,
    budget_status: dept.budget_status || "active",
    description: dept.keyFunctions,
    abbreviation: dept.abbreviation,
    subAgencies: [],
    employeeData: {
      headCount: Object.entries(headCountYearly)
        .filter(([year, count]) => year && count !== null)
        .map(([year, count]) => ({
          year: year.toString(),
          count: count as number
        })),
      wages: Object.entries(wagesYearly)
        .filter(([year, amount]) => year && amount !== null)
        .map(([year, amount]) => ({
          year: year.toString(),
          amount: amount as number
        })),
      averageTenure: workforceData.averageTenureYears || null,
      averageSalary: workforceData.averageSalary || null,
      averageAge: workforceData.averageAge || null,
      tenureDistribution: workforceData.tenureDistribution || null,
      salaryDistribution: workforceData.salaryDistribution || null,
      ageDistribution: workforceData.ageDistribution || null
    }
  };
};

// Build hierarchy from departments data
const buildHierarchy = (): Agency => {
  // Create root agency (California State Government)
  const root: Agency = createAgencyFromDepartment(
    typedDepartmentsData.departments.find(d => d.name === "California State Government") || {
      name: "California State Government",
      org_level: 0,
      budget_status: "active"
    }
  );

  // Create main branches (Level 1)
  const branches: Record<string, Agency> = {
    "Executive Branch": {
      name: "Executive Branch",
      org_level: 1,
      budget_status: "active",
      subAgencies: [],
      description: "Executive branch of California state government"
    },
    "Legislative Branch": {
      name: "Legislative Branch",
      org_level: 1,
      budget_status: "active",
      subAgencies: [],
      description: "Legislative branch of California state government"
    },
    "Judicial Branch": {
      name: "Judicial Branch",
      org_level: 1,
      budget_status: "active",
      subAgencies: [],
      description: "Judicial branch of California state government"
    }
  };

  // Group departments by org_level
  const departmentsByLevel: Record<number, any[]> = {};
  typedDepartmentsData.departments.forEach(dept => {
    if (dept.name === "California State Government") return; // Skip root
    
    const level = dept.org_level || 4; // Default to level 4 if not specified
    if (!departmentsByLevel[level]) {
      departmentsByLevel[level] = [];
    }
    departmentsByLevel[level].push(dept);
  });

  // Create a map to store all agencies by name for easy lookup
  const agencyMap: Record<string, Agency> = {
    "Executive Branch": branches["Executive Branch"],
    "Legislative Branch": branches["Legislative Branch"],
    "Judicial Branch": branches["Judicial Branch"]
  };

  // Process departments level by level (2 through 4)
  [2, 3, 4].forEach(level => {
    const depts = departmentsByLevel[level] || [];
    depts.forEach(dept => {
      const agency = createAgencyFromDepartment(dept);
      agencyMap[dept.name] = agency;

      // Find parent agency
      const parentName = dept.parentAgency;
      if (parentName) {
        let parentAgency = agencyMap[parentName];
        
        // If parent doesn't exist yet, create it
        if (!parentAgency) {
          parentAgency = {
            name: parentName,
            org_level: level - 1,
            budget_status: "active",
            subAgencies: [],
            description: `Parent agency for ${dept.name}`
          };
          agencyMap[parentName] = parentAgency;
          
          // Add to Executive Branch by default if not already under another branch
          if (!["Legislative Branch", "Judicial Branch"].includes(parentName)) {
            if (!branches["Executive Branch"].subAgencies) {
              branches["Executive Branch"].subAgencies = [];
            }
            branches["Executive Branch"].subAgencies.push(parentAgency);
          }
        }
        
        // Ensure parent agency has subAgencies array
        if (!parentAgency.subAgencies) {
          parentAgency.subAgencies = [];
        }
        
        // Add this agency to its parent
        parentAgency.subAgencies.push(agency);
      } else {
        // If no parent specified, add to Executive Branch by default
        if (!branches["Executive Branch"].subAgencies) {
          branches["Executive Branch"].subAgencies = [];
        }
        branches["Executive Branch"].subAgencies.push(agency);
      }
    });
  });

  // Add branches to root
  root.subAgencies = Object.values(branches);

  // Calculate subordinate offices
  const calculateSubordinateOffices = (agency: Agency): number => {
    if (!agency.subAgencies || agency.subAgencies.length === 0) {
      return 0;
    }
    const directSubordinates = agency.subAgencies.length;
    const nestedSubordinates = agency.subAgencies.reduce(
      (sum, subAgency) => sum + calculateSubordinateOffices(subAgency),
      0
    );
    agency.subordinateOffices = directSubordinates + nestedSubordinates;
    return agency.subordinateOffices;
  };

  calculateSubordinateOffices(root);
  return root;
};

// Filter inactive agencies
const filterInactiveAgencies = (agencies: Agency[] | undefined, showInactive: boolean): Agency[] => {
  if (!agencies) return [];
  
  return agencies.map(agency => {
    if (showInactive) return agency;
    if (agency.budget_status === 'inactive') return null;
    
    if (agency.subAgencies) {
      const filteredSubs = filterInactiveAgencies(agency.subAgencies, showInactive);
      return {...agency, subAgencies: filteredSubs.filter(Boolean)};
    }
    
    return agency;
  }).filter(Boolean) as Agency[];
};

// Remove or prefix unused functions with underscore
const _logAgencyHierarchy = (agencies: Agency[], level = 0) => {
  agencies.forEach(agency => {
    console.log(
      '  '.repeat(level) + 
      `${agency.name}${agency.subordinateOffices ? ` (${agency.subordinateOffices} offices)` : ''}`
    );
    if (agency.subAgencies) {
      _logAgencyHierarchy(agency.subAgencies, level + 1);
    }
  });
};

// Remove or prefix unused functions with underscore
const _findAgencyByNameRecursive = (
  agencies: Agency[], 
  targetName: string, 
  path: string[] = []
): { agency: Agency | null; path: string[] } => {
  for (const agency of agencies) {
    const currentPath = [...path, agency.name];
    
    if (agency.name === targetName) {
      return { agency, path: currentPath };
    }
    
    if (agency.subAgencies) {
      const found = _findAgencyByNameRecursive(agency.subAgencies, targetName, currentPath);
      if (found.agency) {
        return found;
      }
    }
  }
  
  return { agency: null, path: [] };
};

// Update the mergeAgencyData function to handle the array structure
const mergeAgencyData = (structure: Agency[]): Agency[] => {
  console.log('Starting new data merge process...');
  
  // Function to find matching data in the departments data array
  const findMatchingData = (name: string): any => {
    // Try direct match
    let match = typedDepartmentsData.departments.find(d => d.name === name);
    
    // Try with canonical name
    if (!match) {
      match = typedDepartmentsData.departments.find(d => d.canonicalName === name);
    }
    
    // Try with aliases
    if (!match) {
      match = typedDepartmentsData.departments.find(d => 
        d.aliases && d.aliases.includes(name)
      );
    }
    
    // Try with normalized name (removing 'California', 'Department of', etc.)
    if (!match) {
      const normalizedName = normalizeForMatching(name);
      match = typedDepartmentsData.departments.find(d => 
        normalizeForMatching(d.name) === normalizedName || 
        normalizeForMatching(d.canonicalName) === normalizedName ||
        (d.aliases && d.aliases.some(alias => normalizeForMatching(alias) === normalizedName))
      );
    }
    
    return match;
  };

  // Function to apply agency data recursively
  const applyAgencyData = (agency: Agency): Agency => {
    // Find matching data for this agency
    const agencyData = findMatchingData(agency.name);
    
    // If we found matching data, apply it to the agency
    if (agencyData?.workforce) {
      const workforceData = agencyData.workforce as WorkforceData;
      agency.employeeData = {
        headCount: Object.entries(workforceData.headCount?.yearly || {})
          .filter(([year, count]) => year && count !== null)
          .map(([year, count]) => ({
            year: year.toString(),
            count: count as number
          })),
        wages: Object.entries(workforceData.wages?.yearly || {})
          .filter(([year, amount]) => year && amount !== null)
          .map(([year, amount]) => ({
            year: year.toString(),
            amount: amount as number
          })),
        averageTenure: workforceData.averageTenureYears || null,
        averageSalary: workforceData.averageSalary || null,
        averageAge: workforceData.averageAge || null,
        tenureDistribution: workforceData.tenureDistribution || null,
        salaryDistribution: workforceData.salaryDistribution || null,
        ageDistribution: workforceData.ageDistribution || null
      };
    } else {
      // If no matching data found, ensure we have a valid employeeData structure
      agency.employeeData = {
        headCount: [],
        wages: [],
        averageTenure: null,
        averageSalary: null,
        averageAge: null,
        tenureDistribution: null,
        salaryDistribution: null,
        ageDistribution: null
      };
    }
    
    // Recursively apply to subagencies
    if (agency.subAgencies) {
      agency.subAgencies = agency.subAgencies.map(subAgency => 
        applyAgencyData(subAgency)
      );
    }
    
    return agency;
  };

  // Apply data to all agencies in the structure
  return structure.map(agency => applyAgencyData(agency));
};

function AgencyCard({ 
  agency, 
  isActive, 
  onClick,
  showChart
}: { 
  agency: Agency;
  isActive: boolean;
  onClick: () => void;
  showChart: boolean;
}) {
  return (
    <div className={`space-y-4 ${isActive ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
      <div 
        className={`p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow ${agency.budget_status === 'inactive' ? 'bg-gray-100 opacity-75' : 'bg-white'} cursor-pointer relative`}
        onClick={onClick}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {agency.name}
              {agency.abbreviation && <span className="ml-2 text-sm text-gray-500">({agency.abbreviation})</span>}
              {agency.budget_status === 'inactive' && <span className="ml-2 text-xs text-gray-500 italic">(inactive)</span>}
              {agency.budget_code && (
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {agency.budget_code}
                </span>
              )}
            </h3>
            {agency.description && (
              <p className="mt-2 text-sm text-gray-600">{agency.description}</p>
            )}
          </div>
          {agency.subordinateOffices !== undefined && agency.subordinateOffices > 0 && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">{agency.subordinateOffices}</span>
            </div>
          )}
        </div>
      </div>
      {showChart && (
        <div className="chart-wrapper">
          <AgencyDataVisualization agency={agency} />
        </div>
      )}
    </div>
  );
}

function _AgencySection({ 
  section, 
  activeAgencyPath,
  onAgencyClick
}: { 
  section: Agency;
  activeAgencyPath: string[];
  onAgencyClick: { (_paths: string[]): void };
}) {
  // Check if this section is in the active path
  const isInActivePath = activeAgencyPath.length > 0 && activeAgencyPath[0] === section.name;
  
  // Check if this section is the currently selected item
  const isActiveItem = activeAgencyPath.length === 1 && activeAgencyPath[0] === section.name;
  
  // Show Executive Branch chart when:
  // 1. Nothing is selected (activeAgencyPath.length === 0)
  // 2. Executive Branch is specifically selected
  const showChart = section.name === "Executive Branch" && 
    (activeAgencyPath.length === 0 || isActiveItem);

  // Show subagencies when:
  // 1. This is Executive Branch (always show its immediate children)
  // 2. This section is in the active path
  const showSubAgencies = section.name === "Executive Branch" || isInActivePath;

  return (
    <div className="mb-8">
      <AgencyCard 
        agency={section}
        isActive={isActiveItem}
        onClick={() => onAgencyClick([section.name])}
        showChart={showChart}
      />
      
      {section.subAgencies && showSubAgencies && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {section.subAgencies.map((agency, index) => (
            <div key={index} className="ml-4">
              <SubAgencySection
                agency={agency}
                parentPath={[section.name]}
                activeAgencyPath={activeAgencyPath}
                onAgencyClick={onAgencyClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubAgencySection({ 
  agency, 
  parentPath,
  activeAgencyPath,
  onAgencyClick
}: { 
  agency: Agency;
  parentPath: string[];
  activeAgencyPath: string[];
  onAgencyClick: (_path: string[]) => void;
}) {
  const currentPath = [...parentPath, agency.name];
  
  // Check if this agency is the currently selected item
  const isActiveItem = activeAgencyPath.length === currentPath.length &&
    currentPath.every((name, i) => activeAgencyPath[i] === name);
  
  // Check if this agency is in the active path
  const isInActivePath = activeAgencyPath.length >= currentPath.length &&
    currentPath.every((name, i) => activeAgencyPath[i] === name);

  // Show chart only for the actively selected item
  const showChart = isActiveItem;

  // Show subagencies only if this is in the active path
  const showSubAgencies = isInActivePath;

  return (
    <div className="flex flex-col gap-2">
      <AgencyCard
        agency={agency}
        isActive={isActiveItem}
        onClick={() => onAgencyClick(currentPath)}
        showChart={showChart}
      />

      {showSubAgencies && agency?.subAgencies && (
        <div className="pl-4">
          {agency.subAgencies.map((subAgency, index) => (
            <SubAgencySection
              key={`${subAgency.name}-${index}`}
              agency={subAgency}
              parentPath={currentPath}
              activeAgencyPath={activeAgencyPath}
              onAgencyClick={onAgencyClick}
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
  const [selectedAgencyName, setSelectedAgencyName] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [_activeAgency, setActiveAgency] = useState<Agency | null>(null);
  const [activePath, setActivePath] = useState<string[]>([]);
  const [hierarchyData, setHierarchyData] = useState<Agency | null>(null);
  
  // Build hierarchy from departments data
  useEffect(() => {
    try {
      const hierarchy = buildHierarchy();
      setHierarchyData(hierarchy);
    } catch (error) {
      console.error('Error building hierarchy:', error);
    }
  }, []);
  
  // Get the department from URL query parameter
  useEffect(() => {
    const agencyParam = searchParams.get('agency');
    const departmentParam = searchParams.get('department');
    
    console.log('Workforce page params:', { agencyParam, departmentParam });
    
    if (departmentParam) {
      console.log(`Setting selected agency name to department: ${departmentParam}`);
      
      // Try to get the department by name to handle mapping
      const dept = getDepartmentByName(departmentParam);
      
      if (dept) {
        // If we have aliases, we might need to map to the primary name
        if (dept.aliases && dept.aliases.includes(departmentParam) && dept.name !== departmentParam) {
          console.log(`Mapped department name from ${departmentParam} to ${dept.name}`);
          setSelectedAgencyName(dept.name);
        } else {
          // No mapping needed, use as is
          setSelectedAgencyName(departmentParam);
        }
      } else {
        // No mapping, use as is
        setSelectedAgencyName(departmentParam);
      }
    } else if (agencyParam) {
      console.log(`Setting selected agency name to agency: ${agencyParam}`);
      setSelectedAgencyName(agencyParam);
    }
  }, [searchParams]);
  
  // When selectedAgencyName or hierarchyData changes, find the active agency
  useEffect(() => {
    if (!hierarchyData || !hierarchyData.subAgencies) return;
    
    if (!selectedAgencyName) {
      // If no agency is selected, set the root as active
      setActiveAgency(hierarchyData);
      setActivePath([hierarchyData.name]);
      return;
    }
    
    // Function to find agency by name in hierarchy
    const findAgencyByName = (
      agencies: Agency[], 
      targetName: string, 
      currentPath: string[] = []
    ): { agency: Agency | null; path: string[] } => {
      console.log(`Looking for agency: "${targetName}"`);
      
      for (const agency of agencies) {
        const updatedPath = [...currentPath, agency.name];
        
        console.log(`Checking against: "${agency.name}"`);
        
        if (agency.name === targetName) {
          console.log(`Found exact match for "${targetName}"`);
          return { agency, path: updatedPath };
        }
        
        if (agency.subAgencies) {
          const result = findAgencyByName(agency.subAgencies, targetName, updatedPath);
          if (result.agency) {
            return result;
          }
        }
      }
      
      console.log(`No match found for "${targetName}"`);
      return { agency: null, path: [] };
    };
    
    // First check if the root itself is selected
    if (selectedAgencyName === hierarchyData.name) {
      setActiveAgency(hierarchyData);
      setActivePath([hierarchyData.name]);
      return;
    }
    
    // Otherwise search through subagencies
    const result = findAgencyByName(
      hierarchyData.subAgencies,
      selectedAgencyName,
      [hierarchyData.name]
    );
    
    if (result.agency) {
      setActiveAgency(result.agency);
      setActivePath(result.path);
    } else {
      // If not found in hierarchy, check workforce data directly
      console.log(`Agency "${selectedAgencyName}" not found in hierarchy, checking workforce data...`);
      
      // Find in workforce data
      const workforceDept = typedDepartmentsData.departments.find(dept => dept.name === selectedAgencyName);
      
      if (workforceDept) {
        console.log(`Found "${selectedAgencyName}" in workforce data`);
        // Create a synthetic agency for this department
        const syntheticAgency: Agency = {
          name: workforceDept.name,
          org_level: 4, // Assume it's a department-level entity
          budget_status: "active",
          employeeData: workforceDept.workforce ? {
            headCount: workforceDept.workforce.yearlyHeadCount?.map(item => ({
              year: item.year,
              count: item.headCount
            })),
            wages: workforceDept.workforce.yearlyWages?.map(item => ({
              year: item.year,
              amount: item.wages
            })),
            averageTenure: workforceDept.workforce.averageTenureYears,
            averageSalary: workforceDept.workforce.averageSalary,
            averageAge: workforceDept.workforce.averageAge,
            tenureDistribution: workforceDept.workforce.tenureDistribution,
            salaryDistribution: workforceDept.workforce.salaryDistribution,
            ageDistribution: workforceDept.workforce.ageDistribution
          } : undefined
        };
        
        setActiveAgency(syntheticAgency);
        // Use a path that includes the root and this agency
        setActivePath([hierarchyData.name, syntheticAgency.name]);
      } else {
        console.log(`"${selectedAgencyName}" not found in workforce data either, defaulting to root`);
        // If not found, default to root
        setActiveAgency(hierarchyData);
        setActivePath([hierarchyData.name]);
      }
    }
  }, [selectedAgencyName, hierarchyData]);
  
  // Handle agency selection
  const handleSelectAgency = (agency: Agency) => {
    setSelectedAgencyName(agency.name);
  };
  
  if (!hierarchyData) {
    return <div className="p-4">Loading workforce data...</div>;
  }
  
  // Filter inactive agencies if needed
  const _filteredHierarchy = {
    ...hierarchyData,
    subAgencies: filterInactiveAgencies(hierarchyData.subAgencies, showInactive)
  };
  
  // Merge with workforce data
  const agenciesWithData = [hierarchyData];
  const mergedAgencies = mergeAgencyData(agenciesWithData);
  const enrichedHierarchy = mergedAgencies[0];
  
  // Get path agencies to display
  const pathAgencies: Agency[] = [];
  let currentAgencies = [enrichedHierarchy];
  
  for (let i = 0; i < activePath.length; i++) {
    const currentName = activePath[i];
    const foundAgency = currentAgencies.find(a => a.name === currentName);
    
    if (foundAgency) {
      pathAgencies.push(foundAgency);
      if (foundAgency.subAgencies) {
        currentAgencies = foundAgency.subAgencies;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  // The last agency in the path is the active one
  const currentActiveAgency = pathAgencies.length > 0 ? pathAgencies[pathAgencies.length - 1] : null;
  
  // Child agencies of the active agency (to display below)
  let childAgencies = currentActiveAgency && currentActiveAgency.subAgencies 
    ? currentActiveAgency.subAgencies 
    : [];
  
  // Apply active-only filter if needed
  if (!showInactive) {
    childAgencies = childAgencies.filter(a => a.budget_status !== 'inactive');
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">California State Government Workforce</h1>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 border rounded-full p-1 bg-gray-100">
            <button
              className={`rounded-full px-3 py-1 text-xs ${showInactive ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Show Active Only' : 'Show All'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mb-10">
        <nav className="mb-4">
          <ol className="flex flex-wrap items-center">
            {pathAgencies.map((agency, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-gray-400">/</span>
                )}
                <button 
                  onClick={() => handleSelectAgency(agency)}
                  className={`text-sm ${
                    index === pathAgencies.length - 1 
                      ? 'font-bold text-blue-600' 
                      : 'text-gray-600 hover:text-blue-500'
                  }`}
                >
                  {agency.name}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        
        {/* Active agency card with visualization */}
        {currentActiveAgency && (
          <div className="mb-6">
            <AgencyCard 
              agency={currentActiveAgency} 
              isActive={true} 
              onClick={() => {}} 
              showChart={true} 
            />
          </div>
        )}
      </div>
      
      {/* Child agencies */}
      {childAgencies && childAgencies.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">
            {currentActiveAgency?.name} Subagencies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {childAgencies.map((agency, index) => (
              <AgencyCard 
                key={index} 
                agency={agency} 
                isActive={false} 
                onClick={() => handleSelectAgency(agency)} 
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