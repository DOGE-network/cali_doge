import { Metadata } from 'next';
import Link from 'next/link';
import WhistleblowerForm from '@/components/WhistleblowerForm';

export const metadata: Metadata = {
  title: "California Whistleblower Platform | Report Government Waste with Cali DOGE",
  description: "Report California government waste, fraud, and abuse through our secure whistleblower platform. Your anonymous tips help us maintain transparency and accountability in California government.",
  alternates: {
    canonical: '/whistleblower',
  },
};

export default function Whistleblower() {
  return (
    <main className="flex-grow">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-6">Report California Government Waste</h1>
          <p className="text-xl text-gray-600 mb-8">
            Help us maintain transparency and accountability in California government. Your anonymous tips are crucial for uncovering waste, fraud, and abuse.
          </p>
        </header>

        {/* Report Form */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <WhistleblowerForm />
          </div>
        </section>

        {/* Information Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">What Happens Next?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Review</h3>
              <p>Our team reviews each submission carefully to verify the information provided.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Investigation</h3>
              <p>We investigate credible reports using our database and research resources.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Action</h3>
              <p>We take appropriate action, which may include public reporting or referral to authorities.</p>
            </div>
          </div>
        </section>

        {/* Protection Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Your Protection</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="font-semibold">Anonymous Submission</h3>
                  <p className="text-gray-600">You can submit reports without revealing your identity.</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="font-semibold">Secure Platform</h3>
                  <p className="text-gray-600">Our platform uses encryption to protect your information.</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="font-semibold">Legal Protection</h3>
                  <p className="text-gray-600">California law protects whistleblowers from retaliation.</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-gray-50 p-8 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Need More Information?</h2>
          <p className="mb-6">
            If you have questions about the reporting process or need assistance, our team is here to help.
          </p>
          <div className="flex gap-4">
            <Link 
              href="/contact" 
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Contact Us
            </Link>
            <Link 
              href="/faq" 
              className="bg-gray-100 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors"
            >
              View FAQ
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
} 