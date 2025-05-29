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
        fs.unlink(filename, () => {}); // Clean up empty file
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      let error: Error | null = null;
      response.pipe(file);

      file.on('error', (err) => {
        error = err;
        file.close();
        fs.unlink(filename, () => {}); // Clean up on error
      });

      file.on('finish', () => {
        file.close();
        if (error) {
          reject(error);
        } else {
          // Verify file size before resolving
          const stats = fs.statSync(filename);
          if (stats.size === 0) {
            fs.unlink(filename, () => {}); // Clean up empty file
            reject(new Error('Downloaded file is empty'));
          } else {
            resolve();
          }
        }
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {}); // Clean up on error
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

// Add logging to file
const logFile = path.join(process.cwd(), 'src', 'logs', 'download-specific-media.log');

// Ensure logs directory exists
if (!fs.existsSync(path.dirname(logFile))) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

function logToFile(message: string) {
  fs.appendFileSync(logFile, message + '\n');
}

function logInfo(message: string) {
  console.log(message);
  logToFile(`[INFO] ${message}`);
}

function logDetail(message: string) {
  logToFile(`[DETAIL] ${message}`);
}

async function main() {
  try {
    // Read the tweets.json file
    const tweetsPath = path.join(process.cwd(), 'src', 'data', 'tweets', 'tweets.json');
    const tweetsData = JSON.parse(fs.readFileSync(tweetsPath, 'utf-8'));
    
    // Create a Set to track unique news image URLs
    const newsImageUrls = new Set<string>();
    const mediaUrls = new Set<string>();
    
    // Track URL mappings for updating tweets.json
    const urlMappings = new Map<string, string>();
    
    // Find all news image URLs and media URLs in the tweets
    tweetsData.tweets.forEach((tweet: any) => {
      // Check for news images in URLs
      if (tweet.entities?.urls) {
        tweet.entities.urls.forEach((url: any) => {
          if (url.url && url.url.includes('pbs.twimg.com/news_img')) {
            newsImageUrls.add(url.url);
          }
          // Check for images in URL previews
          if (url.images) {
            url.images.forEach((image: any) => {
              if (image.url && image.url.includes('pbs.twimg.com/news_img')) {
                newsImageUrls.add(image.url);
              }
            });
          }
        });
      }
      
      // Check for media attachments
      if (tweet.media) {
        tweet.media.forEach((media: any) => {
          if (media.url) {
            mediaUrls.add(media.url);
          }
        });
      }
    });
    
    logInfo(`Found ${newsImageUrls.size} unique news images to download`);
    logInfo(`Found ${mediaUrls.size} unique media files to download`);
    
    // Download each news image
    for (const url of Array.from(newsImageUrls)) {
      try {
        const imageId = extractNewsImageId(url);
        if (!imageId) {
          logDetail(`Could not extract image ID from URL: ${url}`);
          continue;
        }
        
        const filename = `${imageId}.jpg`;
        const filepath = path.join(process.cwd(), 'public', 'twitter_media', filename);
        
        // Skip if file already exists
        if (fs.existsSync(filepath)) {
          logDetail(`File already exists: ${filepath}`);
          urlMappings.set(url, `/media/${filename}`);
          continue;
        }
        
        logDetail(`Downloading ${url} to ${filepath}...`);
        await downloadMedia(url, filepath);
        
        // Verify the file was downloaded and has content
        const stats = fs.statSync(filepath);
        if (stats.size === 0) {
          logDetail(`Downloaded file is empty: ${filepath}`);
          fs.unlinkSync(filepath); // Delete empty file
          continue;
        }
        
        logInfo(`Successfully downloaded news image: ${imageId}`);
        urlMappings.set(url, `/media/${filename}`);
        
        // Wait 1 second between downloads to avoid rate limits
        await wait(1000);
      } catch (error) {
        logDetail(`Error downloading news image ${url}: ${error}`);
      }
    }
    
    // Download each media file
    for (const url of Array.from(mediaUrls)) {
      try {
        // Skip if it's already a local path
        if (url.startsWith('/media/')) {
          logDetail(`Skipping local path: ${url}`);
          continue;
        }

        // Extract filename from URL or generate one
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const filename = pathParts[pathParts.length - 1].split('?')[0];
        
        if (!filename) {
          logDetail(`Could not extract filename from URL: ${url}`);
          continue;
        }
        
        const filepath = path.join(process.cwd(), 'public', 'twitter_media', filename);
        
        // Skip if file already exists
        if (fs.existsSync(filepath)) {
          logDetail(`File already exists: ${filepath}`);
          urlMappings.set(url, `/media/${filename}`);
          continue;
        }
        
        logDetail(`Downloading ${url} to ${filepath}...`);
        await downloadMedia(url, filepath);
        
        // Verify the file was downloaded and has content
        const stats = fs.statSync(filepath);
        if (stats.size === 0) {
          logDetail(`Downloaded file is empty: ${filepath}`);
          fs.unlinkSync(filepath); // Delete empty file
          continue;
        }
        
        logInfo(`Successfully downloaded media file: ${filename}`);
        urlMappings.set(url, `/media/${filename}`);
        
        // Wait 1 second between downloads to avoid rate limits
        await wait(1000);
      } catch (error) {
        logDetail(`Error downloading media file ${url}: ${error}`);
      }
    }
    
    // Now handle the specific tweet media
    const tweetIds = [
      '1906435722753765451',
      '1906169739095007396'
    ];

    for (const tweetId of tweetIds) {
      try {
        logDetail(`Fetching tweet ${tweetId}...`);
        
        // Get the tweet with media
        const tweet = await v2Client.singleTweet(tweetId, {
          expansions: ['attachments.media_keys'],
          'media.fields': ['url', 'preview_image_url', 'type']
        });

        if (!tweet.data.attachments?.media_keys) {
          logDetail(`No media found for tweet ${tweetId}`);
          continue;
        }

        // Get media details
        const media = tweet.includes?.media?.[0];
        if (!media) {
          logDetail(`No media details found for tweet ${tweetId}`);
          continue;
        }

        logDetail('Media details:');
        logDetail(JSON.stringify(media));

        // Download the media
        const mediaUrl = media.url || media.preview_image_url;
        if (!mediaUrl) {
          logDetail(`No URL found for media in tweet ${tweetId}`);
          continue;
        }

        const filename = `${tweetId}_0.jpg`;
        const filepath = path.join(process.cwd(), 'public', 'twitter_media', filename);
        
        logDetail(`Downloading ${mediaUrl} to ${filepath}...`);
        await downloadMedia(mediaUrl, filepath);
        
        // Verify the file was downloaded and has content
        const stats = fs.statSync(filepath);
        if (stats.size === 0) {
          logDetail(`Downloaded file is empty: ${filepath}`);
          fs.unlinkSync(filepath); // Delete empty file
          continue;
        }
        
        logInfo(`Successfully downloaded media for tweet ${tweetId}`);
        urlMappings.set(mediaUrl, `/media/${filename}`);

        // Wait 2 seconds between requests to avoid rate limits
        await wait(2000);
      } catch (error: any) {
        if (error.code === 429) {
          const resetTime = error.rateLimit?.reset;
          if (resetTime) {
            const waitTime = (resetTime * 1000) - Date.now() + 1000; // Add 1 second buffer
            logInfo(`Rate limited. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
            await wait(waitTime);
            // Retry this tweet
            tweetIds.unshift(tweetId);
          }
        } else {
          logDetail(`Error processing tweet ${tweetId}: ${error}`);
        }
      }
    }

    // Log missing files and their original tweet data
    logDetail('\nMissing files and their original tweet data:');
    tweetsData.tweets.forEach((tweet: any) => {
      if (tweet.media) {
        tweet.media.forEach((media: any) => {
          if (media.url) {
            const filename = media.url.split('/').pop();
            const filepath = path.join(process.cwd(), 'public', 'twitter_media', filename);
            if (!fs.existsSync(filepath)) {
              logDetail(`\nMissing file: ${filename}`);
              logDetail(`Tweet ID: ${tweet.id}`);
              logDetail(`Original URL: ${media.url}`);
              logDetail(`Tweet text: ${tweet.text}`);
            }
          }
        });
      }
    });

    // Update URLs in tweets.json
    logInfo('\nUpdating URLs in tweets.json...');
    tweetsData.tweets.forEach((tweet: any) => {
      // Update media URLs
      if (tweet.media) {
        tweet.media.forEach((media: any) => {
          if (media.url && urlMappings.has(media.url)) {
            media.url = urlMappings.get(media.url);
          }
        });
      }
      
      // Update URL preview images
      if (tweet.entities?.urls) {
        tweet.entities.urls.forEach((url: any) => {
          if (url.url && urlMappings.has(url.url)) {
            url.url = urlMappings.get(url.url);
          }
          if (url.images) {
            url.images.forEach((image: any) => {
              if (image.url && urlMappings.has(image.url)) {
                image.url = urlMappings.get(image.url);
              }
            });
          }
        });
      }
    });

    // Save updated tweets.json
    fs.writeFileSync(tweetsPath, JSON.stringify(tweetsData, null, 2));
    logInfo('Successfully updated tweets.json with local image paths');

  } catch (error) {
    logDetail('Error:');
    logDetail(String(error));
    process.exit(1);
  }
}

main(); 