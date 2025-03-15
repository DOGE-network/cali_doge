export interface WorkforceData {
  name: string;
  yearlyHeadCount: Array<{ year: string; headCount: number }>;
  yearlyWages: Array<{ year: string; wages: number }>;
  tenureDistribution?: { [key: string]: number };
  salaryDistribution?: { [key: string]: number };
  ageDistribution?: { [key: string]: number };
  averageTenureYears?: number;
  averageSalary?: number;
  averageAge?: number;
} 