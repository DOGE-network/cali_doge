'use client';

import Image from 'next/image';
import { EnrichedTweet } from '@/types/twitter';
import { format } from 'date-fns';
import { useState } from 'react';

interface TweetCardProps {
  tweet: EnrichedTweet;
  isFirst?: boolean;
}

// Function to extract YouTube video ID from various YouTube URL formats
function extractYouTubeVideoId(url: string): string | null {
  // Try various YouTube URL patterns
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^#&?]*)/,
    /(?:youtube\.com\/watch\?(?:.+&)?si=)([^#&?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // If it's a youtu.be short URL
  if (url.includes('youtu.be/')) {
    const parts = url.split('youtu.be/')[1];
    const videoId = parts.split('?')[0];
    if (videoId) return videoId;
  }
  
  return null;
}

// Function to decode HTML entities in text
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };
  
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g, 
    match => entities[match] || match);
}

// Function to format tweet text with highlighted mentions, hashtags, and URLs
function formatTweetText(text: string): React.ReactNode {
  // First decode HTML entities
  const decodedText = decodeHtmlEntities(text);
  
  // Find all matches and their positions
  const matches: Array<{ type: 'mention' | 'hashtag' | 'url', content: string, index: number }> = [];
  
  // Find mentions
  const mentionRegex = /@(\w+)/g;
  let mentionMatch;
  while ((mentionMatch = mentionRegex.exec(decodedText)) !== null) {
    matches.push({ 
      type: 'mention', 
      content: mentionMatch[0], 
      index: mentionMatch.index 
    });
  }
  
  // Find hashtags
  const hashtagRegex = /#(\w+)/g;
  let hashtagMatch;
  while ((hashtagMatch = hashtagRegex.exec(decodedText)) !== null) {
    matches.push({ 
      type: 'hashtag', 
      content: hashtagMatch[0], 
      index: hashtagMatch.index 
    });
  }
  
  // Find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(decodedText)) !== null) {
    matches.push({ 
      type: 'url', 
      content: urlMatch[0], 
      index: urlMatch.index 
    });
  }
  
  // Sort matches by their index
  matches.sort((a, b) => a.index - b.index);
  
  // If no matches, return the decoded text
  if (matches.length === 0) {
    return decodedText;
  }
  
  // Split the text by matches
  const parts: Array<{ type: 'text' | 'mention' | 'hashtag' | 'url', content: string }> = [];
  let lastIndex = 0;
  
  // Process matches in order
  for (const match of matches) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: decodedText.substring(lastIndex, match.index) });
    }
    
    // Add the match
    parts.push({ type: match.type, content: match.content });
    
    // Update lastIndex
    lastIndex = match.index + match.content.length;
  }
  
  // Add any remaining text
  if (lastIndex < decodedText.length) {
    parts.push({ type: 'text', content: decodedText.substring(lastIndex) });
  }
  
  // Handle click on a mention, hashtag, or URL
  const handleEntityClick = (e: React.MouseEvent, type: 'mention' | 'hashtag' | 'url', content: string) => {
    e.stopPropagation(); // Prevent the tweet card click from triggering
    
    let url = '';
    if (type === 'mention') {
      // Extract username without the @ symbol
      const username = content.substring(1);
      url = `https://twitter.com/${username}`;
    } else if (type === 'hashtag') {
      // Extract hashtag without the # symbol
      const tag = content.substring(1);
      url = `https://twitter.com/hashtag/${tag}`;
    } else if (type === 'url') {
      // Use the URL as is
      url = content;
    }
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  
  // Convert parts to React elements
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        } else {
          // We know part.type is 'mention', 'hashtag', or 'url' here
          const entityType = part.type; // This narrows the type
          return (
            <span 
              key={index} 
              className="text-blue-600 cursor-pointer hover:underline"
              onClick={(e) => handleEntityClick(e, entityType, part.content)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleEntityClick(e as any, entityType, part.content);
                }
              }}
            >
              {part.content}
            </span>
          );
        }
      })}
    </>
  );
}

export function TweetCard({ tweet, isFirst = false }: TweetCardProps) {
  const [youtubeThumbError, setYoutubeThumbError] = useState(false);
  const [linkPreviewError, setLinkPreviewError] = useState(false);
  const [mediaErrors, setMediaErrors] = useState<Record<number, boolean>>({});

  const tweetUrl = `https://twitter.com/${tweet.author?.username}/status/${tweet.id}`;
  const urls = tweet.entities?.urls;
  const hasUrls = urls && urls.length > 0;
  const mainUrl = hasUrls ? urls[0] : null;
  
  // Check if the URL is a YouTube link
  const isYouTubeLink = mainUrl?.expanded_url && 
    (mainUrl.expanded_url.includes('youtube.com') || mainUrl.expanded_url.includes('youtu.be'));
  
  // Extract video ID if it's a YouTube link
  const youtubeVideoId = isYouTubeLink && mainUrl?.expanded_url ? 
    extractYouTubeVideoId(mainUrl.expanded_url) : null;
  
  // Create direct thumbnail URL (always available)
  const youtubeThumbnailUrl = youtubeVideoId ? 
    `https://img.youtube.com/vi/${youtubeVideoId}/0.jpg` : null;

  // Check if this tweet is part of a thread
  const threadMatch = tweet.text.match(/^(\d+)\/(\d+)/);
  const isThreadTweet = !!threadMatch;
  const threadPosition = isThreadTweet ? parseInt(threadMatch[1]) : null;
  const threadTotal = isThreadTweet ? parseInt(threadMatch[2]) : null;
  
  // If it's a thread tweet, remove the thread indicator from the displayed text
  let displayText = isThreadTweet 
    ? tweet.text.replace(/^\d+\/\d+\s*/, '') 
    : tweet.text;
    
  // Format the tweet text (this will also decode HTML entities)
  const formattedText = formatTweetText(displayText);

  // Function to clean media URLs
  const cleanMediaUrl = (url: string, media: any) => {
    if (!url) return '/icon2.svg';
    
    // Check for corrupted URLs that contain multiple path segments or malformed paths
    if (url.includes('.com/2/media/') || url.includes('_0.com/')) {
      console.warn('Detected corrupted media URL, using fallback:', url);
      return '/icon2.svg';
    }
    
    // If it's a news image URL that's no longer available, use fallback
    if (url.includes('pbs.twimg.com/news_img')) {
      console.warn('News image no longer available, using fallback:', url);
      return '/icon2.svg';
    }
    
    // If it's already a full URL, return it
    if (url.startsWith('http')) return url;
    // If it's already a clean media URL, return it
    if (url.startsWith('/media/')) {
      // Extract just the filename part if it's a Twitter API URL
      const match = url.match(/\/media\/([^\/]+)$/);
      if (match) {
        return `/media/${match[1]}`;
      }
      return url;
    }
    
    // Log the original URL for debugging
    console.log('Original media URL:', url);
    
    // Remove any domain names and clean the path
    const cleanPath = url
      .replace(/^https?:\/\/[^\/]+\//, '') // Remove domain
      .replace(/^\/?media\/?/, '') // Remove media prefix
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // Clean filename
    
    // Log the cleaned path
    console.log('Cleaned media path:', cleanPath);
    
    // If we have the original media URL, use it as fallback
    const fallbackUrl = media?.url || media?.preview_image_url;
    return `/media/${cleanPath}?fallback=${encodeURIComponent(fallbackUrl || '')}`;
  };

  const handleClick = () => {
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white p-4 hover:bg-gray-50 transition-colors cursor-pointer"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      data-tour={isFirst ? "twitter-content" : undefined}
    >
      <div className="flex items-start space-x-3">
        {tweet.author?.profile_image_url && (
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image
              src={tweet.author.profile_image_url.replace('_normal', '')}
              alt={tweet.author.name || 'Profile'}
              fill
              className="rounded-full object-cover"
              sizes="48px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="font-bold text-gray-900 truncate">
              {tweet.author?.name ? decodeHtmlEntities(tweet.author.name) : ''}
            </span>
            <span className="text-gray-500 truncate">
              @{tweet.author?.username ? decodeHtmlEntities(tweet.author.username) : ''}
            </span>
            {tweet.created_at && (
              <span className="text-gray-500 text-sm">
                · {format(new Date(tweet.created_at), 'MMM d')}
              </span>
            )}
            {/* Thread indicator badge - show for all tweets in a thread */}
            {isThreadTweet && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 ml-1">
                {threadPosition}/{threadTotal}
              </span>
            )}
          </div>
          
          <p className="text-gray-800 mt-1 whitespace-pre-wrap">{formattedText}</p>
          
          {/* Linked Content Preview */}
          {mainUrl && mainUrl.expanded_url && (
            <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50">
              {/* Use YouTube thumbnail URL for YouTube videos */}
              {isYouTubeLink && youtubeThumbnailUrl ? (
                <div className="relative w-full h-52">
                  {!youtubeThumbError ? (
                    <Image
                      src={youtubeThumbnailUrl}
                      alt={mainUrl.title || 'YouTube video'}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      onError={() => setYoutubeThumbError(true)}
                    />
                  ) : (
                    <Image
                      src="/icon2.svg"
                      alt="Fallback image"
                      className="object-contain"
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    />
                  )}
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                // For non-YouTube links, use the original image if available
                mainUrl.images?.[0]?.url && (
                  <div className="relative w-full h-52">
                    {!linkPreviewError ? (
                      <Image
                        src={mainUrl.images[0].url}
                        alt={mainUrl.title || 'Link preview'}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        unoptimized
                        onError={() => setLinkPreviewError(true)}
                      />
                    ) : (
                      <Image
                        src="/icon2.svg"
                        alt="Fallback image"
                        className="object-contain"
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      />
                    )}
                  </div>
                )
              )}
              <div className="p-3">
                <div className="text-gray-500 text-sm truncate">
                  {mainUrl.display_url}
                </div>
                {mainUrl.title && (
                  <div className="font-bold text-gray-900 mt-1">
                    {decodeHtmlEntities(mainUrl.title)}
                  </div>
                )}
                {mainUrl.description && (
                  <div className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {decodeHtmlEntities(mainUrl.description)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Media Grid */}
          {tweet.media && tweet.media.length > 0 && (
            <div className={`grid gap-2 mt-3 ${
              tweet.media.length === 1 ? 'grid-cols-1' :
              tweet.media.length === 2 ? 'grid-cols-2' :
              tweet.media.length === 3 ? 'grid-cols-2' :
              'grid-cols-2'
            }`}>
              {tweet.media.map((media, index) => (
                <div
                  key={index}
                  className={`relative aspect-video ${
                    tweet.media?.length === 3 && index === 2
                      ? 'col-span-2'
                      : ''
                  }`}
                >
                  <Image
                    src={mediaErrors[index] ? '/icon2.svg' : cleanMediaUrl(media.url || '', media)}
                    alt={mediaErrors[index] ? 'Fallback image' : 'Tweet media'}
                    fill
                    className={`rounded-lg ${mediaErrors[index] ? 'object-contain' : 'object-cover'}`}
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    onError={() => setMediaErrors(prev => ({ ...prev, [index]: true }))}
                    unoptimized
                    priority={index === 0}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 