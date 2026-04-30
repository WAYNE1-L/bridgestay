import React from 'react'
import { Info } from 'lucide-react'
import { Button } from './ui/button'

interface VersionDisplayProps {
  className?: string
  showIcon?: boolean
  showEnvironment?: boolean
}

export function VersionDisplay({ 
  className = '', 
  showIcon = true, 
  showEnvironment = true 
}: VersionDisplayProps) {
  const version = import.meta.env.VITE_APP_VERSION || (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ || '1.0.0'
  const environment = import.meta.env.VITE_APP_ENVIRONMENT || 'production'
  const buildTime = import.meta.env.VITE_BUILD_TIME || (globalThis as { __BUILD_TIME__?: string }).__BUILD_TIME__ || new Date().toISOString()

  const handleClick = () => {
    // Show detailed version info in console
    console.group('🚀 BridgeStay Analytics - Version Info')
    console.log('Version:', version)
    console.log('Environment:', environment)
    console.log('Build Time:', buildTime)
    console.log('User Agent:', navigator.userAgent)
    console.log('Viewport:', `${window.innerWidth}x${window.innerHeight}`)
    console.log('Performance:', {
      memory: (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory ? {
        used: Math.round((performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory.jsHeapSizeLimit / 1024 / 1024),
      } : 'Not available',
      timing: performance.timing ? {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      } : 'Not available',
    })
    console.groupEnd()
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`text-xs text-muted-foreground hover:text-foreground ${className}`}
      onClick={handleClick}
      title={`Version ${version}${showEnvironment ? ` (${environment})` : ''}`}
    >
      {showIcon && <Info className="h-3 w-3 mr-1" />}
      <span className="font-mono">
        v{version}
        {showEnvironment && environment !== 'production' && (
          <span className="ml-1 text-orange-500">({environment})</span>
        )}
      </span>
    </Button>
  )
}

// Footer version component
export function FooterVersion() {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <VersionDisplay showIcon={false} />
      <span>•</span>
      <span>Built with React & TypeScript</span>
      <span>•</span>
      <span>© 2024 BridgeStay Analytics</span>
    </div>
  )
}
