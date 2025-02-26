import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Agency } from './types';

const AgencyDataVisualization = ({ agency }: { agency: Agency }) => {
  const formatNumber = (num: number) => num.toLocaleString();

  // Enhanced debug logs
  console.log('AgencyDataVisualization received:', {
    name: agency.name,
    headCount: agency.headCount,
    hasDistributions: {
      tenure: !!agency.tenureDistribution && Object.keys(agency.tenureDistribution).length > 0,
      salary: !!agency.salaryDistribution && Object.keys(agency.salaryDistribution).length > 0,
      age: !!agency.ageDistribution && Object.keys(agency.ageDistribution).length > 0
    }
  });

  // Debug logs to check data
  console.log('Agency data:', agency);
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

  // Check if we have any data to display
  if (!agency.tenureDistribution && !agency.salaryDistribution && !agency.ageDistribution) {
    console.log('No distribution data available for:', agency.name);
    return null;
  }

  const tenureData = Object.entries(agency.tenureDistribution || {}).map(([key, value]) => ({ name: key, value }));
  const salaryData = Object.entries(agency.salaryDistribution || {}).map(([key, value]) => ({ name: key, value }));
  const ageData = Object.entries(agency.ageDistribution || {}).map(([key, value]) => ({ name: key, value }));

  console.log('Prepared chart data:', {
    name: agency.name,
    tenureDataPoints: tenureData.length,
    salaryDataPoints: salaryData.length,
    ageDataPoints: ageData.length
  });

  return (
    <div className="mt-4 bg-white p-6 rounded-lg shadow border">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-lg font-bold">{formatNumber(agency.headCount || 0)}</div>
          <div className="text-gray-600 text-sm">Headcount</div>
        </div>
        <div>
          <div className="text-lg font-bold">{formatNumber(agency.subordinateOffices || 0)}</div>
          <div className="text-gray-600 text-sm">Subordinate Offices</div>
        </div>
        <div>
          <div className="text-lg font-bold">${formatNumber(agency.totalWages || 0)}B</div>
          <div className="text-gray-600 text-sm">Total Wages</div>
        </div>
      </div>

      <div className="charts-container">
        {tenureData.length > 0 && (
          <div className="chart-section">
            <h3 className="text-sm font-semibold mb-2">Years of Tenure</h3>
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
            <p className="text-gray-600 text-xs mt-1">Average tenure: {agency.averageTenureYears} years</p>
          </div>
        )}

        {salaryData.length > 0 && (
          <div className="chart-section">
            <h3 className="text-sm font-semibold mb-2">Salary Distribution</h3>
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
            <p className="text-gray-600 text-xs mt-1">Average salary: ${formatNumber(agency.averageSalary || 0)}/yr</p>
          </div>
        )}

        {ageData.length > 0 && (
          <div className="chart-section">
            <h3 className="text-sm font-semibold mb-2">Age Distribution</h3>
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
            <p className="text-gray-600 text-xs mt-1">Average age: {agency.averageAge} years</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgencyDataVisualization; 