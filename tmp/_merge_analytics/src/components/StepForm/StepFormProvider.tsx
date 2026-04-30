import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { RoiValues } from '../../lib/schema'
import { RoiSchema } from '../../lib/validation'

export interface StepFormContextType {
  currentStep: number
  totalSteps: number
  data: Partial<RoiValues>
  errors: Record<string, string>
  isValid: boolean
  isStepValid: boolean
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateData: (data: Partial<RoiValues>) => void
  setErrors: (errors: Record<string, string>) => void
  reset: () => void
}

const StepFormContext = createContext<StepFormContextType | null>(null)

export interface StepFormProviderProps {
  children: React.ReactNode
  totalSteps: number
  initialData?: Partial<RoiValues>
  onStepChange?: (step: number) => void
  onDataChange?: (data: Partial<RoiValues>) => void
}

export function StepFormProvider({
  children,
  totalSteps,
  initialData = {},
  onStepChange,
  onDataChange,
}: StepFormProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Initialize step from URL hash
  const getInitialStep = () => {
    const hash = location.hash
    const match = hash.match(/#step=(\d+)/)
    return match ? Math.max(0, Math.min(parseInt(match[1], 10), totalSteps - 1)) : 0
  }

  const [currentStep, setCurrentStep] = useState(getInitialStep)
  const [data, setData] = useState<Partial<RoiValues>>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update URL hash when step changes
  useEffect(() => {
    const newHash = `#step=${currentStep}`
    if (location.hash !== newHash) {
      navigate(newHash, { replace: true })
    }
  }, [currentStep, location.hash, navigate])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        nextStep()
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        prevStep()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [nextStep, prevStep])

  // Validate current step fields
  const getStepFields = (step: number): (keyof RoiValues)[] => {
    const stepFields: Record<number, (keyof RoiValues)[]> = {
      0: ['purchasePrice', 'downPct', 'rentMonthly'], // Property info
      1: ['interestPct', 'years', 'taxPct', 'insuranceMonthly', 'hoaMonthly'], // Financing
      2: ['mgmtPct', 'maintPct', 'vacancyPct', 'expensesMonthly'], // Operating
    }
    return stepFields[step] || []
  }

  const validateCurrentStep = useCallback(() => {
    const stepFields = getStepFields(currentStep)
    const stepData: Partial<RoiValues> = {}
    
    stepFields.forEach(field => {
      if (data[field] !== undefined) {
        stepData[field] = data[field]
      }
    })

    const result = RoiSchema.partial().safeParse(stepData)
    return result.success
  }, [currentStep, data])

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
      onStepChange?.(step)
    }
  }, [totalSteps, onStepChange])

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1 && validateCurrentStep()) {
      const next = currentStep + 1
      setCurrentStep(next)
      onStepChange?.(next)
    }
  }, [currentStep, totalSteps, onStepChange, validateCurrentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1
      setCurrentStep(prev)
      onStepChange?.(prev)
    }
  }, [currentStep, onStepChange])

  const updateData = useCallback((newData: Partial<RoiValues>) => {
    setData(prev => {
      const updated = { ...prev, ...newData }
      onDataChange?.(updated)
      return updated
    })
  }, [onDataChange])

  const reset = useCallback(() => {
    setCurrentStep(0)
    setData(initialData)
    setErrors({})
    navigate('#step=0', { replace: true })
  }, [initialData, navigate])

  const isValid = Object.keys(errors).length === 0
  const isStepValid = validateCurrentStep()

  const value: StepFormContextType = {
    currentStep,
    totalSteps,
    data,
    errors,
    isValid,
    isStepValid,
    goToStep,
    nextStep,
    prevStep,
    updateData,
    setErrors,
    reset,
  }

  return (
    <StepFormContext.Provider value={value}>
      {children}
    </StepFormContext.Provider>
  )
}

export function useStepForm(): StepFormContextType {
  const context = useContext(StepFormContext)
  if (!context) {
    throw new Error('useStepForm must be used within a StepFormProvider')
  }
  return context
}
