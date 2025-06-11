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

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface TopVendorRecord {
  year: number;
  name: string;
  totalAmount: number;
  transactionCount: number;
  departments: string[];
  programs: string[];
  funds: string[];
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

// Client component that uses useSearchParams
function PaymentsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for filters and sorting
  const [selectedYear, setSelectedYear] = useState('2024'); // Default to most recent year
  const [sort, setSort] = useState('totalAmount'); // vendor|totalAmount|transactionCount|primaryDepartment
  const [order, setOrder] = useState('desc'); // asc|desc
  const [page, setPage] = useState(1);
  const [limit] = useState(100); // Top 100 vendors
  const [filterValue, setFilterValue] = useState(''); // Add filter value state
  const [appliedFilter, setAppliedFilter] = useState(''); // Track the currently applied filter

  // Get available years from the vendors API response
  const { data: yearsData } = useSWR<TopVendorsResponse>(
    `/api/vendors/top?year=2024&limit=1`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000
    }
  );

  // Extract available years from vendor data
  const availableYears = useMemo(() => {
    if (yearsData?.summary?.availableYears) {
      return yearsData.summary.availableYears.sort((a, b) => parseInt(b) - parseInt(a));
    }
    return ['2024', '2023', '2022', '2021', '2020']; // Fallback to hardcoded years
  }, [yearsData]);

  // Build API URL for top 100 vendors
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.set('year', selectedYear);
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
    const yearParam = searchParams.get('year');
    const sortParam = searchParams.get('sort');
    const orderParam = searchParams.get('order');
    const filterParam = searchParams.get('filter');
    
    if (yearParam && availableYears.includes(yearParam)) {
      setSelectedYear(yearParam);
    }
    if (sortParam && ['vendor', 'totalAmount', 'transactionCount', 'primaryDepartment'].includes(sortParam)) {
      setSort(sortParam);
    }
    if (orderParam && ['asc', 'desc'].includes(orderParam)) {
      setOrder(orderParam);
    }
    if (filterParam) {
      setFilterValue(filterParam);
      setAppliedFilter(filterParam); // Set both the input value and applied filter
    }
  }, [searchParams, availableYears]);

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

  // Handle year change
  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    setPage(1);
    updateUrl({ year: newYear, page: '1' });
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
        {/* Year Selection and Filter */}
        <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
          <label className="text-sm font-medium">Year:</label>
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="text-sm text-gray-600">
            Showing top {limit} vendors for {selectedYear}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {[
                { key: 'vendor', label: 'Vendor' },
                { key: 'year', label: 'Year' },
                { key: 'totalAmount', label: 'Total Amount' },
                { key: 'transactionCount', label: 'Transactions' },
                { key: 'primaryDepartment', label: 'Primary Department' },
                { key: 'departments', label: 'All Departments' },
                { key: 'programs', label: 'Programs' }
              ].map((column) => (
                <th
                  key={column.key}
                  className="border border-gray-300 px-4 py-2 text-left cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{column.label}</span>
                    <span className="text-xs">{getSortIcon(column.key)}</span>
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
                    <span className="font-medium">{vendor.name}</span>
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      <a 
                        href={`https://projects.propublica.org/nonprofits/search?q=${encodeURIComponent(vendor.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:underline mr-2"
                      >
                        ProPublica
                      </a>
                      <a 
                        href={`https://www.datarepublican.com/search?q=${encodeURIComponent(vendor.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:underline"
                      >
                        Data Republican
                      </a>
                    </div>
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">{vendor.year || selectedYear}</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                  {formatCurrency(vendor.totalAmount)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {vendor.transactionCount?.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {vendor.primaryDepartmentSlug ? (
                    <Link 
                      href={`/departments/${vendor.primaryDepartmentSlug}`}
                      className="text-blue-600 hover:underline"
                    >
                      {vendor.primaryDepartment}
                    </Link>
                  ) : (
                    vendor.primaryDepartment
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="text-sm">
                    {vendor.departments && vendor.departments.length > 3 ? (
                      <span title={vendor.departments.join(', ')}>
                        {vendor.departments.slice(0, 3).join(', ')} +{vendor.departments.length - 3} more
                      </span>
                    ) : (
                      vendor.departments?.join(', ')
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="text-sm">
                    {vendor.programs && vendor.programs.length > 2 ? (
                      <span title={vendor.programs.join(', ')}>
                        {vendor.programs.slice(0, 2).join(', ')} +{vendor.programs.length - 2} more
                      </span>
                    ) : 
                      vendor.programs?.join(', ')
                    }
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  No vendor payment data found for {selectedYear}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {vendorData.pagination.totalPages > 1 && (
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