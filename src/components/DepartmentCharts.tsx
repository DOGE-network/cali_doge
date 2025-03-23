import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import Image from 'next/image';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

interface CustomTooltipProps extends Omit<TooltipProps<ValueType, NameType>, 'type'> {
  type: 'tenure' | 'salary' | 'age';
  headCount: number;
}

interface RawDistributionItem {
  range: [number, number];
  count: number;
}

interface EmployeeData {
  headcount: { year: string; value: number }[];
  wages: { year: string; value: number }[];
  tenureDistribution: RawDistributionItem[];
  salaryDistribution: RawDistributionItem[];
  ageDistribution: RawDistributionItem[];
  averageSalary: number;
  averageTenure: number;
  averageAge: number;
}

interface DepartmentChartsProps {
  employeeData: EmployeeData;
  averageSalary: number | null;
  averageTenureYears: number | null;
  averageAge: number | null;
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
  <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
    <Image 
      src="/no-data-yet.svg" 
      alt="No Data Available" 
      width={100} 
      height={100} 
      priority
    />
    <p className="text-gray-500 mt-4">No data available</p>
  </div>
);

export default function DepartmentCharts({ employeeData, averageSalary, averageTenureYears, averageAge }: DepartmentChartsProps) {
  const headCount = employeeData.headcount.length > 0 
    ? employeeData.headcount[employeeData.headcount.length - 1].value 
    : 0;

  const latestYear = employeeData.headcount.length > 0
    ? employeeData.headcount[employeeData.headcount.length - 1].year
    : new Date().getFullYear().toString();

  const totalWages = employeeData.wages.length > 0
    ? employeeData.wages[employeeData.wages.length - 1].value
    : 0;
  
  const chartData = useMemo(() => {
    console.log('Raw Data:', {
      tenure: employeeData.tenureDistribution,
      salary: employeeData.salaryDistribution,
      age: employeeData.ageDistribution
    });
    
    const transformed = {
      tenure: transformDistributionData(employeeData.tenureDistribution, headCount, 'tenure'),
      salary: transformDistributionData(employeeData.salaryDistribution, headCount, 'salary'),
      age: transformDistributionData(employeeData.ageDistribution, headCount, 'age')
    };
    
    console.log('Transformed Data:', transformed);
    return transformed;
  }, [employeeData, headCount]);

  // Calculate averages from distributions first if available, otherwise use provided averages
  const effectiveAverageTenure = employeeData.tenureDistribution?.length > 0 
    ? calculateAverageFromDistribution(employeeData.tenureDistribution) 
    : averageTenureYears;

  const effectiveAverageSalary = employeeData.salaryDistribution?.length > 0
    ? calculateAverageFromDistribution(employeeData.salaryDistribution)
    : averageSalary;

  const effectiveAverageAge = employeeData.ageDistribution?.length > 0
    ? calculateAverageFromDistribution(employeeData.ageDistribution)
    : averageAge;

  const formatCurrency = (amount: number) => {
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
            {headCount.toLocaleString()}
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
                      content={(props) => <CustomTooltip {...props} type="tenure" headCount={headCount} />}
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
            <NoDataDisplay />
          )}
        </div>
        
        <div className="min-w-[200px] max-w-[500px]" style={{ position: 'relative' }}>
          <h3 className="text-lg font-semibold mb-2">Salary</h3>
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
                      content={(props) => <CustomTooltip {...props} type="salary" headCount={headCount} />}
                      cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Bar dataKey="value" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-600 mt-0 text-center">
                The average employee makes {effectiveAverageSalary ? formatCurrency(effectiveAverageSalary) : 'N/A'}/yr
              </p>
            </>
          ) : (
            <NoDataDisplay />
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
                      content={(props) => <CustomTooltip {...props} type="age" headCount={headCount} />}
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
            <NoDataDisplay />
          )}
        </div>
      </div>
    </div>
  );
} 