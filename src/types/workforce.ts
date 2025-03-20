export interface WorkforceData {
  name: string;
  headCount: {
    yearly: Record<string, number | null>;
  };
  wages: {
    yearly: Record<string, number | null>;
  };
  tenureDistribution?: { [key: string]: number } | null;
  salaryDistribution?: { [key: string]: number } | null;
  ageDistribution?: { [key: string]: number } | null;
  averageTenureYears?: number | null;
  averageSalary?: number | null;
  averageAge?: number | null;
  yearlyHeadCount?: Array<{ year: string; headCount: number }>;
  yearlyWages?: Array<{ year: string; wages: number }>;
} 