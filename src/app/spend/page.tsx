'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import SpendingDisplay from '@/components/SpendingDisplay';
import { DepartmentsJSON } from '@/types/department';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Client component that uses useSearchParams
function SpendPageClient() {
  const searchParams = useSearchParams();
  const [highlightedDepartment, setHighlightedDepartment] = useState<string | null>(null);
  const [showAllDepartments, setShowAllDepartments] = useState(true);
  const [showRecentYears, setShowRecentYears] = useState(true);
  const [departmentsData, setDepartmentsData] = useState<DepartmentsJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Get the department from URL query parameter
    const departmentParam = searchParams.get('department');
    if (departmentParam) {
      // The department param is now a slug, so use it directly
      setHighlightedDepartment(departmentParam);
    }
    
    // Check if view=top is in the URL
    const viewParam = searchParams.get('view');
    if (viewParam === 'top') {
      setShowAllDepartments(false);
    }
  }, [searchParams]);

  // Fetch departments data
  useEffect(() => {
    async function fetchDepartments() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/departments');
        if (!response.ok) {
          throw new Error('Failed to fetch departments');
        }
        const data = await response.json();
        setDepartmentsData(data);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load department data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDepartments();
  }, []);
  
  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading || !departmentsData) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Agency Spending */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">California State Government Spend</h1>
          <div className="flex items-center space-x-4">
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
            <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
              <Button
                variant={showRecentYears ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs ${showRecentYears ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setShowRecentYears(true)}
              >
                Recent Years
              </Button>
              <Button
                variant={!showRecentYears ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs ${!showRecentYears ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setShowRecentYears(false)}
              >
                All Years
              </Button>
            </div>
          </div>
        </div>
        
        <SpendingDisplay 
          departmentsData={departmentsData} 
          highlightedDepartment={highlightedDepartment}
          showTopSpendOnly={!showAllDepartments}
          showRecentYears={showRecentYears}
        />
      </div>

      {/* Sources */}
      <div className="mt-16">
        <h2 className="text-xl font-bold mb-4">Sources</h2>
        <ul className="list-disc pl-5 space-y-2">
          {departmentsData.sources ? departmentsData.sources.map((source, index) => (
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
          )) : null}
          <li>
            <a 
              href="https://www.ebudget.ca.gov/2023-24/pdf/Enacted/BudgetSummary/FullBudgetSummary.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California State Budget 2023-24
            </a>
          </li>
          <li>
            <a 
              href="https://www.ebudget.ca.gov/2024-25/pdf/Enacted/BudgetSummary/FullBudgetSummary.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California State Budget 2024-25
            </a>
          </li>
          <li>
            <a 
              href="https://lao.ca.gov/Publications/Report/4704" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Legislative Analyst&apos;s Office - The 2023-24 Budget: Overview of the California Spending Plan
            </a>
          </li>
          <li>
            <a 
              href="https://dof.ca.gov/budget/historical-budget-information/historical-budget-publications/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Department of Finance - Historical Budget Publications
            </a>
          </li>
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