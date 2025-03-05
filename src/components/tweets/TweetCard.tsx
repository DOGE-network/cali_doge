'use client';

import Image from 'next/image';
import { EnrichedTweet } from '@/lib/twitter/types';
import { format } from 'date-fns';

interface TweetCardProps {
  tweet: EnrichedTweet;
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

export function TweetCard({ tweet }: TweetCardProps) {
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

  const handleClick = () => {
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
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
          <div className="flex items-center space-x-2">
            <span className="font-bold text-gray-900 truncate">
              {tweet.author?.name}
            </span>
            <span className="text-gray-500 truncate">
              @{tweet.author?.username}
            </span>
            {tweet.created_at && (
              <span className="text-gray-500 text-sm">
                · {format(new Date(tweet.created_at), 'MMM d')}
              </span>
            )}
          </div>
          <p className="text-gray-800 mt-1 whitespace-pre-wrap">{tweet.text}</p>
          
          {/* Linked Content Preview */}
          {mainUrl && mainUrl.expanded_url && (
            <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50">
              {/* Use YouTube thumbnail URL for YouTube videos */}
              {isYouTubeLink && youtubeThumbnailUrl ? (
                <div className="relative w-full h-52">
                  <img
                    src={youtubeThumbnailUrl}
                    alt={mainUrl.title || 'YouTube video'}
                    className="w-full h-full object-cover"
                  />
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
                    <Image
                      src={mainUrl.images[0].url}
                      alt={mainUrl.title || 'Link preview'}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      unoptimized
                    />
                  </div>
                )
              )}
              <div className="p-3">
                <div className="text-gray-500 text-sm truncate">
                  {mainUrl.display_url}
                </div>
                {mainUrl.title && (
                  <div className="font-bold text-gray-900 mt-1">
                    {mainUrl.title}
                  </div>
                )}
                {mainUrl.description && (
                  <div className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {mainUrl.description}
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
                    src={media.url || ''}
                    alt="Tweet media"
                    fill
                    className="rounded-lg object-cover"
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
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