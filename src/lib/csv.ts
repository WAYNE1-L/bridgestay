/**
 * CSV import/export utilities for property data
 */

export interface Property {
  id: string
  address: string
  purchasePrice: number
  downPct: number
  monthlyRent: number
  interestRate: number
  loanYears: number
  propertyTaxPct: number
  insuranceMonthly: number
  hoaMonthly: number
  mgmtPct: number
  maintenancePct: number
  vacancyPct: number
}

export interface PropertyResult extends Property {
  monthlyCashFlow: number
  annualCashFlow: number
  capRate: number
  roi: number
  dscr: number
}

const CSV_HEADERS = [
  'Address',
  'Purchase Price',
  'Down Payment %',
  'Monthly Rent',
  'Interest Rate %',
  'Loan Years',
  'Property Tax %',
  'Insurance Monthly',
  'HOA Monthly',
  'Management %',
  'Maintenance %',
  'Vacancy %',
  'Monthly Cash Flow',
  'Annual Cash Flow',
  'Cap Rate %',
  'ROI %',
  'DSCR'
]

/**
 * Parse CSV text into Property array
 */
export function parseCSV(text: string): Property[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  // Skip header row
  const dataLines = lines.slice(1)
  
  return dataLines
    .map((line, index) => {
      const values = parseCSVLine(line)
      if (values.length < 12) return null

      try {
        return {
          id: `property-${index}`,
          address: values[0]?.trim() || '',
          purchasePrice: parseFloat(values[1]) || 0,
          downPct: parseFloat(values[2]) || 0,
          monthlyRent: parseFloat(values[3]) || 0,
          interestRate: parseFloat(values[4]) || 0,
          loanYears: parseFloat(values[5]) || 0,
          propertyTaxPct: parseFloat(values[6]) || 0,
          insuranceMonthly: parseFloat(values[7]) || 0,
          hoaMonthly: parseFloat(values[8]) || 0,
          mgmtPct: parseFloat(values[9]) || 0,
          maintenancePct: parseFloat(values[10]) || 0,
          vacancyPct: parseFloat(values[11]) || 0,
        }
      } catch (error) {
        console.warn(`Failed to parse line ${index + 2}:`, error)
        return null
      }
    })
    .filter((property): property is Property => property !== null)
}

/**
 * Convert PropertyResult array to CSV string
 */
export function toCSV(results: PropertyResult[]): string {
  const headerRow = CSV_HEADERS.join(',')
  
  const dataRows = results.map(property => [
    `"${property.address}"`,
    property.purchasePrice,
    property.downPct,
    property.monthlyRent,
    property.interestRate,
    property.loanYears,
    property.propertyTaxPct,
    property.insuranceMonthly,
    property.hoaMonthly,
    property.mgmtPct,
    property.maintenancePct,
    property.vacancyPct,
    property.monthlyCashFlow,
    property.annualCashFlow,
    property.capRate,
    property.roi,
    property.dscr
  ].join(','))

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

/**
 * Generate CSV template for import
 */
export function generateCSVTemplate(): string {
  const templateData = [
    'Sample Property, 300000, 20, 2400, 6.5, 30, 1.2, 100, 0, 8, 10, 5',
    'Another Property, 250000, 25, 2000, 7.0, 30, 1.0, 80, 50, 10, 8, 6'
  ]
  
  return [CSV_HEADERS.slice(0, 12).join(','), ...templateData].join('\n')
}

/**
 * Validate CSV data before processing
 */
export function validateCSVData(properties: Property[]): { valid: Property[], errors: string[] } {
  const valid: Property[] = []
  const errors: string[] = []
  
  properties.forEach((property, index) => {
    const rowNum = index + 2 // Account for header row
    
    if (!property.address.trim()) {
      errors.push(`Row ${rowNum}: Address is required`)
    }
    
    if (property.purchasePrice <= 0) {
      errors.push(`Row ${rowNum}: Purchase price must be greater than 0`)
    }
    
    if (property.monthlyRent <= 0) {
      errors.push(`Row ${rowNum}: Monthly rent must be greater than 0`)
    }
    
    if (property.downPct < 0 || property.downPct > 100) {
      errors.push(`Row ${rowNum}: Down payment percentage must be between 0-100`)
    }
    
    if (property.interestRate < 0 || property.interestRate > 50) {
      errors.push(`Row ${rowNum}: Interest rate must be between 0-50`)
    }
    
    if (property.loanYears <= 0 || property.loanYears > 50) {
      errors.push(`Row ${rowNum}: Loan years must be between 1-50`)
    }
    
    // If no errors, add to valid list
    if (errors.length === 0 || !errors.some(error => error.startsWith(`Row ${rowNum}`))) {
      valid.push(property)
    }
  })
  
  return { valid, errors }
}
