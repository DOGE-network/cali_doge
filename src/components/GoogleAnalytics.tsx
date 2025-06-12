'use client';

import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    gtag: (
      _command: 'config' | 'event' | 'js' | 'consent',
      _targetId: string | Date | 'default' | 'update',
      _config?: {
        [key: string]: any;
      }
    ) => void;
    dataLayer: any[];
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
  enableDevelopment?: boolean;
}

export default function GoogleAnalytics({ 
  measurementId, 
  enableDevelopment = false 
}: GoogleAnalyticsProps) {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldLoadGA = isProduction || enableDevelopment;

  useEffect(() => {
    if (!shouldLoadGA) return;
    console.log('Google Analytics initializing with ID:', measurementId, 'isProduction:', isProduction, 'shouldLoadGA:', shouldLoadGA);
    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    // Set up gtag function
    window.gtag = gtag;
    // Configure marketing-focused settings for social media and newsletter growth
    gtag('js', new Date());
    gtag('config', measurementId, {
      anonymize_ip: false,
      allow_google_signals: true,
      allow_ad_personalization_signals: true,
      restricted_data_processing: false,
      send_page_view: true,
      debug_mode: !isProduction,
      enhanced_conversions: true,
      automatic_screen_view: true,
      custom_map: {
        'custom_parameter_1': 'department',
        'custom_parameter_2': 'data_type',
        'custom_parameter_3': 'search_query',
        'custom_parameter_4': 'fiscal_year',
        'custom_parameter_5': 'user_engagement_level'
      }
    });
    // Track initial page view with enhanced context
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      content_group1: 'government_transparency',
      content_group2: 'california_doge',
    });
  }, [measurementId, shouldLoadGA, isProduction]);

  if (!shouldLoadGA) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        async
      />
    </>
  );
}

// Utility functions for tracking custom events
export const trackEvent = (
  eventName: string,
  parameters?: {
    [key: string]: any;
  }
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      // Default parameters for government transparency context
      content_group1: 'government_transparency',
      content_group2: 'california_doge',
      ...parameters,
    });
  }
};

// Specific tracking functions for California DOGE
export const trackDepartmentView = (departmentName: string, departmentSlug?: string) => {
  trackEvent('department_view', {
    department: departmentName,
    department_slug: departmentSlug,
    custom_parameter_1: departmentName,
    event_category: 'navigation',
    event_label: departmentName,
  });
};

export const trackSearch = (query: string, resultCount: number, searchType?: string) => {
  trackEvent('search', {
    search_term: query,
    search_results: resultCount,
    search_type: searchType || 'general',
    custom_parameter_3: query,
    event_category: 'engagement',
    event_label: query,
    value: resultCount, // Use result count as event value
  });
};

export const trackFilterApplication = (filterType: string, filterValue: string, department?: string) => {
  trackEvent('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
    department: department,
    custom_parameter_2: filterType,
    event_category: 'interaction',
    event_label: `${filterType}: ${filterValue}`,
  });
};

export const trackWorkforceCardClick = (departmentName: string, employeeCount?: number) => {
  trackEvent('workforce_card_click', {
    department: departmentName,
    employee_count: employeeCount,
    custom_parameter_1: departmentName,
    event_category: 'engagement',
    event_label: departmentName,
    value: employeeCount,
  });
};

export const trackExternalLinkClick = (url: string, linkContext: string) => {
  trackEvent('external_link_click', {
    link_url: url,
    link_context: linkContext,
    event_category: 'outbound',
    event_label: url,
  });
};

export const trackNewsletterSignup = (source: string) => {
  trackEvent('newsletter_signup', {
    signup_source: source,
    event_category: 'conversion',
    event_label: source,
    value: 1, // Conversion value
  });
};

export const trackSocialShare = (platform: string, contentType: string, contentId?: string) => {
  trackEvent('social_share', {
    platform: platform,
    content_type: contentType,
    content_id: contentId,
    event_category: 'social',
    event_label: `${platform}: ${contentType}`,
  });
};

export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!, {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
  }
}; 