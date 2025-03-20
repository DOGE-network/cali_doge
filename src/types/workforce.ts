export interface WorkforceData {
  name: string;
  headCount: {
    yearly: Record<string, number | null>;
  };
  wages: {
    yearly: Record<string, number | null>;
  };
  tenureDistribution?: { [key: string]: number };
  salaryDistribution?: { [key: string]: number };
  ageDistribution?: { [key: string]: number };
  averageTenureYears?: number | null;
  averageSalary?: number | null;
  averageAge?: number | null;
} 