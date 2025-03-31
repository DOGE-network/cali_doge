'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import SpendingDisplay from '@/components/SpendingDisplay';
import { DepartmentsJSON } from '@/types/department';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Client component that uses useSearchParams
function SpendPageClient() {
  const searchParams = useSearchParams();
  const [highlightedDepartment, setHighlightedDepartment] = useState<string | null>(null);
  const [showAllDepartments, setShowAllDepartments] = useState(true);
  const [showRecentYears, setShowRecentYears] = useState(true);
  const { data: departmentsData, error, isLoading } = useSWR<DepartmentsJSON>('/api/departments', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000 // Dedupe requests within 1 minute
  });
  
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

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (isLoading || !departmentsData) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-gray-600">Loading department data...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Agency Spending */}
      <div className="mb-12">
        <div className="flex flex-col space-y-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">California State Government Spend</h1>
            <p className="text-sm text-gray-600 mt-1">Spend numbers are from the TOTALS, POSITIONS AND EXPENDITURES (All Programs) section of the Governor&apos;s Budget found at <a href="https://ebudget.ca.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ebudget.ca.gov</a>.</p>
          </div>
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
                  All Dept
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