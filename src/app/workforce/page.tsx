'use client';

import React, { useState } from 'react';

interface Agency {
  name: string;
  abbreviation?: string;
  description?: string;
  website?: string;
  subAgencies?: Agency[];
  headCount?: number;
  totalWages?: number;
  averageTenureYears?: number;
  averageSalary?: number;
  averageAge?: number;
}

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

function AgencyCard({ agency }: { agency: Agency }) {
  return (
    <div className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
      <h3 className="text-lg font-semibold text-gray-900">
        {agency.name}
        {agency.abbreviation && <span className="ml-2 text-sm text-gray-500">({agency.abbreviation})</span>}
      </h3>
      {agency.description && (
        <p className="mt-2 text-sm text-gray-600">{agency.description}</p>
      )}
      {agency.headCount && (
        <ul className="mt-2 text-sm text-gray-600">
          <li>Head Count: {agency.headCount}</li>
          <li>Total Wages: ${agency.totalWages?.toLocaleString()}</li>
          <li>Average Tenure: {agency.averageTenureYears} years</li>
          <li>Average Salary: ${agency.averageSalary?.toLocaleString()}</li>
        <li>Average Age: {agency.averageAge} years</li>
        </ul>
      )}
    </div>
  );
}

function AgencySection({ section, isOpen, toggleOpen }: { section: Agency, isOpen: boolean, toggleOpen: () => void }) {
  // State to manage visibility of sub-sub-agencies
  const [openSubIndex, setOpenSubIndex] = useState<number | null>(null);

  // Function to handle opening a sub-agency
  const handleToggleSubOpen = (index: number) => {
    setOpenSubIndex(prevIndex => prevIndex === index ? null : index);
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2 cursor-pointer"
          onClick={toggleOpen}>
        {section.name}
      </h2>
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {section.subAgencies?.map((agency, index) => (
            <div key={index}>
              <div onClick={(e) => { e.stopPropagation(); handleToggleSubOpen(index); }} className="cursor-pointer">
                <AgencyCard agency={agency} />
                {/* Render sub-sub-agencies if they exist and this sub-agency is open */}
                {openSubIndex === index && agency.subAgencies && (
                  <div className="ml-4">
                    {agency.subAgencies.map((subAgency, subIndex) => (
                      <AgencyCard key={subIndex} agency={subAgency} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  // Initially, only the top-level "California Government" section is open
  const [openSectionIndex, setOpenSectionIndex] = useState<number | null>(0);  // Assuming it's the first in the array

  const handleToggleOpen = (index: number) => {
    setOpenSectionIndex(openSectionIndex === index ? null : index);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          California State Agencies
        </h1>
        <p className="text-lg text-gray-600">
          A comprehensive overview of California&apos;s government agencies and their relationships
        </p>
      </div>
      
      <div className="space-y-12">
        {agencyStructure.map((section, index) => (
          <div key={index}>
            <AgencySection
              section={section}
              isOpen={openSectionIndex === index}
              toggleOpen={() => handleToggleOpen(index)}
            />
          </div>
        ))}
      </div>
      
      <footer className="mt-12 pt-8 border-t text-sm text-gray-500">
        <p>Data sourced from official California government records and public documents.</p>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </footer>
    </div>
  );
} 