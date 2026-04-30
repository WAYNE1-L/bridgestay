import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { usd, pct } from '../lib/format'
import { calculateRoiResults, RoiInputs } from '../lib/finance'

interface SensitivityCardProps {
  inputs: RoiInputs
}

interface SensitivityData {
  rent: number
  monthlyCashFlow: number
  color: string
}

export function SensitivityCard({ inputs }: SensitivityCardProps) {
  const [rentAdjustment, setRentAdjustment] = useState(0) // -20% to +20%
  const [vacancyAdjustment, setVacancyAdjustment] = useState(0) // 0% to 15%
  const [interestAdjustment, setInterestAdjustment] = useState(0) // -2% to +2%

  const sensitivityData = useMemo(() => {
    const data: SensitivityData[] = []
    
    // Generate data points for rent vs cash flow
    for (let rentPct = -20; rentPct <= 20; rentPct += 5) {
      const adjustedRent = inputs.monthlyRent * (1 + rentPct / 100)
      const adjustedVacancy = Math.max(0, inputs.vacancyPct + vacancyAdjustment)
      const adjustedInterest = Math.max(0, inputs.interestRate + interestAdjustment)
      
      const adjustedInputs: RoiInputs = {
        ...inputs,
        monthlyRent: adjustedRent,
        vacancyPct: adjustedVacancy,
        interestRate: adjustedInterest,
      }
      
      const results = calculateRoiResults(adjustedInputs)
      
      data.push({
        rent: adjustedRent,
        monthlyCashFlow: results.monthlyCashFlow,
        color: results.monthlyCashFlow > 0 ? '#10b981' : results.monthlyCashFlow === 0 ? '#6b7280' : '#ef4444',
      })
    }
    
    return data
  }, [inputs, rentAdjustment, vacancyAdjustment, interestAdjustment])

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-medium text-gray-900">Rent: {usd(label)}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Cash Flow: {usd(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sensitivity Analysis</CardTitle>
        <CardDescription>
          See how changes in key variables affect your monthly cash flow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rent-slider">
              Rent Adjustment: {rentAdjustment > 0 ? '+' : ''}{rentAdjustment}%
            </Label>
            <input
              id="rent-slider"
              type="range"
              min="-20"
              max="20"
              step="5"
              value={rentAdjustment}
              onChange={(e) => setRentAdjustment(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-20%</span>
              <span>+20%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vacancy-slider">
              Vacancy Rate: {pct(inputs.vacancyPct + vacancyAdjustment)}
            </Label>
            <input
              id="vacancy-slider"
              type="range"
              min="0"
              max="15"
              step="1"
              value={vacancyAdjustment}
              onChange={(e) => setVacancyAdjustment(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>15%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest-slider">
              Interest Rate: {pct(inputs.interestRate + interestAdjustment)}
            </Label>
            <input
              id="interest-slider"
              type="range"
              min="-2"
              max="2"
              step="0.25"
              value={interestAdjustment}
              onChange={(e) => setInterestAdjustment(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-2%</span>
              <span>+2%</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sensitivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="rent"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => usd(value)}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => usd(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="monthlyCashFlow"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={(props) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={4}
                    fill={props.payload.color}
                    stroke={props.payload.color}
                    strokeWidth={2}
                  />
                )}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Positive Cash Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Break Even</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Negative Cash Flow</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
