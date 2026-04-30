/**
 * Web Worker for heavy ROI calculations
 * Runs calculations off the main thread to prevent UI blocking
 */

import { calc } from '../lib/calc'
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

// Listen for messages from main thread
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, input, id } = event.data

  if (type !== 'CALC') {
    const error: WorkerError = {
      type: 'ERROR',
      id,
      ok: false,
      error: 'Invalid message type'
    }
    self.postMessage(error)
    return
  }

  try {
    // Perform the calculation
    const result = calc(input)
    
    const response: WorkerResponse = {
      type: 'RESULT',
      id,
      ok: true,
      data: result
    }
    
    self.postMessage(response)
  } catch (error) {
    const errorResponse: WorkerError = {
      type: 'ERROR',
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown calculation error'
    }
    
    self.postMessage(errorResponse)
  }
})

// Export empty object to satisfy TypeScript module requirements
export {}