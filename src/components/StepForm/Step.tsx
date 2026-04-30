import React from 'react'
import { useStepForm } from './StepFormProvider'

export interface StepProps {
  step: number
  children: React.ReactNode
  className?: string
}

export function Step({ step, children, className = '' }: StepProps) {
  const { currentStep } = useStepForm()

  if (currentStep !== step) {
    return null
  }

  return (
    <div className={`step-${step} ${className}`}>
      {children}
    </div>
  )
}

export interface StepContainerProps {
  children: React.ReactNode
  className?: string
}

export function StepContainer({ children, className = '' }: StepContainerProps) {
  return (
    <div className={`step-container ${className}`}>
      {children}
    </div>
  )
}
