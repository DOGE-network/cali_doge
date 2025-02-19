import { TweetV2, UserV2, TweetEntitiesV2 } from 'twitter-api-v2';

export interface TwitterMedia {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
}

export interface UrlMetadata {
  url: string;
  expanded_url: string;
  display_url: string;
  title?: string;
  description?: string;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

export interface EnrichedTweetEntities extends TweetEntitiesV2 {
  urls: (TweetEntitiesV2['urls'][0] & UrlMetadata)[];
}

export interface EnrichedTweet extends Omit<TweetV2, 'entities'> {
  media?: TwitterMedia[];
  author?: UserV2;
  created_at_formatted?: string;
  entities?: EnrichedTweetEntities;
}

export interface TwitterApiResponse {
  tweets: EnrichedTweet[];
  users: UserV2[];
  errors?: Array<{
    code: string;
    message: string;
  }>;
  meta?: {
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
}

export interface TwitterError extends Error {
  code?: string;
  data?: any;
} 