'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import useSWR from 'swr';
import { analytics } from '@/lib/analytics';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface SpendingRecord {
  year: number;
  department: string;
  departmentSlug?: string;
  vendor: string;
  program: string;
  fund: string;
  amount: number;
  // For compare view
  vendorAmount?: number;
  budgetAmount?: number;
}

interface SpendResponse {
  spending: SpendingRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    totalAmount: number;
    recordCount: number;
  };
}

interface Program {
  projectCode: string;
  name: string;
  programDescriptions: Array<{
    description: string;
    source: string | string[];
  }>;
}

// Client component that uses useSearchParams
function SpendPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for filters and sorting
  const [view, setView] = useState('vendor'); // budget|vendor|compare
  const [filter, setFilter] = useState('all'); // all|year|department|vendor|program|fund (or department|program|fund for compare)
  const [filterValue, setFilterValue] = useState('');
  const [sort, setSort] = useState('amount'); // year|department|vendor|program|fund|amount
  const [order, setOrder] = useState('desc'); // asc|desc
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  
  // For compare view, track which field to compare by
  const [compareBy, setCompareBy] = useState('department'); // department|program|fund
  
  // State for program hover
  const [hoveredProgram, setHoveredProgram] = useState<string | null>(null);
  const [programDetails, setProgramDetails] = useState<Program | null>(null);

  // Build API URL based on current filters
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.set('view', view);
    params.set('sort', sort);
    params.set('order', order);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    
    // For compare view, add the compareBy parameter
    if (view === 'compare') {
      params.set('compareBy', compareBy);
    }
    
    // Get applied filter values from URL params (not local state)
    const appliedFilter = searchParams.get('filter');
    const appliedFilterValue = searchParams.get('filterValue');
    
    // Only add filter params if we have both filter type and value from URL
    if (appliedFilter && appliedFilter !== 'all' && appliedFilterValue && appliedFilterValue.trim()) {
      params.set(appliedFilter, appliedFilterValue.trim());
    }
    
    return `/api/spend?${params.toString()}`;
  };

  // Fetch spending data
  const { data: spendData, error, isLoading } = useSWR<SpendResponse>(
    buildApiUrl(),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000
    }
  );

  // Initialize from URL params
  useEffect(() => {
    const viewParam = searchParams.get('view');
    const compareByParam = searchParams.get('compareBy');
    const filterParam = searchParams.get('filter');
    const filterValueParam = searchParams.get('filterValue');
    const sortParam = searchParams.get('sort');
    const orderParam = searchParams.get('order');
    
    if (viewParam && ['vendor', 'budget', 'compare'].includes(viewParam)) {
      setView(viewParam);
    }
    if (compareByParam && ['department', 'program', 'fund'].includes(compareByParam)) {
      setCompareBy(compareByParam);
    }
    // Validate filter param based on URL view param (not state)
    const validFilters = viewParam === 'compare' 
      ? ['all', 'department', 'program', 'fund']
      : ['all', 'year', 'department', 'vendor', 'program', 'fund'];
    
    if (filterParam && validFilters.includes(filterParam)) {
      setFilter(filterParam);
    }
    if (filterValueParam) {
      setFilterValue(filterValueParam);
    }
    if (sortParam && ['year', 'department', 'vendor', 'program', 'fund', 'amount', 'vendorAmount', 'budgetAmount'].includes(sortParam)) {
      setSort(sortParam);
    }
    if (orderParam && ['asc', 'desc'].includes(orderParam)) {
      setOrder(orderParam);
    }
  }, [searchParams]);

  // Update URL when filters change
  const updateUrl = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/spend?${params.toString()}`);
  };

  // Handle sorting
  const handleSort = (column: string) => {
    const newOrder = sort === column && order === 'desc' ? 'asc' : 'desc';
    setSort(column);
    setOrder(newOrder);
    setPage(1);
    updateUrl({ sort: column, order: newOrder, page: '1' });
  };

  // Handle view change
  const handleViewChange = (newView: string) => {
    setView(newView);
    setPage(1);
    
    // Reset filter when switching to compare view
    if (newView === 'compare') {
      setFilter('all');
      setFilterValue('');
      updateUrl({ view: newView, page: '1', filter: '', filterValue: '', compareBy });
    } else {
      updateUrl({ view: newView, page: '1' });
    }
  };

  // Handle filter type change (dropdown)
  const handleFilterTypeChange = (newFilter: string) => {
    setFilter(newFilter);
    setFilterValue('');
    setPage(1);
    
    // If switching to 'all', immediately update API
    if (newFilter === 'all') {
      const urlParams: Record<string, string> = { page: '1', filter: '', filterValue: '' };
      updateUrl(urlParams);
    }
  };

  // Handle applying the filter (button click or Enter key)
  const handleApplyFilter = () => {
    setPage(1);
    
    const urlParams: Record<string, string> = { page: '1' };
    if (filter !== 'all' && filterValue && filterValue.trim()) {
      urlParams.filter = filter;
      urlParams.filterValue = filterValue.trim();
    } else {
      urlParams.filter = '';
      urlParams.filterValue = '';
    }
    updateUrl(urlParams);
  };

  // Handle program hover
  const handleProgramHover = async (programName: string) => {
    if (programName === 'Unknown Program' || programName === hoveredProgram) return;
    
    setHoveredProgram(programName);
    
    try {
      // Search for program by name
      const response = await fetch(`/api/programs?search=${encodeURIComponent(programName)}&limit=1`);
      const data = await response.json();
      
      if (data.programs && data.programs.length > 0) {
        setProgramDetails(data.programs[0]);
      } else {
        setProgramDetails(null);
      }
    } catch (error) {
      console.error('Error fetching program details:', error);
      setProgramDetails(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sort !== column) return '↕️';
    return order === 'asc' ? '↑' : '↓';
  };

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (isLoading || !spendData) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-gray-600">Loading spending data...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">California State Government Spend</h1>
        <p className="text-sm text-gray-600 mt-1">
          Spend numbers are from the budgets found at <a href="https://ebudget.ca.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ebudget.ca.gov</a> and vendor payments are collected from the California Open Data Portal at <a href="https://open.fiscal.ca.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">open.fiscal.ca.gov</a>
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* View Selection */}
          <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Display:</label>
            <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
            {['vendor', 'budget', 'compare'].map((viewOption) => (
                <Button
                key={viewOption}
                variant={view === viewOption ? "secondary" : "ghost"}
                  size="sm"
                className={`rounded-full text-xs ${view === viewOption ? 'bg-white shadow-sm' : ''}`}
                onClick={() => handleViewChange(viewOption)}
                >
                {viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
                </Button>
            ))}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-4 flex-wrap p-4 bg-white rounded-lg border">
          {view === 'compare' ? (
            <>
              <label className="text-sm font-medium">Compare by:</label>
              <Select value={compareBy} onValueChange={(value) => {
                setCompareBy(value);
                setPage(1);
                updateUrl({ compareBy: value, page: '1' });
              }}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="fund">Fund</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <label className="text-sm font-medium">Filter by:</label>
              <Select value={filter} onValueChange={handleFilterTypeChange}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="fund">Fund</SelectItem>
                </SelectContent>
              </Select>
              
              {filter !== 'all' && (
                <div className="flex flex-col space-y-2">
                  <Input
                    placeholder={`Enter ${filter}...`}
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyFilter();
                      }
                    }}
                    className="w-96 bg-white"
                  />
                  <p className="text-xs text-gray-500">
                    Use AND to find records containing all terms (e.g. &quot;diversity AND equity AND inclusion&quot;). 
                    Use OR to find records containing any term (e.g. &quot;diversity OR equity&quot;). 
                    Commas are treated as AND. Use quotes for exact phrases (e.g. &quot;racial justice&quot;).
                  </p>
                </div>
              )}
              
              {filter !== 'all' && filterValue && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyFilter}
                  className="bg-white"
                >
                  Apply Filter
                </Button>
              )}
            </>
          )}
        </div>
      </div>



      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {view === 'compare' ? (
                // Compare view columns
                ['year', compareBy, 'vendor amount', 'budget amount'].map((column) => (
                  <th
                    key={column}
                    className="border border-gray-300 px-4 py-2 text-left cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      let sortField = column;
                      if (column === 'vendor amount') sortField = 'vendorAmount';
                      else if (column === 'budget amount') sortField = 'budgetAmount';
                      else if (column === compareBy) sortField = compareBy;
                      handleSort(sortField);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{column}</span>
                      <span className="text-xs">{
                        column === 'vendor amount' ? getSortIcon('vendorAmount') :
                        column === 'budget amount' ? getSortIcon('budgetAmount') :
                        column === compareBy ? getSortIcon(compareBy) :
                        getSortIcon(column)
                      }</span>
                    </div>
                  </th>
                ))
              ) : (
                // Regular view columns
                ['year', 'department', 'vendor', 'program', 'fund', 'amount'].map((column) => (
                  <th
                    key={column}
                    className="border border-gray-300 px-4 py-2 text-left cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{column}</span>
                      <span className="text-xs">{getSortIcon(column)}</span>
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {spendData.spending && spendData.spending.length > 0 ? spendData.spending.map((record, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {view === 'compare' ? (
                  // Compare view rows
                  <>
                    <td className="border border-gray-300 px-4 py-2">{record.year}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {compareBy === 'department' && record.departmentSlug ? (
                        <Link 
                          href={`/departments/${record.departmentSlug}`}
                          className="text-blue-600 hover:underline"
                        >
                          {record.department}
                        </Link>
                      ) : compareBy === 'program' && record.program !== 'Unknown Program' ? (
                        <div 
                          className="group relative cursor-help"
                          onMouseEnter={() => handleProgramHover(record.program)}
                          onMouseLeave={() => {
                            setHoveredProgram(null);
                            setProgramDetails(null);
                          }}
                        >
                          <span>{record.program}</span>
                          {hoveredProgram === record.program && programDetails && (
                            <div className="absolute bottom-full left-0 mb-2 bg-black text-white text-xs rounded px-3 py-2 whitespace-nowrap z-10 max-w-xs">
                              <div className="font-medium mb-1">{programDetails.name}</div>
                              {programDetails.programDescriptions.map((desc, i) => (
                                <div key={i} className="mb-1">
                                  <div>{desc.description}</div>
                                  <div className="text-gray-300 text-xs">
                                    Sources: {Array.isArray(desc.source) ? desc.source.length : 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : compareBy === 'fund' ? (
                        record.fund
                      ) : (
                        record.department
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                      {formatCurrency(record.vendorAmount || 0)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                      {formatCurrency(record.budgetAmount || 0)}
                    </td>
                  </>
                ) : (
                  // Regular view rows
                  <>
                    <td className="border border-gray-300 px-4 py-2">{record.year}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {record.departmentSlug ? (
                        <Link 
                          href={`/departments/${record.departmentSlug}`}
                          className="text-blue-600 hover:underline"
                        >
                          {record.department}
              </Link>
                      ) : (
                        record.department
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {record.vendor !== 'Budget Allocation' ? (
                        <div className="group relative">
                          <span>{record.vendor}</span>
                          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                            <a 
                              href={`https://projects.propublica.org/nonprofits/search?q=${encodeURIComponent(record.vendor)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:underline mr-2"
                              onClick={() => analytics.externalLinkClick(`https://projects.propublica.org/nonprofits/search?q=${encodeURIComponent(record.vendor)}`, 'vendor_lookup_propublica')}
                            >
                              ProPublica
                            </a>
                            <a 
                              href={`https://datarepublican.com/nonprofit/assets/?filter=${encodeURIComponent(record.vendor)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:underline"
                              onClick={() => analytics.externalLinkClick(`https://datarepublican.com/nonprofit/assets/?filter=${encodeURIComponent(record.vendor)}`, 'vendor_lookup_datarepublican')}
                            >
                              Data Republican
                            </a>
                          </div>
                        </div>
                      ) : (
                        record.vendor
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {record.program !== 'Unknown Program' ? (
                        <div 
                          className="group relative cursor-help"
                          onMouseEnter={() => handleProgramHover(record.program)}
                          onMouseLeave={() => {
                            setHoveredProgram(null);
                            setProgramDetails(null);
                          }}
                        >
                          <span>{record.program}</span>
                          {hoveredProgram === record.program && programDetails && (
                            <div className="absolute bottom-full left-0 mb-2 bg-black text-white text-xs rounded px-3 py-2 whitespace-nowrap z-10 max-w-xs">
                              <div className="font-medium mb-1">{programDetails.name}</div>
                              {programDetails.programDescriptions.map((desc, i) => (
                                <div key={i} className="mb-1">
                                  <div>{desc.description}</div>
                                  <div className="text-gray-300 text-xs">
                                    Sources: {Array.isArray(desc.source) ? desc.source.length : 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        record.program
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">{record.fund}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                      {formatCurrency(record.amount)}
                    </td>
                  </>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={view === 'compare' ? 4 : 6} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  No spending data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {spendData.pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((spendData.pagination.currentPage - 1) * spendData.pagination.itemsPerPage) + 1} to{' '}
            {Math.min(spendData.pagination.currentPage * spendData.pagination.itemsPerPage, spendData.pagination.totalItems)} of{' '}
            {spendData.pagination.totalItems} records
            </div>
          <div className="flex items-center space-x-2">
              <Button
              variant="outline"
                size="sm"
              disabled={!spendData.pagination.hasPrevPage}
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                updateUrl({ page: newPage.toString() });
              }}
            >
              Previous
              </Button>
            <span className="text-sm">
              Page {spendData.pagination.currentPage} of {spendData.pagination.totalPages}
            </span>
              <Button
              variant="outline"
                size="sm"
              disabled={!spendData.pagination.hasNextPage}
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                updateUrl({ page: newPage.toString() });
              }}
            >
              Next
              </Button>
          </div>
        </div>
      )}

      {/* Sources */}
      <div className="mt-16">
        <h2 className="text-xl font-bold mb-4">Sources</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>
            <a 
              href="https://www.ebudget.ca.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              onClick={() => analytics.externalLinkClick('https://www.ebudget.ca.gov/', 'spend_sources')}
            >
              California State Budget (ebudget.ca.gov)
            </a>
          </li>
          <li>
            <a 
              href="https://fiscal.ca.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              onClick={() => analytics.externalLinkClick('https://fiscal.ca.gov/', 'spend_sources')}
            >
              California Fiscal Transparency (fiscal.ca.gov)
            </a>
          </li>
          <li>
            <a 
              href="https://publicpay.ca.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              onClick={() => analytics.externalLinkClick('https://publicpay.ca.gov/', 'spend_sources')}
            >
              California Public Pay (publicpay.ca.gov)
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