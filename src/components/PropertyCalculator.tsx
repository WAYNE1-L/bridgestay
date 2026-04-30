import { useMemo, useState } from 'react'
import { calculateAll, type CalculatorInputs } from '../utils/calculations'
import { formatCurrency, formatPercent } from '../lib/format'
import type { CalculatorResults } from '../types/results'
import { AmortizationChart } from './AmortizationChart'
import { PrintExportButton } from './PrintExportButton'
import { DollarSign, Percent, Calendar, Wrench, Shield } from 'lucide-react'

const defaultInputs: CalculatorInputs = {
  purchasePrice: 300000,
  downPaymentPercent: 20,
  interestRateAnnualPercent: 6.5,
  loanTermYears: 30,
  monthlyRent: 2400,
  vacancyPercent: 5,
  maintenancePercent: 5,
  managementPercent: 8,
  taxesMonthly: 300,
  insuranceMonthly: 120,
  otherFixedMonthly: 0,
  closingCosts: 6000,
  rehabBudget: 0,
}

// Icon mapping for input fields
const inputIcons: Record<keyof CalculatorInputs, React.ComponentType<{ className?: string }>> = {
  purchasePrice: DollarSign,
  downPaymentPercent: Percent,
  interestRateAnnualPercent: Percent,
  loanTermYears: Calendar,
  monthlyRent: DollarSign,
  vacancyPercent: Percent,
  maintenancePercent: Wrench,
  managementPercent: Percent,
  taxesMonthly: DollarSign,
  insuranceMonthly: Shield,
  otherFixedMonthly: DollarSign,
  closingCosts: DollarSign,
  rehabBudget: Wrench,
};

function Input({ label, name, value, onChange, step = 1 }: { label: string; name: keyof CalculatorInputs; value: number; onChange: (name: keyof CalculatorInputs, value: number) => void; step?: number }) {
  const IconComponent = inputIcons[name];

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <IconComponent className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(name, Number(e.target.value))}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
    </label>
  )
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-gray-600">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${positive === true ? 'text-emerald-600' : positive === false ? 'text-rose-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between px-3 py-2 text-sm">
      <span className="text-gray-700">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </li>
  )
}

export function PropertyCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs)

  const results: CalculatorResults = useMemo(() => {
    return calculateAll(inputs)
  }, [inputs])

  const handleChange = (name: keyof CalculatorInputs, value: number) => {
    setInputs(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src="/bridge-stay-logo.svg" alt="BridgeStay" className="h-8 w-8" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">BridgeStay Analytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-700 hover:text-gray-900">Dashboard</a>
              <a href="/pricing" className="text-gray-700 hover:text-gray-900">Pricing</a>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-2">
        <section className="section-wrap avoid-break rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Inputs</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Purchase price" name="purchasePrice" value={inputs.purchasePrice} onChange={handleChange} step={1000} />
            <Input label="Down payment %" name="downPaymentPercent" value={inputs.downPaymentPercent} onChange={handleChange} step={0.1} />
            <Input label="Interest rate %" name="interestRateAnnualPercent" value={inputs.interestRateAnnualPercent} onChange={handleChange} step={0.1} />
            <Input label="Loan term (years)" name="loanTermYears" value={inputs.loanTermYears} onChange={handleChange} />
            <Input label="Monthly rent" name="monthlyRent" value={inputs.monthlyRent} onChange={handleChange} step={50} />
            <Input label="Vacancy %" name="vacancyPercent" value={inputs.vacancyPercent} onChange={handleChange} step={0.5} />
            <Input label="Maintenance %" name="maintenancePercent" value={inputs.maintenancePercent} onChange={handleChange} step={0.5} />
            <Input label="Management %" name="managementPercent" value={inputs.managementPercent} onChange={handleChange} step={0.5} />
            <Input label="Taxes (monthly)" name="taxesMonthly" value={inputs.taxesMonthly} onChange={handleChange} step={10} />
            <Input label="Insurance (monthly)" name="insuranceMonthly" value={inputs.insuranceMonthly} onChange={handleChange} step={10} />
            <Input label="Other fixed (monthly)" name="otherFixedMonthly" value={inputs.otherFixedMonthly} onChange={handleChange} step={10} />
            <Input label="Closing costs" name="closingCosts" value={inputs.closingCosts} onChange={handleChange} step={500} />
            <Input label="Rehab budget" name="rehabBudget" value={inputs.rehabBudget} onChange={handleChange} step={500} />
          </div>
        </section>

        <section id="report-root" className="report-column section-wrap avoid-break rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Results</h2>
            <PrintExportButton />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="card avoid-break">
              <Stat label="Monthly cash flow" value={formatCurrency(results.summary.cashFlowMonthly)} positive={results.summary.cashFlowMonthly >= 0} />
            </div>
            <div className="card avoid-break">
              <Stat label="Mortgage payment" value={formatCurrency(results.summary.monthlyMortgage)} />
            </div>
            <div className="card avoid-break">
              <Stat label="NOI (monthly)" value={formatCurrency(results.summary.noiMonthly)} />
            </div>
            <div className="card avoid-break">
              <Stat label="NOI (annual)" value={formatCurrency(results.summary.noiAnnual)} />
            </div>
            <div className="card avoid-break">
              <Stat label="Cash on cash" value={formatPercent(results.summary.cashOnCashReturnPercent)} />
            </div>
            <div className="card avoid-break">
              <Stat label="Cap rate" value={formatPercent(results.summary.capRatePercent)} />
            </div>
            <div className="card avoid-break">
              <Stat label="5yr annualized" value={formatPercent(results.summary.annualizedFiveYearReturnPercent)} />
            </div>
          </div>

          <div className="page-break-before"></div>
          <div className="card-wrap avoid-break">
            <h3 className="mt-4 text-sm font-semibold text-gray-900">Monthly expenses</h3>
            <ul className="avoid-break mt-2 divide-y rounded-md border">
              <Row label="Fixed" value={formatCurrency(results.expenseBreakdown.fixed)} />
              <Row label="Variable" value={formatCurrency(results.expenseBreakdown.variable)} />
              <Row label="Total" value={formatCurrency(results.expenseBreakdown.total)} />
            </ul>
          </div>

          <div className="page-break-before"></div>
          <div className="card-wrap avoid-break">
            <h3 className="mt-4 text-sm font-semibold text-gray-900">Amortization (first 12 months)</h3>
            <div className="avoid-break mt-2 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-gray-700">
                  <th className="px-2 py-1 font-medium">Month</th>
                  <th className="px-2 py-1 font-medium">Principal</th>
                  <th className="px-2 py-1 font-medium">Interest</th>
                  <th className="px-2 py-1 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {results.amortization.slice(0, 12).map((p) => (
                  <tr key={p.month} className="odd:bg-gray-50">
                    <td className="px-2 py-1">{p.month}</td>
                    <td className="px-2 py-1">{formatCurrency(p.principal)}</td>
                    <td className="px-2 py-1">{formatCurrency(p.interest)}</td>
                    <td className="px-2 py-1">{formatCurrency(p.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="page-break-before"></div>
          <div className="card-wrap avoid-break">
            <AmortizationChart items={results.amortization} monthlyRent={inputs.monthlyRent} />
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-gray-500">
        Built with React, Vite, and Tailwind.
      </footer>
    </div>
  )
}
