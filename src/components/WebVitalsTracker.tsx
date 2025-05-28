'use client';

import { useEffect } from 'react';
import { trackWebVitals } from '@/lib/analytics';

/**
 * Web Vitals Tracker for California DOGE
 * 
 * Monitors Core Web Vitals to optimize government transparency site performance:
 * - LCP: How fast department/budget pages load
 * - INP: How responsive search and filters feel (replaces FID)
 * - CLS: How stable data visualizations are
 * - FCP: How quickly users see initial content
 * - TTFB: Server response time for large datasets
 */
export default function WebVitalsTracker() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Dynamically import web-vitals to avoid SSR issues
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      // Track Core Web Vitals for government data optimization
      
      // Largest Contentful Paint - Critical for department pages with large datasets
      onLCP((metric) => {
        trackWebVitals(metric);
        
        // Log performance issues for debugging
        if (metric.value > 2500) { // Poor LCP threshold
          console.warn(`Slow page load detected: ${metric.value}ms on ${window.location.pathname}`);
        }
      });

      // Interaction to Next Paint - Important for search and filter responsiveness
      onINP((metric) => {
        trackWebVitals(metric);
        
        // Log interaction delays
        if (metric.value > 200) { // Poor INP threshold
          console.warn(`Slow interaction detected: ${metric.value}ms delay`);
        }
      });

      // Cumulative Layout Shift - Critical for data tables and charts
      onCLS((metric) => {
        trackWebVitals(metric);
        
        // Log layout stability issues
        if (metric.value > 0.1) { // Poor CLS threshold
          console.warn(`Layout shift detected: ${metric.value} on ${window.location.pathname}`);
        }
      });

      // First Contentful Paint - User perception of loading speed
      onFCP((metric) => {
        trackWebVitals(metric);
      });

      // Time to First Byte - Server performance for large government datasets
      onTTFB((metric) => {
        trackWebVitals(metric);
        
        // Log server performance issues
        if (metric.value > 800) { // Poor TTFB threshold
          console.warn(`Slow server response: ${metric.value}ms for ${window.location.pathname}`);
        }
      });

    }).catch((error) => {
      console.warn('Failed to load web-vitals library:', error);
    });
  }, []);

  // This component doesn't render anything visible
  return null;
} 