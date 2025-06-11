import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "DOGE CA: Transparent California Spending Data | Cali DOGE",
  description: "DOGE CA provides real transparency for California government spending. Search our 15M+ record database to track government efficiency, waste, and spending patterns. Independent data platform for California taxpayers.",
  alternates: {
    canonical: '/doge-ca',
  },
};

export default function DogeCA() {
  return (
    <main className="flex-grow">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-6">DOGE CA: Real Transparency for California</h1>
          <p className="text-xl text-gray-600 mb-8">
            Your independent source for California government spending data. Unlike other platforms, DOGE CA delivers actionable insights backed by 15M+ records of real spending data.
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
            <h2 className="text-2xl font-semibold mb-4">Why DOGE CA is Different</h2>
            <p>
              While other transparency platforms focus on advocacy or limited data sets, DOGE CA provides comprehensive access to California government operations. Our platform combines:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>15M+ records of government spending data</li>
              <li>300+ hours of research and analysis</li>
              <li>Real-time updates on government operations</li>
              <li>Independent verification of spending patterns</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">California Budget Transparency</h2>
            <p>
              DOGE CA&apos;s database reveals the true cost of government operations, from state agencies to local municipalities. Our platform helps you:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Track government spending patterns</li>
              <li>Identify wasteful contracts and programs</li>
              <li>Monitor efficiency initiatives</li>
              <li>Discover hidden taxes and fees</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Independent Data Platform</h2>
            <p>
              Unlike Reform California&apos;s advocacy-focused approach, DOGE CA provides raw data and analysis tools. We believe in empowering citizens with information, not just opinions. Our platform:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Maintains strict data independence</li>
              <li>Verifies all spending records</li>
              <li>Provides context for complex transactions</li>
              <li>Updates in real-time as new data becomes available</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">How to Use DOGE CA</h2>
            <p>
              Getting started with DOGE CA is simple. Our platform offers multiple ways to explore California government spending:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Search our comprehensive database</li>
              <li>Browse pre-analyzed spending patterns</li>
              <li>Report potential waste through our whistleblower platform</li>
              <li>Track specific agencies or programs</li>
            </ul>
          </section>

          {/* Call to Action */}
          <section className="bg-gray-50 p-8 rounded-lg mt-12">
            <h2 className="text-2xl font-semibold mb-4">Start Exploring California Government Data</h2>
            <p className="mb-6">
              Join thousands of Californians who use DOGE CA to stay informed about government spending and efficiency.
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