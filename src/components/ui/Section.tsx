import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  title: string
  desc?: string
  accent?: 'blue' | 'green' | 'purple'
  children: ReactNode
  className?: string
}

const accentColors = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  purple: 'border-l-purple-500',
}

export function Section({ title, desc, accent = 'blue', children, className }: SectionProps) {
  return (
    <div className={cn('section border-l-4 pl-4 mb-6', accentColors[accent], className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {title}
        </h3>
        {desc && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {desc}
          </p>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}
