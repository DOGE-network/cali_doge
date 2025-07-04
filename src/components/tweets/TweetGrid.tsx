import { EnrichedTweet } from '@/types/twitter';
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 tweet-grid" data-tour="twitter-content">
      {tweets.map((tweet, index) => (
        <div key={tweet.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <TweetCard tweet={tweet} isFirst={index === 0} />
        </div>
      ))}
    </div>
  );
} 