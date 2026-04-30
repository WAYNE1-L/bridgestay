/**
 * Sublease to Airbnb calculation functions
 * These functions calculate profitability metrics for subleasing properties on Airbnb
 */

// Input types for sublease calculations
export interface SubleaseInput {
  nightlyRate: number
  occupancyRate: number // percentage (0-100)
  averageStayLength: number // nights
  rentPaidToLandlord: number // monthly
  utilitiesMonthly: number
  internetMonthly: number
  cleaningFeePerStay: number
  managementFeePercent: number // percentage (0-100)
  otherExpenses: number // monthly
}

// Result types for sublease calculations
export interface SubleaseResult {
  // Revenue
  monthlyBookings: number
  monthlyRevenue: number
  annualRevenue: number
  
  // Costs
  totalMonthlyCosts: number
  costPerStay: number
  totalAnnualCosts: number
  
  // Profit metrics
  netOperatingIncome: number // annual
  monthlyProfit: number
  annualProfit: number
  profitMarginPercent: number
  
  // Break-even analysis
  breakEvenNightlyRate: number
  breakEvenOccupancy: number
  
  // Efficiency metrics
  revenuePerNight: number
  costPerNight: number
}

/**
 * Calculate sublease profitability metrics
 */
export function calcSublease(input: SubleaseInput): SubleaseResult {
  const {
    nightlyRate,
    occupancyRate,
    averageStayLength,
    rentPaidToLandlord,
    utilitiesMonthly,
    internetMonthly,
    cleaningFeePerStay,
    managementFeePercent,
    otherExpenses,
  } = input

  // Number of bookings per month (assuming ~30 nights per month)
  const availableNightsPerMonth = 30
  const nightsBookedPerMonth = (availableNightsPerMonth * occupancyRate) / 100
  const bookingsPerMonth = nightsBookedPerMonth / averageStayLength
  
  // Revenue calculations
  const monthlyRevenue = bookingsPerMonth * (nightlyRate * averageStayLength + cleaningFeePerStay)
  const annualRevenue = monthlyRevenue * 12
  
  // Cost calculations
  const managementCostMonthly = monthlyRevenue * (managementFeePercent / 100)
  const totalMonthlyCosts = 
    rentPaidToLandlord + 
    utilitiesMonthly + 
    internetMonthly + 
    managementCostMonthly + 
    otherExpenses
  
  const costPerStay = totalMonthlyCosts / bookingsPerMonth + cleaningFeePerStay
  const totalAnnualCosts = totalMonthlyCosts * 12
  
  // Profit calculations
  const netOperatingIncome = annualRevenue - totalAnnualCosts
  const monthlyProfit = monthlyRevenue - totalMonthlyCosts
  const annualProfit = annualRevenue - totalAnnualCosts
  const profitMarginPercent = annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0
  
  // Break-even analysis
  // Break-even nightly rate: the minimum nightly rate needed to cover costs
  const breakEvenNightlyRate = nightsBookedPerMonth > 0
    ? (totalMonthlyCosts - cleaningFeePerStay * bookingsPerMonth) / nightsBookedPerMonth
    : totalMonthlyCosts
    
  // Break-even occupancy: the minimum occupancy % needed to cover costs at current rate
  // revenuePerBooking = nightlyRate * averageStayLength + cleaningFeePerStay
  // We need: revenuePerBooking * bookings >= totalMonthlyCosts
  // Where bookings = (30 * occupancy / 100) / averageStayLength
  const revenuePerBooking = nightlyRate * averageStayLength + cleaningFeePerStay
  const breakEvenOccupancy = revenuePerBooking > 0
    ? (totalMonthlyCosts * averageStayLength) / (revenuePerBooking * 30) * 100
    : 0
  
  // Efficiency metrics
  const revenuePerNight = nightsBookedPerMonth > 0 ? monthlyRevenue / nightsBookedPerMonth : 0
  const costPerNight = nightsBookedPerMonth > 0 ? totalMonthlyCosts / nightsBookedPerMonth : 0

  return {
    // Revenue
    monthlyBookings: bookingsPerMonth,
    monthlyRevenue,
    annualRevenue,
    
    // Costs
    totalMonthlyCosts,
    costPerStay,
    totalAnnualCosts,
    
    // Profit metrics
    netOperatingIncome,
    monthlyProfit,
    annualProfit,
    profitMarginPercent,
    
    // Break-even analysis
    breakEvenNightlyRate,
    breakEvenOccupancy,
    
    // Efficiency metrics
    revenuePerNight,
    costPerNight,
  }
}

/**
 * Validate input parameters
 */
export function validateSubleaseInput(input: SubleaseInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (input.nightlyRate < 0) errors.push('Nightly rate must be non-negative')
  if (input.occupancyRate < 0 || input.occupancyRate > 100) errors.push('Occupancy rate must be between 0 and 100%')
  if (input.averageStayLength <= 0) errors.push('Average stay length must be greater than 0')
  if (input.rentPaidToLandlord < 0) errors.push('Rent paid to landlord must be non-negative')
  if (input.utilitiesMonthly < 0) errors.push('Monthly utilities must be non-negative')
  if (input.internetMonthly < 0) errors.push('Monthly internet must be non-negative')
  if (input.cleaningFeePerStay < 0) errors.push('Cleaning fee must be non-negative')
  if (input.managementFeePercent < 0 || input.managementFeePercent > 100) errors.push('Management fee must be between 0 and 100%')
  if (input.otherExpenses < 0) errors.push('Other expenses must be non-negative')
  
  return {
    valid: errors.length === 0,
    errors
  }
}

