"use client"

import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import Image from 'next/image';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomTooltipProps extends Omit<TooltipProps<ValueType, NameType>, 'type'> {
  type: 'tenure' | 'salary' | 'age';
  headCount: number;
}

interface RawDistributionItem {
  range: [number, number];
  count: number;
}

interface EmployeeData {
  headcount: { year: string; value: number | null }[];
  wages: { year: string; value: number | null }[];
  tenureDistribution: RawDistributionItem[];
  salaryDistribution: RawDistributionItem[];
  ageDistribution: RawDistributionItem[];
  averageSalary: number | null;
  averageTenure: number | null;
  averageAge: number | null;
}

interface DepartmentChartsProps {
  employeeData: EmployeeData;
  averageSalary: number | null;
  averageTenureYears: number | null;
  averageAge: number | null;
  aggregatedDistributions?: {
    tenureDistribution: RawDistributionItem[];
    salaryDistribution: RawDistributionItem[];
    ageDistribution: RawDistributionItem[];
  };
}

const CustomTooltip = ({ active, payload, type, headCount }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  
  const value = payload[0]?.value;
  if (typeof value !== 'number') return null;
  
  const count = Math.round((value / 100) * headCount);
  const label = payload[0]?.payload?.displayName;
  if (!label) return null;
  
  return (
    <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-lg" style={{
      position: 'relative',
      zIndex: 1000
    }}>
      <p className="text-sm font-medium text-gray-900">
        {count.toLocaleString()} employees {
          type === 'tenure' ? `work here ${label} years` :
          type === 'salary' ? `make ${label}` :
          `are ${label}`
        }
      </p>
    </div>
  );
};

const calculateAverageFromDistribution = (distribution: RawDistributionItem[]): number | null => {
  if (!distribution?.length) return null;
  
  let totalCount = 0;
  let weightedSum = 0;
  
  distribution.forEach(({ range, count }) => {
    const [min, max] = range;
    const midpoint = (min + max) / 2;
    weightedSum += midpoint * count;
    totalCount += count;
  });
  
  return totalCount > 0 ? weightedSum / totalCount : null;
};

// Statistical calculation functions for different average types
const calculateStatisticalMeasures = (distribution: RawDistributionItem[]) => {
  if (!distribution?.length) return null;

  // Calculate basic statistics
  const values: number[] = [];
  distribution.forEach(({ range, count }) => {
    const [min, max] = range;
    const midpoint = (min + max) / 2;
    for (let i = 0; i < count; i++) {
      values.push(midpoint);
    }
  });

  if (values.length === 0) return null;

  values.sort((a, b) => a - b);

  // Mean (same as existing calculation)
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  // Median
  const median = values.length % 2 === 0
    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : values[Math.floor(values.length / 2)];

  // Percentile calculation function
  const getPercentile = (values: number[], percentile: number): number => {
    const index = (percentile / 100) * (values.length - 1);
    if (Number.isInteger(index)) {
      return values[index];
    } else {
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return values[lower] * (1 - weight) + values[upper] * weight;
    }
  };

  // Calculate percentiles
  const percentile68 = getPercentile(values, 68);
  const percentile84 = getPercentile(values, 84);
  const percentile95 = getPercentile(values, 95);

  // Trimmed mean (removing <20K and >500K)
  const trimmedValues = values.filter(val => val >= 20000 && val <= 500000);
  const trimmedMean = trimmedValues.length > 0
    ? trimmedValues.reduce((sum, val) => sum + val, 0) / trimmedValues.length
    : null;

  return {
    mean,
    median,
    trimmedMean,
    percentile68,
    percentile84,
    percentile95
  };
};

const getSelectedStatistic = (stats: any, averageType: string): number | null => {
  if (!stats) return null;
  
  switch (averageType) {
    case 'mean': return stats.mean;
    case 'p68': return stats.percentile68;
    case 'p84': return stats.percentile84;
    case 'p95': return stats.percentile95;
    case 'median': return stats.median;
    case 'trimmed': return stats.trimmedMean;
    default: return stats.mean;
  }
};

const getAverageTypeLabel = (averageType: string): string => {
  switch (averageType) {
    case 'mean': return 'average';
    case 'p68': return 'employee at 68th percentile';
    case 'p84': return 'employee at 84th percentile';
    case 'p95': return 'employee at 95th percentile';
    case 'median': return 'median employee';
    case 'trimmed': return 'trimmed average (20K-500K) employee';
    default: return 'average';
  }
};

const transformDistributionData = (distribution: RawDistributionItem[], total: number, type: 'tenure' | 'salary' | 'age') => {
  if (!distribution?.length || total === 0) return [];

  return distribution
    .map(({ range, count }) => ({
      name: formatRangeForTooltip(range, type),  // Keep full name for labels
      displayName: formatRangeForTooltip(range, type),  // Keep descriptive names for tooltips
      value: (count / total) * 100,
      range
    }))
    .sort((a, b) => {
      const [minA] = a.range;
      const [minB] = b.range;
      return minA - minB;
    });
};

// New function for tooltip display only
const formatRangeForTooltip = (range: [number, number], type: 'tenure' | 'salary' | 'age'): string => {
  const [min, max] = range;
  
  if (type === 'tenure') {
    if (min === 0) return '<1';
    if (min === 5 && max === 9) return '5-9';
    if (min === 20 && max === 24) return '20-24';
    if (min === 35) return '35+';
    return `${min}-${max}`;
  }
  
  if (type === 'salary') {
    if (min === 0) return '<20K';
    if (min === 500000) return '500K>';
    const minK = Math.round(min/1000);
    const maxK = Math.round(max/1000);
    return `${minK}K-${maxK}K`;
  }
  
  if (type === 'age') {
    if (min === 25 && max === 29) return '25-29';
    if (min === 35 && max === 39) return '35-39';
    if (min === 45 && max === 49) return '45-49';
    if (min === 55 && max === 59) return '55-59';
    if (min === 65) return '65 >';
    return `${min}-${max}`;
  }
  
  return '';
};

const NoDataDisplay = () => (
  <div className="flex flex-col items-center justify-center h-16 bg-gray-50 rounded-lg border border-gray-200">
    <div className="flex items-center gap-2">
      <Image 
        src="/no-data-yet.svg" 
        alt="No public data available" 
        width={20} 
        height={20} 
        priority
      />
      <p className="text-gray-500 text-sm">No public data available</p>
    </div>
  </div>
);

export default function DepartmentCharts({ 
  employeeData, 
  averageSalary, 
  averageTenureYears, 
  averageAge,
  aggregatedDistributions 
}: DepartmentChartsProps) {
  // State for average type selection
  const [averageType, setAverageType] = useState<string>('mean');

  const _headcount = employeeData.headcount;
  const _wages = employeeData.wages;
  const _averageSalary = employeeData.averageSalary;
  const _averageTenure = employeeData.averageTenure;
  const _averageAge = employeeData.averageAge;

  const headCount = _headcount.length > 0 
    ? _headcount[_headcount.length - 1].value 
    : null;

  const latestYear = _headcount.length > 0
    ? _headcount[_headcount.length - 1].year
    : new Date().getFullYear().toString();

  const totalWages = _wages.length > 0
    ? _wages[_wages.length - 1].value
    : null;
  
  const chartData = useMemo(() => {
    console.log('Raw Data:', {
      tenure: employeeData.tenureDistribution,
      salary: employeeData.salaryDistribution,
      age: employeeData.ageDistribution,
      aggregated: aggregatedDistributions
    });
    
    const transformed = {
      tenure: transformDistributionData(
        aggregatedDistributions?.tenureDistribution || employeeData.tenureDistribution, 
        headCount ?? 0, 
        'tenure'
      ),
      salary: transformDistributionData(
        aggregatedDistributions?.salaryDistribution || employeeData.salaryDistribution, 
        headCount ?? 0, 
        'salary'
      ),
      age: transformDistributionData(
        aggregatedDistributions?.ageDistribution || employeeData.ageDistribution, 
        headCount ?? 0, 
        'age'
      )
    };
    
    console.log('Transformed Data:', transformed);
    return transformed;
  }, [employeeData, headCount, aggregatedDistributions]);

  // Calculate averages from distributions first if available, otherwise use provided averages
  const effectiveAverageTenure = employeeData.tenureDistribution?.length > 0 
    ? calculateAverageFromDistribution(aggregatedDistributions?.tenureDistribution || employeeData.tenureDistribution) 
    : averageTenureYears;

  // Calculate statistical measures for salary
  const salaryStats = useMemo(() => {
    const distribution = aggregatedDistributions?.salaryDistribution || employeeData.salaryDistribution;
    return calculateStatisticalMeasures(distribution);
  }, [aggregatedDistributions?.salaryDistribution, employeeData.salaryDistribution]);

  const effectiveAverageSalary = useMemo(() => {
    if (employeeData.salaryDistribution?.length > 0 || (aggregatedDistributions?.salaryDistribution && aggregatedDistributions.salaryDistribution.length > 0)) {
      return getSelectedStatistic(salaryStats, averageType);
    }
    return averageSalary;
  }, [salaryStats, averageType, employeeData.salaryDistribution, aggregatedDistributions?.salaryDistribution, averageSalary]);

  const effectiveAverageAge = employeeData.ageDistribution?.length > 0
    ? calculateAverageFromDistribution(aggregatedDistributions?.ageDistribution || employeeData.ageDistribution)
    : averageAge;

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'No data';
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const axisStyle = {
    fontSize: 12,
    fontWeight: 500,
    fill: '#4B5563',
    fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <div className="text-lg font-semibold">
            {headCount !== null ? headCount.toLocaleString() : 'No data'}
          </div>
          <div className="text-sm text-gray-600">
            Headcount ({latestYear})
          </div>
        </div>
        <div>
          <div className="text-lg font-semibold">
            {formatCurrency(totalWages)}
          </div>
          <div className="text-sm text-gray-600">
            Total Wages ({latestYear})
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="min-w-[200px] max-w-[500px]" style={{ position: 'relative' }}>
          <h3 className="text-lg font-semibold mb-2">Years of Tenure</h3>
          {chartData.tenure.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.tenure} 
                    margin={{ top: 10, right: 0, left: 0, bottom: 25 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      height={25}
                      tick={axisStyle}
                      interval="preserveStartEnd"
                      tickFormatter={(value) => value || ''}
                    />
                    <YAxis hide={true} />
                    <Tooltip
                      content={(props) => <CustomTooltip {...props} type="tenure" headCount={headCount ?? 0} />}
                      cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Bar dataKey="value" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-600 mt-0 text-center">
                The average employee has worked here {Math.round(effectiveAverageTenure ?? 0)} years
              </p>
            </>
          ) : (
            <div className="h-16">
              <NoDataDisplay />
            </div>
          )}
        </div>
        
        <div className="min-w-[200px] max-w-[500px]" style={{ position: 'relative' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Salary</h3>
            {(chartData.salary.length > 0) && (
              <Select value={averageType} onValueChange={setAverageType}>
                <SelectTrigger className="w-48 h-8 text-xs bg-white">
                  <SelectValue placeholder="Select average type" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="mean">Mean: Average (midpoint calculation)</SelectItem>
                  <SelectItem value="p68">68th percentile: What 68% of employees earn less than</SelectItem>
                  <SelectItem value="p84">84th percentile: What 84% of employees earn less than</SelectItem>
                  <SelectItem value="p95">95th percentile: What 95% of employees earn less than</SelectItem>
                  <SelectItem value="median">Median: The true middle value</SelectItem>
                  <SelectItem value="trimmed">Trimmed Mean: Average excluding extreme outliers</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {chartData.salary.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.salary} 
                    margin={{ top: 10, right: 0, left: 0, bottom: 25 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      height={25}
                      tick={axisStyle}
                      interval="preserveStartEnd"
                      tickFormatter={(value) => value || ''}
                    />
                    <YAxis hide={true} />
                    <Tooltip
                      content={(props) => <CustomTooltip {...props} type="salary" headCount={headCount ?? 0} />}
                      cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Bar dataKey="value" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-600 mt-0 text-center">
                The {getAverageTypeLabel(averageType)} employee makes {effectiveAverageSalary ? formatCurrency(effectiveAverageSalary) : 'N/A'}/yr
              </p>
            </>
          ) : (
            <div className="h-16">
              <NoDataDisplay />
            </div>
          )}
        </div>
        
        <div className="min-w-[200px] max-w-[500px]" style={{ position: 'relative' }}>
          <h3 className="text-lg font-semibold mb-2">Age</h3>
          {chartData.age.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.age} 
                    margin={{ top: 10, right: 0, left: 0, bottom: 25 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      height={25}
                      tick={axisStyle}
                      interval="preserveStartEnd"
                      tickFormatter={(value) => value || ''}
                    />
                    <YAxis hide={true} />
                    <Tooltip
                      content={(props) => <CustomTooltip {...props} type="age" headCount={headCount ?? 0} />}
                      cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Bar dataKey="value" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-600 mt-0 text-center">
                The average employee is {Math.round(effectiveAverageAge ?? 0)} years old
              </p>
            </>
          ) : (
            <div className="h-16">
              <NoDataDisplay />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 