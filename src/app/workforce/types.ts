export interface Agency {
  name: string;
  org_level?: number;
  budget_code?: string;
  budget_level?: string;
  budget_status?: 'active' | 'inactive';
  abbreviation?: string;
  description?: string;
  website?: string;
  subAgencies?: Agency[];
  subordinateOffices?: number;
  tenureDistribution?: { [key: string]: number };
  salaryDistribution?: { [key: string]: number };
  ageDistribution?: { [key: string]: number };
  yearlyHeadCount?: Array<{ year: string; headCount: number }>;
  yearlyWages?: Array<{ year: string; wages: number }>;
  averageTenureYears?: number;
  averageSalary?: number;
  averageAge?: number;
} 