import Button from '@/components/Button';
import Link from 'next/link';
import { FaTwitter, FaGithub } from 'react-icons/fa';

export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">About California DOGE</h1>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4" data-tour="about-mission">Our Mission</h2>
        <p className="mb-4">
          We analyze government spending and regulations through a three-layer approach:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-2"><strong>People:</strong> Understanding workforce distribution and roles</li>
          <li className="mb-2"><strong>Infrastructure:</strong> Analyzing physical assets and operational costs</li>
          <li className="mb-2"><strong>Services & IT:</strong> Examining digital infrastructure and service delivery</li>
        </ul>
        <p>
          Our goal is to provide clear, actionable insights that can lead to more efficient government operations and better public services.
        </p>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4" data-tour="about-involved">Get Involved</h2>
        <p className="mb-4">
          We welcome volunteers to help with:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-2">Strategy development and research</li>
          <li className="mb-2">Content updates and data analysis</li>
          <li className="mb-2">Social media engagement and outreach</li>
        </ul>
        
        <h3 className="text-xl font-medium mb-3">How to contribute:</h3>
        <ul className="space-y-3 mb-4" data-tour="social-links">
          <li className="flex items-center">
            <a 
              href="https://twitter.com/cali_doge" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FaTwitter className="mr-2 text-lg" />
              <span>Follow us on X (Twitter) for updates</span>
            </a>
          </li>
          <li className="flex items-center">
            <a 
              href="https://github.com/opendatainitiative/cali_doge" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FaGithub className="mr-2 text-lg" />
              <span>Submit issues or pull requests on GitHub</span>
            </a>
          </li>
          <li className="mb-2">Share your expertise through content contributions</li>
        </ul>
        <p className="mb-6">
          We maintain an apolitical approach, focusing solely on data analysis and transparency. Our goal is to present facts and insights that can help improve government efficiency.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button 
            href="https://www.whitehouse.gov/presidential-actions/2025/01/establishing-and-implementing-the-presidents-department-of-government-efficiency/"
            variant="primary"
          >
            Learn more about DOGE.gov
          </Button>
          
          <Link href="/network" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-center transition-colors">
            Join Our Mailing List
          </Link>
        </div>
      </section>
    </main>
  );
} 