import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  throw new Error('Missing Stripe publishable key')
}

export const stripePromise = loadStripe(stripePublishableKey)

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  stripe_price_id: string
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    description: 'Perfect for individual investors',
    price: 29,
    interval: 'month',
    features: [
      'Up to 10 property analyses per month',
      'Basic market data',
      'PDF report export',
      'Email support',
    ],
    stripe_price_id: 'price_basic_monthly',
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    description: 'For serious real estate investors',
    price: 79,
    interval: 'month',
    features: [
      'Unlimited property analyses',
      'Advanced market data & trends',
      'Zillow integration',
      'Census data access',
      'Priority support',
      'Custom report templates',
    ],
    stripe_price_id: 'price_pro_monthly',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    description: 'For real estate teams and agencies',
    price: 199,
    interval: 'month',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'White-label reports',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
    ],
    stripe_price_id: 'price_enterprise_monthly',
  },
]

export const createCheckoutSession = async (priceId: string, userId: string) => {
  const response = await fetch('/.netlify/functions/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      userId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  const { sessionId } = await response.json()
  return sessionId
}

export const createCustomerPortalSession = async (userId: string) => {
  const response = await fetch('/.netlify/functions/create-portal-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    throw new Error('Failed to create portal session')
  }

  const { url } = await response.json()
  return url
}
