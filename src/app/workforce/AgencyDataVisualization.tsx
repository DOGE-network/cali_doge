import React, { useMemo } from 'react';
import DepartmentCharts from '@/components/DepartmentCharts';
import { DepartmentHierarchy } from '@/types/department';

interface AgencyDataVisualizationProps {
  department: DepartmentHierarchy;
  viewMode: 'parent-only' | 'aggregated';
}

const AgencyDataVisualization: React.FC<AgencyDataVisualizationProps> = ({ department, viewMode }) => {
  const employeeData = useMemo(() => {
    const dataSource = viewMode === 'parent-only' 
      ? { ...department, ...department.originalData }
      : department;

    const headCountValue = typeof dataSource.headCount?.yearly?.["2023"] === 'number' 
      ? dataSource.headCount.yearly["2023"] as number 
      : null;

    const wagesValue = typeof dataSource.wages?.yearly?.["2023"] === 'number'
      ? dataSource.wages.yearly["2023"] as number
      : null;

    return {
      headcount: [{ year: "2023", value: headCountValue }],
      wages: [{ year: "2023", value: wagesValue }],
      averageSalary: dataSource.averageSalary || null,
      averageTenure: dataSource.averageTenureYears || null,
      averageAge: dataSource.averageAge || null,
      tenureDistribution: viewMode === 'parent-only' 
        ? dataSource.tenureDistribution?.yearly?.["2023"] || []
        : dataSource.aggregatedDistributions?.tenureDistribution || [],
      salaryDistribution: viewMode === 'parent-only'
        ? dataSource.salaryDistribution?.yearly?.["2023"] || []
        : dataSource.aggregatedDistributions?.salaryDistribution || [],
      ageDistribution: viewMode === 'parent-only'
        ? dataSource.ageDistribution?.yearly?.["2023"] || []
        : dataSource.aggregatedDistributions?.ageDistribution || []
    };
  }, [department, viewMode]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <DepartmentCharts
        employeeData={employeeData}
        averageSalary={employeeData.averageSalary}
        averageTenureYears={employeeData.averageTenure}
        averageAge={employeeData.averageAge}
        aggregatedDistributions={viewMode === 'parent-only' 
          ? undefined
          : department.aggregatedDistributions}
      />
    </div>
  );
};

export default AgencyDataVisualization; 