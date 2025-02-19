import { TweetV2, UserV2 } from 'twitter-api-v2';

export interface TwitterMedia {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
}

export interface EnrichedTweet extends TweetV2 {
  media?: TwitterMedia[];
  author?: UserV2;
  created_at_formatted?: string;
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