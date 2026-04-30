import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'

interface ErrorElementProps {
  error?: Error
  resetError?: () => void
}

export function ErrorElement({ error, resetError }: ErrorElementProps) {
  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          Dashboard Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Something went wrong while loading the dashboard. Please try refreshing the page.
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-500 dark:text-gray-400 mb-2">
              Error Details (Development)
            </summary>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        
        <div className="flex gap-2">
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
          >
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
