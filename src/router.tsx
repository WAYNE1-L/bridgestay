import { createBrowserRouter } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Loading } from '../components/ui/Loading'
import { ErrorElement } from '../components/ErrorElement'

// Lazy load all pages
const HomePage = lazy(() => import('../pages/HomePage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const RoiPage = lazy(() => import('../pages/RoiPage'))
const ReportsPage = lazy(() => import('../pages/ReportsPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

export const router = createBrowserRouter([
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
