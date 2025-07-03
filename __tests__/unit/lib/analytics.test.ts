// Mock the dependencies
jest.mock('@vercel/analytics', () => ({
  track: jest.fn()
}));

jest.mock('@/components/GoogleAnalytics', () => ({
  trackEvent: jest.fn(),
  trackDepartmentView: jest.fn(),
  trackSearch: jest.fn(),
  trackFilterApplication: jest.fn(),
  trackWorkforceCardClick: jest.fn(),
  trackExternalLinkClick: jest.fn(),
  trackNewsletterSignup: jest.fn(),
  trackSocialShare: jest.fn(),
  trackPageView: jest.fn()
}));

describe('Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window object for browser environment
    Object.defineProperty(global, 'window', {
      value: {
        location: { pathname: '/test' },
        performanceContext: []
      },
      writable: true
    });
  });

  describe('pageView', () => {
    it('tracks page view with title', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackPageView } = require('@/components/GoogleAnalytics');
      
      analytics.pageView('/test-page', 'Test Page');
      
      expect(trackPageView).toHaveBeenCalledWith('/test-page', 'Test Page');
    });

    it('tracks page view without title', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackPageView } = require('@/components/GoogleAnalytics');
      
      analytics.pageView('/test-page');
      
      expect(trackPageView).toHaveBeenCalledWith('/test-page', undefined);
    });
  });

  describe('departmentView', () => {
    it('tracks department view with slug', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackDepartmentView } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.departmentView('Test Department', 'test-dept');
      
      expect(trackDepartmentView).toHaveBeenCalledWith('Test Department', 'test-dept');
      expect(track).toHaveBeenCalledWith('Department View', {
        department: 'Test Department',
        slug: 'test-dept'
      });
    });

    it('tracks department view without slug', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackDepartmentView } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.departmentView('Test Department');
      
      expect(trackDepartmentView).toHaveBeenCalledWith('Test Department', undefined);
      expect(track).toHaveBeenCalledWith('Department View', {
        department: 'Test Department'
      });
    });
  });

  describe('search', () => {
    it('tracks search with all parameters', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackSearch } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.search('test query', 25, 'departments');
      
      expect(trackSearch).toHaveBeenCalledWith('test query', 25, 'departments');
      expect(track).toHaveBeenCalledWith('Search', {
        query: 'test query',
        results: 25,
        type: 'departments'
      });
    });

    it('tracks search without search type', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackSearch } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.search('test query', 25);
      
      expect(trackSearch).toHaveBeenCalledWith('test query', 25, undefined);
      expect(track).toHaveBeenCalledWith('Search', {
        query: 'test query',
        results: 25
      });
    });

    it('truncates long queries for Vercel', () => {
      const { analytics } = require('@/lib/analytics');
      const { track } = require('@vercel/analytics');
      
      const longQuery = 'a'.repeat(100);
      analytics.search(longQuery, 25);
      
      expect(track).toHaveBeenCalledWith('Search', {
        query: longQuery.substring(0, 50),
        results: 25
      });
    });
  });

  describe('filterApplied', () => {
    it('tracks filter application with department', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackFilterApplication } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.filterApplied('department', 'Test Dept', 'test-dept');
      
      expect(trackFilterApplication).toHaveBeenCalledWith('department', 'Test Dept', 'test-dept');
      expect(track).toHaveBeenCalledWith('Filter Applied', {
        filter: 'department',
        value: 'Test Dept'
      });
    });

    it('tracks filter application without department', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackFilterApplication } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.filterApplied('year', '2023');
      
      expect(trackFilterApplication).toHaveBeenCalledWith('year', '2023', undefined);
      expect(track).toHaveBeenCalledWith('Filter Applied', {
        filter: 'year',
        value: '2023'
      });
    });
  });

  describe('workforceCardClick', () => {
    it('tracks workforce card click with employee count', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackWorkforceCardClick } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.workforceCardClick('Test Department', 1000);
      
      expect(trackWorkforceCardClick).toHaveBeenCalledWith('Test Department', 1000);
      expect(track).toHaveBeenCalledWith('Workforce Card Click', {
        department: 'Test Department',
        employees: 1000
      });
    });

    it('tracks workforce card click without employee count', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackWorkforceCardClick } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.workforceCardClick('Test Department');
      
      expect(trackWorkforceCardClick).toHaveBeenCalledWith('Test Department', undefined);
      expect(track).toHaveBeenCalledWith('Workforce Card Click', {
        department: 'Test Department'
      });
    });
  });

  describe('externalLinkClick', () => {
    it('tracks external link click', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackExternalLinkClick } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.externalLinkClick('https://example.com', 'government');
      
      expect(trackExternalLinkClick).toHaveBeenCalledWith('https://example.com', 'government');
      expect(track).toHaveBeenCalledWith('External Link', {
        domain: 'example.com',
        context: 'government'
      });
    });
  });

  describe('newsletterSignup', () => {
    it('tracks newsletter signup', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackNewsletterSignup } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.newsletterSignup('footer');
      
      expect(trackNewsletterSignup).toHaveBeenCalledWith('footer');
      expect(track).toHaveBeenCalledWith('Newsletter Signup', { source: 'footer' });
    });
  });

  describe('socialShare', () => {
    it('tracks social share with content ID', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackSocialShare } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.socialShare('twitter', 'department', 'dept-123');
      
      expect(trackSocialShare).toHaveBeenCalledWith('twitter', 'department', 'dept-123');
      expect(track).toHaveBeenCalledWith('Social Share', {
        platform: 'twitter',
        content: 'department',
        id: 'dept-123'
      });
    });

    it('tracks social share without content ID', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackSocialShare } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.socialShare('facebook', 'page');
      
      expect(trackSocialShare).toHaveBeenCalledWith('facebook', 'page', undefined);
      expect(track).toHaveBeenCalledWith('Social Share', {
        platform: 'facebook',
        content: 'page'
      });
    });
  });

  describe('budgetView', () => {
    it('tracks budget view with department', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.budgetView(2023, 'test-dept');
      
      expect(trackEvent).toHaveBeenCalledWith('budget_view', {
        fiscal_year: 2023,
        department: 'test-dept'
      });
      expect(track).toHaveBeenCalledWith('Budget View', {
        year: '2023',
        dept: 'test-dept'
      });
    });

    it('tracks budget view without department', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.budgetView(2023);
      
      expect(trackEvent).toHaveBeenCalledWith('budget_view', {
        fiscal_year: 2023
      });
      expect(track).toHaveBeenCalledWith('Budget View', {
        year: '2023',
        dept: 'all'
      });
    });
  });

  describe('vendorView', () => {
    it('tracks vendor view with amount', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.vendorView('Test Vendor', 1000000);
      
      expect(trackEvent).toHaveBeenCalledWith('vendor_view', {
        vendor: 'Test Vendor',
        amount: 1000000
      });
      expect(track).toHaveBeenCalledWith('Vendor View', {
        vendor: 'Test Vendor'
      });
    });

    it('tracks vendor view without amount', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.vendorView('Test Vendor');
      
      expect(trackEvent).toHaveBeenCalledWith('vendor_view', {
        vendor: 'Test Vendor'
      });
      expect(track).toHaveBeenCalledWith('Vendor View', {
        vendor: 'Test Vendor'
      });
    });

    it('truncates long vendor names for Vercel', () => {
      const { analytics } = require('@/lib/analytics');
      const { track } = require('@vercel/analytics');
      
      const longVendorName = 'a'.repeat(100);
      analytics.vendorView(longVendorName);
      
      expect(track).toHaveBeenCalledWith('Vendor View', {
        vendor: longVendorName.substring(0, 50)
      });
    });
  });

  describe('programView', () => {
    it('tracks program view with name', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.programView('PROG123', 'Test Program');
      
      expect(trackEvent).toHaveBeenCalledWith('program_view', {
        program_code: 'PROG123',
        program_name: 'Test Program'
      });
      expect(track).toHaveBeenCalledWith('Program View', {
        code: 'PROG123'
      });
    });

    it('tracks program view without name', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.programView('PROG123');
      
      expect(trackEvent).toHaveBeenCalledWith('program_view', {
        program_code: 'PROG123'
      });
      expect(track).toHaveBeenCalledWith('Program View', {
        code: 'PROG123'
      });
    });
  });

  describe('timeOnPage', () => {
    it('tracks time on page with high engagement', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.timeOnPage('/test-page', 120);
      
      expect(trackEvent).toHaveBeenCalledWith('time_on_page', {
        page: '/test-page',
        duration: 120,
        engagement_level: 'high'
      });
      expect(track).toHaveBeenCalledWith('Page Engagement', {
        page: '/test-page',
        duration: 120
      });
    });

    it('tracks time on page with low engagement', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.timeOnPage('/test-page', 15);
      
      expect(trackEvent).toHaveBeenCalledWith('time_on_page', {
        page: '/test-page',
        duration: 15,
        engagement_level: 'low'
      });
      expect(track).not.toHaveBeenCalledWith('Page Engagement', expect.anything());
    });
  });

  describe('error', () => {
    it('tracks error with page path', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.error('api_error', 'Failed to fetch data', '/test-page');
      
      expect(trackEvent).toHaveBeenCalledWith('error', {
        error_type: 'api_error',
        error_message: 'Failed to fetch data',
        page_path: '/test-page'
      });
      expect(track).toHaveBeenCalledWith('Error', {
        type: 'api_error',
        page: '/test-page'
      });
    });

    it('tracks error without page path', () => {
      const { analytics } = require('@/lib/analytics');
      const { trackEvent } = require('@/components/GoogleAnalytics');
      const { track } = require('@vercel/analytics');
      
      analytics.error('api_error', 'Failed to fetch data');
      
      expect(trackEvent).toHaveBeenCalledWith('error', {
        error_type: 'api_error',
        error_message: 'Failed to fetch data',
        page_path: '/test'
      });
      expect(track).toHaveBeenCalledWith('Error', {
        type: 'api_error',
        page: 'unknown'
      });
    });
  });
}); 