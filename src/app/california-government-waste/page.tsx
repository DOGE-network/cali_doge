import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "California Government Waste: Track Spending & Inefficiency | Cali DOGE",
  description: "Discover California government waste with Cali DOGE's 30M+ record database. Track wasteful spending, hidden taxes, and inefficiency in state and local government. Your source for California transparency.",
  alternates: {
    canonical: '/california-government-waste',
  },
};

export default function CaliforniaGovernmentWaste() {
  return (
    <main className="flex-grow">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-6">California Government Waste: Track Spending & Inefficiency</h1>
          <p className="text-xl text-gray-600 mb-8">
            Cali DOGE&apos;s database reveals billions in California government waste. Our 30M+ records help you track wasteful spending, hidden taxes, and inefficiency in state and local government operations.
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
            <h2 className="text-2xl font-semibold mb-4">Types of California Government Waste</h2>
            <p>
              Our analysis of 30M+ records reveals several categories of government waste in California:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Hidden taxes and fees in utility bills</li>
              <li>Redundant government programs</li>
              <li>Inefficient contract management</li>
              <li>Excessive administrative costs</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Hidden Taxes and Fees</h2>
            <p>
              Cali DOGE has uncovered billions in hidden taxes and fees, including:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>$4.5 billion in utility bill taxes annually</li>
              <li>Hidden fees in state services</li>
              <li>Undisclosed surcharges</li>
              <li>Regulatory cost pass-throughs</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Inefficient Spending Patterns</h2>
            <p>
              Our database reveals patterns of inefficient spending across California government:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Duplicate program funding</li>
              <li>Overlapping agency responsibilities</li>
              <li>Excessive administrative overhead</li>
              <li>Costly contract management</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">How We Track Government Waste</h2>
            <p>
              Cali DOGE uses multiple methods to identify and track government waste:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Pattern analysis of spending data</li>
              <li>Cross-agency program comparison</li>
              <li>Contract performance tracking</li>
              <li>Whistleblower reports</li>
            </ul>
          </section>

          {/* Examples Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Recent Examples of Government Waste</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Utility Bill Taxes</h3>
                <p>Our analysis revealed $4.5 billion in hidden taxes on California utility bills annually.</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Duplicate Programs</h3>
                <p>Multiple state agencies running similar programs with overlapping responsibilities.</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Contract Waste</h3>
                <p>Inefficient contract management leading to cost overruns and poor performance.</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Administrative Costs</h3>
                <p>Excessive overhead in state agencies reducing program effectiveness.</p>
              </div>
            </div>
          </section>

          {/* How to Help Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">How You Can Help</h2>
            <p>
              Join thousands of Californians who are helping identify and reduce government waste:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Search our database for specific examples</li>
              <li>Report waste through our whistleblower platform</li>
              <li>Share findings with your community</li>
              <li>Track specific agencies or programs</li>
            </ul>
          </section>

          {/* Call to Action */}
          <section className="bg-gray-50 p-8 rounded-lg mt-12">
            <h2 className="text-2xl font-semibold mb-4">Start Tracking Government Waste</h2>
            <p className="mb-6">
              Use Cali DOGE&apos;s database to discover and report government waste in California.
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