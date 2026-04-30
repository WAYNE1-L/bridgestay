import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import type { MonthlyCashFlowItem } from '../types/results';
import { usd } from '../lib/format';
import { EmptyState } from './ui/EmptyState';

interface ChartDataItem {
  month: number;
  principal: number;
  interest: number;
  cashFlow: number;
}

interface AmortizationChartProps {
  items: MonthlyCashFlowItem[];
  monthlyRent: number;
}

export function AmortizationChart({ items, monthlyRent }: AmortizationChartProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Guard against empty/null data
  if (!items || items.length === 0) {
    return (
      <div className="avoid-break mt-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Monthly Payment Breakdown (First 12 Months)</h3>
        <EmptyState 
          title="No amortization data"
          description="Enter valid loan details to see the payment breakdown over time."
          icon="chart"
        />
      </div>
    );
  }

  // Transform data for chart - limit to first 12 months
  const chartData: ChartDataItem[] = items.slice(0, 12).map(item => ({
    month: item.month,
    principal: item.principal,
    interest: item.interest,
    cashFlow: monthlyRent - (item.principal + item.interest), // Simplified cash flow calculation
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-medium text-gray-900">Month {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {usd(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="avoid-break mt-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Monthly Payment Breakdown (First 12 Months)</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `M${value}`}
              aria-label="Month number"
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              aria-label="Payment amount in thousands"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend aria-label="Chart legend showing principal, interest, and cash flow lines" />
            <Line 
              type="monotone" 
              dataKey="principal" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Principal"
              dot={{ r: 3 }}
              isAnimationActive={!prefersReducedMotion}
            />
            <Line 
              type="monotone" 
              dataKey="interest" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Interest"
              dot={{ r: 3 }}
              isAnimationActive={!prefersReducedMotion}
            />
            <Line 
              type="monotone" 
              dataKey="cashFlow" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Cash Flow"
              dot={{ r: 3 }}
              isAnimationActive={!prefersReducedMotion}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
