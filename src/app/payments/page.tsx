/**
 * VendorsPage Component
 * 
 * strictly following vendor types from vendor.ts
 * API Endpoints:
 * - /api/vendors/vendor-departments: Returns vendor data grouped by departments
 * - /api/vendors/department-vendors: Returns department data grouped by vendors
 * - /api/vendors/account-vendors: Returns account data grouped by vendors
 * - /api/vendors/program-vendors: Returns program data grouped by vendors
 * 
 * Data Structure:
 * - vendor-departments: VendorDepartment[] - Shows how vendors are distributed across departments
 * - department-vendors: DepartmentVendor[] - Shows how departments interact with vendors
 * - account-vendors: AccountVendor[] - Shows vendor distribution across account types
 * - program-vendors: ProgramVendor[] - Shows vendor distribution across programs
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface TopVendorRecord {
  year: number;
  years: number[];
  vendor: string;
  totalAmount: number;
  transactionCount: number;
  departments: string[];
  programs: string[];
  funds: string[];
  categories: string[];
  descriptions: string[];
  primaryDepartment?: string;
  primaryDepartmentSlug?: string;
}

interface TopVendorsResponse {
  vendors: TopVendorRecord[];
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
    vendorCount: number;
    year: number;
    availableYears: string[];
  };
}

// HoverTooltip component for displaying array values
function HoverTooltip({ 
  items, 
  maxDisplay = 5, 
  className = "text-sm" 
}: { 
  items: string[], 
  maxDisplay?: number, 
  className?: string 
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (!Array.isArray(items) || items.length === 0) {
    return <span className={className}></span>;
  }

  const displayItems = items.slice(0, maxDisplay);
  const hasMore = items.length > maxDisplay;
  const remainingCount = items.length - maxDisplay;

  return (
    <div className={`${className} relative`}>
      <span>
        {displayItems.join(', ')}
        {hasMore && (
          <button
            onClick={() => setIsHovered(true)}
            className="ml-1 text-blue-600 hover:text-blue-800 underline"
          >
            +{remainingCount} more
          </button>
        )}
      </span>
      {isHovered && hasMore && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setIsHovered(false)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-lg w-full max-w-sm max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="p-4">
              <div className="text-sm font-medium mb-3 text-gray-700">All {items.length} items:</div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="text-sm text-gray-800 break-words">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Client component that uses useSearchParams
function PaymentsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for pagination and filtering
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [sort, setSort] = useState('totalAmount'); // vendor|totalAmount|transactionCount|programs|funds|categories|descriptions
  const [order, setOrder] = useState('desc'); // asc|desc
  const [filterValue, setFilterValue] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');

  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.set('sort', sort);
    params.set('order', order);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    
    // Use appliedFilter instead of filterValue
    if (appliedFilter && appliedFilter.trim()) {
      params.set('filter', appliedFilter.trim());
    }
    
    return `/api/vendors/top?${params.toString()}`;
  };

  // Fetch vendor spending data
  const { data: vendorData, error, isLoading } = useSWR<TopVendorsResponse>(
    buildApiUrl(),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000
    }
  );

  // Handle applying the filter (button click or Enter key)
  const handleApplyFilter = () => {
    setPage(1);
    setAppliedFilter(filterValue); // Update the applied filter
    updateUrl({ page: '1', filter: filterValue.trim() });
  };

  // Initialize from URL params
  useEffect(() => {
    const sortParam = searchParams.get('sort');
    const orderParam = searchParams.get('order');
    const filterParam = searchParams.get('filter');
    
    if (sortParam && ['vendor', 'totalAmount', 'transactionCount'].includes(sortParam)) {
      setSort(sortParam);
    }
    if (orderParam && ['asc', 'desc'].includes(orderParam)) {
      setOrder(orderParam);
    }
    if (filterParam) {
      setFilterValue(filterParam);
      setAppliedFilter(filterParam); // Set both the input value and applied filter
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
    router.push(`/payments?${params.toString()}`);
  };

  // Handle sorting
  const handleSort = (column: string) => {
    const newOrder = sort === column && order === 'desc' ? 'asc' : 'desc';
    setSort(column);
    setOrder(newOrder);
    setPage(1);
    updateUrl({ sort: column, order: newOrder, page: '1' });
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

  if (isLoading || !vendorData) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-gray-600">Loading vendor payment data...</p>
      </div>
    );
  }

  // Defensive check for pagination structure
  if (!vendorData.pagination) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>Invalid response structure from API</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">California State Government Payments</h1>
        <p className="text-sm text-gray-600">
        Vendor payments are collected from the California Open Data Portal at <a href="https://open.fiscal.ca.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">open.fiscal.ca.gov</a>
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Filter */}
        <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
          <div className="flex-1">
            <div className="flex flex-col space-y-2">
              <Input
                placeholder="Filter vendors..."
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
                Use AND to find vendors containing all terms (e.g. &quot;health AND care AND services&quot;). 
                Use OR to find vendors containing any term (e.g. &quot;health OR medical&quot;). 
                Commas are treated as AND. Use quotes for exact phrases (e.g. &quot;health care&quot;).
              </p>
            </div>
          </div>
          {filterValue && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyFilter}
              className="bg-white"
            >
              Apply Filter
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {[
                { key: 'vendor', label: 'Vendor', sortable: true },
                { key: 'totalAmount', label: 'Total Amount', sortable: true },
                { key: 'transactionCount', label: 'Transactions', sortable: true },
                { key: 'departments', label: 'Departments', sortable: false },
                { key: 'programs', label: 'Programs', sortable: false },
                { key: 'funds', label: 'Funds', sortable: false },
                { key: 'categories', label: 'Categories', sortable: false },
                { key: 'descriptions', label: 'Descriptions', sortable: false }
              ].map((column) => (
                <th
                  key={column.key}
                  className={`border border-gray-300 px-4 py-2 text-left ${column.sortable ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{column.label}</span>
                    {column.sortable && <span className="text-xs">{getSortIcon(column.key)}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendorData.vendors && vendorData.vendors.length > 0 ? vendorData.vendors.map((vendor, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">
                  <div className="group relative">
                    <span className="font-medium">{vendor.vendor}</span>
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      <a 
                        href={`https://projects.propublica.org/nonprofits/search?q=${encodeURIComponent(vendor.vendor)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:underline mr-2"
                      >
                        ProPublica
                      </a>
                      <a 
                        href={`https://datarepublican.com/nonprofit/assets/?filter=${encodeURIComponent(vendor.vendor)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:underline"
                      >
                        Data Republican
                      </a>
                    </div>
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                  {formatCurrency(vendor.totalAmount)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {vendor.transactionCount?.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <HoverTooltip items={vendor.departments} />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <HoverTooltip items={vendor.programs} />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <HoverTooltip items={vendor.funds} />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <HoverTooltip items={vendor.categories} />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <HoverTooltip items={vendor.descriptions} />
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  No vendor payment data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {vendorData.pagination && vendorData.pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((vendorData.pagination.currentPage - 1) * vendorData.pagination.itemsPerPage) + 1} to{' '}
            {Math.min(vendorData.pagination.currentPage * vendorData.pagination.itemsPerPage, vendorData.pagination.totalItems)} of{' '}
            {vendorData.pagination.totalItems} records
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!vendorData.pagination.hasPrevPage}
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                updateUrl({ page: newPage.toString() });
              }}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {vendorData.pagination.currentPage} of {vendorData.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!vendorData.pagination.hasNextPage}
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
              href="https://fiscal.ca.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California Fiscal Transparency (fiscal.ca.gov)
            </a>
          </li>
          <li>
            <a 
              href="https://open.fiscal.ca.gov/transparency.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Fi$cal Monthly Vendor Transaction Files
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}

// Wrapper component for suspense
export default function PaymentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentsPageClient />
    </Suspense>
  );
} 