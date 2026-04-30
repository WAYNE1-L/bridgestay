import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface KeyValueProps {
  label: string
  value: ReactNode
  tone?: 'positive' | 'negative' | 'neutral'
  className?: string
}

const toneColors = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-gray-900 dark:text-gray-100',
}

export function KeyValue({ label, value, tone = 'neutral', className }: KeyValueProps) {
  return (
    <div className={cn('grid grid-cols-[1fr_auto] gap-x-4 tabnums', className)}>
      <dt className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </dt>
      <dd className={cn('text-sm font-semibold text-right', toneColors[tone])}>
        {value}
      </dd>
    </div>
  )
}
