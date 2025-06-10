import { TweetThread } from '@/components/tweets/TweetThread';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TwitterApiResponse } from '@/types/twitter';
import { groupTweetsIntoThreads } from '@/lib/twitter/utils';
import Link from 'next/link';
import { Metadata } from 'next';

// Add revalidation period
export const revalidate = 3600; // Revalidate every hour

// Add metadata for better SEO
export const metadata: Metadata = {
  title: "Cali DOGE: California's Independent Government Transparency Platform | California DOGE, CA DOGE",
  description: "Explore Cali DOGE for California government waste data. Search 15M+ records with our CA DOGE platform. Independent, transparent, and data-driven insights into California government operations.",
  alternates: {
    canonical: '/',
  },
};

async function getLatestTweets(): Promise<TwitterApiResponse | null> {
  try {
    const tweetsFile = join(process.cwd(), 'src/data/tweets/tweets.json');
    const fileContent = readFileSync(tweetsFile, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading tweets:', error);
    return null;
  }
}

export default async function Home() {
  const tweetData = await getLatestTweets();

  // Group tweets into threads and standalone tweets
  const tweetGroups = tweetData ? groupTweetsIntoThreads(tweetData.tweets) : [];

  return (
    <main className="flex-grow">
      {/* View Toggle */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex justify-end">
          <Link 
            href="/grid" 
            className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Switch to Grid View
          </Link>
        </div>
      </div>
      
      {/* Welcome Section with H1 */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl font-bold mb-4">Cali DOGE: Uncovering California Government Waste</h1>
        <div className="prose prose-lg text-gray-600 mb-8">
          <p className="mb-4">
            Welcome to Cali DOGE (California DOGE), your independent platform for government transparency. With over 15M records in our database and 300+ hours of research, we provide unprecedented access to California government operations, programs, and spending data.
          </p>
          <p className="mb-4">
            Our CA DOGE platform helps you discover hidden taxes, track government efficiency, and understand how your tax dollars are being spent. Unlike other transparency platforms, we focus exclusively on California, delivering detailed insights into state and local government operations.
          </p>
          <div className="flex gap-4 mt-6">
            <Link 
              href="/search" 
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Search Database
            </Link>
            <Link 
              href="/whistleblower" 
              className="bg-gray-100 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              Report Waste
            </Link>
          </div>
        </div>
      </section>
      
      {/* Tweets Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-2xl font-semibold mb-6">Latest Updates from Cali DOGE</h2>
        {tweetGroups.length > 0 ? (
          <div className="space-y-6">
            {/* Display all tweet groups in chronological order */}
            {tweetGroups.map((tweetGroup, index) => (
              <div key={`tweet-group-${index}`} className="mb-6">
                <TweetThread tweets={tweetGroup} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            No tweets available at the moment
          </div>
        )}
      </section>
    </main>
  );
} 