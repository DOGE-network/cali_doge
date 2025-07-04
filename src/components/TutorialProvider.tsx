'use client';

import { useState, useEffect } from 'react';
import { TourProvider, useTour, StepType } from '@reactour/tour';
import FloatingTutorialButton from './FloatingTutorialButton';
import { usePathname } from 'next/navigation';

// Tutorial steps configuration for different pages
const getTutorialSteps = (pathname: string): StepType[] => {
  const normalizedPath = pathname.replace(/\/$/, '');
  console.log('DEBUG getTutorialSteps:', pathname, 'normalized:', normalizedPath);

  // Search page tutorial (put this first)
  if (normalizedPath === '/search') {
    return [
      // 1. Overview
      {
        selector: 'body',
        content: (
          <div>
            <h3 className="text-xl font-bold mb-3">Search Overview</h3>
            <p className="mb-4">This is the most powerful way to explore California government data. You can search across departments, vendors, programs, funds, and keywords.</p>
            <p className="mb-2 text-sm text-blue-600">💡 We&apos;ve added a sample search &apos;high&apos; to demonstrate the search functionality.</p>
          </div>
        ),
        position: 'center',
        action: () => {
          // Input "high" into the search field when tutorial starts
          const searchInput = document.querySelector('[data-tour="search-input"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.value = 'high';
            // Trigger the change event to update the state
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
            
            // Also trigger a search by updating the URL
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('q', 'high');
            window.history.replaceState({}, '', currentUrl.toString());
          }
        },
      },
      // 2. Search Bar
      {
        selector: '[data-tour="search-input"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Search Bar</h3>
            <p className="mb-3">Type keywords to search across all government data. Try department names, vendor names, program codes, or fund numbers.</p>
            <p className="mb-2 text-sm text-gray-600">The search &apos;high&apos; was added to show you how the search works. You can change it to any term you want!</p>
          </div>
        ),
        position: 'bottom',
      },
      // 3. Type Filter
      {
        selector: '[data-tour="type-filter"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Type Filter</h3>
            <p className="mb-3">Toggle which types of results you want to see: Departments, Vendors, Programs, Funds, or Keywords. You can combine multiple types for broader results.</p>
          </div>
        ),
        position: 'bottom',
      },
      // 4. Exclude Common Words
      {
        selector: '[data-tour="exclude-common"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Exclude Common Words</h3>
            <p className="mb-3">Enable this to ignore common words (like &quot;the&quot;, &quot;of&quot;, &quot;and&quot;) for more relevant results.</p>
          </div>
        ),
        position: 'top',
      },
      // 5. Types Sections (Departments, Vendors, Programs, Funds, Keywords)
      {
        selector: '[data-tour="departments-section"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Result Sections</h3>
            <p className="mb-3">Results are grouped by type: Departments, Vendors, Programs, Funds, and Keywords. Each section shows the most relevant matches for your search.</p>
          </div>
        ),
        position: 'top',
        action: (elem) => { if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
      },
      // 6. Expand/Collapse
      {
        selector: '[data-tour="section-heading-departments-section"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Expand/Collapse</h3>
            <p className="mb-3">Click the arrow to show or hide the results in each section.</p>
          </div>
        ),
        position: 'top',
        action: (elem) => { if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
      },
      // 7. Click a Card for Details
      {
        selector: '[data-tour="result-card-department"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">View Details</h3>
            <p className="mb-3">Click a card to view more details about a department, vendor, program, fund, or keyword.</p>
          </div>
        ),
        position: 'top',
      },
      // 8. Need More Help
      {
        selector: '.floating-tutorial-button',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
            <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
          </div>
        ),
        position: 'left',
      },
    ];
  }

  // Root page tutorial (put this after /search)
  if (pathname === '/') {
    return [
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
  {
    selector: '[data-tour="search-icon"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Quick Search</h3>
        <p className="mb-3">Use the search icon to quickly find departments, vendors, or programs from any page.</p>
      </div>
    ),
    position: 'bottom',
    styles: {
      popover: (base) => ({ ...base, marginTop: '25px' }),
    },
  },
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
    styles: {
      popover: (base) => ({ ...base, marginTop: '25px' }),
    },
    action: (_elem) => {
      const menuButton = document.querySelector('[data-tour="nav-menu"]');
      if (menuButton && !menuButton.getAttribute('aria-expanded')) {
        (menuButton as HTMLElement).click();
      }
    },
  },
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
  }

  // Savings page tutorial
  if (pathname === '/savings') {
    return [
      {
        selector: 'body',
        content: (
          <div>
            <h3 className="text-xl font-bold mb-3">Savings Page Overview</h3>
            <p className="mb-4">This page shows potential savings opportunities identified by the California State Auditor across various government agencies.</p>
          </div>
        ),
        position: 'center',
      },
      {
        selector: '[data-tour="savings-summary"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Savings Summary</h3>
            <p className="mb-3">View the total potential savings of $25 billion and per-taxpayer impact of $1,420.45.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="agency-savings"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Agency-Specific Savings</h3>
            <p className="mb-3">Explore detailed savings opportunities for major agencies like Health Care Services, Transportation, and Corrections.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="additional-savings"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Additional Opportunities</h3>
            <p className="mb-3">Learn about procurement reform, property management, IT modernization, and energy efficiency savings.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '.floating-tutorial-button',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
            <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
          </div>
        ),
        position: 'left',
      },
    ];
  }

  // Payments page tutorial
  if (pathname === '/payments') {
    return [
      {
        selector: 'body',
        content: (
          <div>
            <h3 className="text-xl font-bold mb-3">Payments Page Overview</h3>
            <p className="mb-4">This page displays vendor payment data, showing how much money flows to different contractors and service providers.</p>
          </div>
        ),
        position: 'center',
      },
      {
        selector: '[data-tour="vendor-filter"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Filter Vendors</h3>
            <p className="mb-3">Search for specific vendors or filter by name to find particular contractors.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="vendor-sort"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Sort Data</h3>
            <p className="mb-3">Click column headers to sort vendors by amount, transaction count, or name.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="vendor-details"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Vendor Details</h3>
            <p className="mb-3">Hover over vendor names to see detailed information about departments, programs, and transaction categories.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '.floating-tutorial-button',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
            <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
          </div>
        ),
        position: 'left',
      },
    ];
  }

  // Spend page tutorial
  if (pathname === '/spend') {
    return [
      {
        selector: 'body',
        content: (
          <div>
            <h3 className="text-xl font-bold mb-3">Spend Page Overview</h3>
            <p className="mb-4">This page provides detailed spending analysis with multiple views: vendor spending, budget comparisons, and program analysis.</p>
          </div>
        ),
        position: 'center',
      },
      {
        selector: '[data-tour="view-selector"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">View Options</h3>
            <p className="mb-3">Switch between Vendor, Budget, and Compare views to analyze spending from different perspectives.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="filter-controls"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Filter Data</h3>
            <p className="mb-3">Filter by year, department, vendor, program, or fund to focus on specific spending areas.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="sort-controls"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Sort Results</h3>
            <p className="mb-3">Click column headers to sort spending data by amount, department, vendor, or other criteria.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '.floating-tutorial-button',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
            <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
          </div>
        ),
        position: 'left',
      },
    ];
  }

  // Workforce page tutorial
  if (pathname === '/workforce') {
    return [
      {
        selector: 'body',
        content: (
          <div>
            <h3 className="text-xl font-bold mb-3">Workforce Page Overview</h3>
            <p className="mb-4">This page shows California government workforce data, including employee counts, salaries, and organizational structure.</p>
          </div>
        ),
        position: 'center',
      },
      {
        selector: '[data-tour="department-hierarchy"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Department Hierarchy</h3>
            <p className="mb-3">Navigate through the government organizational structure by clicking on departments to explore their workforce data.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="fiscal-year-selector"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Fiscal Year</h3>
            <p className="mb-3">Select different fiscal years to view workforce data from specific time periods.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="view-mode"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">View Mode</h3>
            <p className="mb-3">Switch between aggregated view (includes subordinates) and parent-only view for different data perspectives.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="workforce-charts"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Data Visualizations</h3>
            <p className="mb-3">View charts showing salary distributions, tenure patterns, and age demographics for selected departments.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '.floating-tutorial-button',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
            <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
          </div>
        ),
        position: 'left',
      },
    ];
  }

  // Regulations page tutorial
  if (pathname === '/regulations') {
    return [
      {
        selector: 'body',
        content: (
          <div>
            <h3 className="text-xl font-bold mb-3">Regulations Page Overview</h3>
            <p className="mb-4">This page shows the regulatory impact on California, including restriction counts, compliance costs, and regulatory growth over time.</p>
          </div>
        ),
        position: 'center',
      },
      {
        selector: '[data-tour="regulatory-impact"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Regulatory Impact Summary</h3>
            <p className="mb-3">View key metrics including total regulatory restrictions, annual compliance costs, and per-employee impact.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="historical-data"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Historical Data</h3>
            <p className="mb-3">Explore how laws and regulations have grown over time from 2010 to 2024.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="agency-distribution"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Agency Distribution</h3>
            <p className="mb-3">See which state agencies are responsible for the most regulatory restrictions.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '.floating-tutorial-button',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
            <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
          </div>
        ),
        position: 'left',
      },
    ];
  }

  // Network page tutorial
  if (pathname === '/network') {
    return [
      {
        selector: 'body',
        content: (
          <div>
            <h3 className="text-xl font-bold mb-3">Network Page Overview</h3>
            <p className="mb-4">This page shows DOGE initiatives across different states and provides information about joining our mailing list.</p>
          </div>
        ),
        position: 'center',
      },
      {
        selector: '[data-tour="mailing-list"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Join Our Mailing List</h3>
            <p className="mb-3">Stay updated with the latest transparency news and California DOGE updates by subscribing to our mailing list.</p>
          </div>
        ),
        position: 'left',
      },
      {
        selector: '[data-tour="state-initiatives"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">State Initiatives</h3>
            <p className="mb-3">Explore DOGE-inspired government efficiency initiatives across different states and their progress.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="network-sources"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Sources</h3>
            <p className="mb-3">Find links to original sources and research materials used for this analysis.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '.floating-tutorial-button',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
            <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
          </div>
        ),
        position: 'left',
      },
    ];
  }

  // About page tutorial
  if (pathname === '/about') {
    return [
      {
        selector: 'body',
        content: (
          <div>
            <h3 className="text-xl font-bold mb-3">About Page Overview</h3>
            <p className="mb-4">Learn about California DOGE&apos;s mission, approach, and how you can get involved in government transparency efforts.</p>
          </div>
        ),
        position: 'center',
      },
      {
        selector: '[data-tour="about-mission"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Our Mission</h3>
            <p className="mb-3">Understand our three-layer approach to analyzing government spending: People, Infrastructure, and Services & IT.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="about-involved"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Get Involved</h3>
            <p className="mb-3">Learn about volunteer opportunities and ways to contribute to government transparency efforts.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '[data-tour="social-links"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Connect With Us</h3>
            <p className="mb-3">Follow us on social media and contribute to our GitHub repository to stay engaged.</p>
          </div>
        ),
        position: 'bottom',
      },
      {
        selector: '.floating-tutorial-button',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
            <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
          </div>
        ),
        position: 'left',
      },
    ];
  }

  // Default tutorial for other pages
  return [
    {
      selector: 'body',
      content: (
        <div>
          <h3 className="text-xl font-bold mb-3">Welcome to California DOGE</h3>
          <p className="mb-4">This page provides additional insights into California government operations and transparency.</p>
        </div>
      ),
      position: 'center',
    },
    {
      selector: '.floating-tutorial-button',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
          <p className="mb-3">You can restart this tutorial at any time by clicking the floating help button.</p>
        </div>
      ),
      position: 'left',
    },
  ];
};

// Inner component that uses the tour hook
function TutorialContent() {
  const { setIsOpen } = useTour();
  const pathname = usePathname();
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if user has seen tutorial for this specific page
    const tutorialSeen = localStorage.getItem(`cali-doge-tutorial-seen-${pathname}`);
    if (tutorialSeen) {
      setHasSeenTutorial(true);
    }
    setIsLoaded(true);
  }, [pathname]);

  const handleTutorialClick = () => {
    console.log('[Tutorial] Starting tutorial for page:', pathname);
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
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/$/, '');
  console.log('TutorialProvider pathname:', pathname, 'normalized:', normalizedPath);
  const tutorialSteps = getTutorialSteps(pathname);

  return (
    <TourProvider
      key={pathname}
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
          backgroundColor: '#2563eb',
          color: '#fff',
          fontWeight: '700',
          fontFamily: 'inherit',
          borderRadius: '9999px',
          fontSize: '20px',
          minWidth: '32px',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
          backgroundColor: '#f3f4f6',
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
        highlightedArea: (base) => ({
          ...base,
          fill: '#f3f4f6',
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
        console.log('[Tutorial] Tour opened for page:', pathname);
      }}
      beforeClose={(_target) => {
        console.log('[Tutorial] Tour closing for page:', pathname);
        // Mark tutorial as seen for this specific page
        localStorage.setItem(`cali-doge-tutorial-seen-${pathname}`, 'true');
      }}
      onClickMask={({ setIsOpen }) => {
        setIsOpen(false);
      }}
      onClickClose={({ setIsOpen }) => {
        setIsOpen(false);
      }}
    >
      <TutorialContent />
    </TourProvider>
  );
} 