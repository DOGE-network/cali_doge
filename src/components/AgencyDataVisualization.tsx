import { useMemo } from 'react';
import DepartmentCharts from './DepartmentCharts';
import type { DepartmentHierarchy } from '@/types/department';

interface AgencyDataVisualizationProps {
  department: DepartmentHierarchy;
  viewMode: 'aggregated' | 'parent-only';
}

export default function AgencyDataVisualization({ department, viewMode }: AgencyDataVisualizationProps) {
  const employeeData = useMemo(() => {
    // Choose the data source based on view mode
    const dataSource = viewMode === 'parent-only' && department.originalData 
      ? { ...department, ...department.originalData }  // Merge original data with department data
      : department;

    // Get FY2023 data with defaults
    const fy2023Headcount = typeof dataSource.headCount?.yearly?.["2023"] === 'number' 
      ? dataSource.headCount.yearly["2023"] 
      : null;

    const fy2023Wages = typeof dataSource.wages?.yearly?.["2023"] === 'number'
      ? dataSource.wages.yearly["2023"]
      : null;

    console.log('AgencyDataVisualization - Department data for:', dataSource.name);
    console.log('- Has aggregatedDistributions:', !!dataSource.aggregatedDistributions);
    
    if (dataSource.aggregatedDistributions) {
      console.log('- Salary distribution length:', dataSource.aggregatedDistributions.salaryDistribution?.length || 0);
      console.log('- Tenure distribution length:', dataSource.aggregatedDistributions.tenureDistribution?.length || 0);
      console.log('- Age distribution length:', dataSource.aggregatedDistributions.ageDistribution?.length || 0);
    }
    
    console.log('- Own salary distribution:', !!dataSource.salaryDistribution?.yearly?.["2023"]);
    if (dataSource.salaryDistribution?.yearly?.["2023"]) {
      console.log('- Own salary distribution length:', dataSource.salaryDistribution.yearly["2023"].length);
    }

    return {
      headCount: fy2023Headcount,
      averageSalary: dataSource.averageSalary ?? null,
      headcount: [{ year: "2023", value: fy2023Headcount }],
      wages: [{ year: "2023", value: fy2023Wages }],
      tenureDistribution: [],  // Empty - we'll let DepartmentCharts handle this
      salaryDistribution: [],  // Empty - we'll let DepartmentCharts handle this
      ageDistribution: [],     // Empty - we'll let DepartmentCharts handle this
      averageTenure: dataSource.averageTenureYears ?? null,
      averageAge: dataSource.averageAge ?? null
    };
  }, [department, viewMode]);

  // Choose distributions based on view mode
  const distributionsToUse = useMemo(() => {
    // In parent-only mode, use original data if available
    if (viewMode === 'parent-only' && department.originalData) {
      return {
        tenureDistribution: department.originalData.tenureDistribution?.yearly?.["2023"] || [],
        salaryDistribution: department.originalData.salaryDistribution?.yearly?.["2023"] || [],
        ageDistribution: department.originalData.ageDistribution?.yearly?.["2023"] || []
      };
    }
    
    // In aggregated mode, directly use aggregatedDistributions without any fallback
    if (viewMode === 'aggregated') {
      return {
        tenureDistribution: department.aggregatedDistributions?.tenureDistribution || [],
        salaryDistribution: department.aggregatedDistributions?.salaryDistribution || [],
        ageDistribution: department.aggregatedDistributions?.ageDistribution || []
      };
    }

    // Fallback to department's own distributions
    return {
      tenureDistribution: department.tenureDistribution?.yearly?.["2023"] || [],
      salaryDistribution: department.salaryDistribution?.yearly?.["2023"] || [],
      ageDistribution: department.ageDistribution?.yearly?.["2023"] || []
    };
  }, [department, viewMode]);

  return (
    <div className="space-y-8">
      <DepartmentCharts
        employeeData={employeeData}
        averageSalary={employeeData.averageSalary}
        averageTenureYears={employeeData.averageTenure}
        averageAge={employeeData.averageAge}
        aggregatedDistributions={distributionsToUse}
      />
    </div>
  );
} 