'use client';

import { useState, useEffect } from 'react';

interface FloatingTutorialButtonProps {
  onTutorialClick: () => void;
  hasSeenTutorial?: boolean;
}

export default function FloatingTutorialButton({ onTutorialClick, hasSeenTutorial = false }: FloatingTutorialButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay the appearance to prevent flashing
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) {
    return null;
  }

  const buttonText = hasSeenTutorial ? 'Restart Tutorial' : 'Start Tutorial';

  return (
    <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40">
      <button
        onClick={onTutorialClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 floating-tutorial-button"
        aria-label={buttonText}
      >
        {/* Main button icon */}
        <svg 
          className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>

        {/* Tooltip */}
        {isHovered && (
          <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg tutorial-modal">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{buttonText}</span>
            </div>
            {/* Arrow pointing to button */}
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
          </div>
        )}

        {/* Pulse animation */}
        <div className="absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-20"></div>
      </button>
    </div>
  );
} 