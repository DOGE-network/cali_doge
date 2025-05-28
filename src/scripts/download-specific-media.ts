import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Validate required environment variables
const requiredEnvVars = [
  'TWITTER_API_KEY',
  'TWITTER_API_KEY_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please make sure these are set in your .env.local file');
  process.exit(1);
}

// Initialize Twitter client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_KEY_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

const v2Client = client.v2;

async function downloadMedia(url: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {}); // Delete the file if there's an error
      reject(err);
    });
  });
}

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to extract news image ID from URL
function extractNewsImageId(url: string): string | null {
  const match = url.match(/news_img\/\d+\/([^?]+)/);
  return match ? match[1] : null;
}

async function main() {
  try {
    // Read the tweets.json file
    const tweetsPath = path.join(process.cwd(), 'src', 'data', 'tweets', 'tweets.json');
    const tweetsData = JSON.parse(fs.readFileSync(tweetsPath, 'utf-8'));
    
    // Create a Set to track unique news image URLs
    const newsImageUrls = new Set<string>();
    
    // Find all news image URLs in the tweets
    tweetsData.forEach((tweet: any) => {
      if (tweet.entities?.urls) {
        tweet.entities.urls.forEach((url: any) => {
          if (url.url && url.url.includes('pbs.twimg.com/news_img')) {
            newsImageUrls.add(url.url);
          }
        });
      }
    });
    
    console.log(`Found ${newsImageUrls.size} unique news images to download`);
    
    // Convert Set to Array for iteration
    const newsImageUrlsArray = Array.from(newsImageUrls);
    
    // Download each news image
    for (const url of newsImageUrlsArray) {
      try {
        const imageId = extractNewsImageId(url);
        if (!imageId) {
          console.log(`Could not extract image ID from URL: ${url}`);
          continue;
        }
        
        const filename = path.join(process.cwd(), 'public', 'twitter_media', `${imageId}.jpg`);
        
        // Skip if file already exists
        if (fs.existsSync(filename)) {
          console.log(`File already exists: ${filename}`);
          continue;
        }
        
        console.log(`Downloading ${url} to ${filename}...`);
        await downloadMedia(url, filename);
        console.log(`Successfully downloaded news image: ${imageId}`);
        
        // Wait 1 second between downloads to avoid rate limits
        await wait(1000);
      } catch (error) {
        console.error(`Error downloading news image ${url}:`, error);
      }
    }
    
    // Now handle the specific tweet media
    const tweetIds = [
      '1906435722753765451',
      '1906169739095007396'
    ];

    for (const tweetId of tweetIds) {
      try {
        console.log(`Fetching tweet ${tweetId}...`);
        
        // Get the tweet with media
        const tweet = await v2Client.singleTweet(tweetId, {
          expansions: ['attachments.media_keys'],
          'media.fields': ['url', 'preview_image_url', 'type']
        });

        if (!tweet.data.attachments?.media_keys) {
          console.log(`No media found for tweet ${tweetId}`);
          continue;
        }

        // Get media details
        const media = tweet.includes?.media?.[0];
        if (!media) {
          console.log(`No media details found for tweet ${tweetId}`);
          continue;
        }

        console.log('Media details:', media);

        // Download the media
        const mediaUrl = media.url || media.preview_image_url;
        if (!mediaUrl) {
          console.log(`No URL found for media in tweet ${tweetId}`);
          continue;
        }

        const filename = path.join(process.cwd(), 'public', 'twitter_media', `${tweetId}_0.jpg`);
        console.log(`Downloading ${mediaUrl} to ${filename}...`);
        
        await downloadMedia(mediaUrl, filename);
        console.log(`Successfully downloaded media for tweet ${tweetId}`);

        // Wait 2 seconds between requests to avoid rate limits
        await wait(2000);
      } catch (error: any) {
        if (error.code === 429) {
          const resetTime = error.rateLimit?.reset;
          if (resetTime) {
            const waitTime = (resetTime * 1000) - Date.now() + 1000; // Add 1 second buffer
            console.log(`Rate limited. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
            await wait(waitTime);
            // Retry this tweet
            tweetIds.unshift(tweetId);
          }
        } else {
          console.error(`Error processing tweet ${tweetId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 