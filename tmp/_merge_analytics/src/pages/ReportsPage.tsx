import { useState, useEffect } from 'react'
import { FileText, Printer, Share2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { Section } from '../components/ui/Section'
import { KeyValue } from '../components/ui/KeyValue'
import { ReportHeader } from '../components/ui/ReportHeader'
import { usd, pct } from '../lib/format'

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeModules, setActiveModules] = useState({
    propertyAnalysis: true,
    cashFlow: true,
    expenseBreakdown: true,
    marketComparison: true,
  })

  useEffect(() => {
    document.title = 'Investment Reports - BridgeStay Analytics'
  }, [])

  const handleDownloadReport = () => {
    setIsGenerating(true)
    
    // Simulate report generation
    setTimeout(() => {
      // Add print class to body for print styles
      document.body.classList.add('print-mode')
      
      // Trigger print dialog
      window.print()
      
      // Remove print class after print dialog closes
      setTimeout(() => {
        document.body.classList.remove('print-mode')
        setIsGenerating(false)
      }, 1000)
    }, 500)
  }

  const handleToggleModule = (module: keyof typeof activeModules) => {
    setActiveModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }))
  }

  // Mock report data
  const reportData = {
    propertyAddress: '123 Main St, Austin, TX',
    analysisDate: new Date().toLocaleDateString(),
    summary: {
      monthlyCashFlow: 1200,
      annualCashFlow: 14400,
      capRate: 8.5,
      roi: 12.3,
      totalInvested: 60000,
    },
    expenses: [
      { category: 'Mortgage Payment (P&I)', amount: 1200 },
      { category: 'Property Management', amount: 192 },
      { category: 'Maintenance', amount: 120 },
      { category: 'Insurance & Taxes', amount: 288 },
    ],
    financialMetrics: [
      { label: 'Purchase Price', value: 300000 },
      { label: 'Down Payment', value: 60000 },
      { label: 'Monthly Rent', value: 2400 },
      { label: 'Monthly Expenses', value: 1200 },
      { label: 'Monthly Cash Flow', value: 1200 },
      { label: 'Cap Rate', value: 8.5 },
      { label: 'ROI', value: 12.3 },
    ]
  }

  const summaryBadges = [
    { label: 'Monthly Cash Flow', value: usd(reportData.summary.monthlyCashFlow) },
    { label: 'Annual Cash Flow', value: usd(reportData.summary.annualCashFlow) },
    { label: 'Cap Rate', value: pct(reportData.summary.capRate) },
    { label: 'ROI', value: pct(reportData.summary.roi) },
  ]

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Investment Reports
            </h1>
            <p className="text-muted-foreground">
              Generate and download detailed property analysis reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadReport} 
              disabled={isGenerating}
              className="gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Printer className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Print Report'}
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Module Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Modules</CardTitle>
            <CardDescription>Select which sections to include in your report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeModules.propertyAnalysis}
                  onChange={() => handleToggleModule('propertyAnalysis')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Property Analysis</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeModules.cashFlow}
                  onChange={() => handleToggleModule('cashFlow')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Cash Flow</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeModules.expenseBreakdown}
                  onChange={() => handleToggleModule('expenseBreakdown')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Expense Breakdown</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeModules.marketComparison}
                  onChange={() => handleToggleModule('marketComparison')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Market Comparison</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card id="report-content" className="shadow-lg">
          <CardContent className="p-8">
            {/* Report Header */}
            <ReportHeader
              propertyAddress={reportData.propertyAddress}
              analysisDate={reportData.analysisDate}
              summaryBadges={summaryBadges}
            />

            {/* Executive Summary */}
            {activeModules.propertyAnalysis && (
              <Section title="Executive Summary" accent="blue">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Property at <strong>{reportData.propertyAddress}</strong> shows{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    positive cash flow of {usd(reportData.summary.monthlyCashFlow)}/month
                  </span>{' '}
                  with {pct(reportData.summary.capRate)} cap rate and {pct(reportData.summary.roi)} ROI. 
                  This investment demonstrates strong potential for consistent returns and portfolio growth.
                </p>
              </Section>
            )}

            {/* Financial Metrics */}
            {activeModules.cashFlow && (
              <Section title="Financial Metrics" accent="green" desc="Key performance indicators and investment metrics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportData.financialMetrics.map((metric, index) => {
                    const isCashFlow = metric.label.includes('Cash Flow')
                    const isPositive = metric.value > 0
                    const tone = isCashFlow ? (isPositive ? 'positive' : 'negative') : 'neutral'
                    
                    let formattedValue: string
                    if (metric.label.includes('Rate') || metric.label.includes('ROI')) {
                      formattedValue = pct(metric.value)
                    } else {
                      formattedValue = usd(metric.value)
                    }
                    
                    return (
                      <KeyValue
                        key={index}
                        label={metric.label}
                        value={formattedValue}
                        tone={tone}
                      />
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Expense Analysis */}
            {activeModules.expenseBreakdown && (
              <Section title="Expense Analysis" accent="purple" desc="Monthly operating expenses breakdown">
                <div className="space-y-3">
                  {reportData.expenses.map((expense, index) => (
                    <KeyValue
                      key={index}
                      label={expense.category}
                      value={usd(expense.amount)}
                      tone="neutral"
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Market Comparison */}
            {activeModules.marketComparison && (
              <Section title="Market Comparison" accent="blue" desc="Local market insights and trends">
                <div className="space-y-3">
                  <KeyValue label="Local Market Cap Rate" value="7.2%" tone="neutral" />
                  <KeyValue label="Average Rent Growth" value="3.5%" tone="positive" />
                  <KeyValue label="Vacancy Rate" value="4.1%" tone="neutral" />
                  <KeyValue label="Property Appreciation" value="5.8%" tone="positive" />
                </div>
              </Section>
            )}

            {/* Report Footer */}
            <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400 tabnums print:fixed print:bottom-0 w-full">
              Report generated on {reportData.analysisDate} • BridgeStay Analytics
              <span className="print:after:content-[' · Page '] print:after:counter(page)"></span>
            </footer>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
