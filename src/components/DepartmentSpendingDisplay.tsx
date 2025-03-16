'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SpendingData } from '@/types/spending';

interface DepartmentSpendingDisplayProps {
  departmentName: string;
  spendingData: SpendingData;
}

const DepartmentSpendingDisplay: React.FC<DepartmentSpendingDisplayProps> = ({ 
  departmentName, 
  spendingData 
}) => {
  const [showAllYears, setShowAllYears] = useState(false);
  
  // Find the department data
  const departmentData = spendingData.agencies.find(
    agency => agency.name === departmentName
  );
  
  if (!departmentData) {
    return <div>No spending data available for this department.</div>;
  }
  
  // Default years to show (FY2023-2025)
  const defaultYears = spendingData.fiscalYears.filter(year => 
    ['FY2023', 'FY2024', 'FY2025'].includes(year)
  );
  
  // Years to display based on toggle state
  const unsortedYears = showAllYears ? spendingData.fiscalYears : defaultYears;
  
  // Sort years chronologically from oldest to latest
  const sortedYears = [...unsortedYears].sort((a, b) => {
    const yearA = parseInt(a.replace('FY', ''));
    const yearB = parseInt(b.replace('FY', ''));
    return yearA - yearB;
  });

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Spending Data</h2>
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
      
      {/* Spending Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left">Fiscal Year</th>
              <th className="py-3 px-4 text-right">Spend</th>
              {departmentData.stateOperations && (
                <th className="py-3 px-4 text-right">State Operations</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedYears.map(year => (
              <tr key={year} className="border-t border-gray-200">
                <td className="py-3 px-4">{year.replace('FY', '')}</td>
                <td className="py-3 px-4 text-right">
                  {departmentData.spending[year] || 'N/A'}
                </td>
                {departmentData.stateOperations && (
                  <td className="py-3 px-4 text-right">
                    {departmentData.stateOperations[year] || 'N/A'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentSpendingDisplay; 