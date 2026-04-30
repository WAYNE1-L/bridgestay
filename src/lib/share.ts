/**
 * Sharing utilities for ROI calculator data with URL-safe base64 encoding
 */

import type { RoiValues } from './schema'

export interface ShareableData {
  version: string
  timestamp: number
  data: RoiValues
  metadata?: {
    propertyName?: string
    description?: string
    tags?: string[]
  }
}

const CURRENT_VERSION = '1.0'

/**
 * Encode state to URL-safe base64 (RFC 4648 Section 5)
 */
export function encodeState(data: ShareableData): string {
  try {
    const json = JSON.stringify(data)
    return btoa(json)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  } catch {
    throw new Error('Failed to encode data for sharing')
  }
}

/**
 * Decode URL-safe base64 to state
 */
export function decodeState(encoded: string): ShareableData {
  try {
    // Add padding if needed
    const padded = encoded + '='.repeat((4 - encoded.length % 4) % 4)
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const data = JSON.parse(json) as ShareableData
    
    // Validate version compatibility
    if (data.version !== CURRENT_VERSION) {
      console.warn(`Data version ${data.version} may not be compatible with current version ${CURRENT_VERSION}`)
    }
    
    return data
  } catch {
    throw new Error('Failed to decode shared data')
  }
}

/**
 * Generate shareable URL with encoded data
 */
export function generateShareUrl(data: RoiValues, metadata?: ShareableData['metadata']): string {
  const shareableData: ShareableData = {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    data,
    metadata,
  }
  
  const encoded = encodeState(shareableData)
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}?s=${encoded}`
}