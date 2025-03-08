import { EnrichedTweet } from '@/lib/twitter/types';
import { TweetCard } from './TweetCard';
import { TweetThread } from './TweetThread';
import { groupTweetsIntoThreads } from '@/lib/twitter/utils';

interface TweetGridProps {
  tweets: EnrichedTweet[];
  showThreads?: boolean;
}

export function TweetGrid({ tweets, showThreads = false }: TweetGridProps) {
  // If showThreads is true, group tweets into threads
  if (showThreads) {
    const tweetGroups = groupTweetsIntoThreads(tweets);
    
    return (
      <div className="grid gap-6">
        {tweetGroups.map((tweetGroup, index) => (
          <TweetThread key={`thread-${index}`} tweets={tweetGroup} />
        ))}
      </div>
    );
  }
  
  // Otherwise, display tweets in a grid without threading
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tweets.map((tweet) => (
        <div key={tweet.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <TweetCard key={tweet.id} tweet={tweet} />
        </div>
      ))}
    </div>
  );
} 