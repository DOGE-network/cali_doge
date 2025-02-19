import { TweetV2, UserV2 } from 'twitter-api-v2';
import { format } from 'date-fns';
import { EnrichedTweet, TwitterMedia } from './types';

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