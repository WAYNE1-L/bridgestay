import { useState, useEffect } from 'react'
import { FileText, Download, Printer, Share2, Upload, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { Section } from '../components/ui/Section'
import { KeyValue } from '../components/ui/KeyValue'
import { ReportHeader } from '../components/ui/ReportHeader'
import { usd, pct } from '../lib/format'
import { parseCSV, toCSV, generateCSVTemplate, validateCSVData, type PropertyResult } from '../lib/csv'
import { useFinanceWorker } from '../hooks/useFinanceWorker'
import { useTranslation } from '../lib/i18n'

export default function ReportsPage() {
  const { t } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeModules, setActiveModules] = useState({
    propertyAnalysis: true,
    cashFlow: true,
    expenseBreakdown: true,
    marketComparison: true,
  })
  const [propertyResults, setPropertyResults] = useState<PropertyResult[]>([])
  const [isProcessingCSV, setIsProcessingCSV] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)

  const { calculateBatch } = useFinanceWorker()

  useEffect(() => {
    document.title = `${t('reports.title')} - BridgeStay Analytics`
  }, [t])

  const handleDownloadReport = () => {
    setIsGenerating(true)
    
    setTimeout(() => {
      document.body.classList.add('print-mode')
      window.print()
      
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError(t('reports.errors.invalidFormat'))
      return
    }

    setIsProcessingCSV(true)
    setCsvError(null)

    try {
      const text = await file.text()
      const properties = parseCSV(text)
      
      if (properties.length === 0) {
        setCsvError(t('reports.errors.parseError'))
        return
      }

      const { valid, errors } = validateCSVData(properties)
      
      if (errors.length > 0) {
        setCsvError(errors.join('; '))
        return
      }

      setImportedProperties(valid)

      // Calculate results for all properties using Web Worker
      const results = await calculateBatch(valid)
      
      const propertyResults: PropertyResult[] = valid.map((property, index) => ({
        ...property,
        ...results[index]
      }))

      setPropertyResults(propertyResults)
    } catch (error) {
      console.error('CSV processing error:', error)
      setCsvError(t('reports.errors.parseError'))
    } finally {
      setIsProcessingCSV(false)
    }
  }

  const handleExportCSV = () => {
    if (propertyResults.length === 0) return

    const csv = toCSV(propertyResults)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `property-analysis-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate()
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = 'property-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Mock report data for single property
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
    { label: t('calculator.monthlyCashFlow'), value: usd(reportData.summary.monthlyCashFlow) },
    { label: t('calculator.annualCashFlow'), value: usd(reportData.summary.annualCashFlow) },
    { label: t('calculator.capRate'), value: pct(reportData.summary.capRate) },
    { label: t('calculator.roi'), value: pct(reportData.summary.roi) },
  ]

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8" />
              {t('reports.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('reports.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadReport} 
              disabled={isGenerating}
              className="gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Printer className="h-4 w-4" />
              {isGenerating ? t('common.loading') : t('common.print')}
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              {t('common.share')}
            </Button>
          </div>
        </div>

        {/* CSV Import/Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t('reports.importCSV')} / {t('reports.exportCSV')}
            </CardTitle>
            <CardDescription>
              Import multiple properties from CSV or export analysis results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="csv-file" className="block text-sm font-medium mb-2">
                  {t('reports.selectFile')}
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isProcessingCSV}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {csvError && (
                  <div role="alert" aria-live="polite" className="mt-2 text-sm text-red-600">
                    {csvError}
                  </div>
                )}
                {isProcessingCSV && (
                  <div className="mt-2 text-sm text-blue-600">
                    {t('reports.processingFile')}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('reports.csvTemplate')}
                </Button>
                <Button
                  onClick={handleExportCSV}
                  disabled={propertyResults.length === 0}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t('reports.exportCSV')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Imported Properties Table */}
        {propertyResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Imported Properties Analysis</CardTitle>
              <CardDescription>
                {propertyResults.length} properties analyzed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Property</th>
                      <th className="text-left p-2 font-medium">Purchase Price</th>
                      <th className="text-left p-2 font-medium">Monthly Rent</th>
                      <th className="text-left p-2 font-medium">Monthly Cash Flow</th>
                      <th className="text-left p-2 font-medium">Cap Rate</th>
                      <th className="text-left p-2 font-medium">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propertyResults.map((property) => (
                      <tr key={property.id} className="border-b">
                        <td className="p-2 font-medium">{property.address}</td>
                        <td className="p-2">{usd(property.purchasePrice)}</td>
                        <td className="p-2">{usd(property.monthlyRent)}</td>
                        <td className={`p-2 ${property.monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {usd(property.monthlyCashFlow)}
                        </td>
                        <td className="p-2">{pct(property.capRate)}</td>
                        <td className={`p-2 ${property.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {pct(property.roi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Module Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.modules')}</CardTitle>
            <CardDescription>{t('reports.selectModules')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeModules.propertyAnalysis}
                  onChange={() => handleToggleModule('propertyAnalysis')}
                  className="rounded border-gray-300"
                  aria-describedby="property-analysis-desc"
                />
                <span className="text-sm font-medium">{t('reports.propertyAnalysis')}</span>
              </label>
              <div id="property-analysis-desc" className="sr-only">
                Include property analysis section in the report
              </div>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeModules.cashFlow}
                  onChange={() => handleToggleModule('cashFlow')}
                  className="rounded border-gray-300"
                  aria-describedby="cash-flow-desc"
                />
                <span className="text-sm font-medium">{t('reports.cashFlow')}</span>
              </label>
              <div id="cash-flow-desc" className="sr-only">
                Include cash flow projections in the report
              </div>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeModules.expenseBreakdown}
                  onChange={() => handleToggleModule('expenseBreakdown')}
                  className="rounded border-gray-300"
                  aria-describedby="expense-breakdown-desc"
                />
                <span className="text-sm font-medium">{t('reports.expenseBreakdown')}</span>
              </label>
              <div id="expense-breakdown-desc" className="sr-only">
                Include detailed expense breakdown in the report
              </div>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeModules.marketComparison}
                  onChange={() => handleToggleModule('marketComparison')}
                  className="rounded border-gray-300"
                  aria-describedby="market-comparison-desc"
                />
                <span className="text-sm font-medium">{t('reports.marketComparison')}</span>
              </label>
              <div id="market-comparison-desc" className="sr-only">
                Include market comparison data in the report
              </div>
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
              <Section title={t('reports.executiveSummary')} accent="blue">
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
              <Section title={t('reports.financialMetrics')} accent="green" desc="Key performance indicators and investment metrics">
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
              <Section title={t('reports.expenseAnalysis')} accent="purple" desc="Monthly operating expenses breakdown">
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
              <Section title={t('reports.marketInsights')} accent="blue" desc="Local market insights and trends">
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
              {t('reports.reportGenerated', { date: reportData.analysisDate })}
              <span className="print:after:content-[' · Page '] print:after:counter(page)"></span>
            </footer>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
