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
import AgencyDataVisualization from './AgencyDataVisualization';
import agencyData from '@/data/workforce-data.json';
import executiveBranchData from '@/data/executive-branch-hierarchy.json';
import type { Agency } from './types';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

// Convert executive branch JSON to Agency structure
const convertExecutiveBranchToAgency = (data: any): Agency => {
  // Create top-level agency
  const agency: Agency = {
    name: data.name || "California State Government",
    org_level: data.org_level || 0,
    budget_status: data.budget_status || "active",
    subAgencies: []
  };

  // Count total subordinate offices
  let totalSubordinateOffices = 0;

  // Process the branches (Executive, Legislative, Judicial)
  if (data.subAgencies && Array.isArray(data.subAgencies)) {
    data.subAgencies.forEach((branch: any) => {
      const branchAgency: Agency = {
        name: branch.name,
        org_level: branch.org_level,
        budget_status: branch.budget_status || "active",
        subAgencies: []
      };

      let branchSubordinateOffices = 0;
      
      // Handle Executive Branch's special structure (object with categories)
      if (branch.name === "Executive Branch" && branch.subAgencies && typeof branch.subAgencies === 'object' && !Array.isArray(branch.subAgencies)) {
        // Process each category of sub-agencies
        Object.entries(branch.subAgencies).forEach(([category, categoryAgencies]: [string, any]) => {
          // Create a category agency
          const categoryAgency: Agency = {
            name: category,
            org_level: 3, // Categories are level 3 under Executive
            budget_status: "active",
            subAgencies: []
          };

          // Count subordinate offices for this category
          let categorySubordinateOffices = 0;

          // Process agencies in this category
          categoryAgencies.forEach((subAgencyData: any) => {
            // Count this agency as a subordinate office
            categorySubordinateOffices++;
            
            // Count sub-sub-agencies for this agency
            let subAgencySubordinateOffices = 0;
            if (subAgencyData.subAgencies && Array.isArray(subAgencyData.subAgencies)) {
              subAgencySubordinateOffices = subAgencyData.subAgencies.length;
            }

            const subAgency: Agency = {
              name: subAgencyData.name,
              org_level: subAgencyData.org_level,
              budget_status: subAgencyData.budget_status || "active",
              description: subAgencyData.keyFunctions,
              subordinateOffices: subAgencySubordinateOffices
            };

            // Process sub-sub-agencies if they exist
            if (subAgencyData.subAgencies && Array.isArray(subAgencyData.subAgencies)) {
              subAgency.subAgencies = subAgencyData.subAgencies.map((subSubAgencyData: any) => ({
                name: subSubAgencyData.name,
                org_level: subSubAgencyData.org_level,
                budget_status: subSubAgencyData.budget_status || "active",
                description: subSubAgencyData.keyFunctions,
                abbreviation: subSubAgencyData.abbreviation,
                subordinateOffices: 0 // Leaf nodes have no subordinates
              }));
            }

            categoryAgency.subAgencies?.push(subAgency);
          });

          // Set subordinate offices count for this category
          categoryAgency.subordinateOffices = categorySubordinateOffices;
          branchSubordinateOffices += categorySubordinateOffices;

          branchAgency.subAgencies?.push(categoryAgency);
        });
      } 
      // Handle other branches with simple array structure
      else if (branch.subAgencies && Array.isArray(branch.subAgencies)) {
        branchAgency.subAgencies = branch.subAgencies.map((subAgencyData: any) => {
          const subAgency: Agency = {
            name: subAgencyData.name,
            org_level: subAgencyData.org_level,
            budget_status: subAgencyData.budget_status || "active",
            description: subAgencyData.keyFunctions || subAgencyData.entity,
            subordinateOffices: 0
          };

          // If this sub-agency has its own sub-agencies, process them
          if (subAgencyData.subAgencies && Array.isArray(subAgencyData.subAgencies)) {
            subAgency.subordinateOffices = subAgencyData.subAgencies.length;
            branchSubordinateOffices += subAgency.subordinateOffices || 0;

            subAgency.subAgencies = subAgencyData.subAgencies.map((subSubAgencyData: any) => ({
              name: subSubAgencyData.name,
              org_level: subSubAgencyData.org_level,
              budget_status: subSubAgencyData.budget_status || "active",
              description: subSubAgencyData.keyFunctions,
              subordinateOffices: 0
            }));
          }

          branchSubordinateOffices++;
          return subAgency;
        });
      }

      // Set subordinate offices count for this branch
      branchAgency.subordinateOffices = branchSubordinateOffices;
      totalSubordinateOffices += branchSubordinateOffices;

      agency.subAgencies?.push(branchAgency);
    });
  }

  // Set total subordinate offices for the government
  agency.subordinateOffices = totalSubordinateOffices;

  return agency;
};

// Function to filter inactive agencies
const filterInactiveAgencies = (agencies: Agency[] | undefined, showInactive: boolean): Agency[] => {
  if (!agencies) return [];
  
  return agencies.map(agency => {
    // Skip filtering if we're showing all
    if (showInactive) return agency;
    
    // Filter out inactive agencies
    if (agency.budget_status === 'inactive') return null;
    
    // Recursively filter subagencies
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
const mergeAgencyData = (structure: Agency[], data: any[]): Agency[] => {
  if (!data || !Array.isArray(data)) {
    console.log('No valid data provided for merging');
    return structure;
  }
  
  console.log('Starting new data merge process...');
  
  // Map special cases - known naming differences between the two data sets
  const specialCaseMap: Record<string, string> = {
    "California State Government": "California Government",
    "Executive Branch": "California Government",
    "Government Operations Agency": "Government Operations",
    "Labor & Workforce Development": "Labor and Workforce Development Agency"
  };

  // Function to find matching data in the workforce data array
  const findMatchingData = (name: string): any => {
    // Try direct match
    let match = data.find(d => d.name === name);
    
    // Try special case mapping if no direct match
    if (!match && specialCaseMap[name]) {
      match = data.find(d => d.name === specialCaseMap[name]);
    }
    
    return match;
  };

  // Function to apply agency data recursively
  const applyAgencyData = (agency: Agency): Agency => {
    const matchingData = findMatchingData(agency.name);
    
    if (matchingData) {
      console.log(`📍 Found matching data for ${agency.name}`);
      
      // Create merged agency with data from matching agency
      const merged: Agency = {
        ...agency,
        yearlyHeadCount: matchingData.yearlyHeadCount,
        yearlyWages: matchingData.yearlyWages,
        tenureDistribution: matchingData.tenureDistribution,
        salaryDistribution: matchingData.salaryDistribution,
        ageDistribution: matchingData.ageDistribution,
        averageTenureYears: matchingData.averageTenureYears,
        averageSalary: matchingData.averageSalary,
        averageAge: matchingData.averageAge,
      };
      
      // Process subagencies if they exist
      if (agency.subAgencies) {
        merged.subAgencies = agency.subAgencies.map(subAgency => 
          applyAgencyData(subAgency)
        );
      }
      
      return merged;
    }
    
    // No matching data found, but still process subagencies
    if (agency.subAgencies) {
      return {
        ...agency,
        subAgencies: agency.subAgencies.map(subAgency => applyAgencyData(subAgency))
      };
    }
    
    // Return original agency if no match and no subagencies
    return agency;
  };
  
  // Process the entire structure
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
  
  // Convert executive branch data to agency hierarchy
  useEffect(() => {
    try {
      const converted = convertExecutiveBranchToAgency(executiveBranchData);
      setHierarchyData(converted);
    } catch (error) {
      console.error('Error converting hierarchy data:', error);
    }
  }, []);
  
  // Get the department from URL query parameter
  useEffect(() => {
    const agencyParam = searchParams.get('agency');
    const departmentParam = searchParams.get('department');
    
    if (departmentParam) {
      setSelectedAgencyName(departmentParam);
    } else if (agencyParam) {
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
      for (const agency of agencies) {
        const updatedPath = [...currentPath, agency.name];
        
        if (agency.name === targetName) {
          return { agency, path: updatedPath };
        }
        
        if (agency.subAgencies) {
          const result = findAgencyByName(agency.subAgencies, targetName, updatedPath);
          if (result.agency) {
            return result;
          }
        }
      }
      
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
      // If not found, default to root
      setActiveAgency(hierarchyData);
      setActivePath([hierarchyData.name]);
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
  const mergedAgencies = mergeAgencyData(agenciesWithData, agencyData.departments);
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
  const childAgencies = currentActiveAgency && currentActiveAgency.subAgencies 
    ? showInactive 
      ? currentActiveAgency.subAgencies 
      : currentActiveAgency.subAgencies.filter(a => a.budget_status !== 'inactive')
    : [];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">California State Government Workforce</h1>
        <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
          <Button
            variant={showInactive ? "ghost" : "secondary"}
            size="sm"
            className={`rounded-full text-xs ${!showInactive ? 'bg-white shadow-sm' : ''}`}
            onClick={() => setShowInactive(false)}
          >
            Active Only
          </Button>
          <Button
            variant={showInactive ? "secondary" : "ghost"}
            size="sm"
            className={`rounded-full text-xs ${showInactive ? 'bg-white shadow-sm' : ''}`}
            onClick={() => setShowInactive(true)}
          >
            Include Inactive
          </Button>
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
      <div className="mt-12 pt-8 border-t">
        <h3 className="text-lg font-semibold mb-2">Sources</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600">
          {agencyData.sources.map((source, index) => (
            <li key={index}>
              <a 
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 