import { useMemo } from 'react';
import { DepartmentHierarchy } from '@/types/department';
import DepartmentCharts from '@/components/DepartmentCharts';

interface RawDistributionItem {
  range: [number, number];
  count: number;
}

interface _EmployeeData {
  headcount: { year: string; value: number | null }[];
  wages: { year: string; value: number | null }[];
  tenureDistribution: RawDistributionItem[];
  salaryDistribution: RawDistributionItem[];
  ageDistribution: RawDistributionItem[];
  averageSalary: number | null;
  averageTenure: number | null;
  averageAge: number | null;
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
      .map(([year, value]) => ({ year, value: typeof value === 'number' ? value : null }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const wages = Object.entries(workforce.wages.yearly)
      .map(([year, value]) => ({ year, value: typeof value === 'number' ? value : null }))
      .sort((a, b) => a.year.localeCompare(b.year));

    return {
      headcount,
      wages,
      tenureDistribution: workforce.tenureDistribution || [],
      salaryDistribution: workforce.salaryDistribution || [],
      ageDistribution: workforce.ageDistribution || [],
      averageSalary: workforce.averageSalary || null,
      averageTenure: workforce.averageTenureYears || null,
      averageAge: workforce.averageAge || null
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
        aggregatedDistributions={department.aggregatedDistributions}
      />
    </div>
  );
} 