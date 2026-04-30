import React from 'react'
import { captureErrorBoundaryError } from '../../lib/errorLogger'

interface AppErrorBoundaryProps {
  error: Error | string | unknown
  reset: () => void
}

export function AppErrorBoundary({ error, reset }: AppErrorBoundaryProps) {
  // Capture error for logging
  React.useEffect(() => {
    if (error instanceof Error) {
      captureErrorBoundaryError(error, {
        componentStack: 'AppErrorBoundary',
        errorBoundaryName: 'AppErrorBoundary',
      })
    }
  }, [error])

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        An unexpected error occurred while processing your request.
      </p>
      <pre className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm text-gray-600 dark:text-gray-400 overflow-auto">
        {String(error?.message || error)}
      </pre>
      <button 
        className="mt-4 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={reset}
      >
        Reload Page
      </button>
    </div>
  )
}
