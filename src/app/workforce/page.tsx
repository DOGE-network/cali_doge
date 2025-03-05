// Level 0: Executive Branch
// Level 1: Categories (Superagencies and Departments, etc.)
// Level 2: Agencies (Government Operations Agency, etc.)
// Level 3: Sub-agencies (Department of General Services, etc.)

// When nothing is selected:
// - Show Executive Branch (Level 0). show data and charts.
// - Show Categories (Level 1) no data or charts
// - Hide everything else

// When something is selected:
// Always show the path to root, ancestors. ancestors do not display data or charts. 
// always show the active card, data and charts
// if no json data display ~
// if no json chart data then display no-data-yet svg for each chart missing data
// Show only immediate children of active card. do not display data
// Hide all other branches

'use client';

import React, { useState, useEffect } from 'react';
import AgencyDataVisualization from './AgencyDataVisualization';
import agencyData from '@/data/workforce-data.json';
import executiveBranchData from '@/data/executive-branch-hierarchy.json';
import type { Agency } from './types';

// Convert executive branch JSON to Agency structure
const convertExecutiveBranchToAgency = (data: any): Agency => {
  const agency: Agency = {
    name: data.agencyName,
    subAgencies: []
  };

  // Count total subordinate offices
  let totalSubordinateOffices = 0;

  // Process each category of sub-agencies
  if (data.subAgencies) {
    // For each category (Superagencies, Standalone Departments, etc.)
    Object.entries(data.subAgencies).forEach(([category, categoryAgencies]: [string, any]) => {
      // Create a category agency
      const categoryAgency: Agency = {
        name: category,
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
          description: subAgencyData.keyFunctions,
          subordinateOffices: subAgencySubordinateOffices
        };

        // Process sub-sub-agencies if they exist
        if (subAgencyData.subAgencies && Array.isArray(subAgencyData.subAgencies)) {
          subAgency.subAgencies = subAgencyData.subAgencies.map((subSubAgencyData: any) => ({
            name: subSubAgencyData.name,
            description: subSubAgencyData.keyFunctions,
            abbreviation: subSubAgencyData.abbreviation,
            subordinateOffices: 0 // Leaf nodes have no subordinates
          }));
        }

        categoryAgency.subAgencies?.push(subAgency);
      });

      // Set subordinate offices count for this category
      categoryAgency.subordinateOffices = categorySubordinateOffices;
      totalSubordinateOffices += categorySubordinateOffices;

      agency.subAgencies?.push(categoryAgency);
    });
  }

  // Set total subordinate offices for the executive branch
  agency.subordinateOffices = totalSubordinateOffices;

  return agency;
};

// Convert executive branch data to Agency structure
const executiveBranch = convertExecutiveBranchToAgency(executiveBranchData);

const agencyStructure: Agency[] = [
  {
    name: "Executive Branch",
    subAgencies: executiveBranch.subAgencies,
    subordinateOffices: executiveBranch.subordinateOffices
  }
];

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
        headCount: matchingData.headCount,
        totalWages: matchingData.totalWages,
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
        className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer relative"
        onClick={onClick}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {agency.name}
              {agency.abbreviation && <span className="ml-2 text-sm text-gray-500">({agency.abbreviation})</span>}
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

function AgencySection({ 
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

const Page = () => {
  const [mergedStructure, setMergedStructure] = useState<Agency[]>(agencyStructure);
  const [activeAgencyPath, setActiveAgencyPath] = useState<string[]>([]);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
  const isDevEnv = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Add debug logging for initial data
    console.log('📍 Initial agencyData:', agencyData);
    console.log('📍 Initial agencyStructure:', agencyStructure);
    
    const merged = mergeAgencyData(agencyStructure, agencyData);
    console.log('📍 Merged structure:', merged);
    setMergedStructure(merged);
  }, []);

  const handleAgencyClick = (path: string[]) => {
    console.log("👆 Agency clicked:", path, "Current active path:", activeAgencyPath);
    
    // Get the path as a string for comparison
    const clickedPathString = path.join('/');
    const currentPathString = activeAgencyPath.join('/');
    
    // Toggle selection: If already selected, clear selection
    if (clickedPathString === currentPathString) {
      console.log("👆 Clearing selection");
      setActiveAgencyPath([]);
    } else {
      console.log("👆 Setting new active path:", path);
      setActiveAgencyPath(path);
    }
  };

  // Helper function to find agency by path
  const findAgencyByPath = (path: string[], agencies: Agency[]): Agency | null => {
    if (path.length === 0 || agencies.length === 0) return null;
    
    const targetAgency = agencies.find(a => a.name === path[0]);
    if (!targetAgency) return null;
    
    if (path.length === 1) return targetAgency;
    
    if (targetAgency.subAgencies && targetAgency.subAgencies.length > 0) {
      return findAgencyByPath(path.slice(1), targetAgency.subAgencies);
    }
    
    return null;
  };

  // Get the active agency if any
  const activeAgency = activeAgencyPath.length > 0 
    ? findAgencyByPath(activeAgencyPath, mergedStructure)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
          California State Government Workforce
        </h1>
        <p className="text-sm text-center text-gray-600">
          For reference, California&apos;s public sector (state, county, and local governments) employed over 2.3 million workers as of 2023, representing 9% of total state employment. The national average for government employee salary is $68,727. The median age of California&apos;s overall population is 37.6 years. All 2023 data below is from public sources.
        </p>
        
        {/* Debug section only shown in development */}
        {isDevEnv && (
          <>
            <div className="mt-4 flex justify-between items-center">
              <button 
                className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                {showDebugInfo ? 'Hide' : 'Show'} Debug Info
              </button>
              
              {activeAgencyPath.length > 0 && (
                <button 
                  className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  onClick={() => setActiveAgencyPath([])}
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            {showDebugInfo && (
              <div className="mt-2 p-2 bg-gray-100 text-xs text-gray-600 rounded">
                <p><strong>Active path:</strong> {activeAgencyPath.length > 0 ? activeAgencyPath.join(' → ') : 'None (showing Executive Branch)'}</p>
                
                {activeAgency && (
                  <div className="mt-1">
                    <p><strong>Selected agency:</strong> {activeAgency.name}</p>
                    <p><strong>Has data:</strong> {!!activeAgency.headCount ? 'Yes' : 'No'}</p>
                    <p><strong>Has charts:</strong> {!!activeAgency.tenureDistribution ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="space-y-12">
        {mergedStructure.map((section, index) => (
          <div key={index}>
            <AgencySection
              section={section}
              activeAgencyPath={activeAgencyPath}
              onAgencyClick={handleAgencyClick}
            />
          </div>
        ))}
      </div>
      
      <footer className="mt-12 pt-8 border-t text-sm text-gray-500">
        <p>Data sourced from official California government records and public documents.</p>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <p><a href="https://www.calbright.edu/wp-content/uploads/2024/05/Calbright-College-The-Road-to-Optimizing-California&apos;s-Public-Sector-Labor-Market.pdf" target="_blank" rel="noopener noreferrer">Calbright-College-The-Road-to-Optimizing-California&apos;s-Public-Sector-Labor-Market calbright.edu</a>.</p>
        <p><a href="https://publicpay.ca.gov/reports/rawexport.aspx" target="_blank" rel="noopener noreferrer">Government Compensation in California</a>.</p>
        <p><a href="https://www.sco.ca.gov/eo_about_boards.html" target="_blank" rel="noopener noreferrer">Boards and Commissions - California State Controller&apos;s Office</a>.</p>
        <p><a href="https://speaker.asmdc.org/sites/speaker.asmdc.org/files/2022-11/All-Bds-and-Comms-List-8-1-22.pdf" target="_blank" rel="noopener noreferrer">California State Assembly Speaker&apos;s Office - Boards and Commissions List</a>.</p>
        <p><a href="https://www.treasurer.ca.gov/otherboards.asp" target="_blank" rel="noopener noreferrer">California State Treasurer&apos;s Office - Boards and Commissions</a>.</p>
      </footer>
    </div>
  );
};

export default Page; 