import { useMemo } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts"
import { usd } from "@/lib/format"
import type { RoiInput } from "@/lib/calc"
import { calc } from "@/lib/calc"

type Props = { values: RoiInput }

export default function SensitivityChart({ values }: Props) {
  // generate cash-flow vs rent curve ±20%
  const data = useMemo(() => {
    const pts: { x: string; cash: number }[] = []
    for (let p = -20; p <= 20; p += 5) {
      const v = { ...values, rentMonthly: values.rentMonthly * (1 + p / 100) }
      const out = calc(v)
      pts.push({ x: `${p > 0 ? "+" : ""}${p}%`, cash: Number(out.monthlyCashFlow.toFixed(2)) })
    }
    return pts
  }, [values])

  const breakeven = calc(values).totalExpenses

  return (
    <div className="rounded-2xl border p-4 md:p-6">
      <div className="mb-2 font-medium">Sensitivity — Rent vs Monthly Cash Flow</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis tickFormatter={(v) => usd(v)} />
            <Tooltip formatter={(v: number) => [usd(v), 'Cash Flow']} />
            <ReferenceLine y={0} stroke="#bbb" />
            <Line type="monotone" dataKey="cash" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-black/60">Break-even monthly expenses: {usd(breakeven)}</div>
    </div>
  )
}
