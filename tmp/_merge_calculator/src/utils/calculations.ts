export type CalculatorInputs = {
  purchasePrice: number;
  downPaymentPercent: number; // 0-100
  interestRateAnnualPercent: number; // 0-100
  loanTermYears: number; // e.g., 30
  monthlyRent: number;
  vacancyPercent: number; // 0-100
  maintenancePercent: number; // 0-100
  managementPercent: number; // 0-100
  taxesMonthly: number;
  insuranceMonthly: number;
  otherFixedMonthly: number; // utilities, hoa, etc
  closingCosts: number;
  rehabBudget: number;
};

export type CalculatorOutputs = {
  loanAmount: number;
  monthlyMortgage: number;
  noiMonthly: number;
  noiAnnual: number;
  cashFlowMonthly: number;
  cashOnCashReturnPercent: number;
  capRatePercent: number;
  annualizedFiveYearReturnPercent: number;
  expenseBreakdownMonthly: {
    fixed: number;
    variable: number;
    total: number;
  };
  amortization: Array<{ month: number; principal: number; interest: number; balance: number }>;
};

export function percentToDecimal(percent: number): number {
  return percent / 100;
}

export function calculateMonthlyMortgage(loanAmount: number, annualRatePercent: number, termYears: number): number {
  const r = percentToDecimal(annualRatePercent) / 12;
  const n = termYears * 12;
  if (r === 0) return loanAmount / n;
  const factor = Math.pow(1 + r, n);
  return (loanAmount * r * factor) / (factor - 1);
}

export function buildAmortization(loanAmount: number, annualRatePercent: number, termYears: number): Array<{ month: number; principal: number; interest: number; balance: number }> {
  const schedule: Array<{ month: number; principal: number; interest: number; balance: number }> = [];
  let balance = loanAmount;
  const payment = calculateMonthlyMortgage(loanAmount, annualRatePercent, termYears);
  const r = percentToDecimal(annualRatePercent) / 12;
  const n = termYears * 12;
  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    const principal = Math.max(0, payment - interest);
    balance = Math.max(0, balance - principal);
    schedule.push({ month, principal, interest, balance });
  }
  return schedule;
}

export function calculateAll(inputs: CalculatorInputs): CalculatorOutputs {
  const downPayment = inputs.purchasePrice * percentToDecimal(inputs.downPaymentPercent);
  const loanAmount = Math.max(0, inputs.purchasePrice - downPayment);
  const monthlyMortgage = calculateMonthlyMortgage(loanAmount, inputs.interestRateAnnualPercent, inputs.loanTermYears);

  const vacancy = inputs.monthlyRent * percentToDecimal(inputs.vacancyPercent);
  const maintenance = inputs.monthlyRent * percentToDecimal(inputs.maintenancePercent);
  const management = inputs.monthlyRent * percentToDecimal(inputs.managementPercent);
  const variable = vacancy + maintenance + management;
  const fixed = inputs.taxesMonthly + inputs.insuranceMonthly + inputs.otherFixedMonthly + monthlyMortgage;
  const totalExpenses = fixed + variable;

  const noiMonthly = inputs.monthlyRent - (inputs.taxesMonthly + inputs.insuranceMonthly + inputs.otherFixedMonthly + vacancy + maintenance + management);
  const noiAnnual = noiMonthly * 12;
  const cashFlowMonthly = inputs.monthlyRent - totalExpenses;

  const totalCashInvested = downPayment + inputs.closingCosts + inputs.rehabBudget;
  const cashOnCashReturnPercent = totalCashInvested > 0 ? ((cashFlowMonthly * 12) / totalCashInvested) * 100 : 0;
  const capRatePercent = inputs.purchasePrice > 0 ? (noiAnnual / inputs.purchasePrice) * 100 : 0;

  // Simple 5-year annualized return approximate: cash flow + principal paydown
  const amort = buildAmortization(loanAmount, inputs.interestRateAnnualPercent, inputs.loanTermYears);
  const first60 = amort.slice(0, 60);
  const principalPaid5Years = first60.reduce((sum, p) => sum + p.principal, 0);
  const fiveYearProfit = cashFlowMonthly * 12 * 5 + principalPaid5Years;
  const annualizedFiveYearReturnPercent = totalCashInvested > 0 ? (Math.pow(1 + fiveYearProfit / totalCashInvested, 1 / 5) - 1) * 100 : 0;

  return {
    loanAmount,
    monthlyMortgage,
    noiMonthly,
    noiAnnual,
    cashFlowMonthly,
    cashOnCashReturnPercent,
    capRatePercent,
    annualizedFiveYearReturnPercent,
    expenseBreakdownMonthly: { fixed, variable, total: totalExpenses },
    amortization: amort,
  };
}


