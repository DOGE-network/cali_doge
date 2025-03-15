import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Agency } from './types';
import Image from 'next/image';
import Link from 'next/link';
import { getDepartmentByWorkforceName } from '@/lib/departmentMapping';

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

  // Get 2024 data from yearly arrays
  const headCount2024 = agency.yearlyHeadCount?.find(item => item.year === "2024")?.headCount;
  const wages2024 = agency.yearlyWages?.find(item => item.year === "2024")?.wages;

  // Enhanced debug logs
  console.log('AgencyDataVisualization received:', {
    name: agency.name,
    headCount2024,
    wages2024,
    subordinateOffices: agency.subordinateOffices,
    hasDistributions: {
      tenure: !!agency.tenureDistribution && Object.keys(agency.tenureDistribution).length > 0,
      salary: !!agency.salaryDistribution && Object.keys(agency.salaryDistribution).length > 0,
      age: !!agency.ageDistribution && Object.keys(agency.ageDistribution).length > 0
    }
  });

  // Debug logs to check data
  console.log('Agency data:', agency);
  console.log('Subordinate Offices:', agency.subordinateOffices);
  console.log('Tenure data:', Object.entries(agency.tenureDistribution || {}).map(([key, value]) => ({ name: key, value })));
  console.log('Salary data:', Object.entries(agency.salaryDistribution || {}).map(([key, value]) => ({ name: key, value })));
  console.log('Age data:', Object.entries(agency.ageDistribution || {}).map(([key, value]) => ({ name: key, value })));

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

  const tenureData = Object.entries(agency.tenureDistribution || {}).map(([key, value]) => ({ name: key, value }));
  const salaryData = Object.entries(agency.salaryDistribution || {}).map(([key, value]) => ({ name: key, value }));
  const ageData = Object.entries(agency.ageDistribution || {}).map(([key, value]) => ({ name: key, value }));

  console.log('Prepared chart data:', {
    name: agency.name,
    tenureDataPoints: tenureData.length,
    salaryDataPoints: salaryData.length,
    ageDataPoints: ageData.length
  });

  // Check if we have a corresponding department page
  const departmentMapping = getDepartmentByWorkforceName(agency.name);
  
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
          {departmentMapping ? (
            <Link 
              href={`/departments/${departmentMapping.slug}`}
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
            {headCount2024 !== undefined ? formatNumber(headCount2024) : '~'}
          </div>
          <div className="text-gray-600 text-sm">
            {departmentMapping ? (
              <Link 
                href={`/departments/${departmentMapping.slug}`}
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
            {wages2024 !== undefined ? formatCurrencyWithSuffix(wages2024) : '~'}
          </div>
          <div className="text-gray-600 text-sm">Total Wages (2024)</div>
        </div>
      </div>

      <div className="mt-4 bg-white p-6 rounded-lg shadow border">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-lg font-bold">
              {agency.averageSalary ? formatCurrencyWithSuffix(agency.averageSalary) : '—'}
            </div>
            <div className="text-gray-600 text-sm">Average Salary</div>
          </div>
          <div>
            <div className="text-lg font-bold">
              {agency.averageTenureYears ? `${agency.averageTenureYears} years` : '—'}
            </div>
            <div className="text-gray-600 text-sm">Average Tenure</div>
          </div>
          <div>
            <div className="text-lg font-bold">
              {agency.averageAge ? `${agency.averageAge} years` : '—'}
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
            <p className="text-gray-600 text-xs mt-1">Average tenure: {agency.averageTenureYears || '~'} years</p>
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
            <p className="text-gray-600 text-xs mt-1">Average salary: {agency.averageSalary ? formatCurrencyWithSuffix(agency.averageSalary) : '~'}/yr</p>
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
            <p className="text-gray-600 text-xs mt-1">Average age: {agency.averageAge || '~'} years</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyDataVisualization; 