import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
config({ path: envPath });

// Verify required environment variables are loaded
const requiredEnvVars = [
  'TWITTER_API_KEY',
  'TWITTER_API_KEY_SECRET',
  'TWITTER_bearer_TOKEN',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
  'TWITTER_USERNAME',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set in ${envPath}`);
  }
} 