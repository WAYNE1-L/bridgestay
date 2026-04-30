import React, { useState, useEffect, useRef } from 'react'
import { Input } from '../ui/input'
import { parseNumber, formatNumber } from '../../lib/number'

export interface NumberInputProps {
  value: number | null
  onValue: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  suffix?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
  'aria-describedby'?: string
}

export function NumberInput({
  value,
  onValue,
  min,
  max,
  step = 1,
  placeholder,
  suffix,
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Update display value when external value changes
  useEffect(() => {
    if (value === null) {
      setDisplayValue('')
    } else {
      setDisplayValue(formatNumber(value, 0))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // Allow only digits, dots, commas, and minus sign
    if (!/^[0-9,.-]*$/.test(inputValue)) {
      return
    }
    
    setDisplayValue(inputValue)
  }

  const handleBlur = () => {
    const parsed = parseNumber(displayValue)
    
    if (parsed === null) {
      // Invalid input, reset to current value
      if (value === null) {
        setDisplayValue('')
      } else {
        setDisplayValue(formatNumber(value, 0))
      }
      return
    }
    
    // Apply min/max constraints
    let finalValue = parsed
    if (min !== undefined) finalValue = Math.max(finalValue, min)
    if (max !== undefined) finalValue = Math.min(finalValue, max)
    
    // Update display with formatted value
    setDisplayValue(formatNumber(finalValue, 0))
    
    // Notify parent of the final value
    onValue(finalValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    
    // Handle arrow keys for step adjustment
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      
      const currentValue = parseNumber(displayValue) || 0
      const direction = e.key === 'ArrowUp' ? 1 : -1
      const newValue = currentValue + (direction * step)
      
      // Apply constraints
      let finalValue = newValue
      if (min !== undefined) finalValue = Math.max(finalValue, min)
      if (max !== undefined) finalValue = Math.min(finalValue, max)
      
      setDisplayValue(formatNumber(finalValue, 0))
      onValue(finalValue)
    }
    
    // Handle Enter key to commit changes
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
      inputRef.current?.blur()
    }
  }

  const handleFocus = () => {
    // Select all text on focus for easy editing
    inputRef.current?.select()
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={`${className} ${suffix ? 'pr-8' : ''}`}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
          {suffix}
        </div>
      )}
    </div>
  )
}
