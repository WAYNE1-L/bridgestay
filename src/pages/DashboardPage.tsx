import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Home, DollarSign, TrendingUp, Eye, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { LoadingSkeleton, CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/ui/LoadingSkeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { fetchPropertySnapshots, fetchChartData, getSafePropertySnapshots, getSafeChartData } from '../lib/mock'
import { calculateDashboardStats, sortSnapshotsByCashFlow } from '../lib/stats'
import { usd, usdCompact, pct, date } from '../lib/format'
import { PropertySnapshotSchema, ChartDataSchema, PropertySnapshot, ChartData } from '../types'

export default function DashboardPage() {
  const [snapshots, setSnapshots] = useState<PropertySnapshot[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Dashboard - BridgeStay Analytics'
    
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [snapshotsData, chartDataResult] = await Promise.all([
          fetchPropertySnapshots(),
          fetchChartData()
        ])
        
        // Validate data with Zod schemas
        const validatedSnapshots = snapshotsData.map(snapshot => 
          PropertySnapshotSchema.parse(snapshot)
        )
        const validatedChartData = chartDataResult.map(data => 
          ChartDataSchema.parse(data)
        )
        
        setSnapshots(validatedSnapshots)
        setChartData(validatedChartData)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Failed to load dashboard data')
        // Fallback to safe data
        setSnapshots(getSafePropertySnapshots())
        setChartData(getSafeChartData())
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    // Retry logic would go here
    setTimeout(() => {
      setSnapshots(getSafePropertySnapshots())
      setChartData(getSafeChartData())
      setLoading(false)
    }, 500)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <LoadingSkeleton className="h-8 w-32 mb-2" />
          <LoadingSkeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ChartSkeleton />
        <Card>
          <CardHeader>
            <LoadingSkeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && snapshots.length === 0) {
    return (
      <EmptyState
        title="Failed to Load Dashboard"
        description={error}
        icon="file"
        action={
          <Button onClick={handleRetry} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        }
      />
    )
  }

  if (snapshots.length === 0) {
    return (
      <EmptyState
        title="No Properties Yet"
        description="Start by analyzing your first property to see it here."
        icon="chart"
        action={
          <Button onClick={handleRetry} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />
    )
  }

  const stats = calculateDashboardStats(snapshots)
  const sortedSnapshots = sortSnapshotsByCashFlow(snapshots)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your property investments
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              Active investments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usd(stats.totalCashFlowMonthly)}</div>
            <p className="text-xs text-muted-foreground">
              Monthly cash flow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pct(stats.avgRoi)}</div>
            <p className="text-xs text-muted-foreground">
              Return on investment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>Monthly cash flow and ROI trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="1 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => usdCompact(value)}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => pct(value)}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value, name) => [
                    name === 'cashFlow' ? usdCompact(Number(value)) : pct(Number(value)),
                    name === 'cashFlow' ? 'Cash Flow' : 'ROI'
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="cashFlow" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="roiPct" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Properties Table */}
      <Card>
        <CardHeader>
          <CardTitle>Property Rankings</CardTitle>
          <CardDescription>Properties sorted by monthly cash flow</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedSnapshots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No properties found</p>
              <Button>Add Your First Property</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Property</th>
                    <th className="text-left p-2 font-medium">Monthly Cash Flow</th>
                    <th className="text-left p-2 font-medium">Cap Rate</th>
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSnapshots.map((snapshot) => (
                    <tr key={snapshot.id} className="border-b">
                      <td className="p-2 font-medium">{snapshot.property_address}</td>
                      <td className="p-2">{usd(snapshot.calculation_results.summary.cashFlowMonthly)}</td>
                      <td className="p-2">{pct(snapshot.calculation_results.summary.capRatePercent)}</td>
                      <td className="p-2">{date(snapshot.created_at)}</td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
