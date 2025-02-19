import './load-env';
import fs from 'fs';
import path from 'path';
import { v2Client } from '../lib/twitter/client';
import { enrichTweet, handleTwitterError, validateRateLimit, TWEETS_PER_MONTH } from '../lib/twitter/utils';
import { EnrichedTweet, TwitterApiResponse } from '../lib/twitter/types';

const TWEETS_DIR = path.join(process.cwd(), 'src/data/tweets');
const MEDIA_DIR = path.join(process.cwd(), 'src/data/media');
const RATE_LIMIT_FILE = path.join(TWEETS_DIR, 'rate_limit.json');
const TWEETS_FILE = path.join(TWEETS_DIR, 'tweets.json');

interface RateLimitInfo {
  remaining: number;
  reset: string;
  lastUpdated: string;
}

// Ensure directories exist
if (!fs.existsSync(TWEETS_DIR)) fs.mkdirSync(TWEETS_DIR, { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

async function downloadMedia(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download media: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(path.join(MEDIA_DIR, filename), new Uint8Array(arrayBuffer));
  } catch (error) {
    console.error(`Error downloading media ${url}:`, error);
  }
}

function saveRateLimit(info: RateLimitInfo): void {
  fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(info, null, 2));
}

function loadRateLimit(): RateLimitInfo | null {
  try {
    if (fs.existsSync(RATE_LIMIT_FILE)) {
      return JSON.parse(fs.readFileSync(RATE_LIMIT_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading rate limit info:', error);
  }
  return null;
}

function loadExistingTweets(): TwitterApiResponse | null {
  try {
    if (fs.existsSync(TWEETS_FILE)) {
      return JSON.parse(fs.readFileSync(TWEETS_FILE, 'utf-8')) as TwitterApiResponse;
    }
  } catch (error) {
    console.error('Error loading tweets:', error);
  }
  return null;
}

function saveTweets(data: TwitterApiResponse): void {
  fs.writeFileSync(TWEETS_FILE, JSON.stringify(data, null, 2));
}

async function fetchTweets(): Promise<void> {
  try {
    // Check rate limit
    const rateLimit = loadRateLimit();
    if (rateLimit) {
      const resetTime = new Date(rateLimit.reset);
      if (!validateRateLimit(rateLimit.remaining, resetTime)) {
        console.log('Rate limit exceeded. Skipping fetch.');
        return;
      }
    }

    // Get user ID for username
    const username = process.env.TWITTER_USERNAME;
    if (!username) throw new Error('Twitter username not configured');
    
    const user = await v2Client.userByUsername(username);
    if (!user.data) throw new Error('User not found');

    // Load existing tweets
    const existingData = loadExistingTweets();
    const since_id = existingData?.meta?.newest_id;

    // Fetch new tweets with media
    const tweetsResponse = await v2Client.userTimeline(user.data.id, {
      max_results: TWEETS_PER_MONTH,
      since_id,
      'tweet.fields': [
        'created_at',
        'attachments',
        'author_id',
        'entities',
        'context_annotations'
      ],
      'user.fields': ['username', 'name', 'profile_image_url'],
      'media.fields': ['url', 'preview_image_url', 'type', 'width', 'height'],
      expansions: ['attachments.media_keys', 'author_id'],
    });

    const tweets = Array.from(tweetsResponse);
    if (!tweets.length) {
      console.log('No new tweets found');
      return;
    }

    // Process tweets and media
    const enrichedTweets: EnrichedTweet[] = [];
    for (const tweet of tweets) {
      const enriched = enrichTweet(tweet, tweetsResponse.includes?.users);
      
      // Process URLs if present
      if (tweet.entities?.urls) {
        for (const url of tweet.entities.urls) {
          try {
            // Fetch metadata for each URL
            const response = await fetch(url.expanded_url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CaliforniaDOGE/1.0)'
              }
            });
            const html = await response.text();
            
            // Extract metadata from HTML
            const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i) 
              || html.match(/<title>(.*?)<\/title>/i);
            const descriptionMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i)
              || html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
            const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i)
              || html.match(/<meta[^>]*property="twitter:image"[^>]*content="([^"]*)"[^>]*>/i);
            
            url.title = titleMatch?.[1] || '';
            url.description = descriptionMatch?.[1] || '';

            if (ogImageMatch?.[1]) {
              const imageUrl = ogImageMatch[1];
              try {
                const imgResponse = await fetch(imageUrl, { method: 'HEAD' });
                if (imgResponse.ok) {
                  url.images = [{
                    url: imageUrl,
                    width: 1200,
                    height: 630
                  }];
                }
              } catch (imgError) {
                console.error(`Error validating image URL ${imageUrl}:`, imgError);
              }
            }
          } catch (error) {
            console.error(`Error fetching metadata for URL ${url.expanded_url}:`, error);
          }
        }
      }
      
      // Download media if present
      if (enriched.media?.length) {
        for (let i = 0; i < enriched.media.length; i++) {
          const media = enriched.media[i];
          const mediaUrl = media.url || media.preview_image_url;
          if (mediaUrl) {
            const extension = mediaUrl.split('.').pop() || 'jpg';
            const filename = `${tweet.id}_${i}.${extension}`;
            await downloadMedia(mediaUrl, filename);
            media.url = `/media/${filename}`;
          }
        }
      }
      
      enrichedTweets.push(enriched);
    }

    // Merge with existing tweets if available
    const mergedTweets = existingData
      ? [...enrichedTweets, ...existingData.tweets]
      : enrichedTweets;

    const mergedUsers = existingData
      ? [...(tweetsResponse.includes?.users || []), ...existingData.users]
      : tweetsResponse.includes?.users || [];

    // Remove duplicate users by ID
    const uniqueUsers = Array.from(
      new Map(mergedUsers.map(user => [user.id, user])).values()
    );

    // Save merged tweets to file
    const tweetData: TwitterApiResponse = {
      tweets: mergedTweets,
      users: uniqueUsers,
      meta: {
        result_count: mergedTweets.length,
        newest_id: tweetsResponse.meta.newest_id || (existingData?.meta?.newest_id ?? ''),
        oldest_id: existingData?.meta?.oldest_id ?? tweetsResponse.meta.oldest_id,
      },
    };

    saveTweets(tweetData);

    // Update rate limit info
    const resetDate = tweetsResponse.rateLimit?.reset 
      ? new Date(tweetsResponse.rateLimit.reset * 1000) 
      : new Date(Date.now() + 86400000);

    const newRateLimit: RateLimitInfo = {
      remaining: tweetsResponse.rateLimit?.remaining || 0,
      reset: resetDate.toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    saveRateLimit(newRateLimit);

    console.log(`Successfully fetched ${enrichedTweets.length} new tweets and merged with ${existingData ? existingData.tweets.length : 0} existing tweets`);
  } catch (error) {
    handleTwitterError(error);
  }
}

// Execute the script
fetchTweets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 