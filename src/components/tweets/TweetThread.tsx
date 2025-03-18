'use client';

import { EnrichedTweet } from '@/types/twitter';
import { TweetCard } from './TweetCard';
import { useState } from 'react';

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

interface TweetThreadProps {
  tweets: EnrichedTweet[];
}

export function TweetThread({ tweets }: TweetThreadProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If there's only one tweet, just render it normally without thread styling
  if (tweets.length === 1) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <TweetCard tweet={tweets[0]} />
      </div>
    );
  }

  // Sort tweets by their position in the thread (if they have a position indicator like "1/5")
  const sortedTweets = [...tweets].sort((a, b) => {
    const aMatch = a.text.match(/^(\d+)\/\d+/);
    const bMatch = b.text.match(/^(\d+)\/\d+/);
    
    // If both tweets have position indicators, sort by position
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    }
    
    // If only one tweet has a position indicator, put it first
    if (aMatch) return -1;
    if (bMatch) return 1;
    
    // If neither has a position indicator, sort by created_at date (oldest first for threads)
    if (a.created_at && b.created_at) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    
    return 0;
  });

  // Get the first tweet to use for thread information
  const firstTweet = sortedTweets[0];

  // Toggle thread collapse state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handle username click
  const handleUsernameClick = (e: React.MouseEvent, username: string) => {
    e.stopPropagation(); // Prevent the thread header click from triggering
    window.open(`https://twitter.com/${username}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Thread header */}
      <div 
        className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={toggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleCollapse();
          }
        }}
        aria-expanded={!isCollapsed}
        aria-controls="thread-content"
      >
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-medium text-gray-700">
            Thread by {firstTweet.author?.username ? (
              <span 
                className="text-blue-600 cursor-pointer hover:underline"
                onClick={(e) => firstTweet.author && handleUsernameClick(e, firstTweet.author.username)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && firstTweet.author) {
                    handleUsernameClick(e as any, firstTweet.author.username);
                  }
                }}
              >
                @{decodeHtmlEntities(firstTweet.author.username)}
              </span>
            ) : ''} ({sortedTweets.length} tweets)
          </span>
        </div>
        <div className="text-gray-500 transition-transform duration-200">
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Collapsed state - only show first tweet */}
      {isCollapsed && (
        <div>
          <TweetCard tweet={firstTweet} />
        </div>
      )}

      {/* Expanded state - show all tweets with animation */}
      <div 
        id="thread-content"
        className={`transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[5000px] opacity-100'
        }`}
      >
        {sortedTweets.map((tweet, index) => (
          <div key={tweet.id} className="relative">
            {/* Thread connector line between tweets */}
            {index > 0 && (
              <div className="absolute left-6 top-0 h-full w-0.5 bg-blue-100 z-0" />
            )}
            <div className={index < sortedTweets.length - 1 ? 'border-b border-gray-200' : ''}>
              <TweetCard tweet={tweet} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 