import { useMemo } from 'react';
import { DepartmentHierarchy } from '@/types/department';
import DepartmentCharts from '@/components/DepartmentCharts';

interface RawDistributionItem {
  range: [number, number];
  count: number;
}

interface _EmployeeData {
  headcount: { year: string; value: number }[];
  wages: { year: string; value: number }[];
  tenureDistribution: RawDistributionItem[];
  salaryDistribution: RawDistributionItem[];
  ageDistribution: RawDistributionItem[];
  averageSalary: number;
  averageTenure: number;
  averageAge: number;
}

interface AgencyDataVisualizationProps {
  department: DepartmentHierarchy;
}

export default function AgencyDataVisualization({ department }: AgencyDataVisualizationProps) {
  const { workforce } = department;
  
  const employeeData = useMemo(() => {
    if (!workforce) return null;
    
    // Transform yearly data into arrays
    const headcount = Object.entries(workforce.headCount.yearly)
      .map(([year, value]) => ({ year, value: typeof value === 'number' ? value : 0 }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const wages = Object.entries(workforce.wages.yearly)
      .map(([year, value]) => ({ year, value: typeof value === 'number' ? value : 0 }))
      .sort((a, b) => a.year.localeCompare(b.year));

    return {
      headcount,
      wages,
      tenureDistribution: workforce.tenureDistribution || [],
      salaryDistribution: workforce.salaryDistribution || [],
      ageDistribution: workforce.ageDistribution || [],
      averageSalary: workforce.averageSalary || 0,
      averageTenure: workforce.averageTenureYears || 0,
      averageAge: workforce.averageAge || 0
    };
  }, [workforce]);

  if (!workforce || !employeeData) return null;

  return (
    <div className="space-y-8">
      <DepartmentCharts
        employeeData={employeeData}
        averageSalary={workforce.averageSalary ?? null}
        averageTenureYears={workforce.averageTenureYears ?? null}
        averageAge={workforce.averageAge ?? null}
      />
    </div>
  );
} 