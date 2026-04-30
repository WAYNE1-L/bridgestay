import { useState } from 'react'
import { Check, CreditCard, Crown, Zap } from 'lucide-react'
import { SUBSCRIPTION_PLANS, createCheckoutSession, createCustomerPortalSession } from '../lib/stripe'
import { useAuthStore } from '../stores/auth'

export function SubscriptionPlans() {
  const [loading, setLoading] = useState<string | null>(null)
  const { user } = useAuthStore()

  const handleSubscribe = async (planId: string, priceId: string) => {
    if (!user) return

    setLoading(planId)
    try {
      const sessionId = await createCheckoutSession(priceId, user.id)
      const stripe = await import('@stripe/stripe-js').then(m => m.loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY))
      
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!user) return

    try {
      const url = await createCustomerPortalSession(user.id)
      window.location.href = url
    } catch (error) {
      console.error('Error creating portal session:', error)
    }
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'basic':
        return <Zap className="h-6 w-6" />
      case 'pro':
        return <Crown className="h-6 w-6" />
      case 'enterprise':
        return <CreditCard className="h-6 w-6" />
      default:
        return <Zap className="h-6 w-6" />
    }
  }

  const isCurrentPlan = () => {
    // This would be determined by the user's current subscription
    return false
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Choose Your Plan
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          Unlock powerful real estate analytics and investment insights
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-8 ${
              plan.id === 'pro'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {plan.id === 'pro' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">
                  Most Popular
                </span>
              </div>
            )}

            <div className="flex items-center justify-center mb-4">
              <div className={`p-3 rounded-full ${
                plan.id === 'pro' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {getPlanIcon(plan.id)}
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {plan.name}
            </h3>

            <p className="text-gray-600 text-center mb-6">
              {plan.description}
            </p>

            <div className="text-center mb-6">
              <span className="text-4xl font-bold text-gray-900">
                ${plan.price}
              </span>
              <span className="text-gray-600">/{plan.interval}</span>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id, plan.stripe_price_id)}
              disabled={loading === plan.id || isCurrentPlan(plan.id)}
              className={`w-full py-3 px-4 rounded-md font-medium ${
                plan.id === 'pro'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading === plan.id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
              ) : isCurrentPlan(plan.id) ? (
                'Current Plan'
              ) : (
                `Subscribe to ${plan.name}`
              )}
            </button>
          </div>
        ))}
      </div>

      {user?.subscription_status === 'active' && (
        <div className="mt-8 text-center">
          <button
            onClick={handleManageSubscription}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Manage Subscription
          </button>
        </div>
      )}
    </div>
  )
}
