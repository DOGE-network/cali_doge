'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  getDepartmentBySpendingName, 
  debugDepartmentPages, 
  compareSlugFormats,
  findMarkdownForDepartment
} from '@/lib/departmentMapping';
import { DepartmentsJSON, FiscalYearKey } from '@/types/department';

interface SpendingDisplayProps {
  departmentsData: DepartmentsJSON;
  highlightedDepartment?: string | null;
  showTopSpendOnly?: boolean;
  showRecentYears?: boolean;
}

interface AgencySpending {
  name: string;
  spending: Record<FiscalYearKey, number | {}>;
}

const SpendingDisplay: React.FC<SpendingDisplayProps> = ({ 
  departmentsData, 
  highlightedDepartment,
  showTopSpendOnly = false,
  showRecentYears = true
}) => {
  const [showAllYears, setShowAllYears] = useState(false);
  
  // Format spending value to display with $ and M
  const formatSpending = (value: number | {} | undefined): string => {
    if (value === undefined || typeof value !== 'number') return 'N/A';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${(value / 1000000).toFixed(3)}M`;
  };
  
  // Debug on mount
  useEffect(() => {
    // Debug Air Resources Board as an example
    debugDepartmentPages('air_resources_board');
    
    // Try another slug format that includes the code
    debugDepartmentPages('3900_air_resources_board');

    // Compare slug formats
    compareSlugFormats();
  }, []);
  
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
    year.startsWith('FY2022') || year.startsWith('FY2023') || year.startsWith('FY2024') || year.startsWith('FY2025')
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

  // Convert departments to agency-like structure for sorting and display
  const agencies = useMemo(() => {
    return departmentsData.departments
      .filter(dept => dept.spending?.yearly)
      .filter(dept => dept.name !== "California State Government")
      .map(dept => ({
        name: dept.name,
        spending: dept.spending?.yearly || {} as Record<FiscalYearKey, number | {}>
      })) as AgencySpending[];
  }, [departmentsData]);

  // Sort agencies by spending for the most recent year
  const sortedAgencies = useMemo(() => {
    return [...agencies].sort((a, b) => {
      const spendingA = typeof a.spending[mostRecentYear] === 'number' ? a.spending[mostRecentYear] as number : 0;
      const spendingB = typeof b.spending[mostRecentYear] === 'number' ? b.spending[mostRecentYear] as number : 0;
      return spendingB - spendingA;
    });
  }, [agencies, mostRecentYear]);

  // Limit to top 10 if showTopSpendOnly is true
  const agenciesToDisplay = showTopSpendOnly ? sortedAgencies.slice(0, 10) : sortedAgencies;

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
            const departmentMapping = getDepartmentBySpendingName(agency.name);
            const markdownSlug = departmentMapping ? findMarkdownForDepartment(departmentMapping.name) : null;
            const isHighlighted = highlightedDepartment && markdownSlug === highlightedDepartment;

            return (
              <tr 
                key={agency.name}
                className={`border-t ${isHighlighted ? 'bg-yellow-50' : ''} hover:bg-gray-50`}
              >
                <td className="px-4 py-2">
                  {markdownSlug ? (
                    <Link 
                      href={`/spend?department=${markdownSlug}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {agency.name}
                    </Link>
                  ) : (
                    agency.name
                  )}
                </td>
                {sortedYears.map((year) => (
                  <td key={year} className="px-4 py-2 text-right">
                    {formatSpending(agency.spending[year as FiscalYearKey])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {!showTopSpendOnly && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={() => setShowAllYears(!showAllYears)}
            variant="outline"
          >
            {showAllYears ? 'Show Recent Years' : 'Show All Years'}
          </Button>
        </div>
      )}
    </div>
  );
};

const _normalizeYearlyData = (data: Record<string, string | number>) => {
  return Object.entries(data).reduce((acc, [year, value]) => ({
    ...acc,
    [year]: typeof value === 'string' ? parseFloat((value as string).replace(/[^\d.-]/g, '')) : value
  }), {} as Record<string, number>);
};

export default SpendingDisplay; 