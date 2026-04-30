/**
 * Web Worker for heavy financial calculations
 * Moves CPU-intensive calculations off the main thread
 */

import { calculateRoiResults, RoiInputs, RoiResults } from '../lib/finance'

export interface WorkerMessage {
  type: 'CALCULATE_ROI' | 'CALCULATE_BATCH'
  payload: RoiInputs | RoiInputs[]
  id?: string
}

export interface WorkerResponse {
  type: 'ROI_RESULT' | 'BATCH_RESULT' | 'ERROR'
  payload: RoiResults | RoiResults[] | string
  id?: string
}

// Listen for messages from main thread
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, id } = event.data

  try {
    switch (type) {
      case 'CALCULATE_ROI': {
        const singleResult = calculateRoiResults(payload as RoiInputs)
        self.postMessage({
          type: 'ROI_RESULT',
          payload: singleResult,
          id
        } as WorkerResponse)
        break
      }

      case 'CALCULATE_BATCH': {
        const batchInputs = payload as RoiInputs[]
        const batchResults = batchInputs.map(inputs => calculateRoiResults(inputs))
        self.postMessage({
          type: 'BATCH_RESULT',
          payload: batchResults,
          id
        } as WorkerResponse)
        break
      }

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: error instanceof Error ? error.message : 'Unknown error',
      id
    } as WorkerResponse)
  }
})

// Export for TypeScript module resolution
export {}
