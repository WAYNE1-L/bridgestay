import { PropertySnapshot, ChartData, RoiInputs } from '../types'

// Mock property snapshots
export const mockPropertySnapshots: PropertySnapshot[] = [
  {
    id: '1',
    property_address: '123 Main St, Austin, TX',
    calculation_results: {
      summary: {
        cashFlowMonthly: 1200,
        capRatePercent: 8.5,
        roiPercent: 12.3,
      },
    },
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    property_address: '456 Oak Ave, Dallas, TX',
    calculation_results: {
      summary: {
        cashFlowMonthly: 950,
        capRatePercent: 7.2,
        roiPercent: 10.8,
      },
    },
    created_at: '2024-01-10T14:30:00Z',
  },
  {
    id: '3',
    property_address: '789 Pine Rd, Houston, TX',
    calculation_results: {
      summary: {
        cashFlowMonthly: 1800,
        capRatePercent: 9.1,
        roiPercent: 15.2,
      },
    },
    created_at: '2024-01-05T09:15:00Z',
  },
]

// Mock chart data
export const mockChartData: ChartData[] = [
  { month: 'Jan', cashFlow: 1200, roiPct: 12.3 },
  { month: 'Feb', cashFlow: 1250, roiPct: 12.8 },
  { month: 'Mar', cashFlow: 1180, roiPct: 12.1 },
  { month: 'Apr', cashFlow: 1320, roiPct: 13.2 },
  { month: 'May', cashFlow: 1400, roiPct: 14.0 },
  { month: 'Jun', cashFlow: 1350, roiPct: 13.5 },
]

// Mock ROI inputs
export const mockRoiInputs: RoiInputs = {
  purchasePrice: 300000,
  downPct: 20,
  monthlyRent: 2400,
  monthlyExpenses: 800,
}

// Simulate async data fetching with delay
export const fetchPropertySnapshots = async (): Promise<PropertySnapshot[]> => {
  await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay
  return mockPropertySnapshots
}

export const fetchChartData = async (): Promise<ChartData[]> => {
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockChartData
}

// Safe data access with fallbacks
export const getSafePropertySnapshots = (): PropertySnapshot[] => {
  try {
    return mockPropertySnapshots
  } catch {
    return []
  }
}

export const getSafeChartData = (): ChartData[] => {
  try {
    return mockChartData
  } catch {
    return []
  }
}
