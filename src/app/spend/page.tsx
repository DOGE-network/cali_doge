'use client';

import spendingData from '@/data/spending-data.json';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import SpendingDisplay from '@/components/SpendingDisplay';
import { SpendingData } from '@/types/spending';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Type assertion for our imported data
const typedSpendingData = spendingData as SpendingData;

// Helper function to sort years chronologically
const sortYearsChronologically = (years: string[]) => {
  return [...years].sort((a, b) => {
    const yearA = parseInt(a.replace('FY', ''));
    const yearB = parseInt(b.replace('FY', ''));
    return yearA - yearB;
  });
};

// Client component that uses useSearchParams
function SpendPageClient() {
  const searchParams = useSearchParams();
  const [highlightedDepartment, setHighlightedDepartment] = useState<string | null>(null);
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  
  useEffect(() => {
    // Get the department from URL query parameter
    const departmentParam = searchParams.get('department');
    if (departmentParam) {
      setHighlightedDepartment(departmentParam);
    }
    
    // Check if view=top is in the URL
    const viewParam = searchParams.get('view');
    if (viewParam === 'top') {
      setShowAllDepartments(false);
    }
  }, [searchParams]);
  
  // Get sorted years for budget summary and revenue sources
  const budgetYears = sortYearsChronologically(Object.keys(typedSpendingData.budgetSummary.totalSpending));
  const revenueYears = sortYearsChronologically(Object.keys(typedSpendingData.revenueSources[0].amounts));

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Agency Spending */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold"></h1>
          <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
            <Link href="/spend?view=top" passHref>
              <Button
                variant={!showAllDepartments ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs ${!showAllDepartments ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setShowAllDepartments(false)}
              >
                Top Spend
              </Button>
            </Link>
            <Link href="/spend" passHref>
              <Button
                variant={showAllDepartments ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs ${showAllDepartments ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setShowAllDepartments(true)}
              >
                All Departments
              </Button>
            </Link>
          </div>
        </div>
        
        <SpendingDisplay 
          spendingData={typedSpendingData} 
          highlightedDepartment={highlightedDepartment}
          showTopSpendOnly={!showAllDepartments}
        />
      </div>

      {/* Budget Summary */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">Budget Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Spending</h3>
            <div className="space-y-2">
              {budgetYears.map(year => (
                <div key={year} className="flex justify-between">
                  <span>{year}:</span>
                  <span className="font-medium">{typedSpendingData.budgetSummary.totalSpending[year]}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Revenue</h3>
            <div className="space-y-2">
              {budgetYears.map(year => (
                <div key={year} className="flex justify-between">
                  <span>{year}:</span>
                  <span className="font-medium">{typedSpendingData.budgetSummary.revenue[year]}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Deficit</h3>
            <div className="space-y-2">
              {budgetYears.map(year => (
                <div key={year} className="flex justify-between">
                  <span>{year}:</span>
                  <span className="font-medium">{typedSpendingData.budgetSummary.deficit[year]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Sources */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">Revenue Sources</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left">Source</th>
                {revenueYears.map(year => (
                  <th key={year} className="py-3 px-4 text-right">{year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {typedSpendingData.revenueSources.map((source, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="py-3 px-4">{source.source}</td>
                  {revenueYears.map(year => (
                    <td key={year} className="py-3 px-4 text-right">{source.amounts[year]}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-gray-200 font-semibold bg-gray-50">
                <td className="py-3 px-4">Total Revenue</td>
                {revenueYears.map(year => (
                  <td key={year} className="py-3 px-4 text-right">
                    {typedSpendingData.totalRevenue[year]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-right text-sm text-gray-600">
          Year-over-year change: {typedSpendingData.totalRevenue.percentChange}
        </div>
      </div>

      {/* Sources */}
      <div className="mt-16">
        <h2 className="text-xl font-bold mb-4">Sources</h2>
        <ul className="list-disc pl-5 space-y-2">
          {typedSpendingData.sources.map((source, index) => (
            <li key={index}>
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

// Wrapper component for suspense
export default function SpendPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SpendPageClient />
    </Suspense>
  );
} 