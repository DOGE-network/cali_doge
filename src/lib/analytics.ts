import { track as vercelTrack } from '@vercel/analytics';
import { 
  trackEvent as gaTrackEvent,
  trackDepartmentView as gaTrackDepartmentView,
  trackSearch as gaTrackSearch,
  trackFilterApplication as gaTrackFilterApplication,
  trackWorkforceCardClick as gaTrackWorkforceCardClick,
  trackExternalLinkClick as gaTrackExternalLinkClick,
  trackNewsletterSignup as gaTrackNewsletterSignup,
  trackSocialShare as gaTrackSocialShare,
  trackPageView as gaTrackPageView
} from '@/components/GoogleAnalytics';

/**
 * Three-Layer Analytics Interface for California DOGE
 * 
 * Layer 1: Google Analytics (GA4) - Marketing, user behavior, demographics
 * Layer 2: Vercel Analytics - Technical performance, simple event tracking  
 * Layer 3: Web Vitals - Core Web Vitals monitoring and optimization
 * 
 * This approach provides comprehensive insights for government transparency optimization
 */
export const analytics = {
  // Page tracking with performance correlation
  pageView: (pagePath: string, pageTitle?: string) => {
    // GA4: Detailed page tracking with custom dimensions
    gaTrackPageView(pagePath, pageTitle);
    // Vercel: Automatic page view tracking (no manual call needed)
    // Web Vitals: Automatic performance measurement via WebVitalsTracker
  },

  // Department navigation tracking
  departmentView: (departmentName: string, departmentSlug?: string) => {
    // GA4: Detailed department analytics with custom parameters
    gaTrackDepartmentView(departmentName, departmentSlug);
    
    // Vercel: Simple department tracking for performance correlation
    const vercelProps: Record<string, string> = { department: departmentName };
    if (departmentSlug) vercelProps.slug = departmentSlug;
    vercelTrack('Department View', vercelProps);
    
    // Performance context: Track if large datasets affect load times
    analytics.trackPerformanceContext('department_page', { 
      department: departmentName,
      has_large_dataset: ['caltrans', 'cdcr', 'dhcs'].includes(departmentSlug || '')
    });
  },

  // Search functionality tracking
  search: (query: string, resultCount: number, searchType?: string) => {
    // GA4: Comprehensive search analytics with engagement metrics
    gaTrackSearch(query, resultCount, searchType);
    
    // Vercel: Simple search performance tracking
    const vercelProps: Record<string, string | number> = { 
      query: query.substring(0, 50), // Truncate for Vercel limits
      results: resultCount 
    };
    if (searchType) vercelProps.type = searchType;
    vercelTrack('Search', vercelProps);
    
    // Performance context: Track search performance vs result count
    analytics.trackPerformanceContext('search_interaction', {
      result_count_category: resultCount > 100 ? 'large' : resultCount > 20 ? 'medium' : 'small'
    });
  },

  // Filter interactions (department, fiscal year, salary ranges)
  filterApplied: (filterType: string, filterValue: string, department?: string) => {
    // GA4: Detailed filter analytics with department context
    gaTrackFilterApplication(filterType, filterValue, department);
    
    // Vercel: Simple filter tracking for UX optimization
    vercelTrack('Filter Applied', { 
      filter: filterType, 
      value: filterValue.substring(0, 50) // Truncate for Vercel limits
    });
    
    // Performance context: Track if complex filters cause performance issues
    analytics.trackPerformanceContext('filter_interaction', {
      filter_complexity: filterType === 'salary_range' ? 'high' : 'low'
    });
  },

  // Workforce card interactions
  workforceCardClick: (departmentName: string, employeeCount?: number) => {
    // GA4: Detailed workforce engagement tracking
    gaTrackWorkforceCardClick(departmentName, employeeCount);
    
    // Vercel: Simple workforce interaction tracking
    const vercelProps: Record<string, string | number> = { department: departmentName };
    if (employeeCount) vercelProps.employees = employeeCount;
    vercelTrack('Workforce Card Click', vercelProps);
  },

  // External link tracking (government sources, social media)
  externalLinkClick: (url: string, linkContext: string) => {
    // GA4: Comprehensive outbound link tracking
    gaTrackExternalLinkClick(url, linkContext);
    
    // Vercel: Simple external link tracking
    vercelTrack('External Link', { 
      domain: new URL(url).hostname,
      context: linkContext 
    });
  },

  // Newsletter signup conversion tracking
  newsletterSignup: (source: string) => {
    // GA4: Detailed conversion tracking with source attribution
    gaTrackNewsletterSignup(source);
    
    // Vercel: Simple conversion tracking
    vercelTrack('Newsletter Signup', { source });
  },

  // Social media sharing tracking
  socialShare: (platform: string, contentType: string, contentId?: string) => {
    // GA4: Detailed social sharing analytics
    gaTrackSocialShare(platform, contentType, contentId);
    
    // Vercel: Simple social tracking
    const vercelProps: Record<string, string> = { platform, content: contentType };
    if (contentId) vercelProps.id = contentId;
    vercelTrack('Social Share', vercelProps);
  },

  // Budget data interactions
  budgetView: (year: number, department?: string) => {
    const props: Record<string, string | number> = { fiscal_year: year };
    if (department) props.department = department;
    
    // GA4: Detailed budget analytics
    gaTrackEvent('budget_view', props);
    
    // Vercel: Simple budget tracking
    vercelTrack('Budget View', { year: year.toString(), dept: department || 'all' });
  },

  // Vendor data interactions
  vendorView: (vendorName: string, amount?: number) => {
    const props: Record<string, string | number> = { vendor: vendorName };
    if (amount) props.amount = amount;
    
    // GA4: Detailed vendor analytics
    gaTrackEvent('vendor_view', props);
    
    // Vercel: Simple vendor tracking
    vercelTrack('Vendor View', { vendor: vendorName.substring(0, 50) });
  },

  // Program/project interactions
  programView: (programCode: string, programName?: string) => {
    const props: Record<string, string> = { program_code: programCode };
    if (programName) props.program_name = programName;
    
    // GA4: Detailed program analytics
    gaTrackEvent('program_view', props);
    
    // Vercel: Simple program tracking
    vercelTrack('Program View', { code: programCode });
  },

  // User engagement metrics
  timeOnPage: (pagePath: string, timeInSeconds: number) => {
    // GA4: Detailed engagement tracking
    gaTrackEvent('time_on_page', { 
      page: pagePath, 
      duration: timeInSeconds,
      engagement_level: timeInSeconds > 60 ? 'high' : timeInSeconds > 30 ? 'medium' : 'low'
    });
    
    // Vercel: Simple engagement tracking
    if (timeInSeconds > 30) { // Only track meaningful engagement for Vercel
      vercelTrack('Page Engagement', { 
        page: pagePath.substring(0, 50),
        duration: Math.round(timeInSeconds / 10) * 10 // Round to nearest 10 seconds
      });
    }
  },

  // Error tracking
  error: (errorType: string, errorMessage: string, pagePath?: string) => {
    // GA4: Detailed error tracking
    gaTrackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      page_path: pagePath || window.location.pathname
    });
    
    // Vercel: Simple error tracking
    vercelTrack('Error', { 
      type: errorType,
      page: pagePath?.substring(0, 50) || 'unknown'
    });
  },

  // Performance tracking (Web Vitals integration)
  performance: (metric: string, value: number, pagePath?: string) => {
    // Vercel: Performance-focused tracking
    vercelTrack('Performance', { 
      metric,
      value: Math.round(value),
      page: pagePath?.substring(0, 50) || window.location.pathname.substring(0, 50)
    });
    
    // GA4: Core Web Vitals tracking with government data context
    if (['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].includes(metric)) {
      gaTrackEvent('web_vitals', {
        metric_name: metric,
        metric_value: value,
        page_path: pagePath || window.location.pathname,
        performance_grade: getPerformanceGrade(metric, value),
        page_type: getPageType(pagePath || window.location.pathname)
      });
    }
  },

  // Performance context tracking for correlation analysis
  trackPerformanceContext: (interactionType: string, context: Record<string, any>) => {
    // Store context for correlating with Web Vitals data
    if (typeof window !== 'undefined') {
      window.performanceContext = window.performanceContext || [];
      window.performanceContext.push({
        timestamp: Date.now(),
        interaction: interactionType,
        context,
        page: window.location.pathname
      });
      
      // Keep only last 10 interactions to avoid memory issues
      if (window.performanceContext.length > 10) {
        window.performanceContext = window.performanceContext.slice(-10);
      }
    }
  }
};

// Helper functions for Web Vitals analysis
function getPerformanceGrade(metric: string, value: number): string {
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 }
  };
  
  const threshold = thresholds[metric];
  if (!threshold) return 'unknown';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs_improvement';
  return 'poor';
}

function getPageType(pagePath: string): string {
  if (pagePath.includes('/departments/')) return 'department';
  if (pagePath.includes('/search')) return 'search';
  if (pagePath.includes('/budget')) return 'budget';
  if (pagePath.includes('/vendors')) return 'vendors';
  if (pagePath.includes('/workforce')) return 'workforce';
  if (pagePath === '/') return 'homepage';
  return 'other';
}

// Extend window interface for performance context
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    performanceContext?: Array<{
      timestamp: number;
      interaction: string;
      context: Record<string, any>;
      page: string;
    }>;
  }
}

// Hook for tracking page views in Next.js App Router
export const usePageTracking = () => {
  if (typeof window !== 'undefined') {
    // Track page view on mount
    analytics.pageView(window.location.pathname, document.title);
  }
};

// Utility for tracking Core Web Vitals (called by WebVitalsTracker)
export const trackWebVitals = (metric: any) => {
  analytics.performance(metric.name, metric.value, window.location.pathname);
}; 