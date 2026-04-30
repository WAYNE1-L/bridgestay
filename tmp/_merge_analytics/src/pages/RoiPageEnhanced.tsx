import { useState, useEffect, useCallback } from 'react'
import { Calculator, DollarSign, Percent, TrendingUp, Info, Share2, Printer, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import { RoiInputs } from '../lib/finance'
import { usd, pct, number, formatWithSeparators, parseFormattedNumber } from '../lib/format'
import { handleNumericInput } from '../lib/inputHelpers'
import { RoiInputsSchema } from '../lib/validation'
import { ZodError } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { SensitivityCard } from '../components/SensitivityCard'
import { useFinanceWorker } from '../hooks/useFinanceWorker'
import { useTranslation } from '../lib/i18n'

const defaultInputs: RoiInputs = {
  purchasePrice: 300000,
  downPct: 20,
  monthlyRent: 2400,
  interestRate: 6.5,
  loanYears: 30,
  propertyTaxPct: 1.2,
  insuranceMonthly: 100,
  hoaMonthly: 0,
  mgmtPct: 8,
  maintenancePct: 10,
  vacancyPct: 5,
}

const STORAGE_KEY = 'roi-calculator-inputs'

export default function RoiPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [inputs, setInputs] = useState<RoiInputs>(() => {
    // 1. Try to load from URL
    const params = new URLSearchParams(location.search)
    const urlInputs: Partial<RoiInputs> = {}
    for (const key of Object.keys(defaultInputs) as Array<keyof RoiInputs>) {
      const value = params.get(key)
      if (value !== null) {
        urlInputs[key] = parseFloat(value)
      }
    }
    if (Object.keys(urlInputs).length > 0) {
      return { ...defaultInputs, ...urlInputs }
    }

    // 2. Fallback to localStorage
    const savedInputs = localStorage.getItem(STORAGE_KEY)
    if (savedInputs) {
      try {
        return { ...defaultInputs, ...JSON.parse(savedInputs) }
      } catch (e) {
        console.error("Failed to parse localStorage inputs:", e)
        return defaultInputs
      }
    }

    // 3. Fallback to default
    return defaultInputs
  })

  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isValid, setIsValid] = useState(false)

  // Use Web Worker for calculations
  const { results, isCalculating, error: workerError, calculateDebounced } = useFinanceWorker({
    debounceMs: 150,
    onError: (error) => {
      console.error('Worker calculation error:', error)
    }
  })

  useEffect(() => {
    document.title = `${t('calculator.title')} - BridgeStay Analytics`
  }, [t])

  // Recalculate results and validate on input change
  useEffect(() => {
    try {
      const validatedInputs = RoiInputsSchema.parse(inputs)
      setErrors({})
      setIsValid(true)
      
      // Use Web Worker for calculation
      calculateDebounced(validatedInputs)

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))

      // Update URL
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(inputs)) {
        params.set(key, String(value))
      }
      navigate(`?${params.toString()}`, { replace: true })

    } catch (e) {
      if (e instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {}
        e.errors.forEach((err) => {
          const field = err.path[0] as string
          if (!fieldErrors[field]) {
            fieldErrors[field] = []
          }
          fieldErrors[field].push(err.message)
        })
        setErrors(fieldErrors)
        setIsValid(false)
      } else {
        console.error("Unexpected error during calculation:", e)
        setErrors({ general: ["An unexpected error occurred."] })
        setIsValid(false)
      }
    }
  }, [inputs, navigate, calculateDebounced])

  const handleInputChange = useCallback((field: keyof RoiInputs, value: string) => {
    // For percentage fields, allow decimals
    if (['downPct', 'interestRate', 'propertyTaxPct', 'mgmtPct', 'maintenancePct', 'vacancyPct'].includes(field)) {
      const numValue = parseFloat(value)
      setInputs((prev) => ({
        ...prev,
        [field]: isNaN(numValue) ? 0 : numValue,
      }))
    } else {
      // For currency/whole number fields, sanitize to integer before parsing
      const numValue = parseFormattedNumber(value)
      setInputs((prev) => ({
        ...prev,
        [field]: isNaN(numValue) ? 0 : numValue,
      }))
    }
  }, [])

  const handleBlur = useCallback((field: keyof RoiInputs) => {
    // Apply thousand separators on blur for currency fields
    if (['purchasePrice', 'monthlyRent', 'insuranceMonthly', 'hoaMonthly'].includes(field)) {
      const currentValue = inputs[field]
      if (typeof currentValue === 'number') {
        setInputs(prev => ({
          ...prev,
          [field]: parseFormattedNumber(formatWithSeparators(currentValue))
        }))
      }
    }
  }, [inputs])

  const getStatusColor = (value: number) => {
    if (value > 0) return 'text-emerald-600 dark:text-emerald-400'
    if (value < 0) return 'text-rose-600 dark:text-rose-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const handleReset = () => {
    setInputs(defaultInputs)
    localStorage.removeItem(STORAGE_KEY)
    navigate('.', { replace: true })
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }

  const handlePrint = () => {
    window.print()
  }

  // Generate unique IDs for accessibility
  const getFieldId = (field: string) => `roi-${field}`
  const getErrorId = (field: string) => `roi-${field}-error`
  const getDescriptionId = (field: string) => `roi-${field}-description`

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="h-8 w-8" />
              {t('calculator.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('calculator.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('common.reset')}
            </Button>
            <Button variant="outline" onClick={handleCopyLink} className="gap-2">
              <Share2 className="h-4 w-4" />
              {t('common.share')}
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              {t('common.print')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('calculator.propertyDetails')}</CardTitle>
              <CardDescription>{t('calculator.financing')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Purchase Price */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('purchasePrice')}>{t('calculator.purchasePrice')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('purchasePrice')}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formatWithSeparators(inputs.purchasePrice)}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('purchasePrice', value))}
                    onBlur={() => handleBlur('purchasePrice')}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.purchasePrice ? 'border-red-500' : ''}`}
                    placeholder="300,000"
                    aria-describedby={`${getDescriptionId('purchasePrice')} ${errors.purchasePrice ? getErrorId('purchasePrice') : ''}`}
                    aria-invalid={!!errors.purchasePrice}
                  />
                </div>
                <div id={getDescriptionId('purchasePrice')} className="text-sm text-muted-foreground">
                  Total property purchase price
                </div>
                {errors.purchasePrice && (
                  <div id={getErrorId('purchasePrice')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.purchasePrice}
                  </div>
                )}
              </div>

              {/* Down Payment % */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('downPct')}>{t('calculator.downPayment')}</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('downPct')}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    step="0.1"
                    value={inputs.downPct}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('downPct', value))}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.downPct ? 'border-red-500' : ''}`}
                    placeholder="20"
                    aria-describedby={`${getDescriptionId('downPct')} ${errors.downPct ? getErrorId('downPct') : ''}`}
                    aria-invalid={!!errors.downPct}
                  />
                </div>
                <div id={getDescriptionId('downPct')} className="text-sm text-muted-foreground">
                  Down payment as percentage of purchase price
                </div>
                {errors.downPct && (
                  <div id={getErrorId('downPct')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.downPct}
                  </div>
                )}
              </div>

              {/* Monthly Rent */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('monthlyRent')}>{t('calculator.monthlyRent')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('monthlyRent')}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formatWithSeparators(inputs.monthlyRent)}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('monthlyRent', value))}
                    onBlur={() => handleBlur('monthlyRent')}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.monthlyRent ? 'border-red-500' : ''}`}
                    placeholder="2400"
                    aria-describedby={`${getDescriptionId('monthlyRent')} ${errors.monthlyRent ? getErrorId('monthlyRent') : ''}`}
                    aria-invalid={!!errors.monthlyRent}
                  />
                </div>
                <div id={getDescriptionId('monthlyRent')} className="text-sm text-muted-foreground">
                  Expected monthly rental income
                </div>
                {errors.monthlyRent && (
                  <div id={getErrorId('monthlyRent')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.monthlyRent}
                  </div>
                )}
              </div>

              {/* Interest Rate % */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('interestRate')}>{t('calculator.interestRate')}</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('interestRate')}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    step="0.01"
                    value={inputs.interestRate}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('interestRate', value))}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.interestRate ? 'border-red-500' : ''}`}
                    placeholder="6.5"
                    aria-describedby={`${getDescriptionId('interestRate')} ${errors.interestRate ? getErrorId('interestRate') : ''}`}
                    aria-invalid={!!errors.interestRate}
                  />
                </div>
                <div id={getDescriptionId('interestRate')} className="text-sm text-muted-foreground">
                  Annual interest rate for the loan
                </div>
                {errors.interestRate && (
                  <div id={getErrorId('interestRate')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.interestRate}
                  </div>
                )}
              </div>

              {/* Loan Term (Years) */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('loanYears')}>{t('calculator.loanYears')}</Label>
                <Input
                  id={getFieldId('loanYears')}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputs.loanYears}
                  onChange={(e) => handleNumericInput(e, (value) => handleInputChange('loanYears', value))}
                  className={`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.loanYears ? 'border-red-500' : ''}`}
                  placeholder="30"
                  aria-describedby={`${getDescriptionId('loanYears')} ${errors.loanYears ? getErrorId('loanYears') : ''}`}
                  aria-invalid={!!errors.loanYears}
                />
                <div id={getDescriptionId('loanYears')} className="text-sm text-muted-foreground">
                  Loan term in years
                </div>
                {errors.loanYears && (
                  <div id={getErrorId('loanYears')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.loanYears}
                  </div>
                )}
              </div>

              {/* Property Tax % */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('propertyTaxPct')}>{t('calculator.propertyTax')}</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('propertyTaxPct')}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    step="0.01"
                    value={inputs.propertyTaxPct}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('propertyTaxPct', value))}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.propertyTaxPct ? 'border-red-500' : ''}`}
                    placeholder="1.2"
                    aria-describedby={`${getDescriptionId('propertyTaxPct')} ${errors.propertyTaxPct ? getErrorId('propertyTaxPct') : ''}`}
                    aria-invalid={!!errors.propertyTaxPct}
                  />
                </div>
                <div id={getDescriptionId('propertyTaxPct')} className="text-sm text-muted-foreground">
                  Annual property tax rate
                </div>
                {errors.propertyTaxPct && (
                  <div id={getErrorId('propertyTaxPct')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.propertyTaxPct}
                  </div>
                )}
              </div>

              {/* Monthly Insurance */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('insuranceMonthly')}>{t('calculator.insurance')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('insuranceMonthly')}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formatWithSeparators(inputs.insuranceMonthly)}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('insuranceMonthly', value))}
                    onBlur={() => handleBlur('insuranceMonthly')}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.insuranceMonthly ? 'border-red-500' : ''}`}
                    placeholder="100"
                    aria-describedby={`${getDescriptionId('insuranceMonthly')} ${errors.insuranceMonthly ? getErrorId('insuranceMonthly') : ''}`}
                    aria-invalid={!!errors.insuranceMonthly}
                  />
                </div>
                <div id={getDescriptionId('insuranceMonthly')} className="text-sm text-muted-foreground">
                  Monthly insurance premium
                </div>
                {errors.insuranceMonthly && (
                  <div id={getErrorId('insuranceMonthly')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.insuranceMonthly}
                  </div>
                )}
              </div>

              {/* Monthly HOA */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('hoaMonthly')}>{t('calculator.hoa')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('hoaMonthly')}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formatWithSeparators(inputs.hoaMonthly)}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('hoaMonthly', value))}
                    onBlur={() => handleBlur('hoaMonthly')}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.hoaMonthly ? 'border-red-500' : ''}`}
                    placeholder="0"
                    aria-describedby={`${getDescriptionId('hoaMonthly')} ${errors.hoaMonthly ? getErrorId('hoaMonthly') : ''}`}
                    aria-invalid={!!errors.hoaMonthly}
                  />
                </div>
                <div id={getDescriptionId('hoaMonthly')} className="text-sm text-muted-foreground">
                  Monthly HOA fees
                </div>
                {errors.hoaMonthly && (
                  <div id={getErrorId('hoaMonthly')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.hoaMonthly}
                  </div>
                )}
              </div>

              {/* Management Fee % */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('mgmtPct')}>{t('calculator.management')}</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('mgmtPct')}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    step="0.1"
                    value={inputs.mgmtPct}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('mgmtPct', value))}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.mgmtPct ? 'border-red-500' : ''}`}
                    placeholder="8"
                    aria-describedby={`${getDescriptionId('mgmtPct')} ${errors.mgmtPct ? getErrorId('mgmtPct') : ''}`}
                    aria-invalid={!!errors.mgmtPct}
                  />
                </div>
                <div id={getDescriptionId('mgmtPct')} className="text-sm text-muted-foreground">
                  Property management fee percentage
                </div>
                {errors.mgmtPct && (
                  <div id={getErrorId('mgmtPct')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.mgmtPct}
                  </div>
                )}
              </div>

              {/* Maintenance % */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('maintenancePct')}>{t('calculator.maintenance')}</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('maintenancePct')}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    step="0.1"
                    value={inputs.maintenancePct}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('maintenancePct', value))}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.maintenancePct ? 'border-red-500' : ''}`}
                    placeholder="10"
                    aria-describedby={`${getDescriptionId('maintenancePct')} ${errors.maintenancePct ? getErrorId('maintenancePct') : ''}`}
                    aria-invalid={!!errors.maintenancePct}
                  />
                </div>
                <div id={getDescriptionId('maintenancePct')} className="text-sm text-muted-foreground">
                  Maintenance reserve percentage
                </div>
                {errors.maintenancePct && (
                  <div id={getErrorId('maintenancePct')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.maintenancePct}
                  </div>
                )}
              </div>

              {/* Vacancy % */}
              <div className="space-y-2">
                <Label htmlFor={getFieldId('vacancyPct')}>{t('calculator.vacancy')}</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={getFieldId('vacancyPct')}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    step="0.1"
                    value={inputs.vacancyPct}
                    onChange={(e) => handleNumericInput(e, (value) => handleInputChange('vacancyPct', value))}
                    className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.vacancyPct ? 'border-red-500' : ''}`}
                    placeholder="5"
                    aria-describedby={`${getDescriptionId('vacancyPct')} ${errors.vacancyPct ? getErrorId('vacancyPct') : ''}`}
                    aria-invalid={!!errors.vacancyPct}
                  />
                </div>
                <div id={getDescriptionId('vacancyPct')} className="text-sm text-muted-foreground">
                  Vacancy allowance percentage
                </div>
                {errors.vacancyPct && (
                  <div id={getErrorId('vacancyPct')} role="alert" aria-live="polite" className="text-red-500 text-sm">
                    {errors.vacancyPct}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('calculator.results')}
              </CardTitle>
              <CardDescription>Calculated metrics based on your inputs</CardDescription>
            </CardHeader>
            <CardContent>
              {isCalculating && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  Calculating...
                </div>
              )}
              
              {workerError && (
                <div className="text-center py-8 text-red-500">
                  <p>Calculation error: {workerError}</p>
                </div>
              )}

              {!isCalculating && !workerError && isValid && results ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.downPaymentAmount')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The initial cash payment towards the property purchase.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">{usd(results.downPayment)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.loanAmount')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The total amount borrowed for the property.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">{usd(results.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.monthlyPI')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Monthly Principal & Interest payment on the loan.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">{usd(results.monthlyPI)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.totalMonthlyExpenses')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sum of all monthly operating expenses including P&I, taxes, insurance, HOA, management, maintenance, and vacancy.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">{usd(results.totalMonthlyExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.monthlyCashFlow')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Net income after all monthly expenses are paid (Rent - Total Expenses).</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className={`font-semibold ${getStatusColor(results.monthlyCashFlow)}`}>
                      {usd(results.monthlyCashFlow)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.annualCashFlow')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total cash flow generated over a year.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className={`font-semibold ${getStatusColor(results.annualCashFlow)}`}>
                      {usd(results.annualCashFlow)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.capRate')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Capitalization Rate: Net Operating Income / Purchase Price. Measures profitability relative to cost.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">{pct(results.capRate)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.roi')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Annual Cash Flow / Total Cash Invested. Measures return on actual cash invested.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className={`font-semibold ${getStatusColor(results.cocReturn)}`}>
                      {pct(results.cocReturn)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{t('calculator.dscr')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Debt Service Coverage Ratio: Net Operating Income / Total Debt Service. Lenders use this to assess loan risk.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">{number(results.dscr, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">{t('calculator.breakEvenRent')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The minimum monthly rent needed to cover all expenses.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">{usd(results.breakEvenRent)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Enter valid property details to see calculations
                  {Object.keys(errors).length > 0 && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm text-left">
                      <p className="font-medium mb-2">Please fix the following errors:</p>
                      <ul className="list-disc pl-5">
                        {Object.entries(errors).map(([field, fieldErrors]) => (
                          <li key={field}>
                            <strong>{field}:</strong> {fieldErrors?.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isValid && results && (
          <SensitivityCard currentInputs={inputs} currentResults={results} />
        )}
      </div>
    </TooltipProvider>
  )
}
