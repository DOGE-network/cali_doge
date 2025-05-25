import { useMemo } from 'react';
import DepartmentCharts from './DepartmentCharts';
import type { DepartmentHierarchy, AnnualYear } from '@/types/department';

interface AgencyDataVisualizationProps {
  department: DepartmentHierarchy;
  viewMode: 'aggregated' | 'parent-only';
  fiscalYear: AnnualYear;
}

export default function AgencyDataVisualization({ department, viewMode, fiscalYear }: AgencyDataVisualizationProps) {
  const data = useMemo(() => {
    if (!department) return null;

    // Get the appropriate data based on view mode
    const aggregatedData = department.aggregatedDistributions;
    const ownData = department.originalData;

    // Log the data we're working with
    console.log('AgencyDataVisualization data:', {
      department: department.name,
      viewMode,
      fiscalYear,
      aggregatedData: aggregatedData ? {
        parentHeadCount: aggregatedData.parentHeadCount,
        parentWages: aggregatedData.parentWages,
        parentAverageSalary: aggregatedData.parentAverageSalary,
        childHeadCount: aggregatedData.childHeadCount,
        childWages: aggregatedData.childWages,
        childAverageSalary: aggregatedData.childAverageSalary,
        combinedHeadCount: aggregatedData.combinedHeadCount,
        combinedWages: aggregatedData.combinedWages,
        combinedAverageSalary: aggregatedData.combinedAverageSalary
      } : null,
      ownData: ownData ? {
        headCount: ownData.headCount?.yearly?.[fiscalYear],
        wages: ownData.wages?.yearly?.[fiscalYear],
        _averageSalary: ownData._averageSalary
      } : null
    });

    // Determine which data to use based on view mode
    const headCount = viewMode === 'aggregated' && aggregatedData ? 
      aggregatedData.combinedHeadCount : 
      (aggregatedData?.parentHeadCount ?? ownData?.headCount?.yearly?.[fiscalYear] ?? 0);

    const wages = viewMode === 'aggregated' && aggregatedData ? 
      aggregatedData.combinedWages : 
      (aggregatedData?.parentWages ?? ownData?.wages?.yearly?.[fiscalYear] ?? 0);

    const averageSalary = viewMode === 'aggregated' && aggregatedData ? 
      aggregatedData.combinedAverageSalary : 
      (aggregatedData?.parentAverageSalary ?? ownData?._averageSalary ?? null);

    // Log the final values being used
    console.log('AgencyDataVisualization final values:', {
      department: department.name,
      viewMode,
      fiscalYear,
      headCount,
      wages,
      averageSalary
    });

    return {
      headCount: [{ year: fiscalYear, value: headCount as number }],
      headcount: [{ year: fiscalYear, value: headCount as number }],
      wages: [{ year: fiscalYear, value: wages as number }],
      averageSalary,
      tenureDistribution: department.tenureDistribution?.yearly?.[fiscalYear] || [],
      salaryDistribution: department.salaryDistribution?.yearly?.[fiscalYear] || [],
      ageDistribution: department.ageDistribution?.yearly?.[fiscalYear] || [],
      averageTenure: department._averageTenureYears ?? null,
      averageAge: department._averageAge ?? null
    };
  }, [department, viewMode, fiscalYear]);

  // Choose distributions based on view mode
  const distributionsToUse = useMemo(() => {
    if (!department) return {
      tenureDistribution: [],
      salaryDistribution: [],
      ageDistribution: []
    };

    // In parent-only mode, use original data if available
    if (viewMode === 'parent-only' && department.originalData) {
      return {
        tenureDistribution: department.originalData.tenureDistribution?.yearly?.[fiscalYear] || [],
        salaryDistribution: department.originalData.salaryDistribution?.yearly?.[fiscalYear] || [],
        ageDistribution: department.originalData.ageDistribution?.yearly?.[fiscalYear] || []
      };
    }
    
    // In aggregated mode, use aggregatedDistributions if available, otherwise fall back to department's own data
    if (viewMode === 'aggregated') {
      const aggregatedDistributions = department.aggregatedDistributions;
      const hasAggregatedData = aggregatedDistributions && (
        (aggregatedDistributions.tenureDistribution?.length ?? 0) > 0 ||
        (aggregatedDistributions.salaryDistribution?.length ?? 0) > 0 ||
        (aggregatedDistributions.ageDistribution?.length ?? 0) > 0
      );

      if (hasAggregatedData) {
        return {
          tenureDistribution: aggregatedDistributions.tenureDistribution || [],
          salaryDistribution: aggregatedDistributions.salaryDistribution || [],
          ageDistribution: aggregatedDistributions.ageDistribution || []
        };
      }

      // Fall back to department's own distributions if no aggregated data
      return {
        tenureDistribution: department.tenureDistribution?.yearly?.[fiscalYear] || [],
        salaryDistribution: department.salaryDistribution?.yearly?.[fiscalYear] || [],
        ageDistribution: department.ageDistribution?.yearly?.[fiscalYear] || []
      };
    }

    // Default fallback to department's own distributions
    return {
      tenureDistribution: department.tenureDistribution?.yearly?.[fiscalYear] || [],
      salaryDistribution: department.salaryDistribution?.yearly?.[fiscalYear] || [],
      ageDistribution: department.ageDistribution?.yearly?.[fiscalYear] || []
    };
  }, [department, viewMode, fiscalYear]);

  if (!data) return null;

  return (
    <div className="space-y-8">
      <DepartmentCharts
        employeeData={data}
        averageSalary={data.averageSalary}
        averageTenureYears={data.averageTenure}
        averageAge={data.averageAge}
        aggregatedDistributions={distributionsToUse}
      />
    </div>
  );
} 