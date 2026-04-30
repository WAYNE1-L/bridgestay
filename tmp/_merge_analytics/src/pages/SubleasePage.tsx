import { useState, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { Home, DollarSign, Percent, TrendingUp, Copy, RotateCcw, Printer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { NumberInput } from '../components/inputs/NumberInput'
import { safeUSD, safePct } from '../lib/format'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { SubleaseInput, SubleaseResult } from '../lib/sublease'
import { calcSublease, validateSubleaseInput } from '../lib/sublease'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot } from 'recharts'

export default function SubleasePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // State with defaults
  const [nightlyRate, setNightlyRate] = useState<number | null>(150)
  const [occupancyRate, setOccupancyRate] = useState<number | null>(70)
  const [averageStayLength, setAverageStayLength] = useState<number | null>(3)
  const [rentPaidToLandlord, setRentPaidToLandlord] = useState<number | null>(2000)
  const [utilitiesMonthly, setUtilitiesMonthly] = useState<number | null>(150)
  const [internetMonthly, setInternetMonthly] = useState<number | null>(50)
  const [cleaningFeePerStay, setCleaningFeePerStay] = useState<number | null>(50)
  const [managementFeePercent, setManagementFeePercent] = useState<number | null>(15)
  const [otherExpenses, setOtherExpenses] = useState<number | null>(100)

  const [errors, setErrors] = useState<Record<string, string>>({})

  // View mode state from URL or default to monthly
  const viewMode = (searchParams.get('period') as 'monthly' | 'annual') || 'monthly'
  
  const setViewMode = (mode: 'monthly' | 'annual') => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('period', mode)
    setSearchParams(newParams)
  }

  // Debounced values for calculations
  const debouncedNightlyRate = useDebouncedValue(nightlyRate, 300)
  const debouncedOccupancyRate = useDebouncedValue(occupancyRate, 300)
  const debouncedAverageStayLength = useDebouncedValue(averageStayLength, 300)
  const debouncedRentPaidToLandlord = useDebouncedValue(rentPaidToLandlord, 300)
  const debouncedUtilitiesMonthly = useDebouncedValue(utilitiesMonthly, 300)
  const debouncedInternetMonthly = useDebouncedValue(internetMonthly, 300)
  const debouncedCleaningFeePerStay = useDebouncedValue(cleaningFeePerStay, 300)
  const debouncedManagementFeePercent = useDebouncedValue(managementFeePercent, 300)
  const debouncedOtherExpenses = useDebouncedValue(otherExpenses, 300)

  // Validate on change
  useEffect(() => {
    if (
      debouncedNightlyRate === null ||
      debouncedOccupancyRate === null ||
      debouncedAverageStayLength === null ||
      debouncedRentPaidToLandlord === null ||
      debouncedUtilitiesMonthly === null ||
      debouncedInternetMonthly === null ||
      debouncedCleaningFeePerStay === null ||
      debouncedManagementFeePercent === null ||
      debouncedOtherExpenses === null
    ) {
      setErrors({})
      return
    }

    const validation = validateSubleaseInput({
      nightlyRate: debouncedNightlyRate,
      occupancyRate: debouncedOccupancyRate,
      averageStayLength: debouncedAverageStayLength,
      rentPaidToLandlord: debouncedRentPaidToLandlord,
      utilitiesMonthly: debouncedUtilitiesMonthly,
      internetMonthly: debouncedInternetMonthly,
      cleaningFeePerStay: debouncedCleaningFeePerStay,
      managementFeePercent: debouncedManagementFeePercent,
      otherExpenses: debouncedOtherExpenses,
    })

    if (!validation.valid) {
      // Convert errors array to record format
      const errorRecord: Record<string, string> = {}
      validation.errors.forEach((error, index) => {
        errorRecord[`error_${index}`] = error
      })
      setErrors(errorRecord)
    } else {
      setErrors({})
    }
  }, [
    debouncedNightlyRate,
    debouncedOccupancyRate,
    debouncedAverageStayLength,
    debouncedRentPaidToLandlord,
    debouncedUtilitiesMonthly,
    debouncedInternetMonthly,
    debouncedCleaningFeePerStay,
    debouncedManagementFeePercent,
    debouncedOtherExpenses,
  ])

  useEffect(() => {
    document.title = 'Sublease → Airbnb Calculator - BridgeStay Analytics'
  }, [])

  // Prepare input for calculation
  const workerInput = useMemo((): SubleaseInput | null => {
    if (
      debouncedNightlyRate === null ||
      debouncedOccupancyRate === null ||
      debouncedAverageStayLength === null ||
      debouncedRentPaidToLandlord === null ||
      debouncedUtilitiesMonthly === null ||
      debouncedInternetMonthly === null ||
      debouncedCleaningFeePerStay === null ||
      debouncedManagementFeePercent === null ||
      debouncedOtherExpenses === null
    ) {
      return null
    }

    return {
      nightlyRate: debouncedNightlyRate,
      occupancyRate: debouncedOccupancyRate,
      averageStayLength: debouncedAverageStayLength,
      rentPaidToLandlord: debouncedRentPaidToLandlord,
      utilitiesMonthly: debouncedUtilitiesMonthly,
      internetMonthly: debouncedInternetMonthly,
      cleaningFeePerStay: debouncedCleaningFeePerStay,
      managementFeePercent: debouncedManagementFeePercent,
      otherExpenses: debouncedOtherExpenses,
    }
  }, [
    debouncedNightlyRate,
    debouncedOccupancyRate,
    debouncedAverageStayLength,
    debouncedRentPaidToLandlord,
    debouncedUtilitiesMonthly,
    debouncedInternetMonthly,
    debouncedCleaningFeePerStay,
    debouncedManagementFeePercent,
    debouncedOtherExpenses,
  ])

  // Perform calculation
  const result: SubleaseResult | null = workerInput ? calcSublease(workerInput) : null

  // Generate chart data for profit vs occupancy
  const chartData = useMemo(() => {
    if (!workerInput) return []

    const data: { occupancy: number; profit: number }[] = []
    
    // Sample occupancy from 0 to 100 in steps of 5
    for (let occ = 0; occ <= 100; occ += 5) {
      const inputWithOcc = { ...workerInput, occupancyRate: occ }
      const resultForOcc = calcSublease(inputWithOcc)
      data.push({
        occupancy: occ,
        profit: resultForOcc.monthlyProfit,
      })
    }
    
    return data
  }, [workerInput])

  const getProfitColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value === 0) return 'text-gray-600'
    return 'text-red-600'
  }

  const resetForm = () => {
    setNightlyRate(150)
    setOccupancyRate(70)
    setAverageStayLength(3)
    setRentPaidToLandlord(2000)
    setUtilitiesMonthly(150)
    setInternetMonthly(50)
    setCleaningFeePerStay(50)
    setManagementFeePercent(15)
    setOtherExpenses(100)
    setErrors({})
  }

  return (
    <div className="space-y-8">
      <Helmet>
        <title>Sublease → Airbnb Calculator - BridgeStay Analytics</title>
        <meta name="description" content="Analyze sublease to Airbnb profitability with comprehensive financial metrics" />
        <meta property="og:title" content="BridgeStay Sublease → Airbnb Calculator" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.origin + '/sublease'} />
        <meta property="og:description" content="Analyze sublease to Airbnb profitability with comprehensive financial metrics" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Home className="h-8 w-8" />
            Sublease → Airbnb Calculator
          </h1>
          <p className="text-muted-foreground">
            Analyze the profitability of subleasing your property on Airbnb
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('period', viewMode)
              navigator.clipboard.writeText(url.toString())
            }} 
            className="gap-2"
          >
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
            <CardTitle>Sublease & Airbnb Settings</CardTitle>
            <CardDescription>Enter your property and Airbnb hosting details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Nightly Rate */}
            <div className="space-y-2">
              <Label htmlFor="nightlyRate">Nightly Rate</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={nightlyRate}
                  onValue={setNightlyRate}
                  min={0}
                  step={10}
                  placeholder="150"
                  className="pl-10"
                  aria-label="Nightly Rate"
                />
              </div>
            </div>

            {/* Occupancy Rate */}
            <div className="space-y-2">
              <Label htmlFor="occupancyRate">Occupancy Rate %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={occupancyRate}
                  onValue={setOccupancyRate}
                  min={0}
                  max={100}
                  step={5}
                  placeholder="70"
                  suffix="%"
                  className="pl-10"
                  aria-label="Occupancy Rate Percentage"
                />
              </div>
              {/* Slider */}
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={occupancyRate || 0}
                onChange={(e) => setOccupancyRate(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                aria-label="Occupancy Rate Slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Average Stay Length */}
            <div className="space-y-2">
              <Label htmlFor="averageStayLength">Average Stay Length (nights)</Label>
              <NumberInput
                value={averageStayLength}
                onValue={setAverageStayLength}
                min={1}
                max={30}
                step={1}
                placeholder="3"
                aria-label="Average Stay Length"
              />
            </div>

            {/* Rent Paid to Landlord */}
            <div className="space-y-2">
              <Label htmlFor="rentPaidToLandlord">Rent Paid to Landlord</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={rentPaidToLandlord}
                  onValue={setRentPaidToLandlord}
                  min={0}
                  step={50}
                  placeholder="2000"
                  className="pl-10"
                  aria-label="Rent Paid to Landlord"
                />
              </div>
            </div>

            {/* Utilities Monthly */}
            <div className="space-y-2">
              <Label htmlFor="utilitiesMonthly">Utilities (Monthly)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={utilitiesMonthly}
                  onValue={setUtilitiesMonthly}
                  min={0}
                  step={10}
                  placeholder="150"
                  className="pl-10"
                  aria-label="Monthly Utilities"
                />
              </div>
            </div>

            {/* Internet Monthly */}
            <div className="space-y-2">
              <Label htmlFor="internetMonthly">Internet (Monthly)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={internetMonthly}
                  onValue={setInternetMonthly}
                  min={0}
                  step={5}
                  placeholder="50"
                  className="pl-10"
                  aria-label="Monthly Internet"
                />
              </div>
            </div>

            {/* Cleaning Fee Per Stay */}
            <div className="space-y-2">
              <Label htmlFor="cleaningFeePerStay">Cleaning Fee (Per Stay)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={cleaningFeePerStay}
                  onValue={setCleaningFeePerStay}
                  min={0}
                  step={10}
                  placeholder="50"
                  className="pl-10"
                  aria-label="Cleaning Fee Per Stay"
                />
              </div>
            </div>

            {/* Management Fee % */}
            <div className="space-y-2">
              <Label htmlFor="managementFeePercent">Management Fee %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={managementFeePercent}
                  onValue={setManagementFeePercent}
                  min={0}
                  max={50}
                  step={1}
                  placeholder="15"
                  suffix="%"
                  className="pl-10"
                  aria-label="Management Fee Percentage"
                />
              </div>
            </div>

            {/* Other Expenses */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="otherExpenses">Other Expenses (Monthly)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <NumberInput
                  value={otherExpenses}
                  onValue={setOtherExpenses}
                  min={0}
                  step={25}
                  placeholder="100"
                  className="pl-10"
                  aria-label="Monthly Other Expenses"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Analysis Results
              </CardTitle>
              {/* View Mode Toggle */}
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode('annual')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'annual'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>
            <CardDescription>Profitability metrics based on your inputs</CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* Revenue */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Revenue</h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">{viewMode === 'monthly' ? 'Monthly' : 'Annual'} Bookings</span>
                    <span className="font-semibold">{(viewMode === 'monthly' ? result.monthlyBookings : result.monthlyBookings * 12).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">{viewMode === 'monthly' ? 'Monthly' : 'Annual'} Revenue</span>
                    <span className="font-semibold">{safeUSD(viewMode === 'monthly' ? result.monthlyRevenue : result.annualRevenue)}</span>
                  </div>
                </div>

                {/* Costs */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Costs</h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Rent to Landlord</span>
                    <span className="font-semibold">{safeUSD(debouncedRentPaidToLandlord! * (viewMode === 'monthly' ? 1 : 12))}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Utilities & Internet</span>
                    <span className="font-semibold">{safeUSD((debouncedUtilitiesMonthly! + debouncedInternetMonthly!) * (viewMode === 'monthly' ? 1 : 12))}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t">
                    <span className="text-sm font-medium">{viewMode === 'monthly' ? 'Total Monthly' : 'Total Annual'} Costs</span>
                    <span className="font-semibold">{safeUSD(viewMode === 'monthly' ? result.totalMonthlyCosts : result.totalAnnualCosts)}</span>
                  </div>
                </div>

                {/* Profitability */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Profitability</h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">NOI</span>
                    <span className={`font-semibold ${getProfitColor(viewMode === 'monthly' ? result.monthlyProfit : result.netOperatingIncome)}`}>
                      {safeUSD(viewMode === 'monthly' ? result.monthlyProfit : result.netOperatingIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">{viewMode === 'monthly' ? 'Monthly' : 'Annual'} Profit</span>
                    <span className={`font-semibold ${getProfitColor(viewMode === 'monthly' ? result.monthlyProfit : result.annualProfit)}`}>
                      {safeUSD(viewMode === 'monthly' ? result.monthlyProfit : result.annualProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Profit Margin</span>
                    <span className={`font-semibold ${getProfitColor(result.profitMarginPercent)}`}>
                      {safePct(result.profitMarginPercent)}
                    </span>
                  </div>
                </div>

                {/* Break-even */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Break-Even Analysis</h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Break-Even Nightly Rate</span>
                    <span className="font-semibold">{safeUSD(result.breakEvenNightlyRate)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Break-Even Occupancy</span>
                    <span className="font-semibold">{safePct(result.breakEvenOccupancy)}</span>
                  </div>
                </div>

                {/* Profit vs Occupancy Chart */}
                <div className="space-y-3 mt-6 pt-6 border-t">
                  <h4 className="font-medium text-sm text-muted-foreground">Profit vs Occupancy</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <defs>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#dbeafe" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#dbeafe" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="occupancy"
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickFormatter={(value) => `${value}%`}
                          ticks={[0, 25, 50, 75, 100]}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickFormatter={(value) => safeUSD(value)}
                          width={70}
                        />
                        <Tooltip
                          formatter={(value: number) => safeUSD(value)}
                          labelFormatter={(label) => `Occupancy: ${label}%`}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                        />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
                        <Line
                          type="monotone"
                          dataKey="profit"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={(props) => {
                            const isPositive = props.payload.profit >= 0
                            return <circle {...props} fill={isPositive ? '#10b981' : '#ef4444'} />
                          }}
                          activeDot={{ r: 5 }}
                        />
                        {result && (
                          <>
                            <ReferenceLine
                              x={result.breakEvenOccupancy}
                              stroke="#f59e0b"
                              strokeWidth={2}
                              label={{ value: 'Break-Even', position: 'top', fill: '#f59e0b', fontSize: 11 }}
                            />
                            <ReferenceDot
                              x={debouncedOccupancyRate || 0}
                              y={result.monthlyProfit}
                              r={6}
                              fill="#3b82f6"
                              stroke="#1d4ed8"
                              strokeWidth={2}
                            />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Chart shows monthly profit • Blue dot shows current occupancy • Break-even at {safePct(result.breakEvenOccupancy)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Enter valid values to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

