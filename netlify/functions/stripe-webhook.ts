import { Handler } from '@netlify/functions'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const payload = event.body || ''
    const sig = event.headers['stripe-signature'] || ''

    let webhookEvent: Stripe.Event

    try {
      webhookEvent = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid signature' }),
      }
    }

    // Handle the event
    switch (webhookEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(webhookEvent.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(webhookEvent.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(webhookEvent.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(webhookEvent.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${webhookEvent.type}`)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  // Update user subscription status in Supabase
  // This would integrate with your Supabase database
  console.log('Subscription changed:', subscription.id)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // Mark subscription as canceled in Supabase
  console.log('Subscription canceled:', subscription.id)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Update subscription status to active
  console.log('Payment succeeded:', invoice.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment
  console.log('Payment failed:', invoice.id)
}
