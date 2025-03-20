import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Agency } from '@/types/agency';
import Image from 'next/image';
import Link from 'next/link';
import { 
  getDepartmentByWorkforceName, 
  findMarkdownForDepartment 
} from '@/lib/departmentMapping';

const AgencyDataVisualization = ({ agency }: { agency: Agency }) => {
  console.log('Received agency data:', agency);

  const formatNumber = (num: number) => num.toLocaleString();

  // Format currency with appropriate suffix (B for billions, M for millions)
  const formatCurrencyWithSuffix = (amount: number): string => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(2)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else {
      return `$${formatNumber(amount)}`;
    }
  };

  // Get employee data from either the new structure or the legacy structure
  const employeeData = agency.employeeData || {
    headCount: agency.yearlyHeadCount?.map(item => ({ year: item.year, count: item.headCount })),
    wages: agency.yearlyWages?.map(item => ({ year: item.year, amount: item.wages })),
    averageTenure: agency.averageTenureYears,
    averageSalary: agency.averageSalary,
    averageAge: agency.averageAge,
    tenureDistribution: agency.tenureDistribution,
    salaryDistribution: agency.salaryDistribution,
    ageDistribution: agency.ageDistribution
  };

  // Get 2024 data from yearly arrays
  const headCount2024 = employeeData.headCount?.find(item => item.year === "2024")?.count;
  const wages2024 = employeeData.wages?.find(item => item.year === "2024")?.amount;

  // Enhanced debug logs
  console.log('AgencyDataVisualization received:', {
    name: agency.name,
    headCount2024,
    wages2024,
    subordinateOffices: agency.subordinateOffices,
    hasDistributions: {
      tenure: !!employeeData.tenureDistribution && Object.keys(employeeData.tenureDistribution).length > 0,
      salary: !!employeeData.salaryDistribution && Object.keys(employeeData.salaryDistribution).length > 0,
      age: !!employeeData.ageDistribution && Object.keys(employeeData.ageDistribution).length > 0
    }
  });

  // Debug logs to check data
  console.log('Agency data:', agency);
  console.log('Subordinate Offices:', agency.subordinateOffices);
  console.log('Tenure data:', Object.entries(employeeData.tenureDistribution || {}).map(([key, value]) => ({ name: key, value })));
  console.log('Salary data:', Object.entries(employeeData.salaryDistribution || {}).map(([key, value]) => ({ name: key, value })));
  console.log('Age data:', Object.entries(employeeData.ageDistribution || {}).map(([key, value]) => ({ name: key, value })));

  const CustomTooltip = ({ active, payload, label, type }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      let message = '';
      switch (type) {
        case 'tenure':
          message = `${formatNumber(value)} employees have worked here ${label} years`;
          break;
        case 'salary':
          message = `${formatNumber(value)} employees make ${label}`;
          break;
        case 'age':
          message = `${formatNumber(value)} employees are ${label} years old`;
          break;
      }
      return (
        <div className="bg-white p-3 border rounded shadow-lg absolute -translate-y-full -mt-2">
          <p className="text-sm">{message}</p>
        </div>
      );
    }
    return null;
  };

  const tenureData = Object.entries(employeeData.tenureDistribution || {}).map(([key, value]) => ({ name: key, value }));
  const salaryData = Object.entries(employeeData.salaryDistribution || {}).map(([key, value]) => ({ name: key, value }));
  const ageData = Object.entries(employeeData.ageDistribution || {}).map(([key, value]) => ({ name: key, value }));

  console.log('Prepared chart data:', {
    name: agency.name,
    tenureDataPoints: tenureData.length,
    salaryDataPoints: salaryData.length,
    ageDataPoints: ageData.length
  });

  // Check if we have a corresponding department page
  const departmentMapping = getDepartmentByWorkforceName(agency.name, true);
  
  // Try to find markdown file directly
  const markdownSlug = findMarkdownForDepartment(agency.name);
  
  // Debug output
  console.log(`Workforce Agency ${agency.name} -> mapping: ${departmentMapping?.slug || 'no mapping found'}, markdown: ${markdownSlug || 'none'}`);
  
  // Additional debug for Forestry department
  if (agency.name.includes("Forest") || agency.name.includes("fire") || agency.name.includes("Fire")) {
    console.log("FORESTRY DEBUG:", { 
      agencyName: agency.name,
      departmentMapping,
      markdownSlug,
      hasDepartmentPage: markdownSlug ? true : false
    });
  }

  // If no data, show placeholder
  if (!headCount2024 && !wages2024) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Workforce Data</h3>
        <p className="text-gray-500">No workforce data available for this organization</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h3 className="text-xl font-semibold">
          {markdownSlug ? (
            <Link 
              href={`/departments/${markdownSlug}`}
              className="text-blue-600 hover:underline"
            >
              {agency.name} Details
            </Link>
          ) : (
            `${agency.name} Workforce`
          )}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-lg font-bold">
            {headCount2024 !== null && headCount2024 !== undefined ? formatNumber(headCount2024) : '~'}
          </div>
          <div className="text-gray-600 text-sm">
            {markdownSlug ? (
              <Link 
                href={`/departments/${markdownSlug}`}
                className="text-blue-600 hover:underline"
              >
                Headcount (2024)
              </Link>
            ) : (
              "Headcount (2024)"
            )}
          </div>
        </div>
        <div>
          <div className="text-lg font-bold">
            {agency.subordinateOffices !== undefined ? formatNumber(agency.subordinateOffices) : '~'}
          </div>
          <div className="text-gray-600 text-sm">Subordinate Offices</div>
        </div>
        <div>
          <div className="text-lg font-bold">
            {wages2024 !== null && wages2024 !== undefined ? formatCurrencyWithSuffix(wages2024) : '~'}
          </div>
          <div className="text-gray-600 text-sm">Total Wages (2024)</div>
        </div>
      </div>

      <div className="mt-4 bg-white p-6 rounded-lg shadow border">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-lg font-bold">
              {employeeData.averageSalary ? formatCurrencyWithSuffix(employeeData.averageSalary) : '—'}
            </div>
            <div className="text-gray-600 text-sm">Average Salary</div>
          </div>
          <div>
            <div className="text-lg font-bold">
              {employeeData.averageTenure ? `${employeeData.averageTenure} years` : '—'}
            </div>
            <div className="text-gray-600 text-sm">Average Tenure</div>
          </div>
          <div>
            <div className="text-lg font-bold">
              {employeeData.averageAge ? `${employeeData.averageAge} years` : '—'}
            </div>
            <div className="text-gray-600 text-sm">Average Age</div>
          </div>
        </div>

        <div className="charts-container">
          <div className="chart-section">
            <h3 className="text-sm font-semibold mb-2">Years of Tenure</h3>
            {tenureData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={tenureData}>
                    <XAxis dataKey="name" />
                    <YAxis hide={true} />
                    <Tooltip content={(props) => <CustomTooltip {...props} type="tenure" />} />
                    <Bar dataKey="value" fill="#000000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[100px]">
                <Image 
                  src="/no-data-yet.svg" 
                  alt="No Data Yet" 
                  width={100} 
                  height={100} 
                  priority
                />
              </div>
            )}
            <p className="text-gray-600 text-xs mt-1">Average tenure: {employeeData.averageTenure || '~'} years</p>
          </div>

          <div className="chart-section">
            <h3 className="text-sm font-semibold mb-2">Salary Distribution</h3>
            {salaryData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={salaryData}>
                    <XAxis dataKey="name" />
                    <YAxis hide={true} />
                    <Tooltip content={(props) => <CustomTooltip {...props} type="salary" />} />
                    <Bar dataKey="value" fill="#000000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[100px]">
                <Image 
                  src="/no-data-yet.svg" 
                  alt="No Data Yet" 
                  width={100} 
                  height={100} 
                  priority
                />
              </div>
            )}
            <p className="text-gray-600 text-xs mt-1">Average salary: {employeeData.averageSalary ? formatCurrencyWithSuffix(employeeData.averageSalary) : '~'}/yr</p>
          </div>

          <div className="chart-section">
            <h3 className="text-sm font-semibold mb-2">Age Distribution</h3>
            {ageData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={ageData}>
                    <XAxis dataKey="name" />
                    <YAxis hide={true} />
                    <Tooltip content={(props) => <CustomTooltip {...props} type="age" />} />
                    <Bar dataKey="value" fill="#000000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[100px]">
                <Image 
                  src="/no-data-yet.svg" 
                  alt="No Data Yet" 
                  width={100} 
                  height={100} 
                  priority
                />
              </div>
            )}
            <p className="text-gray-600 text-xs mt-1">Average age: {employeeData.averageAge || '~'} years</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyDataVisualization; 