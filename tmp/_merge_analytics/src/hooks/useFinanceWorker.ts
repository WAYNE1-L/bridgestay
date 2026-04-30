/**
 * Custom hook for using the finance Web Worker with debouncing
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { RoiInputs, RoiResults } from '../lib/finance'

interface UseFinanceWorkerOptions {
  debounceMs?: number
  onError?: (error: string) => void
}

export function useFinanceWorker(options: UseFinanceWorkerOptions = {}) {
  const { debounceMs = 150, onError } = options
  
  const [results, setResults] = useState<RoiResults | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const workerRef = useRef<Worker | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageIdRef = useRef(0)

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/financeWorker.ts', import.meta.url),
      { type: 'module' }
    )

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data
      
      if (type === 'ROI_RESULT') {
        setResults(payload)
        setIsCalculating(false)
        setError(null)
      } else if (type === 'ERROR') {
        setError(payload)
        setIsCalculating(false)
        onError?.(payload)
      }
    }

    workerRef.current.onerror = () => {
      setError('Worker error occurred')
      setIsCalculating(false)
      onError?.('Worker error occurred')
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [onError])

  // Debounced calculation function
  const calculateDebounced = useCallback((inputs: RoiInputs) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      if (workerRef.current) {
        setIsCalculating(true)
        setError(null)
        
        const messageId = ++messageIdRef.current
        
        workerRef.current.postMessage({
          type: 'CALCULATE_ROI',
          payload: inputs,
          id: messageId
        })
      }
    }, debounceMs)
  }, [debounceMs])

  // Immediate calculation (no debounce)
  const calculateImmediate = useCallback((inputs: RoiInputs) => {
    if (workerRef.current) {
      setIsCalculating(true)
      setError(null)
      
      const messageId = ++messageIdRef.current
      
      workerRef.current.postMessage({
        type: 'CALCULATE_ROI',
        payload: inputs,
        id: messageId
      })
    }
  }, [])

  // Batch calculation for multiple properties
  const calculateBatch = useCallback((inputsArray: RoiInputs[]): Promise<RoiResults[]> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'))
        return
      }

      const messageId = ++messageIdRef.current
      
      const handleMessage = (event: MessageEvent) => {
        const { type, payload, id } = event.data
        
        if (id === messageId) {
          workerRef.current?.removeEventListener('message', handleMessage)
          
          if (type === 'BATCH_RESULT') {
            resolve(payload)
          } else if (type === 'ERROR') {
            reject(new Error(payload))
          }
        }
      }

      workerRef.current.addEventListener('message', handleMessage)
      
      workerRef.current.postMessage({
        type: 'CALCULATE_BATCH',
        payload: inputsArray,
        id: messageId
      })
    })
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    results,
    isCalculating,
    error,
    calculateDebounced,
    calculateImmediate,
    calculateBatch
  }
}
