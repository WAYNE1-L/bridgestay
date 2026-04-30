/**
 * Tests for CSV import/export utilities
 */

import { describe, it, expect } from 'vitest'
import { 
  parseCSV, 
  toCSV, 
  generateCSVTemplate, 
  validateCSVData,
  type Property,
  type PropertyResult
} from '../lib/csv'

describe('CSV Utilities', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV data correctly', () => {
      const csvData = `Address,Purchase Price,Down Payment %,Monthly Rent,Interest Rate %,Loan Years,Property Tax %,Insurance Monthly,HOA Monthly,Management %,Maintenance %,Vacancy %
"123 Main St",300000,20,2400,6.5,30,1.2,100,50,8,10,5
"456 Oak Ave",250000,25,2000,7.0,30,1.0,80,0,10,8,6`

      const result = parseCSV(csvData)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'property-0',
        address: '123 Main St',
        purchasePrice: 300000,
        downPct: 20,
        monthlyRent: 2400,
        interestRate: 6.5,
        loanYears: 30,
        propertyTaxPct: 1.2,
        insuranceMonthly: 100,
        hoaMonthly: 50,
        mgmtPct: 8,
        maintenancePct: 10,
        vacancyPct: 5,
      })
    })

    it('should handle CSV with quoted values containing commas', () => {
      const csvData = `Address,Purchase Price,Down Payment %,Monthly Rent,Interest Rate %,Loan Years,Property Tax %,Insurance Monthly,HOA Monthly,Management %,Maintenance %,Vacancy %
"123 Main St, Apt 1",300000,20,2400,6.5,30,1.2,100,50,8,10,5`

      const result = parseCSV(csvData)
      
      expect(result).toHaveLength(1)
      expect(result[0].address).toBe('123 Main St, Apt 1')
    })

    it('should handle CSV with escaped quotes', () => {
      const csvData = `Address,Purchase Price,Down Payment %,Monthly Rent,Interest Rate %,Loan Years,Property Tax %,Insurance Monthly,HOA Monthly,Management %,Maintenance %,Vacancy %
"123 ""Main"" St",300000,20,2400,6.5,30,1.2,100,50,8,10,5`

      const result = parseCSV(csvData)
      
      expect(result).toHaveLength(1)
      expect(result[0].address).toBe('123 "Main" St')
    })

    it('should return empty array for empty CSV', () => {
      const result = parseCSV('')
      expect(result).toEqual([])
    })

    it('should return empty array for header-only CSV', () => {
      const csvData = `Address,Purchase Price,Down Payment %,Monthly Rent,Interest Rate %,Loan Years,Property Tax %,Insurance Tax %,Insurance Monthly,HOA Monthly,Management %,Maintenance %,Vacancy %`
      const result = parseCSV(csvData)
      expect(result).toEqual([])
    })

    it('should skip invalid rows and continue parsing', () => {
      const csvData = `Address,Purchase Price,Down Payment %,Monthly Rent,Interest Rate %,Loan Years,Property Tax %,Insurance Monthly,HOA Monthly,Management %,Maintenance %,Vacancy %
"123 Main St",300000,20,2400,6.5,30,1.2,100,50,8,10,5
invalid,row,with,too,few,columns
"456 Oak Ave",250000,25,2000,7.0,30,1.0,80,0,10,8,6`

      const result = parseCSV(csvData)
      
      expect(result).toHaveLength(2)
      expect(result[0].address).toBe('123 Main St')
      expect(result[1].address).toBe('456 Oak Ave')
    })

    it('should handle numeric values with different formats', () => {
      const csvData = `Address,Purchase Price,Down Payment %,Monthly Rent,Interest Rate %,Loan Years,Property Tax %,Insurance Monthly,HOA Monthly,Management %,Maintenance %,Vacancy %
"123 Main St",300000.50,20.5,2400.75,6.5,30,1.2,100,50,8,10,5`

      const result = parseCSV(csvData)
      
      expect(result[0].purchasePrice).toBe(300000.50)
      expect(result[0].downPct).toBe(20.5)
      expect(result[0].monthlyRent).toBe(2400.75)
    })
  })

  describe('toCSV', () => {
    it('should convert PropertyResult array to CSV correctly', () => {
      const results: PropertyResult[] = [
        {
          id: 'property-1',
          address: '123 Main St',
          purchasePrice: 300000,
          downPct: 20,
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
          monthlyCashFlow: 1200,
          annualCashFlow: 14400,
          capRate: 8.5,
          roi: 12.3,
          dscr: 1.5,
        }
      ]

      const csv = toCSV(results)
      const lines = csv.split('\n')
      
      expect(lines).toHaveLength(2) // Header + 1 data row
      expect(lines[0]).toContain('Address')
      expect(lines[0]).toContain('Purchase Price')
      expect(lines[0]).toContain('Monthly Cash Flow')
      expect(lines[1]).toContain('"123 Main St"')
      expect(lines[1]).toContain('300000')
      expect(lines[1]).toContain('1200')
    })

    it('should handle empty array', () => {
      const csv = toCSV([])
      const lines = csv.split('\n')
      
      expect(lines).toHaveLength(1) // Only header
      expect(lines[0]).toContain('Address')
    })

    it('should handle addresses with commas in quotes', () => {
      const results: PropertyResult[] = [
        {
          id: 'property-1',
          address: '123 Main St, Apt 1',
          purchasePrice: 300000,
          downPct: 20,
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
          monthlyCashFlow: 1200,
          annualCashFlow: 14400,
          capRate: 8.5,
          roi: 12.3,
          dscr: 1.5,
        }
      ]

      const csv = toCSV(results)
      expect(csv).toContain('"123 Main St, Apt 1"')
    })
  })

  describe('generateCSVTemplate', () => {
    it('should generate valid CSV template', () => {
      const template = generateCSVTemplate()
      const lines = template.split('\n')
      
      expect(lines).toHaveLength(3) // Header + 2 sample rows
      expect(lines[0]).toContain('Address')
      expect(lines[0]).toContain('Purchase Price')
      expect(lines[1]).toContain('Sample Property')
      expect(lines[2]).toContain('Another Property')
    })
  })

  describe('validateCSVData', () => {
    it('should validate correct data', () => {
      const properties: Property[] = [
        {
          id: 'property-1',
          address: '123 Main St',
          purchasePrice: 300000,
          downPct: 20,
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
        }
      ]

      const result = validateCSVData(properties)
      
      expect(result.valid).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should catch missing address', () => {
      const properties: Property[] = [
        {
          id: 'property-1',
          address: '',
          purchasePrice: 300000,
          downPct: 20,
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
        }
      ]

      const result = validateCSVData(properties)
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toContain('Row 2: Address is required')
    })

    it('should catch invalid purchase price', () => {
      const properties: Property[] = [
        {
          id: 'property-1',
          address: '123 Main St',
          purchasePrice: 0,
          downPct: 20,
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
        }
      ]

      const result = validateCSVData(properties)
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toContain('Row 2: Purchase price must be greater than 0')
    })

    it('should catch invalid down payment percentage', () => {
      const properties: Property[] = [
        {
          id: 'property-1',
          address: '123 Main St',
          purchasePrice: 300000,
          downPct: 150, // Invalid: > 100%
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
        }
      ]

      const result = validateCSVData(properties)
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toContain('Row 2: Down payment percentage must be between 0-100')
    })

    it('should catch invalid interest rate', () => {
      const properties: Property[] = [
        {
          id: 'property-1',
          address: '123 Main St',
          purchasePrice: 300000,
          downPct: 20,
          monthlyRent: 2400,
          interestRate: 60, // Invalid: > 50%
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
        }
      ]

      const result = validateCSVData(properties)
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toContain('Row 2: Interest rate must be between 0-50')
    })

    it('should catch invalid loan years', () => {
      const properties: Property[] = [
        {
          id: 'property-1',
          address: '123 Main St',
          purchasePrice: 300000,
          downPct: 20,
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 60, // Invalid: > 50 years
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
        }
      ]

      const result = validateCSVData(properties)
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toContain('Row 2: Loan years must be between 1-50')
    })

    it('should catch multiple errors in one property', () => {
      const properties: Property[] = [
        {
          id: 'property-1',
          address: '', // Missing address
          purchasePrice: 0, // Invalid price
          downPct: 150, // Invalid down payment
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
        }
      ]

      const result = validateCSVData(properties)
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toHaveLength(3)
      expect(result.errors).toContain('Row 2: Address is required')
      expect(result.errors).toContain('Row 2: Purchase price must be greater than 0')
      expect(result.errors).toContain('Row 2: Down payment percentage must be between 0-100')
    })

    it('should handle mixed valid and invalid properties', () => {
      const properties: Property[] = [
        {
          id: 'property-1',
          address: '123 Main St',
          purchasePrice: 300000,
          downPct: 20,
          monthlyRent: 2400,
          interestRate: 6.5,
          loanYears: 30,
          propertyTaxPct: 1.2,
          insuranceMonthly: 100,
          hoaMonthly: 50,
          mgmtPct: 8,
          maintenancePct: 10,
          vacancyPct: 5,
        },
        {
          id: 'property-2',
          address: '', // Invalid
          purchasePrice: 250000,
          downPct: 25,
          monthlyRent: 2000,
          interestRate: 7.0,
          loanYears: 30,
          propertyTaxPct: 1.0,
          insuranceMonthly: 80,
          hoaMonthly: 0,
          mgmtPct: 10,
          maintenancePct: 8,
          vacancyPct: 6,
        }
      ]

      const result = validateCSVData(properties)
      
      expect(result.valid).toHaveLength(1)
      expect(result.errors).toHaveLength(1)
      expect(result.valid[0].address).toBe('123 Main St')
      expect(result.errors[0]).toBe('Row 3: Address is required')
    })
  })
})
