import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  iconColor?: string
  iconBgColor?: string
}

export function FeatureCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-50'
}: FeatureCardProps) {
  return (
    <a
      href={href}
      className={cn(
        'group relative block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm',
        'transition-all duration-200 ease-in-out',
        'hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-gray-900/50'
      )}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Icon */}
        <div className={cn(
          'flex items-center justify-center w-12 h-12 rounded-xl transition-colors duration-200',
          iconBgColor,
          'group-hover:scale-110'
        )}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
        
        {/* Arrow indicator */}
        <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Get Started
          <svg className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </a>
  )
}
