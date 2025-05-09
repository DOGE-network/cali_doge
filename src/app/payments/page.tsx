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

import { useEffect, useState } from 'react';
import VendorDisplay from '@/components/VendorDisplay';
import { VendorDepartment, DepartmentVendor, AccountVendor, ProgramVendor } from '@/types/vendor';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function VendorsPage() {
  const [vendorData, setVendorData] = useState<{
    departments: VendorDepartment[];
    departmentVendors: DepartmentVendor[];
    accounts: AccountVendor[];
    programs: ProgramVendor[];
  }>({
    departments: [],
    departmentVendors: [],
    accounts: [],
    programs: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [departments, departmentVendors, accounts, programs] = await Promise.all([
          fetch('/api/vendors/vendor-departments').then(res => res.json()),
          fetch('/api/vendors/department-vendors').then(res => res.json()),
          fetch('/api/vendors/account-vendors').then(res => res.json()),
          fetch('/api/vendors/program-vendors').then(res => res.json())
        ]);

        const newVendorData = {
          departments: departments.vendors || [],
          departmentVendors: departmentVendors.departments || [],
          accounts: accounts.accounts || [],
          programs: programs.programs || []
        };

        setVendorData(newVendorData);

        // Extract unique years from vendor data
        const years = new Set<string>();
        newVendorData.departments.forEach((vendor: VendorDepartment) => {
          vendor.fiscalYear?.forEach(fy => {
            if (fy.year) years.add(fy.year);
          });
        });
        const sortedYears = Array.from(years).sort().reverse();
        
        // Set all years as selected by default
        setSelectedYears(sortedYears);

        // Extract unique departments
        const uniqueDepartments = new Set<string>();
        newVendorData.departmentVendors.forEach((dept: DepartmentVendor) => {
          uniqueDepartments.add(dept.department_name);
        });
        const sortedDepartments = Array.from(uniqueDepartments).sort();
        setDepartments(sortedDepartments);
        setSelectedDepartment('');
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vendor data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600">Loading department data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">California State Government Payments</h1>
      <p className="text-sm text-gray-600 mb-6">
        Vendor numbers are from the Fi$cal Monthly Vendor Transaction Files. More details found at{' '}
        <a href="https://open.fiscal.ca.gov/transparency.html" className="text-blue-600 hover:underline">
          open.fiscal.ca.gov/transparency.html
        </a>
        .
      </p>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Filter by Department</h2>
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      <VendorDisplay
        vendorData={vendorData}
        selectedYears={selectedYears}
        showAllVendors={true}
        selectedDepartment={selectedDepartment}
        loading={loading}
        error={error}
      />
    </main>
  );
} 