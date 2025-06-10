import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "CA DOGE: Transparent California Spending Data | Cali DOGE",
  description: "CA DOGE delivers real data on California government spending. Search 15M+ records to track government efficiency, waste, and spending patterns. Your independent source for California transparency.",
  alternates: {
    canonical: '/ca-doge',
  },
};

export default function CADoge() {
  return (
    <main className="flex-grow">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-6">CA DOGE: Data-Driven California Transparency</h1>
          <p className="text-xl text-gray-600 mb-8">
            Your independent platform for California government data. CA DOGE provides unprecedented access to 15M+ records of government spending, contracts, and efficiency metrics.
          </p>
          <div className="flex gap-4">
            <Link 
              href="/search" 
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Search Database
            </Link>
            <Link 
              href="/whistleblower" 
              className="bg-gray-100 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors"
            >
              Report Waste
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">The CA DOGE Database</h2>
            <p>
              Our comprehensive database contains over 15M records of California government spending, making CA DOGE the most extensive transparency platform in the state. We track:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Government contracts and vendors</li>
              <li>Department budgets and spending</li>
              <li>Program efficiency metrics</li>
              <li>Hidden taxes and fees</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">California Government Efficiency</h2>
            <p>
              CA DOGE helps identify areas where California government can improve efficiency and reduce waste. Our platform enables you to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Compare spending across departments</li>
              <li>Track program outcomes and costs</li>
              <li>Identify redundant initiatives</li>
              <li>Monitor contract performance</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Real Data, Real Insights</h2>
            <p>
              Unlike other transparency platforms that focus on advocacy, CA DOGE provides raw data and analysis tools. Our approach:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Verifies all data sources</li>
              <li>Updates in real-time</li>
              <li>Provides context for complex transactions</li>
              <li>Enables independent analysis</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">How CA DOGE Works</h2>
            <p>
              Getting started with CA DOGE is simple. Our platform offers multiple ways to explore California government data:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Advanced search capabilities</li>
              <li>Pre-analyzed spending patterns</li>
              <li>Custom data visualizations</li>
              <li>Regular efficiency reports</li>
            </ul>
          </section>

          {/* Feature Highlights */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Comprehensive Data</h3>
              <p>Access 15M+ records of California government spending, updated in real-time.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Independent Analysis</h3>
              <p>Verified data and tools for your own analysis of government efficiency.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Waste Detection</h3>
              <p>Identify patterns of wasteful spending and inefficiency in government programs.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Transparency Tools</h3>
              <p>Powerful search and visualization tools to explore government spending.</p>
            </div>
          </section>

          {/* Call to Action */}
          <section className="bg-gray-50 p-8 rounded-lg mt-12">
            <h2 className="text-2xl font-semibold mb-4">Start Using CA DOGE Today</h2>
            <p className="mb-6">
              Join thousands of Californians who use CA DOGE to stay informed about government spending and efficiency.
            </p>
            <div className="flex gap-4">
              <Link 
                href="/search" 
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                Search Database
              </Link>
              <Link 
                href="/whistleblower" 
                className="bg-gray-100 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors"
              >
                Report Waste
              </Link>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
} 