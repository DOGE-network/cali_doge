import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Determine if we're running in a GitHub Actions environment
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

// If running locally, load environment variables from .env.local
if (!isGitHubActions) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  // Only try to load from .env.local if the file exists
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from ${envPath}`);
    config({ path: envPath });
  } else {
    console.log('No .env.local file found. Using environment variables from the system.');
  }
}

// Verify required environment variables are loaded
const requiredEnvVars = [
  'TWITTER_API_KEY',
  'TWITTER_API_KEY_SECRET',
  'TWITTER_BEARER_TOKEN',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
  'TWITTER_USERNAME',
];

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  if (isGitHubActions) {
    throw new Error(
      `Missing required environment variables in GitHub Secrets: ${missingVars.join(', ')}\n` +
      'Make sure these are properly configured in your repository settings.'
    );
  } else {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Make sure these are set in your .env.local file or system environment.'
    );
  }
}

// Log the source of environment variables
console.log(`Environment variables loaded ${isGitHubActions ? 'from GitHub Secrets' : 'from local environment'}`); 