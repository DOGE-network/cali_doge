'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DepartmentData, FiscalYearKey } from '@/types/department';

interface DepartmentSpendingDisplayProps {
  spendingData: Required<Pick<DepartmentData, 'spending'>>;
}

const DepartmentSpendingDisplay: React.FC<DepartmentSpendingDisplayProps> = ({ 
  spendingData 
}) => {
  const [showAllYears, setShowAllYears] = useState(false);
  
  // Get all fiscal years
  const fiscalYears = Object.keys(spendingData.spending.yearly) as FiscalYearKey[];
  
  // Default years to show (most recent 3 years)
  const defaultYears = fiscalYears
    .sort((a, b) => {
      const yearA = parseInt(a.slice(2, 6));
      const yearB = parseInt(b.slice(2, 6));
      return yearB - yearA;
    })
    .slice(0, 3);
  
  // Years to display based on toggle state
  const yearsToDisplay = showAllYears ? fiscalYears : defaultYears;
  
  // Sort years chronologically
  const sortedYears = [...yearsToDisplay].sort((a, b) => {
    const yearA = parseInt(a.slice(2, 6));
    const yearB = parseInt(b.slice(2, 6));
    return yearA - yearB;
  });

  // Format spending value to display with appropriate suffix
  const formatSpending = (value: number | {}): string => {
    if (typeof value !== 'number') return 'N/A';
    
    // Convert from thousands to actual value
    const actualValue = value * 1000;
    
    if (actualValue >= 1000000000) {
      // Billions: 1 decimal place for 3+ digits, 2 for 2 digits, 3 for 1 digit
      const billions = actualValue / 1000000000;
      if (billions >= 100) return `$${billions.toFixed(1)}B`;
      if (billions >= 10) return `$${billions.toFixed(2)}B`;
      return `$${billions.toFixed(3)}B`;
    }
    
    // Millions: 1 decimal place for 3+ digits, 2 for 2 digits, 3 for 1 digit
    const millions = actualValue / 1000000;
    if (millions >= 100) return `$${millions.toFixed(1)}M`;
    if (millions >= 10) return `$${millions.toFixed(2)}M`;
    if (millions >= 1) return `$${millions.toFixed(3)}M`;
    return `$${millions.toFixed(3)}M`;
  };

  // If no data or empty data, show message
  if (!fiscalYears.length) {
    return <div>No spending data available for this department.</div>;
  }

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
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left">Fiscal Year</th>
              <th className="py-3 px-4 text-right">Spend</th>
            </tr>
          </thead>
          <tbody>
            {sortedYears.map(year => (
              <tr key={year} className="border-t border-gray-200">
                <td className="py-3 px-4">{year}</td>
                <td className="py-3 px-4 text-right">
                  {formatSpending(spendingData.spending.yearly[year])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentSpendingDisplay; 