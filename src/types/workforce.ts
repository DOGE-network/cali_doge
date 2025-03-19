export interface WorkforceData {
  name: string;
  headCount: {
    yearly: Record<string, number>;
  };
  wages: {
    yearly: Record<string, number>;
  };
  tenureDistribution?: { [key: string]: number };
  salaryDistribution?: { [key: string]: number };
  ageDistribution?: { [key: string]: number };
  averageTenureYears?: number;
  averageSalary?: number;
  averageAge?: number;
} 