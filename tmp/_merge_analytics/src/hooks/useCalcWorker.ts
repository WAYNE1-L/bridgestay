import { useState, useEffect, useRef, useMemo } from 'react'
import type { RoiInput, CalcResult } from '../lib/calc'

// Worker message types
interface WorkerMessage {
  type: 'CALC'
  input: RoiInput
  id: string
}

interface WorkerResponse {
  type: 'RESULT'
  id: string
  ok: true
  data: CalcResult
}

interface WorkerError {
  type: 'ERROR'
  id: string
  ok: false
  error: string
}

// Hook return type
export interface UseCalcWorkerResult {
  loading: boolean
  data: CalcResult | null
  error: string | null
}

// Simple hash function for input memoization
function hashInput(input: RoiInput): string {
  return JSON.stringify(input)
}

/**
 * Hook for using the calculation worker with memoization
 */
export function useCalcWorker(input: RoiInput | null): UseCalcWorkerResult {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CalcResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const workerRef = useRef<Worker | null>(null)
  const cacheRef = useRef<Map<string, CalcResult>>(new Map())
  const currentRequestIdRef = useRef<string | null>(null)

  // Create worker instance
  useEffect(() => {
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL('../workers/calcWorker.ts', import.meta.url),
          { type: 'module' }
        )
        
        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse | WorkerError>) => {
          const { type, id } = event.data
          
          // Only process responses for the current request
          if (id !== currentRequestIdRef.current) {
            return
          }
          
          if (type === 'RESULT' && 'ok' in event.data && event.data.ok) {
            const result = event.data.data
            setData(result)
            setError(null)
            setLoading(false)
            
            // Cache the result
            if (input) {
              const inputHash = hashInput(input)
              cacheRef.current.set(inputHash, result)
            }
          } else if (type === 'ERROR' && 'ok' in event.data && !event.data.ok) {
            setError(event.data.error)
            setData(null)
            setLoading(false)
          }
        }
        
        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error)
          setError('Worker calculation failed')
          setData(null)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to create worker:', err)
        setError('Failed to initialize calculation worker')
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  // Memoize input hash to detect changes
  const inputHash = useMemo(() => {
    return input ? hashInput(input) : null
  }, [input])

  // Check cache and trigger calculation
  useEffect(() => {
    if (!input || !workerRef.current) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    // Check cache first
    const cached = cacheRef.current.get(inputHash!)
    if (cached) {
      setData(cached)
      setError(null)
      setLoading(false)
      return
    }

    // Generate unique request ID
    const requestId = `${Date.now()}-${Math.random()}`
    currentRequestIdRef.current = requestId

    // Send calculation request to worker
    setLoading(true)
    setError(null)
    
    const message: WorkerMessage = {
      type: 'CALC',
      input,
      id: requestId
    }
    
    workerRef.current.postMessage(message)
  }, [inputHash])

  return {
    loading,
    data,
    error
  }
}
