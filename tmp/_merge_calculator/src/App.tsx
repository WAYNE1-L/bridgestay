import { useMemo, useState } from 'react'
import { calculateAll, type CalculatorInputs } from './utils/calculations'

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

function Input({ label, name, value, onChange, step = 1 }: { label: string; name: keyof CalculatorInputs; value: number; onChange: (name: keyof CalculatorInputs, value: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type="number"
        step={step}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(name, parseFloat(e.target.value))}
      />
    </label>
  )
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0)
}
function formatPercent(p: number): string {
  return `${(Number.isFinite(p) ? p : 0).toFixed(1)}%`
}

export default function App() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs)
  const results = useMemo(() => calculateAll(inputs), [inputs])

  function handleChange(name: keyof CalculatorInputs, value: number) {
    setInputs((prev) => ({ ...prev, [name]: Number.isFinite(value) ? value : 0 }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Rental Property Calculator</h1>
          <p className="text-sm text-gray-600">Quickly evaluate a rental deal's cash flow, cap rate, and returns.</p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-2">
        <section className="rounded-lg border bg-white p-4 shadow-sm">
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

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Results</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat label="Monthly cash flow" value={formatCurrency(results.cashFlowMonthly)} positive={results.cashFlowMonthly >= 0} />
            <Stat label="Mortgage payment" value={formatCurrency(results.monthlyMortgage)} />
            <Stat label="NOI (monthly)" value={formatCurrency(results.noiMonthly)} />
            <Stat label="NOI (annual)" value={formatCurrency(results.noiAnnual)} />
            <Stat label="Cash on cash" value={formatPercent(results.cashOnCashReturnPercent)} />
            <Stat label="Cap rate" value={formatPercent(results.capRatePercent)} />
            <Stat label="5yr annualized" value={formatPercent(results.annualizedFiveYearReturnPercent)} />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-gray-900">Monthly expenses</h3>
          <ul className="mt-2 divide-y rounded-md border">
            <Row label="Fixed" value={formatCurrency(results.expenseBreakdownMonthly.fixed)} />
            <Row label="Variable" value={formatCurrency(results.expenseBreakdownMonthly.variable)} />
            <Row label="Total" value={formatCurrency(results.expenseBreakdownMonthly.total)} />
          </ul>

          <h3 className="mt-4 text-sm font-semibold text-gray-900">Amortization (first 12 months)</h3>
          <div className="mt-2 overflow-x-auto">
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
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-gray-500">
        Built with React, Vite, and Tailwind.
      </footer>
    </div>
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
