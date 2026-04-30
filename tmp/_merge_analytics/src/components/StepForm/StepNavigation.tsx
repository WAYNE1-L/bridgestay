import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { useStepForm } from './StepFormProvider'

export interface StepNavigationProps {
  onNext?: () => void
  onPrev?: () => void
  nextLabel?: string
  prevLabel?: string
  showNext?: boolean
  showPrev?: boolean
  nextDisabled?: boolean
  prevDisabled?: boolean
  className?: string
}

export function StepNavigation({
  onNext,
  onPrev,
  nextLabel = 'Next',
  prevLabel = 'Previous',
  showNext = true,
  showPrev = true,
  nextDisabled = false,
  prevDisabled = false,
  className = '',
}: StepNavigationProps) {
  const { currentStep, totalSteps, nextStep, prevStep } = useStepForm()

  const handleNext = () => {
    if (onNext) {
      onNext()
    } else {
      nextStep()
    }
  }

  const handlePrev = () => {
    if (onPrev) {
      onPrev()
    } else {
      prevStep()
    }
  }

  const isLastStep = currentStep === totalSteps - 1
  const isFirstStep = currentStep === 0

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {showPrev && !isFirstStep && (
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={prevDisabled}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {prevLabel}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showNext && !isLastStep && (
          <Button
            onClick={handleNext}
            disabled={nextDisabled}
            className="flex items-center gap-2"
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export interface StepProgressProps {
  className?: string
}

export function StepProgress({ className = '' }: StepProgressProps) {
  const { currentStep, totalSteps } = useStepForm()

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
        </span>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )
}
