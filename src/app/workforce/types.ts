export interface Agency {
  name: string;
  abbreviation?: string;
  description?: string;
  website?: string;
  subAgencies?: Agency[];
  headCount?: number;
  subordinateOffices?: number;
  totalWages?: number;
  tenureDistribution?: { [key: string]: number };
  salaryDistribution?: { [key: string]: number };
  ageDistribution?: { [key: string]: number };
  averageTenureYears?: number;
  averageSalary?: number;
  averageAge?: number;
} 