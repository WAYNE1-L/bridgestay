/**
 * Dynamic import utilities for code splitting
 * Helps reduce initial bundle size by loading heavy libraries on demand
 */

// PDF generation - only load when needed
export const loadPDFLibrary = () => import('jspdf')

// Canvas manipulation - only load when needed  
export const loadCanvasLibrary = () => import('html2canvas-pro')

// Chart libraries - only load when needed
export const loadChartLibraries = () => import('recharts')

// Export utilities - only load when needed
export const loadExportUtilities = () => Promise.all([
  import('jspdf'),
  import('html2canvas-pro')
])

// Monitoring - only load when needed
export const loadMonitoring = () => import('@sentry/react')

// Services - only load when needed
export const loadServices = () => Promise.all([
  import('@supabase/supabase-js'),
  import('@stripe/stripe-js')
])

/**
 * Preload critical resources
 * Call this after initial page load to improve subsequent navigation
 */
export const preloadCriticalResources = () => {
  // Preload chart libraries since they're commonly used
  loadChartLibraries().catch(() => {
    // Silently fail if preloading doesn't work
  })
}

/**
 * Preload non-critical resources
 * Call this when user is idle to improve performance
 */
export const preloadNonCriticalResources = () => {
  // Preload PDF and canvas libraries in background
  loadExportUtilities().catch(() => {
    // Silently fail if preloading doesn't work
  })
}

/**
 * Load resources based on user interaction
 * Call this when user shows intent to use specific features
 */
export const loadResourcesOnIntent = {
  // Load PDF generation when user clicks export
  onExportClick: loadPDFLibrary,
  
  // Load canvas manipulation when user clicks screenshot
  onScreenshotClick: loadCanvasLibrary,
  
  // Load charts when user navigates to dashboard
  onDashboardNavigation: loadChartLibraries,
  
  // Load services when user tries to authenticate
  onAuthIntent: loadServices,
}
