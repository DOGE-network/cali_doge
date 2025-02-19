'use client';

import Image from 'next/image';
import { EnrichedTweet } from '@/lib/twitter/types';
import { format } from 'date-fns';

interface TweetCardProps {
  tweet: EnrichedTweet;
}

export function TweetCard({ tweet }: TweetCardProps) {
  const tweetUrl = `https://twitter.com/${tweet.author?.username}/status/${tweet.id}`;

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