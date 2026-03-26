/**
 * Stripe Products Configuration for SafeLanding
 * 
 * This file defines all payment types and their configurations.
 * Products are created dynamically in Stripe when needed.
 */

export const PAYMENT_TYPES = {
  APPLICATION_FEE: {
    name: "Application Fee",
    description: "Non-refundable application processing fee",
    defaultAmount: 0, // Usually free for international students
  },
  SECURITY_DEPOSIT: {
    name: "Security Deposit",
    description: "Refundable security deposit for apartment rental",
    // Amount varies per apartment
  },
  FIRST_MONTH_RENT: {
    name: "First Month's Rent",
    description: "First month's rent payment",
    // Amount varies per apartment
  },
  MONTHLY_RENT: {
    name: "Monthly Rent",
    description: "Monthly rent payment",
    // Amount varies per apartment
  },
  PET_DEPOSIT: {
    name: "Pet Deposit",
    description: "Refundable pet deposit",
    // Amount varies per apartment
  },
  LATE_FEE: {
    name: "Late Payment Fee",
    description: "Fee for late rent payment",
    defaultAmount: 50,
  },
} as const;

export type PaymentType = keyof typeof PAYMENT_TYPES;

/**
 * Calculate total move-in cost for an apartment
 */
export function calculateMoveInCost(apartment: {
  securityDeposit: string | number;
  monthlyRent: string | number;
  applicationFee?: string | number | null;
  petDeposit?: string | number | null;
  petsAllowed?: boolean;
  hasPet?: boolean;
}): {
  securityDeposit: number;
  firstMonthRent: number;
  applicationFee: number;
  petDeposit: number;
  total: number;
} {
  const securityDeposit = Number(apartment.securityDeposit) || 0;
  const firstMonthRent = Number(apartment.monthlyRent) || 0;
  const applicationFee = Number(apartment.applicationFee) || 0;
  const petDeposit = apartment.hasPet && apartment.petsAllowed 
    ? (Number(apartment.petDeposit) || 0) 
    : 0;
  
  return {
    securityDeposit,
    firstMonthRent,
    applicationFee,
    petDeposit,
    total: securityDeposit + firstMonthRent + applicationFee + petDeposit,
  };
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
