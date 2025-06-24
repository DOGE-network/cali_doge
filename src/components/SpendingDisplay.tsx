'use client';

import React, { useMemo } from 'react';
import { DepartmentsJSON, FiscalYearKey } from '@/types/department';

interface SpendingDisplayProps {
  departmentsData: DepartmentsJSON;
  showRecentYears?: boolean;
}

const SpendingDisplay: React.FC<SpendingDisplayProps> = ({ 
  departmentsData, 
  showRecentYears = true
}) => {
  // DEPRECATED: Use of department spending JSON data (spending.yearly) is removed as of 2024-06-23.
  // All spending analytics should use normalized tables (budgets, vendors, etc).
  
  // Default years to show (FY2023-2025)
  const fiscalYears = useMemo(() => {
    const allYears = new Set<FiscalYearKey>();
    
    // Collect all fiscal years from each department's spending data
    departmentsData.departments.forEach(dept => {
      if (dept.spending?.yearly) {
        Object.keys(dept.spending.yearly).forEach(year => allYears.add(year as FiscalYearKey));
      }
    });
    
    return Array.from(allYears);
  }, [departmentsData]);
  
  const defaultYears = fiscalYears.filter(year => 
    year === 'FY2023-FY2024' || year === 'FY2024-FY2025'
  );
  
  // Years to display based on showRecentYears prop
  const yearsToDisplay = showRecentYears ? defaultYears : fiscalYears;
  
  // Sort years chronologically from oldest to latest
  const sortedYears = [...yearsToDisplay].sort((a, b) => {
    const yearA = parseInt(a.slice(2, 6));
    const yearB = parseInt(b.slice(2, 6));
    return yearA - yearB;
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Department</th>
            {sortedYears.map((year) => (
              <th key={year} className="px-4 py-2 text-right">{year}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* DEPRECATED: Table body content removed as spending data is no longer used */}
        </tbody>
      </table>
    </div>
  );
};

export default SpendingDisplay; 