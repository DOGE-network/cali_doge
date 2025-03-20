'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WorkforceData } from '@/types/workforce';

interface DepartmentWorkforceDisplayProps {
  workforceData: WorkforceData;
}

const DepartmentWorkforceDisplay = ({ workforceData }: DepartmentWorkforceDisplayProps) => {
  const [showAllYears, setShowAllYears] = useState(false);

  // Get all years from the data
  const years = [...new Set([
    ...Object.keys(workforceData.headCount?.yearly || {}),
    ...Object.keys(workforceData.wages?.yearly || {})
  ])].sort((yearA, yearB) => {
    // Convert fiscal years to numbers for comparison
    const getYear = (year: string) => parseInt(year.split('-')[0]);
    return getYear(yearB) - getYear(yearA); // Sort descending
  });

  const formatNumber = (num: number) => num.toLocaleString();

  // Format currency with appropriate suffix (B for billions, M for millions)
  const formatCurrencyWithSuffix = (amount: number): string => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(2)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else {
      return `$${formatNumber(amount)}`;
    }
  };

  // If no data, show placeholder
  if (!workforceData.headCount?.yearly && !workforceData.wages?.yearly) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Workforce Data</h3>
        <p className="text-gray-500">No workforce data available for this department.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Department Workforce</h2>
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
              <th className="py-3 px-4 text-left">Fiscal Year</th>
              <th className="py-3 px-4 text-right">Budget</th>
              <th className="py-3 px-4 text-right">Headcount</th>
            </tr>
          </thead>
          <tbody>
            {years
              .filter(year => showAllYears || parseInt(year) >= 2023)
              .map(year => {
                const headcount = workforceData.headCount?.yearly[year];
                const wages = workforceData.wages?.yearly[year];
                return (
                  <tr key={year} className="border-t border-gray-200">
                    <td className="py-3 px-4">{year}</td>
                    <td className="py-3 px-4 text-right">
                      {wages !== null && wages !== undefined ? formatCurrencyWithSuffix(wages) : '~'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {headcount !== null && headcount !== undefined ? formatNumber(headcount) : '~'}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentWorkforceDisplay; 