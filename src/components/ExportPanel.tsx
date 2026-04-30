import React, { useState } from 'react'
import { Download, FileText, Image, Share2, Loader2, ChevronDown } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { exportToPDF, exportToPNG } from '../lib/export'
import { generateShareUrl } from '../lib/share'
import type { RoiValues } from '../lib/schema'

export interface ExportPanelProps {
  elementId?: string
  data?: RoiValues
  metadata?: {
    propertyName?: string
    description?: string
  }
  className?: string
  onExport?: (result: { success: boolean; filename?: string; error?: string }) => void
}

export function ExportPanel({
  elementId = 'report-root',
  data,
  metadata,
  className = '',
  onExport,
}: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'json' | null>(null)
  const [showOptions, setShowOptions] = useState(false)

  const handleExport = async (format: 'pdf' | 'png' | 'json') => {
    setIsExporting(true)
    setExportFormat(format)

    try {
      let result: { success: boolean; filename?: string; error?: string }

      switch (format) {
        case 'pdf':
          result = await exportToPDF(elementId)
          break
        case 'png':
          result = await exportToPNG(elementId)
          break
        case 'json': {
          if (!data) {
            throw new Error('No data available for JSON export')
          }
          // Simple JSON export implementation
          const jsonData = {
            version: '1.0',
            timestamp: Date.now(),
            data,
            metadata,
          }
          const json = JSON.stringify(jsonData, null, 2)
          const blob = new Blob([json], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `roi-calculator-${Date.now()}.json`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          result = { success: true, filename: `roi-calculator-${Date.now()}.json` }
          break
        }
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }

      onExport?.(result)

      if (!result.success) {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Export Error:', error)
      alert(`Failed to export ${format.toUpperCase()}: ${errorMessage}`)
    } finally {
      setIsExporting(false)
      setExportFormat(null)
    }
  }

  const handleShare = async () => {
    if (!data) {
      alert('No data available to share')
      return
    }

    try {
      const url = generateShareUrl(data, metadata)
      await navigator.clipboard.writeText(url)
      alert('Share link copied to clipboard!')
    } catch (error) {
      console.error('Share Error:', error)
      alert('Failed to copy share link')
    }
  }

  const getShareUrl = () => {
    if (!data) return ''
    return generateShareUrl(data, metadata)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export & Share
        </CardTitle>
        <CardDescription>
          Export your ROI analysis in multiple formats or share with others
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Export Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting && exportFormat === 'pdf' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Export PDF
          </Button>

          <Button
            onClick={() => handleExport('png')}
            disabled={isExporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isExporting && exportFormat === 'png' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
            Export PNG
          </Button>

          {data && (
            <Button
              onClick={handleShare}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Link
            </Button>
          )}
        </div>

        {/* Advanced Options */}
        {data && (
          <div className="space-y-3">
            <Button
              onClick={() => setShowOptions(!showOptions)}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
              Advanced Options
            </Button>

            {showOptions && (
              <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Data Export</h4>
                  <Button
                    onClick={() => handleExport('json')}
                    disabled={isExporting}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isExporting && exportFormat === 'json' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Export JSON Data
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Share URL</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getShareUrl()}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    />
                    <Button
                      onClick={() => navigator.clipboard.writeText(getShareUrl())}
                      variant="outline"
                      size="sm"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export Status */}
        {isExporting && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting {exportFormat?.toUpperCase()}...
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• PDF exports include all charts and calculations</p>
          <p>• PNG exports are high-resolution images</p>
          <p>• Share links preserve all form data</p>
          <p>• JSON exports contain raw calculation data</p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Simple export button for inline use
 */
export function SimpleExportButton({
  elementId = 'report-root',
  data,
  metadata,
  className = '',
  onExport,
}: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'png' | 'json') => {
    setIsExporting(true)
    try {
      let result
      if (format === 'pdf') {
        result = await exportToPDF(elementId, {
          filename: metadata?.propertyName || 'roi-report.pdf'
        })
      } else if (format === 'png') {
        result = await exportToPNG(elementId, {
          filename: metadata?.propertyName || 'roi-report.png'
        })
      } else {
        // Simple JSON export implementation
        const jsonData = {
          version: '1.0',
          timestamp: Date.now(),
          data,
          metadata,
        }
        const json = JSON.stringify(jsonData, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `roi-calculator-${Date.now()}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        result = { success: true, filename: `roi-calculator-${Date.now()}.json` }
      }
      
      onExport?.(result)
    } catch (error) {
      onExport?.({ success: false, error: error instanceof Error ? error.message : 'Export failed' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
        size="sm"
        className="gap-2"
      >
        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        PDF
      </Button>
      <Button
        onClick={() => handleExport('png')}
        disabled={isExporting}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
        PNG
      </Button>
    </div>
  )
}
