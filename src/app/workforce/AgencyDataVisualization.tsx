import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { DepartmentData } from '@/types/department';
import Image from 'next/image';
import Link from 'next/link';
import { findMarkdownForDepartment } from '@/lib/departmentMapping';

const AgencyDataVisualization = ({ department }: { department: DepartmentData }) => {
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

  // Transform yearly data from Record to arrays
  const transformYearlyData = (yearlyRecord: Record<string, number | null> | undefined) => {
    if (!yearlyRecord) return [];
    return Object.entries(yearlyRecord)
      .filter(([_, value]) => value !== null)
      .map(([year, value]) => ({ year, value: value as number }));
  };

  // Get employee data from the workforce structure with safe defaults
  const employeeData = {
    headCount: transformYearlyData(department.workforce?.headCount?.yearly),
    wages: transformYearlyData(department.workforce?.wages?.yearly),
    averageTenureYears: department.workforce?.averageTenureYears || null,
    averageSalary: department.workforce?.averageSalary || null,
    averageAge: department.workforce?.averageAge || null,
    tenureDistribution: department.workforce?.tenureDistribution || {},
    salaryDistribution: department.workforce?.salaryDistribution || {},
    ageDistribution: department.workforce?.ageDistribution || {}
  };

  // Get 2023 data from yearly arrays
  const headCount2023 = employeeData.headCount.find(item => item.year === "2023")?.value;
  const wages2023 = employeeData.wages.find(item => item.year === "2023")?.value;

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

  const tenureData = Object.entries(employeeData.tenureDistribution).map(([key, value]) => ({ name: key, value }));
  const salaryData = Object.entries(employeeData.salaryDistribution).map(([key, value]) => ({ name: key, value }));
  const ageData = Object.entries(employeeData.ageDistribution).map(([key, value]) => ({ name: key, value }));
  
  // Try to find markdown file directly
  const markdownSlug = findMarkdownForDepartment(department.name);

  // Always show the department card, with placeholders for missing data
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h3 className="text-xl font-semibold">
          {markdownSlug ? (
            <Link 
              href={`/departments/${markdownSlug}`}
              className="text-blue-600 hover:underline"
            >
             {department.name} Details
            </Link>
          ) : (
            ""
          )}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-lg font-bold">
            {headCount2023 !== null && headCount2023 !== undefined ? formatNumber(headCount2023) : '—'}
          </div>
          <div className="text-gray-600 text-sm">
            {markdownSlug ? (
              "Headcount (2023)"
            ) : (
              "Headcount (2023)"
            )}
          </div>
        </div>
        <div>
          <div className="text-lg font-bold">
            {wages2023 !== null && wages2023 !== undefined ? formatCurrencyWithSuffix(wages2023) : '—'}
          </div>
          <div className="text-gray-600 text-sm">Total Wages (2023)</div>
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
              {employeeData.averageTenureYears ? `${employeeData.averageTenureYears} years` : '—'}
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
            <p className="text-gray-600 text-xs mt-1">Average tenure: {employeeData.averageTenureYears || '—'} years</p>
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
            <p className="text-gray-600 text-xs mt-1">Average salary: {employeeData.averageSalary ? formatCurrencyWithSuffix(employeeData.averageSalary) : '—'}/yr</p>
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
            <p className="text-gray-600 text-xs mt-1">Average age: {employeeData.averageAge || '—'} years</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyDataVisualization; 