'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getDepartmentBySpendingName } from '@/lib/departmentMapping';
import { SpendingData } from '@/types/spending';

interface SpendingDisplayProps {
  spendingData: SpendingData;
  highlightedDepartment?: string | null;
}

const SpendingDisplay: React.FC<SpendingDisplayProps> = ({ 
  spendingData, 
  highlightedDepartment 
}) => {
  const [showAllYears, setShowAllYears] = useState(false);
  
  // Default years to show (FY2023-2025)
  const defaultYears = spendingData.fiscalYears.filter(year => 
    ['FY2023', 'FY2024', 'FY2025'].includes(year)
  );
  
  // Years to display based on toggle state
  const unsortedYears = showAllYears ? spendingData.fiscalYears : defaultYears;
  
  // Sort years chronologically from oldest to latest
  const yearsToDisplay = [...unsortedYears].sort((a, b) => {
    const yearA = parseInt(a.replace('FY', ''));
    const yearB = parseInt(b.replace('FY', ''));
    return yearA - yearB;
  });

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Department Spending</h2>
        <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
          <Button
            variant={showAllYears ? "ghost" : "secondary"}
            size="sm"
            className={`rounded-full text-xs ${!showAllYears ? 'bg-white shadow-sm' : ''}`}
            onClick={() => setShowAllYears(false)}
          >
            Recent Years
          </Button>
          <Button
            variant={showAllYears ? "secondary" : "ghost"}
            size="sm"
            className={`rounded-full text-xs ${showAllYears ? 'bg-white shadow-sm' : ''}`}
            onClick={() => setShowAllYears(true)}
          >
            All Years
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left">Rank</th>
              <th className="py-3 px-4 text-left">Department</th>
              {yearsToDisplay.map(year => (
                <th key={year} className="py-3 px-4 text-right">{year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spendingData.agencies.map((agency, index) => {
              const departmentMapping = getDepartmentBySpendingName(agency.name);
              const isHighlighted = highlightedDepartment === agency.name;
              
              return (
                <tr 
                  key={index} 
                  className={`border-t border-gray-200 ${isHighlighted ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-3 px-4">{agency.rank}</td>
                  <td className="py-3 px-4">
                    {departmentMapping ? (
                      <Link 
                        href={`/departments/${departmentMapping.slug}`}
                        className="text-blue-600 hover:underline"
                      >
                        {agency.name}
                      </Link>
                    ) : (
                      agency.name
                    )}
                  </td>
                  {yearsToDisplay.map(year => (
                    <td key={year} className="py-3 px-4 text-right">
                      {agency.spending[year] || 'N/A'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpendingDisplay; 