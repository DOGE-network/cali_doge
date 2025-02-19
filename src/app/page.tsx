import { TweetGrid } from '@/components/tweets/TweetGrid';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { TwitterApiResponse } from '@/lib/twitter/types';

async function getLatestTweets(): Promise<TwitterApiResponse | null> {
  try {
    const tweetsDir = join(process.cwd(), 'src/data/tweets');
    const files = readdirSync(tweetsDir)
      .filter(file => file.startsWith('tweets_') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (!files.length) return null;

    const filePath = join(tweetsDir, files[0]);
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading tweets:', error);
    return null;
  }
}

export default async function Home() {
  const tweetData = await getLatestTweets();

  return (
    <main className="flex-grow">

      {/* Tweets Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {tweetData ? (
          <TweetGrid tweets={tweetData.tweets} />
        ) : (
          <div className="text-center text-odi-gray-500">
            No tweets available at the moment
          </div>
        )}
      </section>
    </main>
  );
} 