'use client';

import { useState, useEffect } from 'react';
import { TourProvider, useTour, StepType } from '@reactour/tour';
import FloatingTutorialButton from './FloatingTutorialButton';

// Tutorial steps configuration
const tutorialSteps: StepType[] = [
  // Step 1: Welcome
  {
    selector: 'body',
    content: (
      <div>
        <h3 className="text-xl font-bold mb-3">Welcome to California DOGE</h3>
        <p className="mb-4">Your independent platform for California government transparency. With over 15M records and 300+ hours of research, we provide unprecedented access to government operations.</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            <span>15M+ government records</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            <span>Real-time data updates</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            <span>Independent analysis</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            <span>California-focused insights</span>
          </div>
        </div>
      </div>
    ),
    position: 'center',
  },
  // Step 2: Search Database button
  {
    selector: '[data-tour="search-database"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Search the Database</h3>
        <p className="mb-3">Click here to search California government spending, contracts, and more.</p>
      </div>
    ),
    position: 'bottom',
  },
  // Step 3: Search icon
  {
    selector: '[data-tour="search-icon"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Quick Search</h3>
        <p className="mb-3">Use the search icon to quickly find departments, vendors, or programs from any page.</p>
      </div>
    ),
    position: 'bottom',
  },
  // Step 4: Nav menu
  {
    selector: '[data-tour="nav-menu"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Navigation Menu</h3>
        <p className="mb-3">Click the menu to access all sections of California DOGE, including Spend, Workforce, Regulations, and more.</p>
        <p className="mb-1 text-sm">The menu will open automatically for this step.</p>
      </div>
    ),
    position: 'bottom',
    action: (_elem) => {
      // Open the nav menu if it's not already open
      const menuButton = document.querySelector('[data-tour="nav-menu"]');
      if (menuButton && !menuButton.getAttribute('aria-expanded')) {
        (menuButton as HTMLElement).click();
      }
    },
  },
  // Step 5: Report Waste button
  {
    selector: '[data-tour="report-waste"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Report Waste</h3>
        <p className="mb-3">Help improve government efficiency by reporting waste, fraud, or abuse anonymously.</p>
      </div>
    ),
    position: 'bottom',
  },
  // Step 6: Twitter content (modal-only)
  {
    selector: 'body',
    content: (
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-bold mb-2">Live Twitter Content</h3>
        <p className="mb-3">See the latest transparency updates and news from California DOGE&apos;s Twitter feed.</p>
        <div className="w-64 h-32 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center mt-2 mb-1">
          <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0022.4.36a9.09 9.09 0 01-2.88 1.1A4.52 4.52 0 0016.11 0c-2.5 0-4.52 2.02-4.52 4.52 0 .35.04.7.11 1.03C7.69 5.4 4.07 3.7 1.64.9c-.38.65-.6 1.4-.6 2.2 0 1.52.77 2.86 1.94 3.65A4.48 4.48 0 01.96 6v.06c0 2.13 1.52 3.91 3.54 4.31-.37.1-.76.16-1.16.16-.28 0-.55-.03-.81-.08.55 1.7 2.16 2.94 4.07 2.97A9.05 9.05 0 010 19.54a12.8 12.8 0 006.92 2.03c8.3 0 12.85-6.88 12.85-12.85 0-.2 0-.39-.01-.58A9.22 9.22 0 0023 3z" />
          </svg>
        </div>
        <span className="text-xs text-gray-400">(Scroll down to see live tweets)</span>
      </div>
    ),
    position: 'center',
  },
  // Step 7: Floating tutorial button
  {
    selector: '.floating-tutorial-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
        <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button on any page.</p>
      </div>
    ),
    position: 'left',
  },
];

// Inner component that uses the tour hook
function TutorialContent() {
  const { setIsOpen } = useTour();
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if user has seen tutorial before
    const tutorialSeen = localStorage.getItem('cali-doge-tutorial-seen');
    if (tutorialSeen) {
      setHasSeenTutorial(true);
    }
    setIsLoaded(true);
  }, []);

  const handleTutorialClick = () => {
    // Debug: Check if target elements exist
    console.log('[Tutorial] Starting tutorial...');
    console.log('[Tutorial] Checking for target elements:');
    console.log('[Tutorial] search-database:', document.querySelector('[data-tour="search-database"]'));
    console.log('[Tutorial] search-icon:', document.querySelector('[data-tour="search-icon"]'));
    console.log('[Tutorial] nav-menu:', document.querySelector('[data-tour="nav-menu"]'));
    console.log('[Tutorial] report-waste:', document.querySelector('[data-tour="report-waste"]'));
    console.log('[Tutorial] twitter-content:', document.querySelector('[data-tour="twitter-content"]'));
    console.log('[Tutorial] floating-tutorial-button:', document.querySelector('.floating-tutorial-button'));
    
    setIsOpen(true);
  };

  // Don't render anything until component is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <FloatingTutorialButton 
      onTutorialClick={handleTutorialClick}
      hasSeenTutorial={hasSeenTutorial}
    />
  );
}

// Main provider component
export default function TutorialProvider() {
  return (
    <TourProvider
      steps={tutorialSteps}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          color: '#374151',
          fontSize: '16px',
          padding: '28px 28px 24px 28px',
          boxShadow: '0 10px 32px rgba(0, 0, 0, 0.18)',
          border: '1.5px solid #2563eb',
          maxWidth: '420px',
        }),
        badge: (base) => ({
          ...base,
          color: '#2563eb',
          fontSize: '20px',
          fontWeight: '700',
        }),
        controls: (base) => ({
          ...base,
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.5',
          marginTop: '18px',
        }),
        button: (base, props) => ({
          ...base,
          backgroundColor: '#f3f4f6', // light grey
          color: '#111',
          border: '2px solid #222',
          borderRadius: '4px',
          fontSize: '28px',
          fontWeight: '900',
          width: '48px',
          height: '48px',
          minWidth: '48px',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: props?.kind === 'next' ? '0 0 0 12px' : (props?.kind === 'prev' ? '0 12px 0 0' : '0 0 0 24px'),
          boxShadow: 'none',
          cursor: props?.disabled ? 'not-allowed' : 'pointer',
          opacity: props?.disabled ? 0.6 : 1,
          transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
        }),
        close: (base) => ({
          ...base,
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '32px',
          height: '32px',
          minWidth: '32px',
          minHeight: '32px',
          backgroundColor: '#fff',
          color: '#111',
          border: '2px solid #222',
          borderRadius: '4px',
          fontSize: '20px',
          fontWeight: '900',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'none',
          cursor: 'pointer',
          zIndex: 2,
          transition: 'background 0.2s, color 0.2s',
        }),
      }}
      padding={{
        mask: 10,
        popover: 10,
      }}
      showNavigation={true}
      showPrevNextButtons={true}
      showCloseButton={true}
      showBadge={true}
      showDots={true}
      scrollSmooth={true}
      disableInteraction={false}
      disableDotsNavigation={false}
      disableKeyboardNavigation={false}
      afterOpen={(_target) => {
        console.log('[Tutorial] Tour opened');
      }}
      beforeClose={(_target) => {
        console.log('[Tutorial] Tour closing');
        // Mark tutorial as seen
        localStorage.setItem('cali-doge-tutorial-seen', 'true');
      }}
      onClickMask={({ setIsOpen }) => {
        // Close tour when clicking mask
        setIsOpen(false);
      }}
      onClickClose={({ setIsOpen }) => {
        // Close tour when clicking close button
        setIsOpen(false);
      }}
    >
      <TutorialContent />
    </TourProvider>
  );
} 