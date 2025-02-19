import { EnrichedTweet } from '@/lib/twitter/types';
import { TweetCard } from './TweetCard';

interface TweetGridProps {
  tweets: EnrichedTweet[];
}

export function TweetGrid({ tweets }: TweetGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tweets.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}
    </div>
  );
} 