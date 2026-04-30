import { useState } from 'react'
import { Plus, BarChart3, FileText, Settings, MapPin, TrendingUp, DollarSign, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Mock data for demonstration
const mockSnapshots = [
  {
    id: '1',
    property_address: '123 Main St, Austin, TX',
    calculation_results: {
      summary: {
        cashFlowMonthly: 1200,
        capRatePercent: 8.5,
        roiPercent: 12.3
      }
    },
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    property_address: '456 Oak Ave, Dallas, TX',
    calculation_results: {
      summary: {
        cashFlowMonthly: 950,
        capRatePercent: 7.2,
        roiPercent: 10.8
      }
    },
    created_at: '2024-01-10T14:30:00Z'
  },
  {
    id: '3',
    property_address: '789 Pine Rd, Houston, TX',
    calculation_results: {
      summary: {
        cashFlowMonthly: 1800,
        capRatePercent: 9.1,
        roiPercent: 15.2
      }
    },
    created_at: '2024-01-05T09:15:00Z'
  }
]

const mockChartData = [
  { month: 'Jan', cashFlow: 1200, roi: 12.3 },
  { month: 'Feb', cashFlow: 1250, roi: 12.8 },
  { month: 'Mar', cashFlow: 1180, roi: 12.1 },
  { month: 'Apr', cashFlow: 1320, roi: 13.2 },
  { month: 'May', cashFlow: 1400, roi: 14.0 },
  { month: 'Jun', cashFlow: 1350, roi: 13.5 }
]

// Map placeholder component
function MapView() {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Property Map</h3>
        </div>
      </div>
      <div className="h-64 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Interactive map will be displayed here</p>
          <p className="text-sm text-gray-400 mt-1">Showing property locations and market data</p>
        </div>
      </div>
    </div>
  )
}

// Summary stats component
function SummaryStats({ snapshots }: { snapshots: typeof mockSnapshots }) {
  const totalProperties = snapshots.length
  const totalCashFlow = snapshots.reduce((sum, s) => sum + (s.calculation_results?.summary?.cashFlowMonthly || 0), 0)
  const averageROI = snapshots.length > 0 
    ? snapshots.reduce((sum, s) => sum + (s.calculation_results?.summary?.roiPercent || 0), 0) / snapshots.length 
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Home className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">Total Properties</h3>
            <p className="text-2xl font-bold text-gray-900">{totalProperties}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">Total Cash Flow</h3>
            <p className="text-2xl font-bold text-gray-900">${totalCashFlow.toLocaleString()}/mo</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">Average ROI</h3>
            <p className="text-2xl font-bold text-gray-900">{averageROI.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Chart component
function PerformanceChart() {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
        <p className="text-sm text-gray-500">Monthly cash flow and ROI trends</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => [
                name === 'cashFlow' ? `$${value.toLocaleString()}` : `${value}%`,
                name === 'cashFlow' ? 'Cash Flow' : 'ROI'
              ]}
            />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="cashFlow" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="cashFlow"
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="roi" 
              stroke="#10B981" 
              strokeWidth={2}
              name="roi"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Ranking table component
function RankingTable({ snapshots }: { snapshots: typeof mockSnapshots }) {
  if (snapshots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Yet</h3>
          <p className="text-gray-500 mb-4">Start by analyzing your first property to see it here.</p>
          <Link
            to="/roi"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Analyze Property
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Property Rankings</h3>
        <p className="text-sm text-gray-500">Sorted by monthly cash flow</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monthly Cash Flow
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cap Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {snapshots.map((snapshot) => (
              <tr key={snapshot.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {snapshot.property_address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${snapshot.calculation_results?.summary?.cashFlowMonthly?.toLocaleString() || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(snapshot.calculation_results?.summary?.capRatePercent || 0).toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(snapshot.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    to={`/roi?id=${snapshot.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Dashboard() {
  console.log('Dashboard component rendering')
  
  const [snapshots] = useState(mockSnapshots)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Overview of your property investments</p>
        </div>

        {/* Summary Stats */}
        <SummaryStats snapshots={snapshots} />

        {/* Chart */}
        <div className="mb-8">
          <PerformanceChart />
        </div>

        {/* Map and Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MapView />
          <RankingTable snapshots={snapshots} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/roi"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                <Plus className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true" />
                Analyze New Property
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Calculate ROI, cash flow, and investment metrics for a new property.
              </p>
            </div>
          </Link>

          <Link
            to="/report"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                <FileText className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true" />
                Generate Report
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create and export detailed investment reports with charts and analysis.
              </p>
            </div>
          </Link>

          <div className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-gray-300">
            <div>
              <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                <Settings className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true" />
                Settings
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Manage your account settings and preferences.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}