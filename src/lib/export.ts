/**
 * Enhanced export functionality for ROI calculator
 */

import { loadPDFLibrary, loadCanvasLibrary } from './dynamicImports'

export interface ExportOptions {
  format: 'pdf' | 'png' | 'json'
  filename?: string
  quality?: number
  includeCharts?: boolean
  includeMetadata?: boolean
}

export interface ExportResult {
  success: boolean
  filename?: string
  url?: string
  error?: string
}

/**
 * Enhanced PDF export with better error handling and options
 */
export async function exportToPDF(
  elementId: string = 'report-root',
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      loadCanvasLibrary(),
      loadPDFLibrary(),
      document.fonts.ready,
    ])

    const root = document.getElementById(elementId) as HTMLElement | null
    if (!root) {
      throw new Error(`Element with id "${elementId}" not found`)
    }

    // Add exporting class for CSS overrides and print styles
    root.classList.add('exporting', 'print-mode')
    
    // Apply print styles temporarily
    const printStyles = document.createElement('style')
    printStyles.setAttribute('data-print-styles', 'true')
    printStyles.textContent = `
      .print-mode {
        color: #000 !important;
        background: #fff !important;
      }
      .print-mode .no-print,
      .print-mode button,
      .print-mode .btn,
      .print-mode .export-panel {
        display: none !important;
      }
      .print-mode .card,
      .print-mode .shadow {
        box-shadow: none !important;
        border: 1px solid #e5e7eb !important;
      }
    `
    document.head.appendChild(printStyles)

    // Ensure images are CORS-enabled
    root.querySelectorAll('img').forEach((img) => {
      ;(img as HTMLImageElement).crossOrigin = 'anonymous'
    })

    // Wait for layout stabilization
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    await new Promise(r => setTimeout(r, 150))

    // Capture the element
    const canvas = await html2canvas(root, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      scale: 2,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
      logging: false,
    })

    // Create PDF
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()

    const imgW = pageW
    const imgH = (canvas.height * imgW) / canvas.width

    // Paginate with overlap to avoid cutting borders
    const overlap = 10
    for (let y = 0; y < imgH; y += pageH - overlap) {
      const sy = Math.floor((y / imgH) * canvas.height)
      const sH = Math.min(
        Math.floor(((pageH - (y > 0 ? overlap : 0)) / imgH) * canvas.height),
        canvas.height - sy
      )

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sH
      const ctx = pageCanvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context failed')

      ctx.drawImage(canvas, 0, sy, canvas.width, sH, 0, 0, canvas.width, sH)

      if (y > 0) pdf.addPage()
      pdf.addImage(
        pageCanvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        imgW,
        (sH * imgW) / canvas.width
      )
    }

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = options.filename || `bridge-stay-roi-${timestamp}.pdf`

    // Save the PDF
    pdf.save(filename)

    return {
      success: true,
      filename,
    }
  } catch (error) {
    console.error('PDF Export Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  } finally {
    const root = document.getElementById(elementId)
    if (root) root.classList.remove('exporting')
  }
}

/**
 * Export to PNG with high quality
 */
export async function exportToPNG(
  elementId: string = 'report-root',
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  try {
    const { default: html2canvas } = await loadCanvasLibrary()

    const root = document.getElementById(elementId) as HTMLElement | null
    if (!root) {
      throw new Error(`Element with id "${elementId}" not found`)
    }

    // Add exporting class for CSS overrides
    root.classList.add('exporting')

    // Normalize colors
    await normalizeColors(root)

    // Ensure images are CORS-enabled
    root.querySelectorAll('img').forEach((img) => {
      ;(img as HTMLImageElement).crossOrigin = 'anonymous'
    })

    // Wait for layout stabilization
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    await new Promise(r => setTimeout(r, 150))

    // Capture the element
    const canvas = await html2canvas(root, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      scale: options.quality || 2,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
      logging: false,
    })

    // Convert to blob and download
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!)
      }, 'image/png', 0.95)
    })

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = options.filename || `bridge-stay-roi-${timestamp}.png`

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return {
      success: true,
      filename,
    }
  } catch (error) {
    console.error('PNG Export Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  } finally {
    const root = document.getElementById(elementId)
    if (root) root.classList.remove('exporting')
  }
}

/**
 * Normalize colors to prevent oklch/var() issues
 */
async function normalizeColors(host: HTMLElement): Promise<void> {
  const nodes = host.querySelectorAll('*')
  let normalizedCount = 0

  nodes.forEach((el) => {
    const cs = getComputedStyle(el as Element)
    const htmlEl = el as HTMLElement

    const colorProps = [
      'color', 'backgroundColor',
      'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'outlineColor', 'caretColor', 'fill', 'stroke',
    ]

    colorProps.forEach((prop) => {
      const value = (cs as CSSStyleDeclaration)[prop] as string | undefined
      if (!value) return

      if (/oklch|oklab|display-p3|var\(/i.test(value)) {
        // Force browser to return rgb/rgba
        (htmlEl.style as CSSStyleDeclaration).setProperty(prop, value, 'important')
        const rgb = (getComputedStyle(htmlEl) as CSSStyleDeclaration)[prop] as string | undefined
        if (rgb && /^rgba?\(/i.test(rgb)) {
          (htmlEl.style as CSSStyleDeclaration).setProperty(prop, rgb, 'important')
          normalizedCount++
        }
      }
    })

    // Handle shadows and filters
    if (/oklch|oklab|display-p3|var\(/i.test(cs.boxShadow)) {
      htmlEl.style.boxShadow = 'none'
      normalizedCount++
    }
    if (/oklch|oklab|display-p3|var\(/i.test(cs.textShadow)) {
      htmlEl.style.textShadow = 'none'
      normalizedCount++
    }
    if (/oklch|oklab|display-p3|var\(/i.test(cs.filter)) {
      htmlEl.style.filter = 'none'
      normalizedCount++
    }

    // Handle SVG elements
    if (el instanceof SVGElement) {
      const fill = cs.fill
      const stroke = cs.stroke
      
      if (fill && /oklch|oklab|var\(/i.test(fill)) {
        const f = getComputedStyle(el).fill
        if (/^rgba?\(/i.test(f)) {
          el.setAttribute('fill', f)
          normalizedCount++
        }
      }
      
      if (stroke && /oklch|oklab|var\(/i.test(stroke)) {
        const s = getComputedStyle(el).stroke
        if (/^rgba?\(/i.test(s)) {
          el.setAttribute('stroke', s)
          normalizedCount++
        }
      }
    }
  })

  if (process.env.NODE_ENV === 'development') {
    console.log(`Normalized colors on ${normalizedCount} elements`)
  }
}