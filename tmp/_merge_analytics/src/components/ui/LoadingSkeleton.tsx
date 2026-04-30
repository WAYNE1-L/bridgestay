import { Card, CardContent, CardHeader } from './card'

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <LoadingSkeleton className="h-6 w-32" />
        <LoadingSkeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <LoadingSkeleton className="h-8 w-24 mb-4" />
        <LoadingSkeleton className="h-4 w-full mb-2" />
        <LoadingSkeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <LoadingSkeleton className="h-4 w-32" />
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="h-4 w-20" />
          <LoadingSkeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <LoadingSkeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <LoadingSkeleton className="h-8 w-32" />
        </div>
      </CardContent>
    </Card>
  )
}
