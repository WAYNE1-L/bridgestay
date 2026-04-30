export interface MonthlyCashFlowItem {
  month: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface SummaryKPIs {
  loanAmount: number;
  monthlyMortgage: number;
  noiMonthly: number;
  noiAnnual: number;
  cashFlowMonthly: number;
  cashOnCashReturnPercent: number;
  capRatePercent: number;
  annualizedFiveYearReturnPercent: number;
}

export interface ExpenseBreakdown {
  fixed: number;
  variable: number;
  total: number;
}

export interface CalculatorResults {
  summary: SummaryKPIs;
  expenseBreakdown: ExpenseBreakdown;
  amortization: MonthlyCashFlowItem[];
}
