import { TwitterApi } from 'twitter-api-v2';

if (!process.env.TWITTER_API_KEY) {
  throw new Error('TWITTER_API_KEY is not defined in environment variables');
}
if (!process.env.TWITTER_API_KEY_SECRET) {
  throw new Error('TWITTER_API_KEY_SECRET is not defined in environment variables');
}
if (!process.env.TWITTER_bearer_TOKEN) {
  throw new Error('TWITTER_bearer_TOKEN is not defined in environment variables');
}
if (!process.env.TWITTER_ACCESS_TOKEN) {
  throw new Error('TWITTER_ACCESS_TOKEN is not defined in environment variables');
}
if (!process.env.TWITTER_ACCESS_TOKEN_SECRET) {
  throw new Error('TWITTER_ACCESS_TOKEN_SECRET is not defined in environment variables');
}
if (!process.env.TWITTER_USERNAME) {
  throw new Error('TWITTER_USERNAME is not defined in environment variables');
}

// Create client with app-only bearer token
export const twitterClient = new TwitterApi(process.env.TWITTER_bearer_TOKEN);

// Create client with user authentication
export const twitterAuthClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_KEY_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// Read-only client for app-only endpoints
export const readOnlyClient = twitterClient.readOnly;

// Readonly client is recommended for app-only endpoints
export const v2Client = readOnlyClient.v2; 