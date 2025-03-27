'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WorkforceData, AnnualYear } from '@/types/department';

interface DepartmentWorkforceDisplayProps {
  workforceData: Required<WorkforceData>;
}

const DepartmentWorkforceDisplay = ({ workforceData }: DepartmentWorkforceDisplayProps) => {
  const [selectedYear, setSelectedYear] = useState<AnnualYear>('2023');

  // Generate fiscal years from 2010 to 2025
  const fiscalYears = Array.from({ length: 16 }, (_, i) => (2010 + i).toString() as AnnualYear);

  const formatNumber = (num: number) => num.toLocaleString();

  // Format currency with appropriate suffix (B for billions, M for millions)
  const formatCurrencyWithSuffix = (amount: number | {}): string => {
    if (typeof amount !== 'number') return '~';
    
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
          {fiscalYears.map(year => (
            <Button
              key={year}
              variant={selectedYear === year ? "secondary" : "ghost"}
              size="sm"
              className={`rounded-full text-xs ${selectedYear === year ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setSelectedYear(year)}
            >
              FY{year}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left">Year</th>
              <th className="py-3 px-4 text-right">Budget</th>
              <th className="py-3 px-4 text-right">Headcount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200">
              <td className="py-3 px-4">{selectedYear}</td>
              <td className="py-3 px-4 text-right">
                {formatCurrencyWithSuffix(workforceData.wages.yearly[selectedYear])}
              </td>
              <td className="py-3 px-4 text-right">
                {typeof workforceData.headCount.yearly[selectedYear] === 'number' 
                  ? formatNumber(workforceData.headCount.yearly[selectedYear] as number) 
                  : '~'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentWorkforceDisplay; 