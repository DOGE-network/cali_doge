import React from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface RateLimitErrorProps {
  retryAfter?: number;
  remaining?: number;
  resetTime?: number;
  onRetry?: () => void;
}

export default function RateLimitError({ 
  retryAfter = 60, 
  remaining = 0, 
  resetTime,
  onRetry 
}: RateLimitErrorProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  const getResetTimeString = () => {
    if (!resetTime) return '';
    const resetDate = new Date(resetTime);
    return resetDate.toLocaleTimeString();
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border border-red-200">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Too Many Requests
          </h3>
          <p className="text-sm text-gray-600">
            You&apos;ve exceeded the rate limit for this page
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>
            Please wait <strong>{formatTime(retryAfter)}</strong> before trying again
          </span>
        </div>

        {resetTime && (
          <div className="text-xs text-gray-500">
            Rate limit resets at: {getResetTimeString()}
          </div>
        )}

        {remaining !== undefined && (
          <div className="text-xs text-gray-500">
            Requests remaining: {remaining}
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Why this happened:</strong> This helps protect our servers from abuse and ensures fair access for all users.
          </p>
        </div>

        {onRetry && retryAfter <= 0 && (
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    </div>
  );
} 