import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { Loading } from './components/ui/Loading'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ErrorElement } from './components/ErrorElement'
import { initializeErrorLogger, reportWebVitals } from './lib/errorLogger'
import { preloadCriticalResources, preloadNonCriticalResources } from './lib/dynamicImports'
import './lib/i18n'

// Lazy load all pages
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const RoiPage = lazy(() => import('./pages/RoiPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SubleasePage = lazy(() => import('./pages/SubleasePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorElement />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading message="Loading home..." />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<Loading message="Loading dashboard..." />}>
            <DashboardPage />
          </Suspense>
        ),
        errorElement: <ErrorElement />,
      },
      {
        path: 'roi',
        element: (
          <Suspense fallback={<Loading message="Loading calculator..." />}>
            <RoiPage />
          </Suspense>
        ),
        errorElement: <ErrorElement />,
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<Loading message="Loading reports..." />}>
            <ReportsPage />
          </Suspense>
        ),
        errorElement: <ErrorElement />,
      },
      {
        path: 'sublease',
        element: (
          <Suspense fallback={<Loading message="Loading sublease calculator..." />}>
            <SubleasePage />
          </Suspense>
        ),
        errorElement: <ErrorElement />,
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<Loading message="Loading..." />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
])

export default function App() {
  // Initialize error logging
  useEffect(() => {
    initializeErrorLogger()
    
    // Set up web vitals reporting
    if ('web-vital' in window) {
      import('web-vitals').then((webVitals) => {
        if (webVitals.onCLS) webVitals.onCLS(reportWebVitals)
        if (webVitals.onFID) webVitals.onFID(reportWebVitals)
        if (webVitals.onFCP) webVitals.onFCP(reportWebVitals)
        if (webVitals.onLCP) webVitals.onLCP(reportWebVitals)
        if (webVitals.onTTFB) webVitals.onTTFB(reportWebVitals)
      }).catch(() => {
        // web-vitals not available, skip
      })
    }

    // Preload critical resources after initial load
    const timer = setTimeout(() => {
      preloadCriticalResources()
    }, 2000)

    // Preload non-critical resources when user is idle
    const idleTimer = setTimeout(() => {
      preloadNonCriticalResources()
    }, 10000)

    return () => {
      clearTimeout(timer)
      clearTimeout(idleTimer)
    }
  }, [])

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}