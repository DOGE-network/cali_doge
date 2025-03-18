import { TweetV2, UserV2 } from 'twitter-api-v2';
import { format } from 'date-fns';
import { EnrichedTweet, TwitterMedia } from '@/types/twitter';

export const TWEETS_PER_MONTH = 100;

export function enrichTweet(
  tweet: TweetV2,
  users?: UserV2[],
  includeMedia = true
): EnrichedTweet {
  const enriched: EnrichedTweet = {
    ...tweet,
  };

  // Add formatted date
  if (tweet.created_at) {
    enriched.created_at_formatted = format(
      new Date(tweet.created_at),
      'MMM d, yyyy'
    );
  }

  // Add author if available
  if (users?.length && tweet.author_id) {
    enriched.author = users.find((user) => user.id === tweet.author_id);
  }

  // Add media if available and requested
  if (includeMedia && tweet.attachments?.media_keys) {
    const media: TwitterMedia[] = tweet.attachments.media_keys.map((key) => ({
      type: 'photo', // Default to photo, will be updated with actual type from API
      url: `https://api.twitter.com/2/media/${key}`,
    }));
    enriched.media = media;
  }

  // Enrich URLs with metadata
  if (tweet.entities?.urls) {
    enriched.entities = {
      ...tweet.entities,
      urls: tweet.entities.urls.map(url => ({
        ...url,
        title: url.title || undefined,
        description: url.description || undefined,
        images: url.images?.map(img => ({
          url: img.url,
          width: img.width,
          height: img.height
        }))
      }))
    };
  }

  return enriched;
}

export function handleTwitterError(error: any): never {
  const errorMessage = error.data?.errors?.[0]?.message || error.message;
  const errorCode = error.data?.errors?.[0]?.code || error.code;
  
  throw new Error(`Twitter API Error ${errorCode}: ${errorMessage}`);
}

export function validateRateLimit(
  remainingCalls: number,
  resetTime: Date
): boolean {
  if (remainingCalls <= 0) {
    const now = new Date();
    if (now < resetTime) {
      console.warn(
        `Rate limit exceeded. Reset time: ${format(
          resetTime,
          'MMM d, yyyy HH:mm:ss'
        )}`
      );
      return false;
    }
  }
  return true;
}

/**
 * Groups tweets into threads based on thread indicators (e.g., "1/5", "2/5") and author
 * @param tweets Array of tweets to group
 * @returns Object with arrays of thread tweets and standalone tweets
 */
export function groupTweetsIntoThreads(tweets: EnrichedTweet[]) {
  const threadMap: Record<string, EnrichedTweet[]> = {};
  const processedTweetIds = new Set<string>();
  const result: EnrichedTweet[][] = [];

  // First pass: identify tweets with explicit thread indicators (e.g., "1/5", "2/5")
  tweets.forEach(tweet => {
    // Skip if already processed
    if (processedTweetIds.has(tweet.id)) return;
    
    // Check if tweet has a thread indicator like "1/5"
    const threadMatch = tweet.text.match(/^(\d+)\/(\d+)/);
    
    if (threadMatch && tweet.author_id) {
      const threadTotal = parseInt(threadMatch[2]);
      
      // Create a thread ID based on the author and the total number of tweets in the thread
      const threadId = `${tweet.author_id}_${threadTotal}`;
      
      if (!threadMap[threadId]) {
        threadMap[threadId] = [];
      }
      
      threadMap[threadId].push(tweet);
      processedTweetIds.add(tweet.id);
    }
  });

  // Process thread groups
  Object.values(threadMap).forEach(threadTweets => {
    // Only consider it a thread if we have at least 2 tweets
    if (threadTweets.length >= 2) {
      // Sort thread tweets by position
      threadTweets.sort((a, b) => {
        const aMatch = a.text.match(/^(\d+)\/\d+/);
        const bMatch = b.text.match(/^(\d+)\/\d+/);
        
        if (aMatch && bMatch) {
          return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        }
        
        return 0;
      });
      
      result.push(threadTweets);
    } else {
      // If only one tweet in a "thread", treat it as standalone
      threadTweets.forEach(tweet => {
        result.push([tweet]);
      });
    }
  });

  // Add remaining standalone tweets
  tweets.forEach(tweet => {
    if (!processedTweetIds.has(tweet.id)) {
      result.push([tweet]);
      processedTweetIds.add(tweet.id);
    }
  });

  // Sort all tweet groups by the created_at date of their first tweet (newest first)
  result.sort((a, b) => {
    const aDate = a[0]?.created_at ? new Date(a[0].created_at) : new Date(0);
    const bDate = b[0]?.created_at ? new Date(b[0].created_at) : new Date(0);
    return bDate.getTime() - aDate.getTime();
  });

  return result;
} 