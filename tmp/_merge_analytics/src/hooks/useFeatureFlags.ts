/**
 * Feature flag system for gradual rollouts and A/B testing
 */

import React from 'react'

export interface FeatureFlags {
  // UI Features
  enableDarkMode: boolean
  enableLanguageSwitcher: boolean
  enableAdvancedCharts: boolean
  
  // Functionality Features
  enableExportPDF: boolean
  enableExportPNG: boolean
  enableShareLinks: boolean
  enableAdvancedCalculations: boolean
  
  // Performance Features
  enableWebWorkers: boolean
  enablePreloading: boolean
  enableCaching: boolean
  
  // Monitoring Features
  enableErrorReporting: boolean
  enablePerformanceMonitoring: boolean
  enableAnalytics: boolean
  
  // Experimental Features
  enableBetaFeatures: boolean
  enableNewDashboard: boolean
  enableMobileOptimizations: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  // UI Features - enabled by default
  enableDarkMode: true,
  enableLanguageSwitcher: true,
  enableAdvancedCharts: true,
  
  // Functionality Features - enabled by default
  enableExportPDF: true,
  enableExportPNG: true,
  enableShareLinks: true,
  enableAdvancedCalculations: true,
  
  // Performance Features - enabled by default
  enableWebWorkers: true,
  enablePreloading: true,
  enableCaching: true,
  
  // Monitoring Features - configurable via env
  enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING !== 'false',
  enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  
  // Experimental Features - disabled by default
  enableBetaFeatures: false,
  enableNewDashboard: false,
  enableMobileOptimizations: false,
}

class FeatureFlagManager {
  private flags: FeatureFlags
  private listeners: Set<(flags: FeatureFlags) => void> = new Set()

  constructor() {
    this.flags = this.loadFlags()
    this.setupStorageListener()
  }

  private loadFlags(): FeatureFlags {
    try {
      // Try to load from localStorage first
      const stored = localStorage.getItem('feature-flags')
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_FLAGS, ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load feature flags from localStorage:', error)
    }

    // Fall back to environment variables and defaults
    return {
      ...DEFAULT_FLAGS,
      enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING !== 'false',
      enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',
      enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    }
  }

  private saveFlags(): void {
    try {
      localStorage.setItem('feature-flags', JSON.stringify(this.flags))
    } catch (error) {
      console.warn('Failed to save feature flags to localStorage:', error)
    }
  }

  private setupStorageListener(): void {
    // Listen for changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'feature-flags' && event.newValue) {
        try {
          const newFlags = JSON.parse(event.newValue)
          this.flags = { ...DEFAULT_FLAGS, ...newFlags }
          this.notifyListeners()
        } catch (error) {
          console.warn('Failed to parse feature flags from storage event:', error)
        }
      }
    })
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.flags))
  }

  getFlags(): FeatureFlags {
    return { ...this.flags }
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag]
  }

  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value
    this.saveFlags()
    this.notifyListeners()
  }

  setFlags(flags: Partial<FeatureFlags>): void {
    this.flags = { ...this.flags, ...flags }
    this.saveFlags()
    this.notifyListeners()
  }

  resetFlags(): void {
    this.flags = { ...DEFAULT_FLAGS }
    this.saveFlags()
    this.notifyListeners()
  }

  subscribe(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Utility methods for common patterns
  isAnyEnabled(flags: (keyof FeatureFlags)[]): boolean {
    return flags.some(flag => this.flags[flag])
  }

  areAllEnabled(flags: (keyof FeatureFlags)[]): boolean {
    return flags.every(flag => this.flags[flag])
  }

  // Feature-specific helpers
  canExport(): boolean {
    return this.isAnyEnabled(['enableExportPDF', 'enableExportPNG'])
  }

  canShare(): boolean {
    return this.isEnabled('enableShareLinks')
  }

  hasAdvancedFeatures(): boolean {
    return this.isAnyEnabled(['enableAdvancedCalculations', 'enableAdvancedCharts'])
  }

  isExperimental(): boolean {
    return this.isEnabled('enableBetaFeatures')
  }
}

// Global instance
const featureFlagManager = new FeatureFlagManager()

// React hook for using feature flags
export function useFeatureFlags() {
  const [flags, setFlags] = React.useState<FeatureFlags>(featureFlagManager.getFlags())

  React.useEffect(() => {
    const unsubscribe = featureFlagManager.subscribe(setFlags)
    return unsubscribe
  }, [])

  return {
    flags,
    isEnabled: (flag: keyof FeatureFlags) => featureFlagManager.isEnabled(flag),
    setFlag: (flag: keyof FeatureFlags, value: boolean) => featureFlagManager.setFlag(flag, value),
    setFlags: (newFlags: Partial<FeatureFlags>) => featureFlagManager.setFlags(newFlags),
    resetFlags: () => featureFlagManager.resetFlags(),
    canExport: () => featureFlagManager.canExport(),
    canShare: () => featureFlagManager.canShare(),
    hasAdvancedFeatures: () => featureFlagManager.hasAdvancedFeatures(),
    isExperimental: () => featureFlagManager.isExperimental(),
  }
}

// Utility hook for checking a single flag
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const { isEnabled } = useFeatureFlags()
  return isEnabled(flag)
}

// Export the manager for non-React usage
export { featureFlagManager }

// Type exports
export type { FeatureFlags }
