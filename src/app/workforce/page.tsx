'use client';

import React, { useState, useEffect } from 'react';
import AgencyDataVisualization from './AgencyDataVisualization';
import agencyData from '@/data/workforce-data.json';
import type { Agency } from './types';

const agencyStructure: Agency[] = [
  {
    name: "California Government",
    subAgencies: [
      {
        name: "Core Administrative Agencies",
        subAgencies: [
          {
            name: "California Department of Finance",
            abbreviation: "DOF",
            description: "Responsible for establishing fiscal policies and managing state finances"
          },
          {
            name: "California State Treasurer's Office",
            description: "Manages state investments and finances"
          },
          {
            name: "California Department of General Services",
            abbreviation: "DGS",
            description: "Provides centralized services to state agencies"
          }
        ]
      },
      {
        name: "Public Safety & Emergency Services",
        subAgencies: [
          {
            name: "California Department of Justice",
            abbreviation: "DOJ",
            description: "Primary law enforcement agency"
          },
          {
            name: "California State Threat Assessment Center",
            abbreviation: "STAC",
            description: "Primary fusion center for threat intelligence"
          },
          {
            name: "California Office of Emergency Services",
            abbreviation: "CalOES",
            description: "Coordinates emergency response and disaster preparedness"
          }
        ]
      },
      {
        name: "Natural Resources & Environment",
        subAgencies: [
          {
            name: "California Environmental Protection Agency",
            abbreviation: "CalEPA",
            description: "Develops and implements environmental policies"
          },
          {
            name: "California Department of Parks and Recreation",
            description: "Manages state parks and recreation areas"
          },
          {
            name: "California ISO",
            description: "Independent System Operator managing power grid"
          }
        ]
      },
      {
        name: "Health & Human Services",
        subAgencies: [
          {
            name: "California Department of Health Care Services",
            description: "Provides healthcare services and programs"
          },
          {
            name: "California Department of Public Health",
            description: "Promotes and protects public health"
          },
          {
            name: "California Department of Social Services",
            abbreviation: "CDSS",
            description: "Oversees social service programs"
          }
        ]
      },
      {
        name: "Business & Economic Development",
        subAgencies: [
          {
            name: "California Governor's Office of Business and Economic Development",
            abbreviation: "GO-Biz",
            description: "Promotes business development and economic growth"
          },
          {
            name: "California Department of Financial Protection and Innovation",
            abbreviation: "DFPI",
            description: "Regulates financial services and products"
          },
          {
            name: "California Public Utilities Commission",
            abbreviation: "CPUC",
            description: "Regulates privately owned utilities"
          }
        ]
      },
      {
        name: "Education & Research",
        subAgencies: [
          {
            name: "California Department of Education",
            description: "Oversees K-12 education"
          },
          {
            name: "California Student Aid Commission",
            description: "Administers state financial aid programs"
          },
          {
            name: "California Space Grant Consortium",
            description: "Promotes aerospace research and education"
          }
        ]
      }
    ]
  }
];

// Merge agency data with structure
const mergeAgencyData = (structure: Agency[], data: Agency | undefined): Agency[] => {
  if (!data) {
    console.log('No data provided for merging');
    return structure;
  }
  
  console.log('Merging data:', {
    structureAgencies: structure.map(a => a.name),
    dataName: data.name,
    dataHasHeadCount: !!data.headCount,
    dataHasSubAgencies: !!data.subAgencies?.length
  });
  
  return structure.map(agency => {
    // If this is the top-level California Government agency
    if (agency.name === data.name) {
      const merged = {
        ...agency,
        headCount: data.headCount,
        subordinateOffices: data.subordinateOffices,
        totalWages: data.totalWages,
        tenureDistribution: data.tenureDistribution,
        salaryDistribution: data.salaryDistribution,
        ageDistribution: data.ageDistribution,
        averageTenureYears: data.averageTenureYears,
        averageSalary: data.averageSalary,
        averageAge: data.averageAge,
        // Recursively merge subagencies
        subAgencies: agency.subAgencies && data.subAgencies
          ? mergeAgencyData(agency.subAgencies, { ...data, subAgencies: data.subAgencies })
          : agency.subAgencies
      };
      console.log(`Merged top-level data for ${agency.name}:`, { 
        hasHeadCount: !!merged.headCount,
        subAgenciesCount: merged.subAgencies?.length 
      });
      return merged;
    }
    
    // Find matching agency in the data
    const matchingData = data.subAgencies?.find(d => d.name === agency.name);
    
    if (matchingData) {
      console.log(`Found matching data for ${agency.name}:`, {
        hasHeadCount: !!matchingData.headCount,
        hasSubAgencies: !!matchingData.subAgencies?.length
      });
      const merged = {
        ...agency,
        headCount: matchingData.headCount,
        subordinateOffices: matchingData.subordinateOffices,
        totalWages: matchingData.totalWages,
        tenureDistribution: matchingData.tenureDistribution,
        salaryDistribution: matchingData.salaryDistribution,
        ageDistribution: matchingData.ageDistribution,
        averageTenureYears: matchingData.averageTenureYears,
        averageSalary: matchingData.averageSalary,
        averageAge: matchingData.averageAge,
        // Recursively merge subagencies
        subAgencies: agency.subAgencies && matchingData.subAgencies
          ? mergeAgencyData(agency.subAgencies, matchingData)
          : agency.subAgencies
      };
      return merged;
    }
    
    // If this agency has subagencies, try to merge them with the current data level
    if (agency.subAgencies && data.subAgencies) {
      return {
        ...agency,
        subAgencies: mergeAgencyData(agency.subAgencies, data)
      };
    }
    
    console.log(`No matching data found for ${agency.name}`);
    return agency;
  });
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
  // Debug logs
  console.log('AgencyCard render:', {
    agencyName: agency.name,
    hasHeadCount: !!agency.headCount,
    showChart,
    isActive
  });

  return (
    <div className={`space-y-4 ${isActive ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
      <div 
        className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer"
        onClick={onClick}
      >
        <h3 className="text-lg font-semibold text-gray-900">
          {agency.name}
          {agency.abbreviation && <span className="ml-2 text-sm text-gray-500">({agency.abbreviation})</span>}
        </h3>
        {agency.description && (
          <p className="mt-2 text-sm text-gray-600">{agency.description}</p>
        )}
      </div>
      {showChart && <AgencyDataVisualization agency={agency} />}
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
  // For main agency: show chart by default, hide when any agency is selected
  const showChart = section.name === "California Government" && activeAgencyPath.length === 0;
  const isActiveAgency = activeAgencyPath[0] === section.name;

  console.log('AgencySection render:', {
    sectionName: section.name,
    activeAgencyPath,
    showChart,
    isActiveAgency
  });

  return (
    <div className="mb-8">
      <AgencyCard 
        agency={section}
        isActive={isActiveAgency}
        onClick={() => onAgencyClick([section.name])}
        showChart={showChart}
      />
      
      {section.subAgencies && (
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
  onAgencyClick: { (_paths: string[]): void };
}) {
  const currentPath = [...parentPath, agency.name];
  const isActive = activeAgencyPath.length > parentPath.length && 
                  activeAgencyPath[parentPath.length] === agency.name;
  // Show chart when this agency is selected (paths match exactly)
  const showChart = activeAgencyPath.join('/') === currentPath.join('/');
  
  // Show sub-sub-agencies only when this agency is active
  const showSubAgencies = isActive || activeAgencyPath.length === 0;

  console.log('SubAgencySection render:', {
    agencyName: agency.name,
    currentPath,
    activeAgencyPath,
    showChart,
    isActive
  });

  return (
    <div>
      <AgencyCard
        agency={agency}
        isActive={isActive}
        onClick={() => onAgencyClick(currentPath)}
        showChart={showChart}
      />
      
      {agency.subAgencies && showSubAgencies && (
        <div className="ml-4 mt-4 space-y-4">
          {agency.subAgencies.map((subAgency, index) => (
            <AgencyCard
              key={index}
              agency={subAgency}
              isActive={activeAgencyPath.join('/') === [...currentPath, subAgency.name].join('/')}
              onClick={() => onAgencyClick([...currentPath, subAgency.name])}
              showChart={activeAgencyPath.join('/') === [...currentPath, subAgency.name].join('/')}
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

  useEffect(() => {
    const merged = mergeAgencyData(agencyStructure, agencyData);
    setMergedStructure(merged);
  }, []);

  const handleAgencyClick = (path: string[]) => {
    setActiveAgencyPath(prevPath => 
      prevPath.join('/') === path.join('/') ? [] : path
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-4">
          California State Workforce
        </h1>
        <p className="text-sm text-center text-gray-600">
          California&apos;s public sector employed over 2.3 million workers as of 2023, representing 9% of total state employment.
        </p>
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
        <p><a href="https://www.calbright.edu/wp-content/uploads/2024/05/Calbright-College-The-Road-to-Optimizing-Californias-Public-Sector-Labor-Market.pdf" target="_blank" rel="noopener noreferrer">calbright.edu</a>.</p>
        <p><a href="https://publicpay.ca.gov/reports/rawexport.aspx" target="_blank" rel="noopener noreferrer">Government Compensation in California</a>.</p>
      </footer>
    </div>
  );
};

export default Page; 