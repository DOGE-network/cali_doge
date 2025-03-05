'use client';

import spendingData from '@/data/spending-data.json';

// Define types for our data
type FiscalYear = 'FY2023' | 'FY2024';

interface AgencySpending {
  name: string;
  rank: string;
  spending: Record<FiscalYear, string>;
}

interface BudgetSummary {
  totalSpending: Record<FiscalYear, string>;
  deficit: Record<FiscalYear, string>;
  revenue: Record<FiscalYear, string>;
}

interface RevenueSource {
  source: string;
  amounts: Record<FiscalYear, string>;
}

interface TotalRevenueData extends Record<FiscalYear, string> {
  percentChange: string;
}

interface SpendingData {
  fiscalYears: FiscalYear[];
  agencies: AgencySpending[];
  budgetSummary: BudgetSummary;
  revenueSources: RevenueSource[];
  totalRevenue: TotalRevenueData;
  federalDeficit: Record<FiscalYear, string>;
  sources: Array<{
    name: string;
    url: string;
  }>;
}

// Type assertion for our imported data
const typedSpendingData = spendingData as SpendingData;

export default function SpendPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Agency Spending */}
      <div className="mb-12">
        <h1 className="text-2xl font-bold mb-8">Agency Spending</h1>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-transparent dark:bg-transparent">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left">Agency</th>
                <th className="py-3 px-4 text-right">FY2023</th>
                <th className="py-3 px-4 text-right">FY2024</th>
              </tr>
            </thead>
            <tbody>
              {typedSpendingData.agencies.map((agency) => (
                <tr 
                  key={agency.name} 
                  className="border-b border-gray-700"
                >
                  <td className="py-3 px-4">{agency.name}</td>
                  <td className="py-3 px-4 text-right">
                    {agency.spending.FY2023}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {agency.spending.FY2024}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Sources */}
      <div className="mb-12">
        <h1 className="text-2xl font-bold mb-8">Revenue Sources</h1>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-transparent dark:bg-transparent">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left">Source</th>
                <th className="py-3 px-4 text-right">FY2023</th>
                <th className="py-3 px-4 text-right">FY2024</th>
              </tr>
            </thead>
            <tbody>
              {typedSpendingData.revenueSources.map((item) => (
                <tr 
                  key={item.source} 
                  className="border-b border-gray-700"
                >
                  <td className="py-3 px-4">{item.source}</td>
                  <td className="py-3 px-4 text-right">
                    {item.amounts.FY2023}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.amounts.FY2024}
                  </td>
                </tr>
              ))}
              <tr className="border-b border-gray-700">
                <td className="py-3 px-4 font-bold">Total Revenue</td>
                <td className="py-3 px-4 text-right font-bold">
                  {typedSpendingData.totalRevenue.FY2023}
                </td>
                <td className="py-3 px-4 text-right font-bold">
                  {typedSpendingData.totalRevenue.FY2024}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <p className="mt-4 text-gray-400">
          {typedSpendingData.totalRevenue.percentChange} change from FY2023 to FY2024
        </p>
      </div>

      {/* Federal Deficit */}
      <div className="mb-12">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-transparent dark:bg-transparent">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left"></th>
                <th className="py-3 px-4 text-right">FY2023</th>
                <th className="py-3 px-4 text-right">FY2024</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700">
                <td className="py-3 px-4 font-bold">Federal Deficit</td>
                <td className="py-3 px-4 text-right">
                  {typedSpendingData.federalDeficit.FY2023}
                </td>
                <td className="py-3 px-4 text-right">
                  {typedSpendingData.federalDeficit.FY2024}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sources */}
      <div className="text-sm text-gray-400 mt-8">
        <h3 className="text-lg font-semibold mb-2">Sources:</h3>
        <ul className="list-disc pl-5 space-y-1">
          {typedSpendingData.sources.map((source) => (
            <li key={source.name}>
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {source.name}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4">Note: All figures are in billions of dollars. FY = Fiscal Year.</p>
      </div>
    </main>
  );
} 