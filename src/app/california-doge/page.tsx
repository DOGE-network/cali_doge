import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "California DOGE: Your Independent Source for California Government Transparency | Cali DOGE",
  description: "California DOGE provides exclusive insights into California government operations. Search our 15M+ record database to track state spending, efficiency, and waste. The most comprehensive California-specific transparency platform.",
  alternates: {
    canonical: '/california-doge',
  },
};

export default function CaliforniaDoge() {
  return (
    <main className="flex-grow">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-6">California DOGE: Exclusive California Government Transparency</h1>
          <p className="text-xl text-gray-600 mb-8">
            Unlike broader platforms, California DOGE focuses exclusively on California government data. Our 30M+ records provide unprecedented insights into state and local government operations, spending, and efficiency.
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
            <h2 className="text-2xl font-semibold mb-4">California-Focused Transparency</h2>
            <p>
              While other platforms like Transparent California or OpenTheBooks cover multiple states, California DOGE provides deeper, more detailed insights into California government operations. Our platform:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Focuses exclusively on California data</li>
              <li>Provides state-specific context and analysis</li>
              <li>Tracks local government operations</li>
              <li>Monitors California-specific programs</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Comprehensive California Data</h2>
            <p>
              California DOGE&apos;s database contains detailed information about state and local government operations, including:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>State agency budgets and spending</li>
              <li>Local government contracts</li>
              <li>California-specific programs</li>
              <li>State and local efficiency metrics</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Why California-Specific Matters</h2>
            <p>
              California&apos;s government structure and operations are unique. California DOGE understands these nuances and provides:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>State-specific context for spending data</li>
              <li>Local government insights</li>
              <li>California program analysis</li>
              <li>State-specific efficiency metrics</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">California Government Efficiency</h2>
            <p>
              California DOGE helps identify areas where state and local government can improve efficiency. Our platform enables you to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Track California-specific programs</li>
              <li>Monitor state agency performance</li>
              <li>Analyze local government spending</li>
              <li>Identify California-specific waste</li>
            </ul>
          </section>

          {/* Feature Highlights */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">California-Focused Data</h3>
              <p>Exclusive insights into California government operations and spending patterns.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Local Government Coverage</h3>
              <p>Comprehensive data on California&apos;s cities, counties, and special districts.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">State-Specific Analysis</h3>
              <p>Context and insights specific to California&apos;s unique government structure.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">California Programs</h3>
              <p>Detailed tracking of state-specific initiatives and their outcomes.</p>
            </div>
          </section>

          {/* Call to Action */}
          <section className="bg-gray-50 p-8 rounded-lg mt-12">
            <h2 className="text-2xl font-semibold mb-4">Explore California Government Data</h2>
            <p className="mb-6">
              Join thousands of Californians who use California DOGE to stay informed about state and local government operations.
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