import { useState, useEffect } from 'react'

/**
 * Hook that debounces a value, returning the debounced value after a delay
 * @param value - The value to debounce
 * @param ms - Delay in milliseconds (default 300)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, ms: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, ms)

    return () => {
      clearTimeout(handler)
    }
  }, [value, ms])

  return debouncedValue
}
