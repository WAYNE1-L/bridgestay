import { z } from 'zod'

// Property snapshot schema
export const PropertySnapshotSchema = z.object({
  id: z.string(),
  property_address: z.string(),
  calculation_results: z.object({
    summary: z.object({
      cashFlowMonthly: z.number(),
      capRatePercent: z.number(),
      roiPercent: z.number(),
    }),
  }),
  created_at: z.string(),
})

// Chart data schema
export const ChartDataSchema = z.object({
  month: z.string(),
  cashFlow: z.number(),
  roiPct: z.number(),
})

// ROI calculation inputs schema
export const RoiInputsSchema = z.object({
  purchasePrice: z.number().min(0),
  downPct: z.number().min(0).max(100),
  monthlyRent: z.number().min(0),
  monthlyExpenses: z.number().min(0),
})

// ROI calculation results schema
export const RoiResultsSchema = z.object({
  downPayment: z.number(),
  loanAmount: z.number(),
  monthlyCashFlow: z.number(),
  annualCashFlow: z.number(),
  capRate: z.number(),
  roiPct: z.number(),
})

// Dashboard stats schema
export const DashboardStatsSchema = z.object({
  totalProperties: z.number(),
  totalCashFlowMonthly: z.number(),
  avgRoi: z.number(),
})

// Type exports
export type PropertySnapshot = z.infer<typeof PropertySnapshotSchema>
export type ChartData = z.infer<typeof ChartDataSchema>
export type RoiInputs = z.infer<typeof RoiInputsSchema>
export type RoiResults = z.infer<typeof RoiResultsSchema>
export type DashboardStats = z.infer<typeof DashboardStatsSchema>

// Navigation item type
export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}
