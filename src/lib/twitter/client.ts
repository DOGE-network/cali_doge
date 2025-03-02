import { TwitterApi } from 'twitter-api-v2';

// Determine if we're running in a GitHub Actions environment
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

// Check for required environment variables
const requiredEnvVars = [
  'TWITTER_API_KEY',
  'TWITTER_API_KEY_SECRET',
  'TWITTER_BEARER_TOKEN',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
  'TWITTER_USERNAME',
];

// Check each required environment variable
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    if (isGitHubActions) {
      throw new Error(
        `${envVar} is not defined in GitHub Secrets. ` +
        'Make sure to add it in your repository settings under Secrets and Variables > Actions.'
      );
    } else {
      throw new Error(
        `${envVar} is not defined in environment variables. ` +
        'Make sure it is set in your .env.local file or system environment.'
      );
    }
  }
}

// Create client with app-only bearer token
// We can safely assert non-null since we've checked above
const bearerToken = process.env.TWITTER_BEARER_TOKEN as string;
export const twitterClient = new TwitterApi(bearerToken);

// Create client with user authentication
export const twitterAuthClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY as string,
  appSecret: process.env.TWITTER_API_KEY_SECRET as string,
  accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

// Read-only client for app-only endpoints
export const readOnlyClient = twitterClient.readOnly;

// Readonly client is recommended for app-only endpoints
export const v2Client = readOnlyClient.v2; 