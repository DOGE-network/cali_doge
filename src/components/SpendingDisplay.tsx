'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { DepartmentsJSON, FiscalYearKey, DepartmentData } from '@/types/department';

interface SpendingDisplayProps {
  departmentsData: DepartmentsJSON;
  highlightedDepartment?: string | null;
  showRecentYears?: boolean;
  showTopSpendOnly?: boolean;
}

const SpendingDisplay: React.FC<SpendingDisplayProps> = ({ 
  departmentsData, 
  highlightedDepartment,
  showRecentYears = true,
  showTopSpendOnly = false
}) => {
  // Format spending value to display with $ and M/B
  const formatSpending = (value: number | {} | undefined): string => {
    if (value === undefined || typeof value !== 'number') return 'N/A';
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

  // Get the most recent year for sorting by spending
  const mostRecentYear = sortedYears.length > 0 ? sortedYears[sortedYears.length - 1] : 'FY2023-FY2024' as FiscalYearKey;

  // Use the API data directly and calculate total spending
  const agenciesToDisplay = useMemo(() => {
    const agencies = departmentsData.departments
      .filter((dept): dept is DepartmentData & { spending: { yearly: Record<FiscalYearKey, number | {}> } } => 
        dept.spending?.yearly !== undefined
      )
      .map(dept => {
        // Calculate total spending for the most recent year
        const recentSpending = dept.spending.yearly[mostRecentYear];
        const totalSpending = typeof recentSpending === 'number' ? recentSpending : 0;

        return {
          name: dept.name,
          spending: dept.spending.yearly,
          _slug: dept._slug,
          pageSlug: dept.pageSlug,
          hasPage: Boolean(dept.pageSlug),
          totalSpending
        };
      })
      .sort((a, b) => b.totalSpending - a.totalSpending);

    return showTopSpendOnly ? agencies.slice(0, 20) : agencies;
  }, [departmentsData.departments, mostRecentYear, showTopSpendOnly]);

  const getSpendingValue = (agency: { spending: Record<FiscalYearKey, number | {}> }, year: FiscalYearKey) => {
    const value = agency.spending[year];
    return typeof value === 'number' ? value : 0;
  };

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
          {agenciesToDisplay.map((agency) => {
            const isHighlighted = highlightedDepartment === agency._slug;
            return (
              <tr 
                key={agency.name}
                className={`border-t ${isHighlighted ? 'bg-yellow-50' : ''} hover:bg-gray-50`}
              >
                <td className="px-4 py-2">
                  {agency.hasPage && agency.pageSlug ? (
                    <Link 
                      href={`/departments/${agency.pageSlug}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {agency.name}
                    </Link>
                  ) : (
                    <span>{agency.name}</span>
                  )}
                </td>
                {sortedYears.map((year) => (
                  <td key={year} className="px-4 py-2 text-right">
                    {formatSpending(getSpendingValue(agency, year as FiscalYearKey))}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SpendingDisplay; 