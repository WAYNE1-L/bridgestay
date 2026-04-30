import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ReportHeaderProps {
  propertyAddress: string
  analysisDate: string
  summaryBadges: Array<{
    label: string
    value: string
    icon?: ReactNode
  }>
  actions?: ReactNode
  className?: string
}

export function ReportHeader({ 
  propertyAddress, 
  analysisDate, 
  summaryBadges, 
  actions,
  className 
}: ReportHeaderProps) {
  return (
    <div className={cn('flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8', className)}>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Property Investment Report
        </h1>
        <div className="space-y-1">
          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
            {propertyAddress}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analysis Date: {analysisDate}
          </p>
        </div>
      </div>
      
      <div className="flex flex-col lg:items-end gap-4">
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryBadges.map((badge, index) => (
            <div key={index} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {badge.label}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabnums">
                {badge.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
