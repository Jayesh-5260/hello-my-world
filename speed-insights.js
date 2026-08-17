/**
 * Vercel Speed Insights Initialization
 * 
 * This script initializes Vercel Speed Insights for tracking web vitals
 * and performance metrics on this site.
 * 
 * This uses the ES Module from the @vercel/speed-insights package.
 */

import { injectSpeedInsights } from './speed-insights-dist/index.mjs';

// Initialize Speed Insights
// This will automatically track Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
injectSpeedInsights({
  // Enable debug mode in development (shows console logs)
  debug: false,
  
  // Sample rate: 1.0 = 100% of events are sent
  sampleRate: 1.0,
  
  // Framework identifier for analytics
  framework: 'vanilla'
});

console.log('✅ Vercel Speed Insights initialized');
