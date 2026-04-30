import { useState } from 'react'
import { FileText, Download, BarChart3, TrendingUp, DollarSign } from 'lucide-react'

export function ReportPage() {
  console.log('ReportPage component rendering')
  
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = () => {
    setIsGenerating(true)
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false)
      alert('Report downloaded successfully!')
    }, 2000)
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Investment Reports</h1>
                <p className="mt-2 text-gray-600">Generate and download detailed property analysis reports</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download Report'}
            </button>
          </div>
        </div>

        {/* Report Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Property Analysis</h3>
                <p className="text-sm text-gray-500">Comprehensive ROI calculations</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Cash Flow Projections</h3>
                <p className="text-sm text-gray-500">Monthly and annual projections</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
                <p className="text-sm text-gray-500">Detailed cost analysis</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Market Comparison</h3>
                <p className="text-sm text-gray-500">Local market insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Preview */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Report Preview</h2>
            <p className="text-sm text-gray-500">Sample of what your report will include</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-sm font-semibold text-gray-900">Executive Summary</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Property shows positive cash flow of $1,600/month with 8.5% cap rate and 12.3% ROI.
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-sm font-semibold text-gray-900">Financial Metrics</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-xs text-gray-500">Monthly Cash Flow:</span>
                    <span className="text-sm font-semibold text-green-600 ml-2">$1,600</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Cap Rate:</span>
                    <span className="text-sm font-semibold text-gray-900 ml-2">8.5%</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">ROI:</span>
                    <span className="text-sm font-semibold text-green-600 ml-2">12.3%</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Total Invested:</span>
                    <span className="text-sm font-semibold text-gray-900 ml-2">$156,000</span>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-sm font-semibold text-gray-900">Expense Analysis</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Mortgage Payment:</span>
                    <span className="text-gray-900">$1,200</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Property Management:</span>
                    <span className="text-gray-900">$192</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Maintenance:</span>
                    <span className="text-gray-900">$120</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Insurance & Taxes:</span>
                    <span className="text-gray-900">$288</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
