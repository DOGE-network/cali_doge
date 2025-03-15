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
    ...(workforceData.yearlyHeadCount?.map(d => d.year) || []),
    ...(workforceData.yearlyWages?.map(d => d.year) || [])
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
  if (!workforceData.yearlyHeadCount?.length && !workforceData.yearlyWages?.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Workforce Data</h3>
        <p className="text-gray-500">No workforce data available for this department.</p>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Workforce Data</h2>
        {years.length > 3 && (
          <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
            <Button
              variant={!showAllYears ? "default" : "ghost"}
              size="sm"
              className="rounded-full"
              onClick={() => setShowAllYears(false)}
            >
              Recent Years
            </Button>
            <Button
              variant={showAllYears ? "default" : "ghost"}
              size="sm"
              className="rounded-full"
              onClick={() => setShowAllYears(true)}
            >
              All Years
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left">Fiscal Year</th>
              <th className="py-3 px-4 text-right">Total Budget</th>
              <th className="py-3 px-4 text-right">State Operations</th>
            </tr>
          </thead>
          <tbody>
            {years
              .filter(year => showAllYears || parseInt(year) >= 2023)
              .map(year => {
                const headcount = workforceData.yearlyHeadCount?.find(d => d.year === year)?.headCount;
                const wages = workforceData.yearlyWages?.find(d => d.year === year)?.wages;
                return (
                  <tr key={year} className="border-t border-gray-200">
                    <td className="py-3 px-4">{year}</td>
                    <td className="py-3 px-4 text-right">
                      {wages !== undefined ? formatCurrencyWithSuffix(wages) : '~'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {headcount !== undefined ? formatNumber(headcount) : '~'}
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