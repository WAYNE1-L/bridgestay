import React from 'react'
import { FileX, BarChart3, TrendingUp, PieChart } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: 'chart' | 'data' | 'trend' | 'pie' | 'file'
  action?: React.ReactNode
  className?: string
}

const iconMap = {
  chart: BarChart3,
  data: TrendingUp,
  trend: TrendingUp,
  pie: PieChart,
  file: FileX,
}

export function EmptyState({ 
  title, 
  description, 
  icon = 'chart', 
  action,
  className = '' 
}: EmptyStateProps) {
  const IconComponent = iconMap[icon]

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="mb-4 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
        <IconComponent className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      
      <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      
      {description && (
        <p className="mb-4 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  )
}