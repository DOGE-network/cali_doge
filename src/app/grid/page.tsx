import { TweetGrid } from '@/components/tweets/TweetGrid';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TwitterApiResponse } from '@/types/twitter';
import Link from 'next/link';

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

export default async function GridPage() {
  const tweetData = await getLatestTweets();

  return (
    <main className="flex-grow">
      {/* View Toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex justify-end">
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Switch to Thread View
          </Link>
        </div>
      </div>
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tweetData ? (
          <TweetGrid tweets={tweetData.tweets} />
        ) : (
          <div className="text-center text-gray-500">
            No tweets available at the moment
          </div>
        )}
      </section>
    </main>
  );
} 