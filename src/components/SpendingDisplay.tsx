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
import { DepartmentsJSON } from '@/types/department';

interface SpendingDisplayProps {
  departmentsData: DepartmentsJSON;
  highlightedDepartment?: string | null;
  showTopSpendOnly?: boolean;
}

const SpendingDisplay: React.FC<SpendingDisplayProps> = ({ 
  departmentsData, 
  highlightedDepartment,
  showTopSpendOnly = false
}) => {
  const [showAllYears, setShowAllYears] = useState(false);
  
  // Format spending value to display with $ and B
  const formatSpending = (value: string | number | undefined): string => {
    if (value === undefined) return 'N/A';
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    return `$${(numericValue / 1000000000).toFixed(2)}B`;
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
    const allYears = new Set<string>();
    
    // Collect all fiscal years from each department's spending data
    departmentsData.departments.forEach(dept => {
      if (dept.spending?.yearly) {
        Object.keys(dept.spending.yearly).forEach(year => allYears.add(year));
      }
    });
    
    return Array.from(allYears);
  }, [departmentsData]);
  
  const defaultYears = fiscalYears.filter(year => 
    ['FY2023', 'FY2024', 'FY2025'].includes(year)
  );
  
  // Years to display based on toggle state
  const unsortedYears = showAllYears ? fiscalYears : defaultYears;
  
  // Sort years chronologically from oldest to latest
  const yearsToDisplay = [...unsortedYears].sort((a, b) => {
    const yearA = parseInt(a.replace('FY', ''));
    const yearB = parseInt(b.replace('FY', ''));
    return yearA - yearB;
  });

  // Get the most recent year for sorting by spending
  const mostRecentYear = yearsToDisplay.length > 0 ? yearsToDisplay[yearsToDisplay.length - 1] : 'FY2024';

  // Convert departments to agency-like structure for sorting and display
  const agencies = useMemo(() => {
    return departmentsData.departments
      .filter(dept => dept.spending?.yearly)
      .map(dept => ({
        name: dept.name,
        spending: normalizeYearlyData(dept.spending?.yearly || {})
      }));
  }, [departmentsData]);

  // Sort agencies by spending for the most recent year
  const sortedAgencies = useMemo(() => {
    return [...agencies].sort((a, b) => {
      const spendingA = a.spending[mostRecentYear] || 0;
      const spendingB = b.spending[mostRecentYear] || 0;
      return spendingB - spendingA;
    });
  }, [agencies, mostRecentYear]);

  // Limit to top 10 if showTopSpendOnly is true
  const agenciesToDisplay = showTopSpendOnly ? sortedAgencies.slice(0, 10) : sortedAgencies;

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
              <th className="py-3 px-4 text-left">Department</th>
              {yearsToDisplay.map(year => (
                <th key={year} className="py-3 px-4 text-right">{year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agenciesToDisplay.map((agency, index) => {
              // Only get department mappings that have markdown pages
              const allDeptMapping = getDepartmentBySpendingName(agency.name, false);
              const departmentMapping = getDepartmentBySpendingName(agency.name, true);
              
              // Try to find markdown file directly
              const markdownSlug = findMarkdownForDepartment(agency.name);
              
              // Detailed debug output
              if (allDeptMapping && !departmentMapping && markdownSlug) {
                console.log(`Department '${agency.name}' has mapping to slug '${allDeptMapping.slug}' with markdown page '${markdownSlug}'`);
              }
              
              const isHighlighted = highlightedDepartment === agency.name;
              
              return (
                <tr 
                  key={index} 
                  className={`border-t border-gray-200 ${isHighlighted ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-3 px-4">
                    {markdownSlug ? (
                      <Link 
                        href={`/departments/${markdownSlug}`}
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
                      {formatSpending(agency.spending[year] as string | number | undefined)}
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

const normalizeYearlyData = (data: Record<string, string | number>) => {
  return Object.entries(data).reduce((acc, [year, value]) => ({
    ...acc,
    [year]: typeof value === 'string' ? parseFloat((value as string).replace(/[^\d.-]/g, '')) : value
  }), {} as Record<string, number>);
};

export default SpendingDisplay; 