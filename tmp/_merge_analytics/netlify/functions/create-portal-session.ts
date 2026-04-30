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
    const { userId } = JSON.parse(event.body || '{}')

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId' }),
      }
    }

    // Find customer by userId
    const customers = await stripe.customers.list({
      email: userId,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Customer not found' }),
      }
    }

    const customer = customers.data[0]

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.VITE_APP_URL}/dashboard`,
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (error) {
    console.error('Error creating portal session:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
