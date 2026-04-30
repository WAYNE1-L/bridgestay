import { PropertySnapshot, DashboardStats } from '../types'

/**
 * Calculate dashboard statistics from property snapshots
 */
export const calculateDashboardStats = (snapshots: PropertySnapshot[]): DashboardStats => {
  if (snapshots.length === 0) {
    return {
      totalProperties: 0,
      totalCashFlowMonthly: 0,
      avgRoi: 0,
    }
  }

  const totalProperties = snapshots.length
  const totalCashFlowMonthly = snapshots.reduce(
    (sum, snapshot) => sum + (snapshot.calculation_results?.summary?.cashFlowMonthly || 0),
    0
  )
  const avgRoi = snapshots.reduce(
    (sum, snapshot) => sum + (snapshot.calculation_results?.summary?.roiPercent || 0),
    0
  ) / totalProperties

  return {
    totalProperties,
    totalCashFlowMonthly,
    avgRoi: Math.round(avgRoi * 10) / 10, // Round to 1 decimal place
  }
}

/**
 * Format currency values
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format percentage values
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format date strings
 */
export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'Invalid Date'
  }
}

/**
 * Sort snapshots by cash flow (descending)
 */
export const sortSnapshotsByCashFlow = (snapshots: PropertySnapshot[]): PropertySnapshot[] => {
  return [...snapshots].sort((a, b) => {
    const aCashFlow = a.calculation_results?.summary?.cashFlowMonthly || 0
    const bCashFlow = b.calculation_results?.summary?.cashFlowMonthly || 0
    return bCashFlow - aCashFlow
  })
}
