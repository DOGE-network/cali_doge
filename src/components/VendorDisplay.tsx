/**
 * VendorDisplay Component
 * 
 * strictly following vendor types from vendor.ts
 * 
 * Data Structure from API Endpoints:
 * - vendor-departments: Shows vendors and their department relationships
 *   Structure: { vendor_name: string, fiscalYear: [{ year: string, department_name: [{name: string, amount: number, count: number}] }] }
 * 
 * - department-vendors: Shows departments and their vendor relationships
 *   Structure: { department_name: string, fiscalYear: [{ year: string, vendor_name: [{name: string, amount: number, count: number}] }] }
 * 
 * - account-vendors: Shows accounts and their vendor relationships
 *   Structure: { account_type: string, fiscalYear: [{ year: string, vendor_name: [{name: string, amount: number, count: number}] }] }
 * 
 * - program-vendors: Shows programs and their vendor relationships
 *   Structure: { program_description: string, fiscalYear: [{ year: string, vendor_name: [{name: string, amount: number, count: number}] }] }
 * 
 * View Types:
 * - departments: Shows vendor spending by department
 * - departmentVendors: Shows department spending by vendor
 * - accounts: Shows account type spending by vendor
 * - programs: Shows program spending by vendor
 */

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { VendorDepartment } from '@/types/vendor';

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface VendorDisplayProps {
  vendorData: {
    departments: VendorDepartment[];
  };
  selectedYears: string[];
  showAllVendors: boolean;
  selectedDepartment: string;
  loading: boolean;
  error: string | null;
}

const VendorDisplay: React.FC<VendorDisplayProps> = ({ 
  vendorData, 
  selectedYears,
  showAllVendors,
  selectedDepartment,
  loading,
  error
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedData, setPaginatedData] = useState<VendorDepartment[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Get data based on view type and apply filtering
  const displayData = useMemo(() => {
    if (!vendorData) return [];

    const getData = () => {
      const vendors = showAllVendors ? paginatedData : vendorData.departments || [];
      return vendors
        .filter(dept => {
          if (!selectedDepartment) return true;
          return dept.fiscalYear?.some(fy => 
            fy.data?.some(d => d.name === selectedDepartment)
          ) ?? false;
        })
        .map(dept => ({
          name: dept.vendor_name,
          data: (dept.fiscalYear || [])
            .filter(fy => selectedYears.includes(fy.year))
            .map(fy => ({
              year: fy.year,
              amount: (fy.data || [])
                .filter(d => !selectedDepartment || d.name === selectedDepartment)
                .reduce((sum: number, d) => sum + (d.amount || 0), 0),
              count: (fy.data || [])
                .filter(d => !selectedDepartment || d.name === selectedDepartment)
                .reduce((sum: number, d) => sum + (d.count || 0), 0)
            }))
        }));
    };

    return getData();
  }, [vendorData, showAllVendors, selectedDepartment, selectedYears, paginatedData]);

  useEffect(() => {
    const fetchPaginatedData = async () => {
      if (showAllVendors) {
        try {
          const yearParam = selectedYears.length > 0 ? `&year=${selectedYears[0]}` : '';
          const deptParam = selectedDepartment ? `&department=${encodeURIComponent(selectedDepartment)}` : '';
          const response = await fetch(`/api/vendors/vendor-departments?page=${currentPage}&limit=20${yearParam}${deptParam}`);
          const data = await response.json();
          setPaginatedData(data.vendors);
          setPaginationInfo(data.pagination);
        } catch (err) {
          console.error('Error fetching paginated data:', err);
        }
      }
    };

    fetchPaginatedData();
  }, [showAllVendors, currentPage, selectedYears, selectedDepartment]);

  if (loading) {
    return <div>Loading vendor data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!vendorData) {
    return <div>No vendor data available</div>;
  }

  // Format spending value to display with $ and M/B
  const formatSpending = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(1)}`;
  };

  // Filter data based on showAllVendors
  const filteredData = showAllVendors ? displayData : displayData.slice(0, 20);

  const handlePreviousPage = () => {
    if (paginationInfo.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (paginationInfo.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Vendor</th>
              {selectedYears.map((year, _index) => {
                const nextYear = (parseInt(year) + 1).toString();
                return (
                  <th key={year} className="px-4 py-2 text-right">
                    FY{year}-FY{nextYear}
                  </th>
                );
              }).reverse()}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, _index) => {
              return (
                <tr 
                  key={item.name} 
                  className={`${_index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-2">{item.name}</td>
                  {selectedYears.map(year => {
                    const yearData = item.data.find(d => d.year === year);
                    return (
                      <td key={year} className="px-4 py-2 text-right">
                        {yearData ? formatSpending(yearData.amount) : '$0'}
                      </td>
                    );
                  }).reverse()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAllVendors && (
        <div className="mt-4 flex justify-between items-center">
          <div>
            Showing {paginationInfo.itemsPerPage * (paginationInfo.currentPage - 1) + 1} to{' '}
            {Math.min(paginationInfo.itemsPerPage * paginationInfo.currentPage, paginationInfo.totalItems)} of{' '}
            {paginationInfo.totalItems} vendors
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={!paginationInfo.hasPrevPage}
              className={`px-4 py-2 rounded ${
                paginationInfo.hasPrevPage
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={!paginationInfo.hasNextPage}
              className={`px-4 py-2 rounded ${
                paginationInfo.hasNextPage
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDisplay; 