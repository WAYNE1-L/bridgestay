import Stripe from "stripe";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { users, payments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { PAYMENT_TYPES, PaymentType, calculateMoveInCost } from "./products";

// Lazy-initialize Stripe so the app can start without a key in development
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error(
        "[Stripe] STRIPE_SECRET_KEY is not configured. Payment features are unavailable."
      );
    }
    _stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return _stripe;
}

/** @deprecated – use getStripe() instead; kept for any existing imports */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(user: {
  id: number;
  email: string | null;
  name: string | null;
  stripeCustomerId?: string | null;
}): Promise<string> {
  // Return existing customer ID if available
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }
  
  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.name || undefined,
    metadata: {
      userId: user.id.toString(),
    },
  });
  
  // Update user with Stripe customer ID
  const db = await getDb();
  if (db) {
    await db
      .update(users)
      .set({ stripeCustomerId: customer.id })
      .where(eq(users.id, user.id));
  }
  
  return customer.id;
}

/**
 * Create a checkout session for move-in payments
 */
export async function createMoveInCheckoutSession(params: {
  user: {
    id: number;
    email: string | null;
    name: string | null;
    stripeCustomerId?: string | null;
  };
  apartment: {
    id: number;
    title: string;
    monthlyRent: string | number;
    securityDeposit: string | number;
    applicationFee?: string | number | null;
    petDeposit?: string | number | null;
    petsAllowed?: boolean;
    landlordId: number;
  };
  applicationId: number;
  hasPet?: boolean;
  origin: string;
}): Promise<{ url: string; sessionId: string }> {
  const { user, apartment, applicationId, hasPet, origin } = params;
  
  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer(user);
  
  // Calculate costs
  const costs = calculateMoveInCost({
    ...apartment,
    hasPet,
  });
  
  // Build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  
  // Security Deposit
  if (costs.securityDeposit > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `Security Deposit - ${apartment.title}`,
          description: PAYMENT_TYPES.SECURITY_DEPOSIT.description,
        },
        unit_amount: Math.round(costs.securityDeposit * 100), // Convert to cents
      },
      quantity: 1,
    });
  }
  
  // First Month's Rent
  if (costs.firstMonthRent > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `First Month's Rent - ${apartment.title}`,
          description: PAYMENT_TYPES.FIRST_MONTH_RENT.description,
        },
        unit_amount: Math.round(costs.firstMonthRent * 100),
      },
      quantity: 1,
    });
  }
  
  // Application Fee (if any)
  if (costs.applicationFee > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Application Fee",
          description: PAYMENT_TYPES.APPLICATION_FEE.description,
        },
        unit_amount: Math.round(costs.applicationFee * 100),
      },
      quantity: 1,
    });
  }
  
  // Pet Deposit (if applicable)
  if (costs.petDeposit > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Pet Deposit",
          description: PAYMENT_TYPES.PET_DEPOSIT.description,
        },
        unit_amount: Math.round(costs.petDeposit * 100),
      },
      quantity: 1,
    });
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: user.email || undefined,
    client_reference_id: user.id.toString(),
    mode: "payment",
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    line_items: lineItems,
    metadata: {
      user_id: user.id.toString(),
      customer_email: user.email || "",
      customer_name: user.name || "",
      apartment_id: apartment.id.toString(),
      application_id: applicationId.toString(),
      landlord_id: apartment.landlordId.toString(),
      payment_type: "move_in",
      security_deposit: costs.securityDeposit.toString(),
      first_month_rent: costs.firstMonthRent.toString(),
      application_fee: costs.applicationFee.toString(),
      pet_deposit: costs.petDeposit.toString(),
      total: costs.total.toString(),
    },
    success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/apartments/${apartment.id}?payment=cancelled`,
  });
  
  return {
    url: session.url!,
    sessionId: session.id,
  };
}

/**
 * Create a checkout session for monthly rent payment
 */
export async function createRentCheckoutSession(params: {
  user: {
    id: number;
    email: string | null;
    name: string | null;
    stripeCustomerId?: string | null;
  };
  apartment: {
    id: number;
    title: string;
    monthlyRent: string | number;
    landlordId: number;
  };
  month: string; // e.g., "January 2025"
  origin: string;
}): Promise<{ url: string; sessionId: string }> {
  const { user, apartment, month, origin } = params;
  
  const customerId = await getOrCreateStripeCustomer(user);
  const rentAmount = Number(apartment.monthlyRent);
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: user.email || undefined,
    client_reference_id: user.id.toString(),
    mode: "payment",
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Rent Payment - ${month}`,
            description: `Monthly rent for ${apartment.title}`,
          },
          unit_amount: Math.round(rentAmount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id.toString(),
      customer_email: user.email || "",
      customer_name: user.name || "",
      apartment_id: apartment.id.toString(),
      landlord_id: apartment.landlordId.toString(),
      payment_type: "monthly_rent",
      month,
      amount: rentAmount.toString(),
    },
    success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?payment=cancelled`,
  });
  
  return {
    url: session.url!,
    sessionId: session.id,
  };
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "customer"],
  });
}
