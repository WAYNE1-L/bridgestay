import { useState, useEffect, useMemo } from 'react'
import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Calculator, DollarSign, Percent, TrendingUp, Copy, RotateCcw, Printer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { NumberInput } from '../components/inputs/NumberInput'
import { validate } from '../lib/validation'
import { safeUSD, safePct } from '../lib/format'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useCalcWorker } from '../hooks/useCalcWorker'
import type { RoiInput } from '../lib/calc'
import { calcGRM, calcCapRate } from '../lib/calc'
import { ExportPanel } from '../components/ExportPanel'

// Lazy load the sensitivity chart
const SensitivityChart = React.lazy(() => import('../components/SensitivityChart'))

export default function RoiPage() {
  // Use number state with defaults
  const [purchasePrice, setPurchasePrice] = useState<number | null>(300000)
  const [downPct, setDownPct] = useState<number | null>(20)
  const [rentMonthly, setRentMonthly] = useState<number | null>(2400)
  const [expensesMonthly, setExpensesMonthly] = useState<number | null>(800)
  const [interestPct, setInterestPct] = useState<number | null>(6.5)
  const [years, setYears] = useState<number | null>(30)
  const [taxPct, setTaxPct] = useState<number | null>(1.2)
  const [insuranceMonthly, setInsuranceMonthly] = useState<number | null>(150)
  const [hoaMonthly, setHoaMonthly] = useState<number | null>(0)
  const [mgmtPct, setMgmtPct] = useState<number | null>(8)
  const [maintPct, setMaintPct] = useState<number | null>(5)
  const [vacancyPct, setVacancyPct] = useState<number | null>(5)

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Debounced values for calculations
  const debouncedPurchasePrice = useDebouncedValue(purchasePrice, 300)
  const debouncedDownPct = useDebouncedValue(downPct, 300)
  const debouncedRentMonthly = useDebouncedValue(rentMonthly, 300)
  const debouncedExpensesMonthly = useDebouncedValue(expensesMonthly, 300)
  const debouncedInterestPct = useDebouncedValue(interestPct, 300)
  const debouncedYears = useDebouncedValue(years, 300)
  const debouncedTaxPct = useDebouncedValue(taxPct, 300)
  const debouncedInsuranceMonthly = useDebouncedValue(insuranceMonthly, 300)
  const debouncedHoaMonthly = useDebouncedValue(hoaMonthly, 300)
  const debouncedMgmtPct = useDebouncedValue(mgmtPct, 300)
  const debouncedMaintPct = useDebouncedValue(maintPct, 300)
  const debouncedVacancyPct = useDebouncedValue(vacancyPct, 300)

  // validate on change
  useEffect(() => {
    const res = validate({
      purchasePrice: debouncedPurchasePrice?.toString() || '',
      downPct: debouncedDownPct?.toString() || '',
      rentMonthly: debouncedRentMonthly?.toString() || '',
      expensesMonthly: debouncedExpensesMonthly?.toString() || '',
      interestPct: debouncedInterestPct?.toString() || '',
      years: debouncedYears?.toString() || '',
      taxPct: debouncedTaxPct?.toString() || '',
      insuranceMonthly: debouncedInsuranceMonthly?.toString() || '',
      hoaMonthly: debouncedHoaMonthly?.toString() || '',
      mgmtPct: debouncedMgmtPct?.toString() || '',
      maintPct: debouncedMaintPct?.toString() || '',
      vacancyPct: debouncedVacancyPct?.toString() || '',
    })
    if (!res.ok) setErrors(res.errors)
    else setErrors({})
  }, [debouncedPurchasePrice, debouncedDownPct, debouncedRentMonthly, debouncedExpensesMonthly, debouncedInterestPct, debouncedYears, debouncedTaxPct, debouncedInsuranceMonthly, debouncedHoaMonthly, debouncedMgmtPct, debouncedMaintPct, debouncedVacancyPct])

  useEffect(() => {
    document.title = 'ROI Calculator - BridgeStay Analytics'
  }, [])

  // Prepare input for worker calculation
  const workerInput = useMemo((): RoiInput | null => {
    // Check if all required values are present
    if (
      debouncedPurchasePrice === null ||
      debouncedDownPct === null ||
      debouncedRentMonthly === null ||
      debouncedExpensesMonthly === null ||
      debouncedInterestPct === null ||
      debouncedYears === null ||
      debouncedTaxPct === null ||
      debouncedInsuranceMonthly === null ||
      debouncedHoaMonthly === null ||
      debouncedMgmtPct === null ||
      debouncedMaintPct === null ||
      debouncedVacancyPct === null
    ) {
      return null
    }

    return {
      purchasePrice: debouncedPurchasePrice,
      downPct: debouncedDownPct,
      rentMonthly: debouncedRentMonthly,
      expensesMonthly: debouncedExpensesMonthly,
      interestPct: debouncedInterestPct,
      years: debouncedYears,
      taxPct: debouncedTaxPct,
      insuranceMonthly: debouncedInsuranceMonthly,
      hoaMonthly: debouncedHoaMonthly,
      mgmtPct: debouncedMgmtPct,
      maintPct: debouncedMaintPct,
      vacancyPct: debouncedVacancyPct,
    }
  }, [
    debouncedPurchasePrice, debouncedDownPct, debouncedRentMonthly, debouncedExpensesMonthly,
    debouncedInterestPct, debouncedYears, debouncedTaxPct, debouncedInsuranceMonthly, debouncedHoaMonthly,
    debouncedMgmtPct, debouncedMaintPct, debouncedVacancyPct
  ])

  // Use worker for calculations
  const { loading: calcLoading, data: calcResult, error: calcError } = useCalcWorker(workerInput)

  // Validate input for error display
  const validationResult = workerInput ? validate({
    purchasePrice: workerInput.purchasePrice.toString(),
    downPct: workerInput.downPct.toString(),
    rentMonthly: workerInput.rentMonthly.toString(),
    expensesMonthly: workerInput.expensesMonthly.toString(),
    interestPct: workerInput.interestPct.toString(),
    years: workerInput.years.toString(),
    taxPct: workerInput.taxPct.toString(),
    insuranceMonthly: workerInput.insuranceMonthly.toString(),
    hoaMonthly: workerInput.hoaMonthly.toString(),
    mgmtPct: workerInput.mgmtPct.toString(),
    maintPct: workerInput.maintPct.toString(),
    vacancyPct: workerInput.vacancyPct.toString(),
  }) : { ok: false, errors: {}, values: undefined }

  const valid = validationResult.ok && calcResult !== null
  const out = calcResult

  const getCashFlowColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value === 0) return 'text-gray-600'
    return 'text-red-600'
  }

  const resetForm = () => {
    setPurchasePrice(300000)
    setDownPct(20)
    setRentMonthly(2400)
    setExpensesMonthly(800)
    setInterestPct(6.5)
    setYears(30)
    setTaxPct(1.2)
    setInsuranceMonthly(150)
    setHoaMonthly(0)
    setMgmtPct(8)
    setMaintPct(5)
    setVacancyPct(5)
    setErrors({})
  }

  return (
    <div id="roi-report-root" className="space-y-8">
      <Helmet>
        <title>BridgeStay ROI Calculator</title>
        <meta name="description" content="Calculate GRM, Cap Rate, and ROI easily with our comprehensive real estate calculator" />
        <meta property="og:title" content="BridgeStay ROI Calculator" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.origin + '/roi'} />
        <meta property="og:description" content="Calculate GRM, Cap Rate, and ROI easily with our comprehensive real estate calculator" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            ROI Calculator
          </h1>
          <p className="text-muted-foreground">
            Comprehensive real estate investment analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href)} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Property Details & Financing</CardTitle>
            <CardDescription>Enter the property and loan information</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Purchase Price */}
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={purchasePrice}
                  onValue={setPurchasePrice}
                  min={0}
                  step={1000}
                  placeholder="300,000"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.purchasePrice ? 'border-red-500' : ''}`}
                  aria-label="Purchase Price"
                />
              </div>
              {errors.purchasePrice && <p className="mt-1 text-sm text-rose-600">{errors.purchasePrice}</p>}
            </div>

            {/* Down Payment % */}
            <div className="space-y-2">
              <Label htmlFor="downPct">Down Payment %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={downPct}
                  onValue={setDownPct}
                  min={0}
                  max={100}
                  step={1}
                  placeholder="20"
                  suffix="%"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.downPct ? 'border-red-500' : ''}`}
                  aria-label="Down Payment Percentage"
                />
              </div>
              {errors.downPct && <p className="mt-1 text-sm text-rose-600">{errors.downPct}</p>}
            </div>

            {/* Monthly Rent */}
            <div className="space-y-2">
              <Label htmlFor="rentMonthly">Monthly Rent</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={rentMonthly}
                  onValue={setRentMonthly}
                  min={0}
                  step={50}
                  placeholder="2400"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.rentMonthly ? 'border-red-500' : ''}`}
                  aria-label="Monthly Rent"
                />
              </div>
              {errors.rentMonthly && <p className="mt-1 text-sm text-rose-600">{errors.rentMonthly}</p>}
            </div>

            {/* Monthly Expenses */}
            <div className="space-y-2">
              <Label htmlFor="expensesMonthly">Monthly Expenses</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={expensesMonthly}
                  onValue={setExpensesMonthly}
                  min={0}
                  step={50}
                  placeholder="800"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.expensesMonthly ? 'border-red-500' : ''}`}
                  aria-label="Monthly Expenses"
                />
              </div>
              {errors.expensesMonthly && <p className="mt-1 text-sm text-rose-600">{errors.expensesMonthly}</p>}
            </div>

            {/* Interest Rate % */}
            <div className="space-y-2">
              <Label htmlFor="interestPct">Interest Rate %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={interestPct}
                  onValue={setInterestPct}
                  min={0}
                  max={30}
                  step={0.1}
                  placeholder="6.5"
                  suffix="%"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.interestPct ? 'border-red-500' : ''}`}
                  aria-label="Interest Rate Percentage"
                />
              </div>
              {errors.interestPct && <p className="mt-1 text-sm text-rose-600">{errors.interestPct}</p>}
            </div>

            {/* Loan Years */}
            <div className="space-y-2">
              <Label htmlFor="years">Loan Years</Label>
              <NumberInput
                value={years}
                onValue={setYears}
                min={1}
                max={50}
                step={1}
                placeholder="30"
                className={`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.years ? 'border-red-500' : ''}`}
                aria-label="Loan Years"
              />
              {errors.years && <p className="mt-1 text-sm text-rose-600">{errors.years}</p>}
            </div>

            {/* Property Tax % */}
            <div className="space-y-2">
              <Label htmlFor="taxPct">Property Tax % (Annual)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={taxPct}
                  onValue={setTaxPct}
                  min={0}
                  max={10}
                  step={0.1}
                  placeholder="1.2"
                  suffix="%"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.taxPct ? 'border-red-500' : ''}`}
                  aria-label="Property Tax Percentage"
                />
              </div>
              {errors.taxPct && <p className="mt-1 text-sm text-rose-600">{errors.taxPct}</p>}
            </div>

            {/* Monthly Insurance */}
            <div className="space-y-2">
              <Label htmlFor="insuranceMonthly">Monthly Insurance</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={insuranceMonthly}
                  onValue={setInsuranceMonthly}
                  min={0}
                  step={10}
                  placeholder="150"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.insuranceMonthly ? 'border-red-500' : ''}`}
                  aria-label="Monthly Insurance"
                />
              </div>
              {errors.insuranceMonthly && <p className="mt-1 text-sm text-rose-600">{errors.insuranceMonthly}</p>}
            </div>

            {/* Monthly HOA */}
            <div className="space-y-2">
              <Label htmlFor="hoaMonthly">Monthly HOA</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={hoaMonthly}
                  onValue={setHoaMonthly}
                  min={0}
                  step={25}
                  placeholder="0"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.hoaMonthly ? 'border-red-500' : ''}`}
                  aria-label="Monthly HOA"
                />
              </div>
              {errors.hoaMonthly && <p className="mt-1 text-sm text-rose-600">{errors.hoaMonthly}</p>}
            </div>

            {/* Management Fee % */}
            <div className="space-y-2">
              <Label htmlFor="mgmtPct">Management Fee %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={mgmtPct}
                  onValue={setMgmtPct}
                  min={0}
                  max={20}
                  step={0.5}
                  placeholder="8"
                  suffix="%"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.mgmtPct ? 'border-red-500' : ''}`}
                  aria-label="Management Fee Percentage"
                />
              </div>
              {errors.mgmtPct && <p className="mt-1 text-sm text-rose-600">{errors.mgmtPct}</p>}
            </div>

            {/* Maintenance % */}
            <div className="space-y-2">
              <Label htmlFor="maintPct">Maintenance %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={maintPct}
                  onValue={setMaintPct}
                  min={0}
                  max={20}
                  step={0.5}
                  placeholder="5"
                  suffix="%"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.maintPct ? 'border-red-500' : ''}`}
                  aria-label="Maintenance Percentage"
                />
              </div>
              {errors.maintPct && <p className="mt-1 text-sm text-rose-600">{errors.maintPct}</p>}
            </div>

            {/* Vacancy % */}
            <div className="space-y-2">
              <Label htmlFor="vacancyPct">Vacancy %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={vacancyPct}
                  onValue={setVacancyPct}
                  min={0}
                  max={20}
                  step={0.5}
                  placeholder="5"
                  suffix="%"
                  className={`pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${errors.vacancyPct ? 'border-red-500' : ''}`}
                  aria-label="Vacancy Percentage"
                />
              </div>
              {errors.vacancyPct && <p className="mt-1 text-sm text-rose-600">{errors.vacancyPct}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Investment Analysis
            </CardTitle>
            <CardDescription>Calculated metrics based on your inputs</CardDescription>
          </CardHeader>
          <CardContent>
            {calcLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Calculating...
                </div>
              </div>
            ) : calcError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-2">Calculation Error</p>
                <p className="text-sm text-muted-foreground">{calcError}</p>
              </div>
            ) : valid && out ? (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Property Details</h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Purchase Price</span>
                    <span className="font-semibold">{safeUSD(out.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Down Payment</span>
                    <span className="font-semibold">{safeUSD(out.downPayment)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Loan Amount</span>
                    <span className="font-semibold">{safeUSD(out.loanAmount)}</span>
                  </div>
                </div>

                {/* Monthly Expenses Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Monthly Expenses</h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Principal & Interest</span>
                    <span className="font-semibold">{safeUSD(out.pi)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Property Tax</span>
                    <span className="font-semibold">{safeUSD(out.tax)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Insurance</span>
                    <span className="font-semibold">{safeUSD(out.insurance)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">HOA</span>
                    <span className="font-semibold">{safeUSD(out.hoa)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Management</span>
                    <span className="font-semibold">{safeUSD(out.mgmt)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Maintenance</span>
                    <span className="font-semibold">{safeUSD(out.maint)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Vacancy</span>
                    <span className="font-semibold">{safeUSD(out.vac)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t">
                    <span className="text-sm font-medium">Total Expenses</span>
                    <span className="font-semibold">{safeUSD(out.totalExpenses)}</span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Key Metrics</h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Monthly Cash Flow</span>
                    <span className={`font-semibold ${getCashFlowColor(out.monthlyCashFlow)}`}>
                      {safeUSD(out.monthlyCashFlow)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Annual Cash Flow</span>
                    <span className={`font-semibold ${getCashFlowColor(out.annualCashFlow)}`}>
                      {safeUSD(out.annualCashFlow)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Cap Rate</span>
                    <span className="font-semibold">{safePct(out.capRate)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Cash on Cash Return</span>
                    <span className="font-semibold">{safePct(out.coc)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">DSCR</span>
                    <span className="font-semibold">{safePct(out.dscr)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Break-Even Rent</span>
                    <span className="font-semibold">{safeUSD(out.breakEvenRent)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Enter valid values to see results</p>
                {Object.keys(errors).length > 0 && (
                  <div className="mt-4 space-y-1">
                    {Object.entries(errors).map(([field, message]) => (
                      <p key={field} className="text-sm text-red-600">{message}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sensitivity Chart */}
      {valid && workerInput ? (
        <React.Suspense fallback={<div className="p-6 text-sm text-black/60">Loading chart…</div>}>
          <SensitivityChart values={workerInput} />
        </React.Suspense>
      ) : (
        <div className="rounded-2xl border p-6 text-sm text-black/60">Enter valid inputs to see the sensitivity chart.</div>
      )}

      {/* Export Panel */}
      {valid && workerInput && (
        <ExportPanel
          elementId="roi-report-root"
          data={workerInput}
          metadata={{
            propertyName: `Property Analysis - $${workerInput.purchasePrice.toLocaleString()}`,
            description: `ROI Analysis: ${safePct(out?.capRate || 0)} Cap Rate, ${safeUSD(out?.monthlyCashFlow || 0)} Monthly Cash Flow`,
          }}
          onExport={(result) => {
            if (result.success) {
              console.log('Export successful:', result.filename)
            } else {
              console.error('Export failed:', result.error)
            }
          }}
        />
      )}
    </div>
  )
}