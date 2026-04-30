import { z } from 'zod'
import { toNum, toPct } from './number'
import { RoiSchema, ExtendedRoiSchema } from './schema'

// Extended schema with transformations for backward compatibility
export const RoiSchemaWithTransforms = z.object({
  purchasePrice: z.any().transform(toNum).pipe(z.number().min(0, { message: 'Purchase price must be greater than or equal to 0' })),
  downPct: z.any().transform(toPct).pipe(z.number().min(0).max(1, { message: 'Down payment must be between 0 and 100%' })),
  rentMonthly: z.any().transform(toNum).pipe(z.number().min(0, { message: 'Rent must be greater than or equal to 0' })),
  expensesMonthly: z.any().transform(toNum).pipe(z.number().min(0, { message: 'Expenses must be greater than or equal to 0' })),
  interestPct: z.any().transform(toPct).pipe(z.number().min(0).max(1, { message: 'Interest rate must be between 0 and 100%' })),
  years: z.any().transform(toNum).pipe(z.number().min(0, { message: 'Loan term must be greater than or equal to 0' })),
  taxPct: z.any().transform(toPct).pipe(z.number().min(0).max(1, { message: 'Tax rate must be between 0 and 100%' })),
  insuranceMonthly: z.any().transform(toNum).pipe(z.number().min(0, { message: 'Insurance must be greater than or equal to 0' })),
  hoaMonthly: z.any().transform(toNum).pipe(z.number().min(0, { message: 'HOA must be greater than or equal to 0' })),
  mgmtPct: z.any().transform(toPct).pipe(z.number().min(0).max(1, { message: 'Management rate must be between 0 and 100%' })),
  maintPct: z.any().transform(toPct).pipe(z.number().min(0).max(1, { message: 'Maintenance rate must be between 0 and 100%' })),
  vacancyPct: z.any().transform(toPct).pipe(z.number().min(0).max(1, { message: 'Vacancy rate must be between 0 and 100%' })),
})

export type RoiValues = z.output<typeof RoiSchemaWithTransforms>

export const validate = (i: unknown) => {
  const r = RoiSchemaWithTransforms.safeParse(i ?? {})
  if (!r.success) {
    const e: Record<string, string> = {}
    // Null-safe forEach with guard - prevent "Cannot read properties of undefined"
    const issues = r.error?.issues || []
    if (Array.isArray(issues)) {
      issues.forEach(x => {
        const key = x.path?.join('.') || 'unknown'
        e[key] = x.message || 'Invalid value'
      })
    }
    return { ok: false, errors: e as Record<string, string> }
  }
  return { ok: true, values: r.data as RoiValues, errors: {} as Record<string, string> }
}

// Re-export for convenience
export { RoiSchema, ExtendedRoiSchema }
export type { RoiInput, ExtendedRoiInput } from './schema'

// Legacy aliases for backward compatibility
export const validateRoiInputs = validate
export type RoiInputs = RoiValues
