/**
 * Type-safe schema definitions using Zod
 */

import { z } from 'zod'

/**
 * ROI Calculator schema with validation rules
 */
export const RoiSchema = z.object({
  price: z.number().positive({ message: 'Price must be greater than 0' }),
  rent: z.number().min(0, { message: 'Rent must be greater than or equal to 0' }),
  vacancyRate: z.number().min(0).max(0.5, { message: 'Vacancy rate must be between 0 and 0.5 (50%)' }).default(0.05),
}).passthrough()

export type RoiInput = z.infer<typeof RoiSchema>

/**
 * Extended schema for full ROI calculator
 */
export const ExtendedRoiSchema = z.object({
  purchasePrice: z.number().positive({ message: 'Purchase price must be greater than 0' }),
  downPct: z.number().min(0).max(1, { message: 'Down payment percentage must be between 0 and 100%' }),
  rentMonthly: z.number().min(0, { message: 'Monthly rent must be greater than or equal to 0' }),
  expensesMonthly: z.number().min(0, { message: 'Monthly expenses must be greater than or equal to 0' }),
  interestPct: z.number().min(0).max(1, { message: 'Interest rate must be between 0 and 100%' }),
  years: z.number().min(0, { message: 'Loan term must be greater than or equal to 0' }),
  taxPct: z.number().min(0).max(1, { message: 'Tax rate must be between 0 and 100%' }),
  insuranceMonthly: z.number().min(0, { message: 'Monthly insurance must be greater than or equal to 0' }),
  hoaMonthly: z.number().min(0, { message: 'Monthly HOA must be greater than or equal to 0' }),
  mgmtPct: z.number().min(0).max(1, { message: 'Management percentage must be between 0 and 100%' }),
  maintPct: z.number().min(0).max(1, { message: 'Maintenance percentage must be between 0 and 100%' }),
  vacancyPct: z.number().min(0).max(1, { message: 'Vacancy percentage must be between 0 and 100%' }),
})

export type ExtendedRoiInput = z.infer<typeof ExtendedRoiSchema>